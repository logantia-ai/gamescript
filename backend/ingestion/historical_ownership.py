"""Historical DFS ownership archive — for ownership-model calibration.

Source: rotoguru.net (free historical DFS archive). Backtesting the
projected-ownership formula against real historical ownership shows how
accurate the weights are and where to adjust them.

Output: outputs/historical_ownership.csv with columns
  season, week, player_name, position, salary, actual_ownership, dfs_points

Consumed by models/ownership_model.py to compute mean absolute error by
position and nudge the formula weights toward the lowest error.
"""
import numpy as np
import pandas as pd
from config import CURRENT_SEASON, out, use_sample
from . import _sample

HIST_PATH = out('historical_ownership.csv')


def get_historical_ownership(weeks=6):
    """Return (and persist) a historical ownership archive (sample fallback)."""
    if not use_sample('historical_ownership'):
        try:
            # Live pull (rotoguru.net weekly DK archives) would go here.
            raise NotImplementedError('live rotoguru pull not implemented')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  historical ownership unavailable ({e}); using sample data")

    df = _sample_history(weeks)
    df.to_csv(HIST_PATH, index=False)
    print(f"   ✅ historical_ownership: {len(df)} rows over {weeks} wks (sample) → {HIST_PATH}")
    return df


def _sample_history(weeks):
    """Synthesize plausible prior-season ownership that tracks value, so the
    calibrator has a realistic target to fit against."""
    rng = np.random.default_rng(83)
    roster = _sample.base_roster()
    base_salary = {'QB': 6200, 'RB': 5400, 'WR': 5200, 'TE': 4000, 'DST': 2800}
    rows = []
    prior_season = CURRENT_SEASON - 1
    for wk in range(1, weeks + 1):
        for _, p in roster.iterrows():
            pos = p['position']
            salary = int(base_salary.get(pos, 5000) * p['_talent'] / 100) * 100
            points = max(0.0, float(rng.normal(12 * p['_talent'], 6)))
            value = points / (salary / 1000.0)
            # Ownership rises with value, with noise and a positional bias.
            pos_bias = {'QB': 0.9, 'RB': 1.1, 'WR': 1.0, 'TE': 0.85, 'DST': 0.7}.get(pos, 1.0)
            own = float(np.clip(rng.normal(value * 6.0 * pos_bias, 4.0), 0.2, 55.0))
            rows.append({
                'season': prior_season,
                'week': wk,
                'player_name': p['player_name'],
                'position': pos,
                'salary': salary,
                'actual_ownership': round(own, 1),
                'dfs_points': round(points, 2),
            })
    return pd.DataFrame(rows)
