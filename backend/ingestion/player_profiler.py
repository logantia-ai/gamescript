"""PlayerProfiler — athleticism layer (Speed Score, Burst, Dominator). Sample fallback."""
import numpy as np
import pandas as pd
from config import use_sample
from . import _sample


def build_athleticism_dataset(master=None):
    """Return per-player athleticism metrics keyed by player_name.

    Live path would scrape PlayerProfiler public pages (no account). Sample by default.
    """
    if not use_sample('player_profiler'):
        try:
            raise NotImplementedError('live PlayerProfiler scrape not implemented')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  PlayerProfiler unavailable ({e}); using sample data")
    return _sample_athleticism()


def _grade(speed, dominator, position):
    if position in ('WR', 'TE'):
        if speed >= 108 and dominator >= 32:
            return 'ELITE'
        if speed >= 100 or dominator >= 25:
            return 'GOOD'
        return 'AVERAGE'
    if position == 'RB':
        return 'ELITE' if speed >= 108 else 'GOOD' if speed >= 100 else 'AVERAGE'
    return 'AVERAGE'


def _sample_athleticism():
    rng = np.random.default_rng(99)
    roster = _sample.base_roster()
    skill = roster[roster['position'].isin(['RB', 'WR', 'TE'])]
    rows = []
    for _, p in skill.iterrows():
        # Stars trend more athletic.
        center = 95 + (p['_talent'] - 0.85) * 18
        speed = round(float(rng.normal(center, 6)), 1)
        burst = round(float(rng.normal(center, 7)), 1)
        dominator = round(max(0.0, float(rng.normal(18 + (p['_talent'] - 0.85) * 22, 6))), 1)
        rows.append({
            'player_name': p['player_name'],
            'speed_score': speed,
            'burst_score': burst,
            'dominator_rating': dominator,
            'athleticism_grade': _grade(speed, dominator, p['position']),
        })
    df = pd.DataFrame(rows)
    print(f"   ✅ player_profiler: {len(df)} athletes (sample)")
    return df
