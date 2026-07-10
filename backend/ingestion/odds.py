"""The-Odds-API — Vegas lines & implied totals (free tier)."""
import requests
import pandas as pd
from config import ODDS_API_KEY, TIMEOUT, use_sample
from . import _sample

ODDS_URL = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds'


def get_nfl_odds():
    """Return one row per game with implied totals. Live via The-Odds-API, else sample."""
    if not use_sample(ODDS_API_KEY):
        try:
            resp = requests.get(
                ODDS_URL,
                params={'apiKey': ODDS_API_KEY, 'regions': 'us',
                        'markets': 'spreads,totals', 'oddsFormat': 'american'},
                timeout=TIMEOUT,
            )
            resp.raise_for_status()
            rows = _parse_odds(resp.json())
            if rows:
                df = pd.DataFrame(rows)
                print(f"   ✅ odds: {len(df)} games (live)")
                return df
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  odds live fetch failed ({e}); using sample data")
    return _sample_odds()


def _parse_odds(games):
    rows = []
    for g in games:
        home, away = g.get('home_team'), g.get('away_team')
        total, home_spread = None, None
        for book in g.get('bookmakers', []):
            for mkt in book.get('markets', []):
                if mkt['key'] == 'totals' and mkt['outcomes']:
                    total = mkt['outcomes'][0].get('point')
                if mkt['key'] == 'spreads':
                    for o in mkt['outcomes']:
                        if o.get('name') == home:
                            home_spread = o.get('point')
            if total is not None and home_spread is not None:
                break
        if total is None:
            continue
        hs = home_spread or 0
        rows.append({
            'home_team': home, 'away_team': away, 'game_total': total, 'spread': hs,
            'home_implied_total': round(total / 2 - hs / 2, 1),
            'away_implied_total': round(total / 2 + hs / 2, 1),
        })
    return rows


def _sample_odds():
    rows = []
    for (home, away), line in _sample.GAME_LINES.items():
        t, hs = line['total'], line['home_spread']
        rows.append({
            'home_team': home, 'away_team': away, 'game_total': t, 'spread': hs,
            'home_implied_total': round(t / 2 - hs / 2, 1),
            'away_implied_total': round(t / 2 + hs / 2, 1),
        })
    df = pd.DataFrame(rows)
    print(f"   ✅ odds: {len(df)} games (sample)")
    return df
