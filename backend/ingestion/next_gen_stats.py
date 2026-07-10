"""NFL Next Gen Stats — play-design tracking metrics (nextgenstats.nfl.com).

Free, no key needed. Transforms projections from box-score based to
play-design based. Separation score is among the most predictive metrics
for WR/TE ceiling plays.

Output columns (keyed by player_name):
  separation_score          space at the catch point (yds)
  intended_air_yards        where the QB targets, completed or not (yds)
  completion_probability    catch likelihood adjusted for throw difficulty
  yards_after_contact       true broken-tackle ability (RB-focused)
  route_participation_rate  share of snaps actually running routes

Elite thresholds:
  separation_score         >= 2.5  elite separation
  route_participation_rate >= 0.80 full route runner
  yards_after_contact      >= 3.0  elite broken-tackle ability (RB)
"""
import numpy as np
import pandas as pd
from config import CURRENT_SEASON, use_sample
from . import _sample

NGS_COLS = ['separation_score', 'intended_air_yards', 'completion_probability',
            'yards_after_contact', 'route_participation_rate']


def get_next_gen_stats():
    """Return per-player NGS metrics keyed by player_name (sample fallback)."""
    if not use_sample('next_gen_stats'):
        try:
            df = _fetch_live()
            if df is not None and not df.empty:
                print(f"   ✅ next_gen_stats: {len(df)} players (live)")
                return df
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  NGS live fetch failed ({e}); using sample data")

    df = _sample_ngs()
    print(f"   ✅ next_gen_stats: {len(df)} players (sample)")
    return df


def _fetch_live():
    """Best-effort pull from nfl_data_py NGS tables; map what's available."""
    import nfl_data_py as nfl

    rec = nfl.import_ngs_data('receiving', [CURRENT_SEASON])
    rush = nfl.import_ngs_data('rushing', [CURRENT_SEASON])

    frames = []
    if rec is not None and not rec.empty:
        cmap = {
            'player_display_name': 'player_name',
            'avg_separation': 'separation_score',
            'avg_intended_air_yards': 'intended_air_yards',
            'catch_percentage': 'completion_probability',
            'percent_share_of_intended_air_yards': '_air_share',
        }
        cols = {k: v for k, v in cmap.items() if k in rec.columns}
        r = rec[list(cols)].rename(columns=cols)
        # NGS reports catch % on a 0–100 scale; normalize to 0–1.
        if 'completion_probability' in r.columns:
            r['completion_probability'] = r['completion_probability'] / 100.0
        if '_air_share' in r.columns:
            r['route_participation_rate'] = (r['_air_share'] / 100.0).clip(0.3, 0.98)
        frames.append(r)

    if rush is not None and not rush.empty:
        cmap = {'player_display_name': 'player_name', 'avg_yac': 'yards_after_contact'}
        cols = {k: v for k, v in cmap.items() if k in rush.columns}
        frames.append(rush[list(cols)].rename(columns=cols))

    if not frames:
        return None

    out = frames[0]
    for f in frames[1:]:
        out = out.merge(f, on='player_name', how='outer')
    out = out.drop(columns=[c for c in out.columns if c.startswith('_')], errors='ignore')
    for c in NGS_COLS:
        if c not in out.columns:
            out[c] = np.nan
    return out[['player_name'] + NGS_COLS]


def _sample_ngs():
    rng = np.random.default_rng(13)
    roster = _sample.base_roster()
    skill = roster[roster['position'].isin(['WR', 'TE', 'RB'])]
    rows = []
    for _, p in skill.iterrows():
        pos, depth = p['position'], p['depth']
        if pos in ('WR', 'TE'):
            # Starters separate more cleanly and run a near-full route tree.
            sep_mean = 3.0 if depth == 1 else 2.6 if depth == 2 else 2.3
            route_mean = {1: 0.88, 2: 0.78, 3: 0.62, 4: 0.42}.get(depth, 0.35)
            iay_mean = 10.5 if pos == 'WR' else 7.5
            rows.append({
                'player_name': p['player_name'],
                'separation_score': round(float(rng.normal(sep_mean, 0.4)), 2),
                'intended_air_yards': round(float(rng.normal(iay_mean, 2.5)), 1),
                'completion_probability': round(float(np.clip(rng.normal(0.66, 0.05), 0.4, 0.85)), 3),
                'yards_after_contact': round(float(rng.normal(1.2, 0.4)), 2),
                'route_participation_rate': round(float(np.clip(rng.normal(route_mean, 0.05), 0.2, 0.98)), 3),
            })
        else:  # RB
            yac_mean = 3.2 if depth == 1 else 2.6 if depth == 2 else 2.1
            route_mean = {1: 0.55, 2: 0.35, 3: 0.18}.get(depth, 0.12)
            rows.append({
                'player_name': p['player_name'],
                'separation_score': round(float(rng.normal(2.0, 0.3)), 2),
                'intended_air_yards': round(float(rng.normal(1.0, 1.0)), 1),
                'completion_probability': round(float(np.clip(rng.normal(0.78, 0.05), 0.5, 0.92)), 3),
                'yards_after_contact': round(float(rng.normal(yac_mean, 0.5)), 2),
                'route_participation_rate': round(float(np.clip(rng.normal(route_mean, 0.06), 0.05, 0.7)), 3),
            })
    return pd.DataFrame(rows)
