# backend/models/simulation_engine.py
import numpy as np
import pandas as pd


class SimulationEngine:
    N = 1000

    VOLATILITY = {'QB': 0.20, 'RB': 0.35, 'WR': 0.45, 'TE': 0.50, 'DST': 0.55}
    TD_VALUES  = {'QB': 4.0,  'RB': 6.0,  'WR': 6.0,  'TE': 6.0,  'DST': 6.0}

    def simulate_player(self, player: dict) -> dict:
        projection = player.get('projection', 0)
        if projection == 0:
            return {**player, 'p10': 0, 'p25': 0, 'p50': 0, 'p75': 0, 'p90': 0, 'p99': 0,
                    'median': 0, 'ceiling': 0, 'floor': 0,
                    'boom_probability': 0, 'bust_probability': 0}

        pos = player.get('position', 'WR')
        std = projection * self.VOLATILITY.get(pos, 0.40)

        sims = np.random.normal(loc=projection, scale=std, size=self.N)

        td_prob = min(projection / 30, 0.40)
        td_val  = self.TD_VALUES.get(pos, 6.0)
        sims += np.random.binomial(1, td_prob, self.N) * td_val

        # Ceiling-spike probability: elite athletes, plus deep-target receivers
        # who separate (high aDOT + elite separation = explosive-play upside).
        spike_prob = 0.08 if player.get('athleticism_grade') == 'ELITE' else 0.0
        adot = player.get('adot', 0) or 0
        separation = player.get('separation_score') or player.get('target_separation', 0) or 0
        if pos in ('WR', 'TE') and adot >= 12 and separation >= 2.5:
            spike_prob += 0.03
        if spike_prob > 0:
            ceiling_hits = np.random.random(self.N) < spike_prob
            sims = np.where(ceiling_hits, sims * 1.8, sims)

        sims = np.maximum(sims, 0)
        p = np.percentile(sims, [10, 25, 50, 75, 90, 99])

        return {
            **player,
            'p10': round(p[0], 1),
            'p25': round(p[1], 1),
            'p50': round(p[2], 1),
            'median': round(p[2], 1),
            'p75': round(p[3], 1),
            'p90': round(p[4], 1),
            'p99': round(p[5], 1),
            'ceiling': round(p[5], 1),
            'floor':   round(p[0], 1),
            'boom_probability': round(float(np.mean(sims >= projection * 1.5)) * 100, 1),
            'bust_probability': round(float(np.mean(sims <= projection * 0.5)) * 100, 1),
        }

    def simulate_all(self, df: pd.DataFrame) -> pd.DataFrame:
        print(f"   Running {self.N} simulations for {len(df)} players...")
        return pd.DataFrame([self.simulate_player(row.to_dict()) for _, row in df.iterrows()])
