"""Underdog Fantasy ADP — where the smart season-long money sits.

Source: Underdog Fantasy ADP (free, public). Divergence between Underdog ADP
(sharp best-ball money) and DFS projected ownership reveals where season-long
money disagrees with the DFS public — a leverage tell, or a trap.

Output columns (keyed by player_name):
  underdog_adp                 best-ball average draft position (lower = earlier)
  adp_vs_salary_divergence     underdog_adp_rank - dk_salary_rank
                               large positive  → market undervalues vs DFS price (value)
                               large negative  → DFS price ahead of market (trap)
"""
import numpy as np
import pandas as pd
from config import use_sample
from . import _sample

ADP_COLS = ['underdog_adp', 'adp_vs_salary_divergence']


def get_underdog_adp():
    """Return per-player Underdog ADP + DFS-price divergence (sample fallback)."""
    if not use_sample('underdog_adp'):
        try:
            # Live pull (Underdog public ADP endpoint) would go here.
            raise NotImplementedError('live Underdog ADP pull not implemented')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  Underdog ADP unavailable ({e}); using sample data")

    df = _sample_adp()
    print(f"   ✅ underdog_adp: {len(df)} players (sample)")
    return df


def _sample_adp():
    rng = np.random.default_rng(277)
    roster = _sample.base_roster()
    skill = roster[roster['position'] != 'DST'].copy()
    base_sal = {'QB': 6200, 'RB': 5400, 'WR': 5200, 'TE': 4000}
    rows = []
    for _, p in skill.iterrows():
        pos = p['position']
        # ADP value (lower = drafted earlier); better talent drafts earlier.
        adp = max(1.0, float(rng.normal(120 - 70 * p['_talent'], 18)))
        salary = max(3000, int(base_sal.get(pos, 5000) * p['_talent'] / 100) * 100)
        rows.append({'player_name': p['player_name'], 'underdog_adp': round(adp, 1),
                     '_salary': salary})
    df = pd.DataFrame(rows)
    # Rank both signals overall (1 = best), then divergence = ADP rank minus salary rank.
    df['_adp_rank'] = df['underdog_adp'].rank(method='min').astype(int)
    df['_sal_rank'] = df['_salary'].rank(ascending=False, method='min').astype(int)
    df['adp_vs_salary_divergence'] = df['_adp_rank'] - df['_sal_rank']
    return df[['player_name'] + ADP_COLS]
