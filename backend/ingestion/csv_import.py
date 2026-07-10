"""Weekly CSV Import System.

Watches backend/csv_imports/ for projection CSVs the user downloads from their
paid accounts (Daily Fantasy Fuel, Draft Sharks, Pro Football Network,
FantasyPros) and any generic DFS projection CSV. Run on every pipeline pass —
main.py calls ingest_csv_folder() first.

User workflow:
  1. Download a weekly NFL DFS projection CSV from a site.
  2. Drop it into backend/csv_imports/.
  3. Run `python main.py` — the pipeline auto-detects the source and merges it.
  4. Processed files move to backend/csv_imports/processed/ with a timestamp.

Detection: by filename pattern first, then by column headers. Columns are
normalized to a standard schema and merged on player_name (+ position when
present). Every extra expert projection improves the consensus number built by
build_consensus_projection().
"""
import os
import shutil
from datetime import datetime
from pathlib import Path

import pandas as pd

# csv_import.py lives in backend/ingestion/ → backend/ is two levels up.
BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_FOLDER = BACKEND_DIR / 'csv_imports'

SUPPORTED_SOURCES = {
    'daily_fantasy_fuel': {
        'filename_patterns': ['dff', 'daily_fantasy_fuel', 'dailyfantasyfuel'],
        'key_columns': ['player', 'projection', 'ownership', 'value'],
        'rename_map': {
            'player': 'player_name',
            'projection': 'dff_projection',
            'ownership': 'dff_ownership',
            'value': 'dff_value',
        },
    },
    'draft_sharks': {
        'filename_patterns': ['draftsharks', 'draft_sharks', '_ds_', 'ds_'],
        'key_columns': ['name', 'pts', 'own', 'boom', 'bust'],
        'rename_map': {
            'name': 'player_name',
            'pts': 'ds_projection',
            'own': 'ds_ownership',
            'boom': 'ds_boom_pct',
            'bust': 'ds_bust_pct',
        },
    },
    'pro_football_network': {
        'filename_patterns': ['pfn', 'pro_football_network', 'profootballnetwork'],
        'key_columns': ['player_name', 'fantasy_pts', 'ownership_pct'],
        'rename_map': {
            'fantasy_pts': 'pfn_projection',
            'ownership_pct': 'pfn_ownership',
        },
    },
    'fantasypros': {
        'filename_patterns': ['fantasypros', 'fp_'],
        'key_columns': ['player_name', 'proj_pts', 'owned_pct'],
        'rename_map': {
            'proj_pts': 'fp_projection',
            'owned_pct': 'fp_ownership',
        },
    },
    # Fallback: any DFS CSV exposing a player + projection column.
    'generic_dfs': {
        'filename_patterns': [],
        'detection': 'auto',
        'required_columns': ['player_name', 'projection'],
    },
}

# Common header spellings normalized to player_name regardless of source.
_NAME_ALIASES = ['player_name', 'player', 'name', 'playername', 'full_name']
_POS_ALIASES = ['position', 'pos']


def ingest_csv_folder(folder='csv_imports/'):
    """Detect, normalize, and merge every CSV in `folder`.

    Returns a single DataFrame keyed on player_name (+ position when available)
    carrying the renamed columns from every recognized file. Processed files are
    moved into folder/processed/ with a timestamp. Returns an empty DataFrame
    when the folder is missing or holds no CSVs.
    """
    path = Path(folder)
    if not path.is_absolute():
        path = BACKEND_DIR / folder
    if not path.exists():
        print(f"   ⏭️  csv_import: {path} not found — skipped")
        return pd.DataFrame()

    processed_dir = path / 'processed'
    processed_dir.mkdir(exist_ok=True)

    csv_files = [p for p in path.iterdir() if p.suffix.lower() == '.csv']
    if not csv_files:
        print("   ⏭️  csv_import: no CSV files dropped — skipped")
        return pd.DataFrame()

    merged = None
    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    for fp in csv_files:
        try:
            df, source, added = _read_and_normalize(fp)
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  csv_import: could not parse {fp.name} ({e}); skipped")
            continue
        if df is None or df.empty:
            print(f"   ⚠️  csv_import: {fp.name} unrecognized — no player/projection columns")
            continue

        keys = ['player_name'] + (['position'] if 'position' in df.columns else [])
        merged = df if merged is None else merged.merge(df, on=_common_keys(merged, df), how='outer')
        print(f"   ✅ csv_import: {fp.name} → {source} ({len(df)} rows, +{', '.join(added)})")

        dest = processed_dir / f"{fp.stem}__{stamp}{fp.suffix}"
        shutil.move(str(fp), str(dest))

    if merged is None:
        return pd.DataFrame()
    return merged


