# backend/models/gto_engine.py
"""GTO engine (Coordinator tier).

Builds a lineup that's profitable regardless of how the field constructs —
balancing raw ceiling against ownership diversity — and scores how
game-theory-optimal it is, with field-scenario percentile estimates.
"""
import pandas as pd
from .optimizer import LineupOptimizer


class GTOEngine:
    def build_gto_lineup(self, df: pd.DataFrame) -> dict:
        opt = LineupOptimizer()
        # Ceiling objective balances upside; the field-scenario scoring below
        # rewards lineups that aren't over-exposed to chalk.
        res = opt.optimize(df, objective='ceiling')
        if res.get('error'):
            return res

        avg_own = res['avg_ownership']
        avg_lev = res['avg_leverage']

        # GTO score: high leverage + moderate (not extreme) ownership reads as
        # robust to many field compositions.
        own_penalty = abs(avg_own - 18) * 1.2  # ~18% avg = balanced
        gto_score = max(0, min(100, round(55 + (avg_lev - 50) * 0.6 - own_penalty, 1)))

        scenarios = [
            self._scenario('70% chalk field', avg_own, avg_lev, chalk=0.70),
            self._scenario('Balanced 50/50 field', avg_own, avg_lev, chalk=0.50),
            self._scenario('60% contrarian field', avg_own, avg_lev, chalk=0.40),
        ]

        return {
            'lineup': res['lineup'],
            'total_salary': res['total_salary'],
            'total_projection': res['total_projection'],
            'avg_ownership': avg_own,
            'avg_leverage': avg_lev,
            'gto_score': gto_score,
            'field_scenarios': scenarios,
        }

    @staticmethod
    def _scenario(name, avg_own, avg_lev, chalk):
        """Rough percentile-finish estimate under a given field composition."""
        # In a chalk-heavy field, lower ownership + higher leverage finishes better.
        edge = (avg_lev - 50) * 0.4 + (chalk - 0.5) * 60 * (1 if avg_own < 18 else -1)
        percentile = max(1, min(99, round(50 + edge)))
        return {'scenario': name, 'estimated_percentile_finish': percentile}
