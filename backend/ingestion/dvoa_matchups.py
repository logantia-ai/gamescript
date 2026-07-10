"""DVOA matchups — opponent-adjusted defensive strength by position.

Source: footballoutsiders.com (free, public). DVOA adjusts for opponent
strength, so a defense that allows 30 fantasy points to receivers against
weak offenses grades very differently from one allowing 30 against elite
offenses. The most accurate single defensive metric for DFS matchup grading.

Output columns (keyed by team = the DEFENSE):
  def_dvoa_vs_wr, def_dvoa_vs_rb, def_dvoa_vs_te, def_dvoa_vs_qb

DVOA convention: NEGATIVE = defense allows less than average = good defense
(a tough matchup for the offense). Positive = soft matchup.

Matchup grades (from the offensive player's perspective, on opponent DVOA):
  <= -0.15  elite matchup   (+8%)
  -0.15..0  good matchup    (+3%)
  0..+0.15  neutral
  >= +0.15  tough matchup   (-5%)
"""
import numpy as np
import pandas as pd
from config import use_sample
from . import _sample

DVOA_COLS = ['def_dvoa_vs_wr', 'def_dvoa_vs_rb', 'def_dvoa_vs_te', 'def_dvoa_vs_qb']


def get_dvoa_matchups():
    """Return per-team defensive DVOA by position (sample fallback)."""
    if not use_sample('dvoa_matchups'):
        try:
            # Live scrape (footballoutsiders.com DVOA tables) would go here.
            raise NotImplementedError('live DVOA scrape not implemented')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  DVOA live fetch unavailable ({e}); using sample data")

    df = _sample_dvoa()
    print(f"   ✅ dvoa_matchups: {len(df)} defenses (sample)")
    return df


def _sample_dvoa():
    rng = np.random.default_rng(57)
    rows = []
    for team in _sample.teams():
        row = {'team': team}
        for col in DVOA_COLS:
            # Defensive DVOA spread is roughly ±25%, centered near 0.
            row[col] = round(float(np.clip(rng.normal(0.0, 0.12), -0.30, 0.30)), 3)
        rows.append(row)
    return pd.DataFrame(rows)
