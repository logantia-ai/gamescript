"""Action Network — public betting percentages (sharp vs square money). Sample fallback."""
import numpy as np
import pandas as pd
from config import use_sample
from . import _sample


def get_betting_splits():
    """Return per-game bet % vs money % (sample fallback)."""
    if not use_sample('action_network'):
        try:
            raise NotImplementedError('live Action Network scrape not implemented')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  Action Network unavailable ({e}); using sample data")

    rng = np.random.default_rng(71)
    rows = []
    for home, away in _sample.GAMES:
        bet_pct = int(rng.integers(35, 66))
        money_pct = int(min(95, max(5, bet_pct + rng.integers(-20, 21))))
        rows.append({
            'home_team': home, 'away_team': away,
            'home_bet_pct': bet_pct, 'home_money_pct': money_pct,
            # Sharp signal: money% diverging from bet% = pros on one side.
            'sharp_side': home if money_pct - bet_pct >= 10 else (away if bet_pct - money_pct >= 10 else 'none'),
        })
    df = pd.DataFrame(rows)
    print(f"   ✅ action_network: {len(df)} games (sample)")
    return df
