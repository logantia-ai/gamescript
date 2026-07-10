# backend/models/slate_simulator.py
"""Slate-level simulator (Coordinator tier).

Runs many correlated slate iterations to estimate where a lineup finishes
against a simulated field. Lightweight reference implementation.
"""
import numpy as np
import pandas as pd


class SlateSimulator:
    def __init__(self, iterations: int = 5000):
        self.iterations = iterations

    def simulate_player_scores(self, df: pd.DataFrame) -> dict:
        """Return {player_name: array of simulated scores}."""
        scores = {}
        rng = np.random.default_rng(2025)
        vol = {'QB': 0.20, 'RB': 0.35, 'WR': 0.45, 'TE': 0.50, 'DST': 0.55}
        for _, p in df.iterrows():
            proj = max(0.0, float(p.get('projection', 0)))
            std = proj * vol.get(p.get('position', 'WR'), 0.4)
            scores[p['player_name']] = np.maximum(rng.normal(proj, std, self.iterations), 0)
        return scores

    def estimate_finish(self, lineup_players, df, field_size: int = 1000) -> dict:
        """Estimate a lineup's percentile finish vs a random field of `field_size`."""
        scores = self.simulate_player_scores(df)
        names = list(scores.keys())
        if not names:
            return {'error': 'no players'}

        lineup_total = np.zeros(self.iterations)
        for name in lineup_players:
            if name in scores:
                lineup_total += scores[name]

        # Build a crude field: each opponent = 9 random players' summed scores.
        idx = np.arange(len(names))
        field_best = np.full(self.iterations, -np.inf)
        for _ in range(min(field_size, 400)):  # cap for speed
            pick = np.random.choice(idx, size=9, replace=False)
            opp = np.zeros(self.iterations)
            for j in pick:
                opp += scores[names[j]]
            field_best = np.maximum(field_best, opp)

        beat = float(np.mean(lineup_total >= field_best))
        return {
            'mean_score': round(float(lineup_total.mean()), 1),
            'p90_score': round(float(np.percentile(lineup_total, 90)), 1),
            'win_probability_vs_field': round(beat * 100, 2),
            'iterations': self.iterations,
        }
