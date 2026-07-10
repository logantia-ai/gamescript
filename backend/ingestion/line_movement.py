"""Line movement & sharp-money signals.

Source: betlabs.com + The-Odds-API historical endpoint (free tier).
Reverse line movement — the line moving opposite to where the public is
betting — is the classic sharp-money tell. Sharp money on a game total
means the market expects more (or less) scoring than the public thinks.
Feeds the implied-total model as a confidence multiplier.

Output columns (keyed by team):
  line_movement_direction   'toward' | 'away' | 'flat' (vs the public side)
  public_bet_pct            share of public bets on this team (0–1)
  sharp_signal              bool — reverse line movement detected
  total_movement            over/under: current minus opening (pts)
"""
import numpy as np
import pandas as pd
from config import ODDS_API_KEY, use_sample
from . import _sample

LINE_COLS = ['line_movement_direction', 'public_bet_pct', 'sharp_signal', 'total_movement']


def get_line_movement(odds=None):
    """Return per-team line-movement signals (sample fallback)."""
    if not use_sample(ODDS_API_KEY):
        try:
            # Live pull (The-Odds-API historical + betlabs public %) would go here.
            raise NotImplementedError('live line-movement pull not implemented')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  line movement unavailable ({e}); using sample data")

    df = _sample_movement()
    print(f"   ✅ line_movement: {len(df)} teams (sample)")
    return df


def _sample_movement():
    rng = np.random.default_rng(101)
    rows = []
    # Decide per-game so the two sides of a matchup are internally consistent.
    for home, away in _sample.GAMES:
        public_home = float(np.clip(rng.normal(0.5, 0.18), 0.15, 0.85))
        total_move = round(float(rng.normal(0.0, 1.4)), 1)
        # Reverse line movement: line moves toward the LESS-bet side.
        line_moved_home = rng.random() > public_home  # more likely to move to underdog of betting
        sharp = abs(public_home - 0.5) >= 0.18 and (line_moved_home == (public_home < 0.5))
        for team, pub, moved_to in (
            (home, public_home, line_moved_home),
            (away, 1 - public_home, not line_moved_home),
        ):
            rows.append({
                'team': team,
                'line_movement_direction': 'toward' if moved_to else 'away',
                'public_bet_pct': round(pub, 3),
                'sharp_signal': bool(sharp),
                'total_movement': total_move,
            })
    return pd.DataFrame(rows)
