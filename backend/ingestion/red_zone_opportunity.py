"""Red zone opportunity SHARE — the best single TD predictor.

Source: nflverse (extends the nflverse.py pull). Overall target/carry share
understates red-zone scoring: a WR seeing 35% of his team's red-zone targets
scores TDs far more often than his full-field share implies. This surfaces
the opportunity SHARE, which is the meaningful metric.

Output columns (keyed by player_name):
  rz_opportunity_share   share of team red-zone plays the player is involved in
  rz_target_share        share of team red-zone targets (receivers)
  rz_carry_share         share of team red-zone carries (RBs)
  end_zone_target_rate   share of targets thrown into the end zone
  goal_line_carry_rate   share of carries inside the 5

Modifier thresholds:
  rz_opportunity_share >= 0.30        red-zone threat (WR/TE)  +8%
  rz_target_share      >= 0.25 (TE)   red-zone TE              +10%
  rz_carry_share       >= 0.50 (RB)   goal-line back           +12%
"""
import numpy as np
import pandas as pd
from config import CURRENT_SEASON, use_sample
from . import _sample

RZ_COLS = ['rz_opportunity_share', 'rz_target_share', 'rz_carry_share',
           'end_zone_target_rate', 'goal_line_carry_rate']


def get_red_zone_opportunity():
    """Return per-player red-zone opportunity shares (sample fallback)."""
    if not use_sample('red_zone_opportunity'):
        try:
            df = _fetch_live()
            if df is not None and not df.empty:
                print(f"   ✅ red_zone_opportunity: {len(df)} players (live)")
                return df
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  red-zone live fetch failed ({e}); using sample data")

    df = _sample_red_zone()
    print(f"   ✅ red_zone_opportunity: {len(df)} players (sample)")
    return df


def _fetch_live():
    """Derive red-zone shares from nflverse play-by-play (yardline <= 20)."""
    import nfl_data_py as nfl

    pbp = nfl.import_pbp_data([CURRENT_SEASON], downcast=True)
    if pbp is None or pbp.empty or 'yardline_100' not in pbp.columns:
        return None
    rz = pbp[pbp['yardline_100'] <= 20]
    if rz.empty:
        return None

    rows = {}

    def _accumulate(group_col, name_col, share_key, team_totals):
        sub = rz.dropna(subset=[name_col])
        counts = sub.groupby([group_col, name_col]).size().reset_index(name='n')
        for _, r in counts.iterrows():
            team, name, n = r[group_col], r[name_col], r['n']
            denom = team_totals.get(team, 0) or 1
            rows.setdefault(name, {}).update({share_key: round(n / denom, 3)})

    if {'posteam', 'receiver_player_name', 'pass_attempt'}.issubset(rz.columns):
        tgt = rz[rz['pass_attempt'] == 1]
        team_tgt = tgt.groupby('posteam').size().to_dict()
        _accumulate('posteam', 'receiver_player_name', 'rz_target_share',
                    {k: v for k, v in team_tgt.items()})
    if {'posteam', 'rusher_player_name', 'rush_attempt'}.issubset(rz.columns):
        run = rz[rz['rush_attempt'] == 1]
        team_run = run.groupby('posteam').size().to_dict()
        _accumulate('posteam', 'rusher_player_name', 'rz_carry_share', team_run)

    if not rows:
        return None
    out = pd.DataFrame([{'player_name': k, **v} for k, v in rows.items()])
    out['rz_opportunity_share'] = out[['rz_target_share', 'rz_carry_share']].max(axis=1, skipna=True)
    for c in RZ_COLS:
        if c not in out.columns:
            out[c] = np.nan
    return out[['player_name'] + RZ_COLS]


def _sample_red_zone():
    rng = np.random.default_rng(149)
    roster = _sample.base_roster()
    skill = roster[roster['position'].isin(['WR', 'TE', 'RB'])]
    rows = []
    for _, p in skill.iterrows():
        pos, depth = p['position'], p['depth']
        if pos == 'RB':
            carry = {1: 0.55, 2: 0.28, 3: 0.12}.get(depth, 0.08)
            carry = float(np.clip(rng.normal(carry, 0.07), 0.02, 0.85))
            rows.append({
                'player_name': p['player_name'],
                'rz_opportunity_share': round(float(np.clip(carry + rng.normal(0.05, 0.03), 0.02, 0.9)), 3),
                'rz_target_share': round(float(np.clip(rng.normal(0.06, 0.03), 0.0, 0.2)), 3),
                'rz_carry_share': round(carry, 3),
                'end_zone_target_rate': round(float(np.clip(rng.normal(0.05, 0.03), 0.0, 0.2)), 3),
                'goal_line_carry_rate': round(float(np.clip(carry * rng.normal(0.9, 0.1), 0.0, 0.9)), 3),
            })
        else:  # WR / TE
            tshare_mean = {1: 0.28, 2: 0.18, 3: 0.10, 4: 0.06}.get(depth, 0.05)
            if pos == 'TE':
                tshare_mean += 0.04  # TEs are over-targeted in the red zone
            tshare = float(np.clip(rng.normal(tshare_mean, 0.05), 0.01, 0.55))
            rows.append({
                'player_name': p['player_name'],
                'rz_opportunity_share': round(tshare, 3),
                'rz_target_share': round(tshare, 3),
                'rz_carry_share': 0.0,
                'end_zone_target_rate': round(float(np.clip(rng.normal(0.18, 0.06), 0.02, 0.45)), 3),
                'goal_line_carry_rate': 0.0,
            })
    return pd.DataFrame(rows)
