# backend/models/optimizer.py
import pulp
import pandas as pd
from typing import List, Optional


class LineupOptimizer:
    SALARY_CAP = 50000

    def optimize(self, players_df: pd.DataFrame, objective: str = 'ev',
                 locked: List[str] = None, excluded: List[str] = None,
                 max_ownership: Optional[float] = None) -> dict:

        df = players_df[players_df['projection'] > 0].copy()
        # Normalize team column (sample uses recent_team; some sources use team).
        if 'recent_team' not in df.columns and 'team' in df.columns:
            df['recent_team'] = df['team']
        if excluded:
            df = df[~df['player_name'].isin(excluded)]
        if max_ownership and objective == 'contrarian':
            df = df[df['projected_ownership'] <= max_ownership * 1.5]

        df = df.reset_index(drop=True)

        if objective == 'ev':
            df['opt_score'] = df['projection']
        elif objective == 'ceiling':
            df['opt_score'] = df['p90'] * 0.60 + df['projection'] * 0.40
        elif objective == 'contrarian':
            df['opt_score'] = (df['leverage_score'] * 0.50 +
                               df['projection'] * 0.30 +
                               (100 - df['projected_ownership']) * 0.20)

        prob = pulp.LpProblem("DK_NFL", pulp.LpMaximize)
        idx  = list(df.index)
        x    = pulp.LpVariable.dicts("p", idx, cat='Binary')

        prob += pulp.lpSum([df.loc[i, 'opt_score'] * x[i] for i in idx])
        prob += pulp.lpSum([df.loc[i, 'salary'] * x[i] for i in idx]) <= self.SALARY_CAP
        prob += pulp.lpSum([x[i] for i in idx]) == 9

        for pos, mn, mx in [('QB', 1, 1), ('RB', 2, 3), ('WR', 3, 4), ('TE', 1, 2), ('DST', 1, 1)]:
            pos_idx = df[df['position'] == pos].index
            prob += pulp.lpSum([x[i] for i in pos_idx]) >= mn
            prob += pulp.lpSum([x[i] for i in pos_idx]) <= mx

        if locked:
            for name in locked:
                for i in df[df['player_name'] == name].index:
                    prob += x[i] == 1

        # QB stack constraint: QB must have >=1 pass catcher from same team.
        for _, qb in df[df['position'] == 'QB'].iterrows():
            partners = df[(df['recent_team'] == qb.get('recent_team', '')) &
                          (df['position'].isin(['WR', 'TE'])) &
                          (df.index != qb.name)].index
            if len(partners) > 0:
                prob += pulp.lpSum([x[i] for i in partners]) >= x[qb.name]

        prob.solve(pulp.PULP_CBC_CMD(msg=0))

        if pulp.LpStatus[prob.status] != 'Optimal':
            return {'error': 'No optimal solution found', 'lineup': []}

        selected = [i for i in idx if x[i].value() == 1]
        lineup   = df.loc[selected]

        return {
            'objective': objective,
            'lineup': lineup.to_dict('records'),
            'total_salary': int(lineup['salary'].sum()),
            'salary_remaining': self.SALARY_CAP - int(lineup['salary'].sum()),
            'total_projection': round(float(lineup['projection'].sum()), 2),
            'avg_ownership': round(float(lineup['projected_ownership'].mean()), 1),
            'avg_leverage': round(float(lineup['leverage_score'].mean()), 1),
        }

    def build_all_lineups(self, df: pd.DataFrame) -> dict:
        return {
            'max_ev':       self.optimize(df, 'ev'),
            'high_ceiling': self.optimize(df, 'ceiling'),
            'chalkbreaker': self.optimize(df, 'contrarian', max_ownership=20),
        }
