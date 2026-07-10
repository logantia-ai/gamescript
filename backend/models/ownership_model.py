# backend/models/ownership_model.py
"""Projected ownership model.

Ownership tracks perceived value: raw projection + points-per-dollar, scaled
within the slate. Produces a believable 1–45% distribution.

Calibration: when a historical ownership archive exists
(outputs/historical_ownership.csv, written by ingestion.historical_ownership),
the model fits a per-position correction multiplier that minimizes the mean
absolute error between modeled and actual ownership, then reports the MAE.
"""
import os

import pandas as pd

from config import out


class OwnershipModel:

    POS_BIAS = {'QB': 0.9, 'RB': 1.1, 'WR': 1.0, 'TE': 0.85, 'DST': 0.7}

    def __init__(self, calibrate=True):
        # Per-position correction multipliers, learned from history if available.
        self.pos_calibration = {}
        self.calibration_report = {}
        if calibrate:
            self.calibrate()

    def _raw_ownership(self, proj, salary, position):
        """Core formula shared by scoring and calibration."""
        value = proj / (salary / 1000.0)
        score = 0.45 * _minmax(proj) + 0.55 * _minmax(value)
        bias = position.map(self.POS_BIAS).fillna(1.0)
        own = (1.5 + score * 40.0) * bias
        return own.where(proj > 0, 0.3)

    def add_ownership(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        if df.empty:
            df['projected_ownership'] = []
            return df

        proj = df['projection'].clip(lower=0)
        salary = df.get('salary', pd.Series([6000] * len(df), index=df.index)).clip(lower=2000)
        own = self._raw_ownership(proj, salary, df['position'])

        # Apply learned per-position calibration (1.0 = no correction).
        if self.pos_calibration:
            corr = df['position'].map(self.pos_calibration).fillna(1.0)
            own = (own * corr).where(proj > 0, 0.3)

        df['projected_ownership'] = own.round(1)
        return df

    def calibrate(self, path=None):
        """Fit per-position correction factors against the historical archive."""
        path = path or out('historical_ownership.csv')
        if not os.path.exists(path):
            return self.calibration_report
        try:
            hist = pd.read_csv(path)
        except Exception:  # noqa: BLE001
            return self.calibration_report
        needed = {'position', 'salary', 'actual_ownership', 'dfs_points'}
        if hist.empty or not needed.issubset(hist.columns):
            return self.calibration_report

        # Model the historical weeks with the SAME formula (scored within each
        # week so the min-max normalization matches live behavior).
        modeled = []
        for _, wk in hist.groupby(['season', 'week']):
            proj = wk['dfs_points'].clip(lower=0)
            salary = wk['salary'].clip(lower=2000)
            wk = wk.assign(_modeled=self._raw_ownership(proj, salary, wk['position']).values)
            modeled.append(wk)
        hist = pd.concat(modeled, ignore_index=True)

        report = {}
        for pos, grp in hist.groupby('position'):
            model_mean = grp['_modeled'].mean()
            actual_mean = grp['actual_ownership'].mean()
            factor = float(actual_mean / model_mean) if model_mean else 1.0
            factor = max(0.5, min(2.0, factor))  # guard against extreme corrections
            self.pos_calibration[pos] = round(factor, 3)
            mae_before = float((grp['_modeled'] - grp['actual_ownership']).abs().mean())
            mae_after = float((grp['_modeled'] * factor - grp['actual_ownership']).abs().mean())
            report[pos] = {'factor': round(factor, 3),
                           'mae_before': round(mae_before, 2),
                           'mae_after': round(mae_after, 2)}
        self.calibration_report = report
        if report:
            avg_after = sum(r['mae_after'] for r in report.values()) / len(report)
            print(f"   ✅ ownership calibrated against history (avg MAE {avg_after:.1f}%)")
        return report


def _minmax(s):
    lo, hi = s.min(), s.max()
    if hi == lo:
        return s * 0 + 0.5
    return (s - lo) / (hi - lo)
