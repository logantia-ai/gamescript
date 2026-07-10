# backend/models/leverage_model.py
"""Leverage model.

Leverage = upside you capture relative to the field's exposure. High projection
with low ownership = high leverage. Runs before the Monte Carlo sim, so it uses
a projection-derived ceiling estimate rather than p90.
"""
import pandas as pd


class LeverageModel:

    def add_leverage(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        if df.empty:
            df['leverage_score'] = []
            df['leverage_tier'] = []
            return df

        proj = df['projection'].clip(lower=0)
        own = df['projected_ownership'].clip(lower=0.5)
        est_ceiling = proj * 1.6  # pre-sim ceiling proxy

        raw = est_ceiling / own  # upside per point of ownership
        score = (_minmax(raw) * 100).round(1)
        df['leverage_score'] = score.where(proj > 0, 0.0)

        df['leverage_tier'] = pd.cut(
            df['leverage_score'],
            bins=[-0.1, 45, 60, 75, 100.1],
            labels=['NEUTRAL', 'MODERATE', 'STRONG', 'ELITE'],
        ).astype(str)
        return df


def _minmax(s):
    lo, hi = s.min(), s.max()
    if hi == lo:
        return s * 0 + 0.5
    return (s - lo) / (hi - lo)
