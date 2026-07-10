"""AirYards.com — WOPR, air yards market share, target share. Sample fallback."""
import numpy as np
import pandas as pd
from config import use_sample
from . import _sample


def scrape_air_yards():
    """Return per-pass-catcher receiving usage metrics keyed by player_name."""
    if not use_sample('air_yards'):
        try:
            # Live scrape would go here (airyards.com weekly tables).
            # Left as sample-by-default; flip SAMPLE_MODE=false + implement to enable.
            raise NotImplementedError('live air_yards scrape not implemented')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  air_yards live fetch unavailable ({e}); using sample data")
    return _sample_air_yards()


def _sample_air_yards():
    rng = np.random.default_rng(7)
    roster = _sample.base_roster()
    pass_catchers = roster[roster['position'].isin(['WR', 'TE'])]
    rows = []
    for _, p in pass_catchers.iterrows():
        depth = p['depth']
        # Target share decays down the depth chart; WR1/TE1 carry the load.
        base_ts = {1: 0.26, 2: 0.18, 3: 0.12, 4: 0.07}.get(depth, 0.05)
        ts = max(0.02, float(rng.normal(base_ts, 0.02)))
        ays = max(0.02, float(rng.normal(base_ts * 1.1, 0.03)))  # air yards share
        wopr = round(1.5 * ts + 0.7 * ays, 3)  # standard WOPR formula
        rows.append({
            'player_name': p['player_name'],
            'target_share': round(ts, 3),
            'air_yards_share': round(ays, 3),
            'wopr': wopr,
        })
    df = pd.DataFrame(rows)
    print(f"   ✅ air_yards: {len(df)} pass catchers (sample)")
    return df
