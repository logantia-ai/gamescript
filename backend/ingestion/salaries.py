"""DraftKings salaries. Live via contest CSV/API; sample salaries otherwise."""
import numpy as np
import pandas as pd
from config import SALARY_CAP, use_sample
from . import _sample

# Position salary anchors (DK main slate scale). Calibrated so a full 9-player
# lineup (with the sample roster's talent spread) comfortably fits the $50k cap.
_SAL_BASE = {'QB': 4600, 'RB': 3800, 'WR': 3500, 'TE': 2600, 'DST': 2000}
_SAL_SPAN = {'QB': 3600, 'RB': 5000, 'WR': 5200, 'TE': 4200, 'DST': 1800}


def get_draftkings_salaries(contest_id=None):
    """Return player_name + salary. Live needs a DK contest export; sample otherwise."""
    if contest_id and not use_sample('salaries'):
        try:
            # A real implementation parses the DK contest 'DKSalaries.csv' export.
            raise NotImplementedError('live DK salary fetch not implemented')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  DK salary fetch unavailable ({e}); using sample salaries")
    return _sample_salaries()


def _sample_salaries():
    """Salary correlated to sample talent so value/efficiency is realistic."""
    rng = np.random.default_rng(31)
    roster = _sample.base_roster()
    rows = []
    for _, p in roster.iterrows():
        pos = p['position']
        base, span = _SAL_BASE[pos], _SAL_SPAN[pos]
        # Higher talent → higher salary, with a little noise. Round to nearest $100.
        frac = min(1.0, (p['_talent'] - 0.6) / (1.55 - 0.6)) if pos != 'DST' else 0.4
        sal = base + frac * span + rng.normal(0, 250)
        sal = int(round(max(_SAL_BASE[pos] * 0.8, min(sal, SALARY_CAP * 0.2)) / 100) * 100)
        rows.append({'player_name': p['player_name'], 'salary': sal})
    df = pd.DataFrame(rows)
    print(f"   ✅ salaries: {len(df)} players (sample)")
    return df
