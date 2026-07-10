# backend/models/projection_engine.py
import pandas as pd
import numpy as np


class ProjectionEngine:

    WEIGHTS = {
        'season_avg': 0.40,
        'last3_avg':  0.25,
        'snap_share': 0.20,
        'implied_total': 0.15,
    }

    IMPLIED_SCALE = {
        'QB': 1.8, 'RB': 0.9, 'WR': 0.7, 'TE': 0.5, 'DST': 0.4,
    }

    def project_player(self, player: dict) -> dict:
        pos = player.get('position', 'WR')

        season_component = player.get('season_avg', 12) * self.WEIGHTS['season_avg']
        last3_component  = player.get('last3_avg', 12)  * self.WEIGHTS['last3_avg']

        snap_pct = player.get('snap_pct', 0.65)
        snap_component = (snap_pct / 0.65) * player.get('season_avg', 12) * self.WEIGHTS['snap_share']

        implied = player.get('team_implied_total', 23)
        scale = self.IMPLIED_SCALE.get(pos, 0.7)
        vegas_component = implied * scale * self.WEIGHTS['implied_total']

        base = season_component + last3_component + snap_component + vegas_component

        modifier = 1.0
        notes = []

        status = str(player.get('injury_status', 'Active')).lower()
        if status == 'out':
            return {**player, 'projection': 0, 'confidence_label': 'OUT'}
        elif status == 'doubtful':
            modifier *= 0.25; notes.append('Doubtful (-75%)')
        elif status == 'questionable':
            modifier *= 0.88; notes.append('Questionable (-12%)')

        weather_mod = player.get('weather_modifier', 1.0)
        if weather_mod < 1.0:
            modifier *= weather_mod
            notes.append(f"Weather: {player.get('weather_note', '')}")

        target_share = player.get('target_share', 0) or 0
        if pos in ['WR', 'TE'] and target_share >= 0.25:
            modifier *= 1.08; notes.append(f'High target share: {target_share:.0%}')
        elif pos in ['WR', 'TE'] and target_share >= 0.20:
            modifier *= 1.04; notes.append(f'Solid target share: {target_share:.0%}')

        wopr = player.get('wopr', 0) or 0
        if pos in ['WR', 'TE'] and wopr >= 0.50:
            modifier *= 1.06; notes.append(f'Elite WOPR: {wopr:.2f}')

        grade = player.get('athleticism_grade', 'AVERAGE')
        speed = player.get('speed_score', 0) or 0
        dominator = player.get('dominator_rating', 0) or 0
        if grade == 'ELITE' or (speed >= 105 and dominator >= 30):
            modifier *= 1.05; notes.append('Elite athleticism')

        # ---- Advanced tracking & market signals (Session 2) ----------------
        # PASS RATE OVER EXPECTED — pass-heavy teams feed pass catchers; run-heavy feed RBs.
        proe = player.get('team_proe', 0) or 0
        if pos in ['WR', 'TE'] and proe >= 0.05:
            modifier *= 1.04; notes.append(f'Pass-heavy team (PROE: +{proe:.0%})')
        elif pos == 'RB' and proe <= -0.05:
            modifier *= 1.04; notes.append(f'Run-heavy team (PROE: {proe:.0%})')

        # DVOA MATCHUP — opponent-adjusted defensive strength (replaces raw matchup grade).
        dvoa = player.get(f'def_dvoa_vs_{pos.lower()}', 0) or 0
        if dvoa <= -0.15:
            modifier *= 1.08; notes.append(f'Elite matchup (DVOA: {dvoa:.0%})')
        elif dvoa <= 0:
            modifier *= 1.03; notes.append(f'Good matchup (DVOA: {dvoa:.0%})')
        elif dvoa >= 0.15:
            modifier *= 0.95; notes.append(f'Tough matchup (DVOA: {dvoa:.0%})')

        # SEPARATION SCORE — among the most predictive ceiling signals.
        separation = player.get('separation_score', 0) or 0
        if pos in ['WR', 'TE'] and separation >= 2.5:
            modifier *= 1.05; notes.append(f'Elite separation: {separation:.1f}')

        # RED ZONE OPPORTUNITY SHARE — best single TD predictor.
        rz_share = player.get('rz_opportunity_share', 0) or 0
        if pos in ['WR', 'TE'] and rz_share >= 0.30:
            modifier *= 1.08; notes.append(f'Red zone threat: {rz_share:.0%} share')
        elif pos == 'RB' and rz_share >= 0.50:
            modifier *= 1.12; notes.append(f'Goal line back: {rz_share:.0%} carry share')

        # ROUTE PARTICIPATION — limited route runners cap usage.
        route_pct = player.get('route_participation_rate', 0.70)
        route_pct = 0.70 if route_pct is None else route_pct
        if pos in ['WR', 'TE'] and route_pct < 0.60:
            modifier *= 0.90; notes.append(f'Limited routes: {route_pct:.0%}')

        # SHARP MONEY — reverse line movement on the game total.
        sharp_signal = player.get('sharp_signal', False)
        total_movement = player.get('total_movement', 0) or 0
        if sharp_signal and total_movement > 1.5:
            modifier *= 1.03; notes.append('Sharp money signal on game total')

        # EPA — value created beyond raw box score (nflfastR).
        epa = player.get('epa_per_play', 0) or 0
        if epa >= 0.15:
            modifier *= 1.04; notes.append(f'High EPA: {epa:.2f}')
        elif epa <= -0.10:
            modifier *= 0.97; notes.append(f'Negative EPA: {epa:.2f}')

        projection = base * modifier

        # CONSENSUS CROSS-REFERENCE — blend 80% our model + 20% expert consensus,
        # and flag wide divergence for the Scout Report.
        consensus = player.get('consensus_projection', 0) or 0
        if consensus > 0:
            gap = (projection - consensus) / consensus
            if abs(gap) > 0.25:
                notes.append(f'{abs(gap):.0%} divergence from expert consensus')
            projection = (projection * 0.80) + (consensus * 0.20)

        # ADP DIVERGENCE — Underdog season-long money vs DFS price.
        adp_div = player.get('adp_vs_salary_divergence', 0) or 0
        if adp_div >= 10:
            notes.append(f'Market undervaluing vs DFS price (ADP div: +{adp_div:.0f})')
        elif adp_div <= -10:
            notes.append(f'DFS price ahead of market — possible trap (ADP div: {adp_div:.0f})')

        salary = player.get('salary', 6000) or 6000
        efficiency = (projection / salary) * 1000

        data_points = sum([1 if player.get(k) else 0 for k in
            ['season_avg', 'last3_avg', 'snap_pct', 'team_implied_total',
             'target_share', 'speed_score', 'injury_status']])
        confidence_pct = int((data_points / 7) * 100)
        confidence_label = 'HIGH' if confidence_pct >= 85 else 'MEDIUM' if confidence_pct >= 60 else 'LOW'

        return {
            **player,
            'projection': round(projection, 2),
            'base_projection': round(base, 2),
            'modifier': round(modifier, 3),
            'modifier_notes': ' | '.join(notes) if notes else 'No significant modifiers',
            'salary_efficiency': round(efficiency, 2),
            'confidence_pct': confidence_pct,
            'confidence_label': confidence_label,
        }

    def project_all(self, df: pd.DataFrame) -> pd.DataFrame:
        projections = [self.project_player(row.to_dict()) for _, row in df.iterrows()]
        return pd.DataFrame(projections).sort_values('projection', ascending=False).reset_index(drop=True)
