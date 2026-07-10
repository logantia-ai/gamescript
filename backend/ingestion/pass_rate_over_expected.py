"""Pass Rate Over Expected (PROE) — team play-calling tendency.

Source: sharpfootballstats.com (free, public). PROE is one of the most
predictive single metrics for game-script projection: a team that passes
more than its situation calls for generates pass-catcher points regardless
of the score, and the reverse for run-heavy teams.

Output columns (keyed by team):
  team_proe                  pass rate over expected (e.g. +0.05 = passes 5% more)
  team_early_down_pass_rate  1st/2nd down pass rate
  team_neutral_pass_rate     neutral game-script pass rate
  team_pace                  offensive plays per game
"""
import numpy as np
import pandas as pd
from config import use_sample
from . import _sample

PROE_COLS = ['team_proe', 'team_early_down_pass_rate', 'team_neutral_pass_rate', 'team_pace']


def get_pass_rate_over_expected():
    """Return per-team PROE / pace metrics (sample fallback)."""
    if not use_sample('pass_rate_over_expected'):
        try:
            # Live scrape (sharpfootballstats.com PROE tables) would go here.
            raise NotImplementedError('live PROE scrape not implemented')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  PROE live fetch unavailable ({e}); using sample data")

    df = _sample_proe()
    print(f"   ✅ pass_rate_over_expected: {len(df)} teams (sample)")
    return df


def _sample_proe():
    rng = np.random.default_rng(31)
    rows = []
    for team in _sample.teams():
        # PROE centered at 0 with a realistic spread (~±10%).
        proe = float(np.clip(rng.normal(0.0, 0.05), -0.12, 0.12))
        neutral = float(np.clip(rng.normal(0.58, 0.05), 0.42, 0.72))
        rows.append({
            'team': team,
            'team_proe': round(proe, 3),
            'team_early_down_pass_rate': round(float(np.clip(neutral - 0.04, 0.4, 0.7)), 3),
            'team_neutral_pass_rate': round(neutral, 3),
            'team_pace': round(float(np.clip(rng.normal(63.0, 3.0), 55, 72)), 1),
        })
    return pd.DataFrame(rows)
