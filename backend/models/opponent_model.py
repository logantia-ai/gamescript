# backend/models/opponent_model.py
"""Opponent / field model (Coordinator tier).

Estimates how the field will construct lineups: common stacks, player-pair
co-ownership, stack saturation by team, and differentiation opportunities.
"""
import pandas as pd


class OpponentModel:
    def build_field_model(self, df: pd.DataFrame) -> dict:
        df = df.copy()
        if 'recent_team' not in df.columns and 'team' in df.columns:
            df['recent_team'] = df['team']
        df = df[df['projection'] > 0]

        return {
            'common_constructions': self._common_constructions(df),
            'co_ownership': self._co_ownership(df),
            'stack_saturation': self._saturation(df),
            'differentiation_plays': self._differentiation(df),
        }

    def _common_constructions(self, df):
        qbs = df[df['position'] == 'QB'].sort_values('projected_ownership', ascending=False).head(3)
        out = []
        for _, qb in qbs.iterrows():
            mates = df[(df['recent_team'] == qb['recent_team']) &
                       (df['position'].isin(['WR', 'TE']))].sort_values('projected_ownership', ascending=False).head(2)
            # Field share ≈ product of marginal ownerships (rough independence proxy).
            share = qb['projected_ownership']
            for _, m in mates.iterrows():
                share = share * m['projected_ownership'] / 100
            out.append({
                'qb': qb['player_name'],
                'stack': mates['player_name'].tolist(),
                'estimated_field_pct': round(float(share), 1),
            })
        return out

    def _co_ownership(self, df):
        top = df.sort_values('projected_ownership', ascending=False).head(8)
        pairs = []
        names = top[['player_name', 'projected_ownership', 'recent_team']].to_dict('records')
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                a, b = names[i], names[j]
                co = round(a['projected_ownership'] * b['projected_ownership'] / 100, 1)
                if co >= 3:
                    pairs.append({
                        'pair': [a['player_name'], b['player_name']],
                        'estimated_co_ownership': co,
                        'implication': 'Common pairing — fading both adds leverage' if co >= 8 else 'Moderately paired',
                    })
        return sorted(pairs, key=lambda x: -x['estimated_co_ownership'])[:6]

    def _saturation(self, df):
        skill = df[df['position'].isin(['QB', 'RB', 'WR', 'TE'])]
        by_team = skill.groupby('recent_team')['projected_ownership'].sum().sort_values(ascending=False)
        out = []
        for team, total in by_team.items():
            if total >= 70:
                level = 'SATURATED'
            elif total >= 40:
                level = 'BALANCED'
            else:
                level = 'LEVERAGE'
            out.append({'team': team, 'total_ownership': round(float(total), 1), 'level': level})
        return out

    def _differentiation(self, df):
        diff = df[(df['projected_ownership'] <= 8) & (df['leverage_score'] >= 65)]
        diff = diff.sort_values('leverage_score', ascending=False).head(8)
        return diff[['player_name', 'position', 'projected_ownership', 'leverage_score']].to_dict('records')
