"""
Shared sample-data generator.

When live sources aren't available (no keys / no network), every ingestion
module draws from this single coherent roster so the resulting master dataset
is internally consistent (same players, teams, and matchups everywhere).

Deterministic: seeded RNG → identical output every run.
"""
import numpy as np
import pandas as pd

# Six games / twelve teams — enough variety for the optimizer's stacking rules.
GAMES = [
    ('BUF', 'MIA'), ('SF', 'SEA'), ('DET', 'GB'),
    ('DAL', 'PHI'), ('KC', 'LV'), ('BAL', 'CIN'),
]

# (games, totals, spreads) — sample Vegas lines per matchup.
GAME_LINES = {
    ('BUF', 'MIA'): {'total': 49.5, 'home_spread': -2.5},
    ('SF', 'SEA'): {'total': 44.0, 'home_spread': -6.5},
    ('DET', 'GB'): {'total': 48.0, 'home_spread': -3.0},
    ('DAL', 'PHI'): {'total': 46.5, 'home_spread': 1.5},
    ('KC', 'LV'): {'total': 42.5, 'home_spread': -9.5},
    ('BAL', 'CIN'): {'total': 50.5, 'home_spread': -3.5},
}

# Roster shape per team.
ROSTER = [('QB', 1), ('RB', 3), ('WR', 4), ('TE', 2), ('DST', 1)]

# Position baselines: (mean fantasy pts, volatility) for the WEEK 1 depth player.
_BASE = {'QB': (17.0, 5.0), 'RB': (11.0, 5.0), 'WR': (10.5, 5.5), 'TE': (7.5, 4.0), 'DST': (7.0, 3.5)}

_HISTORY_WEEKS = 4  # synthetic prior weeks for season/last-3 averages


def _rng():
    return np.random.default_rng(20250915)


def teams():
    return [t for g in GAMES for t in g]


def base_roster():
    """One row per player with identity + static talent multiplier."""
    rng = _rng()
    rows = []
    for team in teams():
        for pos, n in ROSTER:
            for depth in range(1, n + 1):
                # Depth-1 players are stars; talent decays down the depth chart.
                talent = {1: 1.55, 2: 1.1, 3: 0.85, 4: 0.7}.get(depth, 0.6)
                if pos == 'DST':
                    talent = 1.0
                name = f"{team} {pos}{depth}" if pos != 'DST' else f"{team} DST"
                rows.append({
                    'player_id': f"{team}-{pos}-{depth}",
                    'player_name': name,
                    'player_display_name': name,
                    'recent_team': team,
                    'position': pos,
                    'depth': depth,
                    '_talent': float(talent),
                    '_jitter': float(rng.normal(1.0, 0.08)),
                })
    return pd.DataFrame(rows)


def weekly_stats():
    """nflverse-style weekly fantasy points across several synthetic weeks."""
    rng = _rng()
    roster = base_roster()
    rows = []
    for _, p in roster.iterrows():
        mean, vol = _BASE[p['position']]
        center = mean * p['_talent'] * p['_jitter']
        for wk in range(1, _HISTORY_WEEKS + 1):
            pts = max(0.0, float(rng.normal(center, vol)))
            rows.append({
                'player_id': p['player_id'],
                'player_name': p['player_name'],
                'player_display_name': p['player_display_name'],
                'recent_team': p['recent_team'],
                'position': p['position'],
                'week': wk,
                'fantasy_points_ppr': round(pts, 2),
            })
    return pd.DataFrame(rows)


def snap_counts():
    roster = base_roster()
    out = []
    for _, p in roster.iterrows():
        pos, depth = p['position'], p['depth']
        if pos == 'QB':
            snap = 0.99
        elif pos == 'DST':
            snap = 1.0
        elif pos == 'RB':
            snap = {1: 0.68, 2: 0.42, 3: 0.22}.get(depth, 0.15)
        elif pos == 'WR':
            snap = {1: 0.92, 2: 0.84, 3: 0.66, 4: 0.40}.get(depth, 0.3)
        else:  # TE
            snap = {1: 0.82, 2: 0.45}.get(depth, 0.3)
        out.append({'player_id': p['player_id'], 'snap_pct': round(snap, 3)})
    return pd.DataFrame(out)


def implied_totals():
    """team -> implied total derived from sample game lines."""
    totals = {}
    for (home, away), line in GAME_LINES.items():
        t, hs = line['total'], line['home_spread']
        home_total = t / 2 - hs / 2
        away_total = t / 2 + hs / 2
        totals[home] = round(home_total, 1)
        totals[away] = round(away_total, 1)
    return totals
