"""PFF / defensive matchup grades. Optional enrichment, sample fallback."""
import numpy as np
import pandas as pd
from config import use_sample
from . import _sample


def get_matchup_grades():
    """Return per-team defensive grades vs each position (sample fallback)."""
    if not use_sample('pff'):
        try:
            raise NotImplementedError('live PFF grades require a subscription/scrape')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  PFF unavailable ({e}); using sample data")

    rng = np.random.default_rng(53)
    rows = []
    for team in _sample.teams():
        rows.append({
            'team': team,
            'pass_def_rank': int(rng.integers(1, 33)),
            'rush_def_rank': int(rng.integers(1, 33)),
            'vs_wr_grade': round(float(rng.normal(65, 12)), 1),
            'vs_te_grade': round(float(rng.normal(65, 12)), 1),
            'vs_rb_grade': round(float(rng.normal(65, 12)), 1),
        })
    df = pd.DataFrame(rows)
    print(f"   ✅ pff_matchups: {len(df)} teams (sample)")
    return df