def _common_keys(a, b):
    keys = ['player_name']
    if 'position' in a.columns and 'position' in b.columns:
        keys.append('position')
    return keys


def _read_and_normalize(fp):
    """Read one CSV, identify its source, and return (df, source_name, added_cols)."""
    raw = pd.read_csv(fp)
    raw.columns = [str(c).strip().lower().replace(' ', '_') for c in raw.columns]

    source = _detect_source(fp.name, raw.columns)
    spec = SUPPORTED_SOURCES[source]

    # Normalize the player-name column first so every source merges consistently.
    df = raw.copy()
    name_col = next((c for c in _NAME_ALIASES if c in df.columns), None)
    if name_col is None:
        return None, source, []
    if name_col != 'player_name':
        df = df.rename(columns={name_col: 'player_name'})

    pos_col = next((c for c in _POS_ALIASES if c in df.columns), None)
    if pos_col and pos_col != 'position':
        df = df.rename(columns={pos_col: 'position'})

    # Apply the source's column rename map, then keep only normalized columns.
    rename_map = spec.get('rename_map', {})
    df = df.rename(columns=rename_map)

    if source == 'generic_dfs':
        proj_col = next((c for c in ['projection', 'proj', 'fpts', 'points', 'fantasy_pts']
                         if c in df.columns), None)
        if proj_col and proj_col != 'projection':
            df = df.rename(columns={proj_col: 'projection'})

    added = [c for c in df.columns if c not in ('player_name', 'position')]
    keep = ['player_name'] + (['position'] if 'position' in df.columns else []) + added
    df = df[keep].copy()
    df['player_name'] = df['player_name'].astype(str).str.strip()
    df = df.dropna(subset=['player_name']).drop_duplicates(subset=['player_name'])
    return df, source, added


def _detect_source(filename, columns):
    """Identify the source by filename pattern, then by column signature."""
    low = filename.lower()
    for source, spec in SUPPORTED_SOURCES.items():
        for pat in spec.get('filename_patterns', []):
            if pat.lower() in low:
                return source
    # No filename hint — match on the recognizable key columns.
    cols = set(columns)
    best, best_hits = 'generic_dfs', 0
    for source, spec in SUPPORTED_SOURCES.items():
        hits = len(cols & set(spec.get('key_columns', [])))
        if hits > best_hits:
            best, best_hits = source, hits
    return best


def build_consensus_projection(master_df):
    """Average every available expert projection into a consensus number.

    More contributing sources → higher confidence. Divergence between our model
    and the consensus is surfaced for the Scout Report. Safe to call at the
    master-dataset stage (before our own 'projection' column exists) — it only
    uses the columns that are actually present.
    """
    projection_cols = [
        'projection',      # Our model (present only after the projection engine runs)
        'dff_projection',  # Daily Fantasy Fuel
        'ds_projection',   # Draft Sharks
        'pfn_projection',  # Pro Football Network
        'fp_projection',   # FantasyPros
        'ff_projection',   # 4for4
    ]
    available = [c for c in projection_cols if c in master_df.columns]
    if not available:
        # Nothing to blend — keep the schema stable so downstream code is simple.
        master_df['consensus_projection'] = pd.NA
        master_df['consensus_source_count'] = 0
        master_df['consensus_confidence'] = 0
        return master_df

    nums = master_df[available].apply(pd.to_numeric, errors='coerce')
    master_df['consensus_projection'] = nums.mean(axis=1).round(2)
    master_df['consensus_source_count'] = nums.notna().sum(axis=1)
    master_df['consensus_confidence'] = (
        master_df['consensus_source_count'] / len(available) * 100
    ).round(0)

    # The model-vs-consensus gap only exists once our own projection does.
    if 'projection' in master_df.columns:
        proj = pd.to_numeric(master_df['projection'], errors='coerce')
        master_df['model_vs_consensus_gap'] = (proj - master_df['consensus_projection']).round(2)

    return master_df
