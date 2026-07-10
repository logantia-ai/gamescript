"""nflfastR advanced metrics — the most granular game-script data available.

Source: nflfastR via the nfl-data-py package (free, no key — already in
requirements). EPA (expected points added) tells you which players create value
beyond their raw box score; CPOE measures a passer's accuracy over expectation.

Output columns (keyed by player_name):
  epa_per_play          expected points added per play
  cpoe                  completion % over expected (passers)
  game_script_tendency  'pass_lean' | 'balanced' | 'run_lean'
  situational_pass_rate team pass rate in neutral game states (0-1)
"""
import numpy as np
import pandas as pd
from config import CURRENT_SEASON, use_sample
from . import _sample

EPA_COLS = ['epa_per_play', 'cpoe', 'game_script_tendency', 'situational_pass_rate']


def get_epa_data():
    """Return per-player nflfastR advanced metrics (sample fallback)."""
    if not use_sample('nflfastr_advanced'):
        try:
            df = _fetch_live()
            if df is not None and not df.empty:
                print(f"   ✅ nflfastr_advanced: {len(df)} players (live)")
                return df
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  nflfastR live fetch failed ({e}); using sample data")

    df = _sample_epa()
    print(f"   ✅ nflfastr_advanced: {len(df)} players (sample)")
    return df


def _fetch_live():
    """Best-effort pull of play-by-play EPA aggregated to the player level."""
    import nfl_data_py as nfl

    pbp = nfl.import_pbp_data([CURRENT_SEASON], downcast=True)
    if pbp is None or pbp.empty:
        return None

    # EPA credited to the primary touch player (passer/rusher/receiver).
    frames = []
    for col in ('passer_player_name', 'rusher_player_name', 'receiver_player_name'):
        if col in pbp.columns and 'epa' in pbp.columns:
            g = pbp.groupby(col)['epa'].mean().reset_index()
            g.columns = ['player_name', 'epa_per_play']
            frames.append(g)
    if not frames:
        return None
    out = pd.concat(frames).groupby('player_name', as_index=False)['epa_per_play'].mean()
    out['epa_per_play'] = out['epa_per_play'].round(3)

    if 'cpoe' in pbp.columns and 'passer_player_name' in pbp.columns:
        cp = pbp.groupby('passer_player_name')['cpoe'].mean().reset_index()
        cp.columns = ['player_name', 'cpoe']
        out = out.merge(cp, on='player_name', how='left')
    if 'cpoe' not in out.columns:
        out['cpoe'] = np.nan
    out['situational_pass_rate'] = np.nan
    out['game_script_tendency'] = 'balanced'
    return out[['player_name'] + EPA_COLS]


def _sample_epa():
    rng = np.random.default_rng(251)
    roster = _sample.base_roster()
    skill = roster[roster['position'] != 'DST']
    rows = []
    for _, p in skill.iterrows():
        pos, depth = p['position'], p['depth']
        # Better players (talent) generate more EPA on average.
        epa = float(np.clip(rng.normal(0.05 * p['_talent'], 0.10), -0.30, 0.45))
        cpoe = round(float(rng.normal(0.0, 3.0)), 1) if pos == 'QB' else np.nan
        spr = float(np.clip(rng.normal(0.58, 0.06), 0.40, 0.75))
        tendency = 'pass_lean' if spr >= 0.60 else 'run_lean' if spr <= 0.52 else 'balanced'
        rows.append({
            'player_name': p['player_name'],
            'epa_per_play': round(epa, 3),
            'cpoe': cpoe,
            'game_script_tendency': tendency,
            'situational_pass_rate': round(spr, 3),
        })
    return pd.DataFrame(rows)
