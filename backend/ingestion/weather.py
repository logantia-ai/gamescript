"""OpenWeather — outdoor game conditions → passing-game modifier."""
import requests
import pandas as pd
from config import (OPENWEATHER_API_KEY, OUTDOOR_STADIUMS, DOME_TEAMS,
                    TIMEOUT, use_sample)
from . import _sample

OWM_URL = 'https://api.openweathermap.org/data/2.5/weather'

# Sample wind (mph) for a couple of outdoor venues to exercise the modifier.
_SAMPLE_WIND = {'CHI': 18, 'BUF': 16, 'GB': 12, 'CLE': 9}


def _modifier(wind_mph):
    """15+ mph wind degrades passing; map to a multiplicative modifier + note."""
    if wind_mph >= 20:
        return 0.86, f'{wind_mph:.0f} mph wind — strong fade passing, shift to RBs'
    if wind_mph >= 15:
        return 0.91, f'{wind_mph:.0f} mph wind — shift to RBs'
    if wind_mph >= 10:
        return 0.97, f'{wind_mph:.0f} mph wind — minor passing drag'
    return 1.0, 'Normal'


def get_all_game_weather(odds):
    """Build a team -> weather modifier table for outdoor teams in this slate."""
    teams = _slate_teams(odds)
    rows = []
    live = not use_sample(OPENWEATHER_API_KEY)

    for team in teams:
        if team in DOME_TEAMS or team not in OUTDOOR_STADIUMS:
            rows.append({'team': team, 'weather_modifier': 1.0, 'weather_note': 'Dome / controlled'})
            continue
        wind = None
        if live:
            try:
                loc = OUTDOOR_STADIUMS[team]
                r = requests.get(OWM_URL, params={
                    'lat': loc['lat'], 'lon': loc['lon'],
                    'appid': OPENWEATHER_API_KEY, 'units': 'imperial',
                }, timeout=TIMEOUT)
                r.raise_for_status()
                wind = r.json().get('wind', {}).get('speed')
            except Exception:  # noqa: BLE001
                wind = None
        if wind is None:
            wind = _SAMPLE_WIND.get(team, 7)
        mod, note = _modifier(wind)
        rows.append({'team': team, 'weather_modifier': mod, 'weather_note': note})

    df = pd.DataFrame(rows)
    src = 'live' if live else 'sample'
    print(f"   ✅ weather: {len(df)} teams ({src})")
    return df


def _slate_teams(odds):
    if odds is not None and not odds.empty:
        return sorted(set(odds['home_team']).union(set(odds['away_team'])))
    return _sample.teams()
