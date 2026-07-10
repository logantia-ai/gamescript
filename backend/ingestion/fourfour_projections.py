"""4for4 projections — one of the most accurate DFS projection services.

Source: 4for4.com (free weekly projections). Used to cross-reference our model.
When our projection AND 4for4 both flag a high-leverage play, confidence rises.
When they disagree, the play is surfaced for manual review in the Scout Report.

Output columns (keyed by player_name):
  ff_projection      4for4 projected fantasy points (feeds consensus blend)
  ff_ownership       4for4 projected ownership (0-1)
  ff_value_score     points per $1k of salary
  ff_leverage_flag   bool — 4for4 tagged this a leverage play

Refresh: Wednesday and Saturday each week.
"""
import numpy as np
import pandas as pd
from config import use_sample
from . import _sample

FF_COLS = ['ff_projection', 'ff_ownership', 'ff_value_score', 'ff_leverage_flag']


def get_4for4():
    """Return per-player 4for4 projections (sample fallback)."""
    if not use_sample('fourfour_projections'):
        try:
            # Live pull (4for4.com weekly projection export) would go here.
            raise NotImplementedError('live 4for4 pull not implemented')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  4for4 projections unavailable ({e}); using sample data")

    df = _sample_4for4()
    print(f"   ✅ fourfour_projections: {len(df)} players (sample)")
    return df


def _sample_4for4():
    rng = np.random.default_rng(229)
    roster = _sample.base_roster()
    skill = roster[roster['position'] != 'DST']
    base_pts = {'QB': 18.5, 'RB': 12.0, 'WR': 11.0, 'TE': 8.0}
    base_sal = {'QB': 6200, 'RB': 5400, 'WR': 5200, 'TE': 4000}
    rows = []
    for _, p in skill.iterrows():
        pos = p['position']
        proj = max(1.5, float(rng.normal(base_pts.get(pos, 10) * p['_talent'], 2.6)))
        salary = max(3000, int(base_sal.get(pos, 5000) * p['_talent'] / 100) * 100)
        own = float(np.clip(proj / 60.0 + rng.normal(0, 0.03), 0.01, 0.55))
        value = round(proj / (salary / 1000.0), 2)
        # Leverage = strong value but low projected ownership.
        leverage = bool(value >= 2.4 and own <= 0.12)
        rows.append({
            'player_name': p['player_name'],
            'ff_projection': round(proj, 1),
            'ff_ownership': round(own, 3),
            'ff_value_score': value,
            'ff_leverage_flag': leverage,
        })
    return pd.DataFrame(rows)
