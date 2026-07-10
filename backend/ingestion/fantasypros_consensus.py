"""FantasyPros consensus — the wisdom of 100+ experts.

Source: fantasypros.com (free public data, no key). A consensus of many expert
projection systems historically beats any single system. The useful signal is
divergence: when our model and the FP consensus disagree by a wide margin, the
play is flagged for manual review in the Scout Report.

Output columns (keyed by player_name):
  fp_consensus_rank   consensus expert ranking (lower = better)
  fp_projection       consensus projected fantasy points (feeds consensus blend)
  fp_expert_count     number of experts in the consensus
  fp_ownership_proj   consensus projected ownership (0-1)

Refresh: Tuesday and Friday each week.
"""
import numpy as np
import pandas as pd
from config import use_sample
from . import _sample

# fp_projection is the canonical projection column consumed by
# build_consensus_projection(); it doubles as FantasyPros' projected points.
FP_COLS = ['fp_consensus_rank', 'fp_projection', 'fp_expert_count', 'fp_ownership_proj']


def get_fp_consensus():
    """Return per-player FantasyPros consensus metrics (sample fallback)."""
    if not use_sample('fantasypros_consensus'):
        try:
            # Live pull (fantasypros.com consensus tables) would go here.
            raise NotImplementedError('live FantasyPros pull not implemented')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  FantasyPros consensus unavailable ({e}); using sample data")

    df = _sample_fp()
    print(f"   ✅ fantasypros_consensus: {len(df)} players (sample)")
    return df


def _sample_fp():
    """Synthesize a consensus that tracks talent, so divergence flags are meaningful."""
    rng = np.random.default_rng(211)
    roster = _sample.base_roster()
    skill = roster[roster['position'] != 'DST']
    rows = []
    base = {'QB': 18.0, 'RB': 12.0, 'WR': 11.0, 'TE': 8.0}
    for _, p in skill.iterrows():
        pos = p['position']
        proj = max(1.5, float(rng.normal(base.get(pos, 10) * p['_talent'], 2.5)))
        rows.append({
            'player_name': p['player_name'],
            'fp_projection': round(proj, 1),
            'fp_expert_count': int(rng.integers(95, 140)),
            'fp_ownership_proj': round(float(np.clip(proj / 60.0 + rng.normal(0, 0.03), 0.01, 0.55)), 3),
            '_pos': pos,
        })
    df = pd.DataFrame(rows)
    # Rank within position by projection (1 = best).
    df['fp_consensus_rank'] = (
        df.groupby('_pos')['fp_projection'].rank(ascending=False, method='min').astype(int)
    )
    return df[['player_name'] + FP_COLS]
