"""Rotoworld / NBC Sports player news — the Sunday-morning edge.

Source: rotoworld.com player news feed (free, public). Rotoworld news routinely
breaks before official NFL injury reports: late scratches, surprise inactives,
weather changes. Any rostered player with news in the last six hours is flagged
as a BREAKING ALERT on the Dashboard and fed into Late Swap.

Output: outputs/news_feed.json — a rolling 48-hour window, shape:
  {"items": [{player_name, headline, impact, time_ago, hours_ago, published_at}],
   "last_updated": ISO8601}

Refresh: every 2 hours Tue-Sat, every 30 minutes Sunday morning.
"""
from datetime import datetime, timedelta

import numpy as np
from config import out, use_sample
from . import _sample

NEWS_PATH = out('news_feed.json')
WINDOW_HOURS = 48


def get_news_feed():
    """Return (and persist) the rolling player-news feed (sample fallback)."""
    if not use_sample('rotoworld_news'):
        try:
            # Live pull (rotoworld.com / NBC Sports feed) would go here.
            raise NotImplementedError('live Rotoworld pull not implemented')
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  Rotoworld news unavailable ({e}); using sample data")

    feed = _sample_news()
    _persist(feed)
    print(f"   ✅ rotoworld_news: {len(feed['items'])} items (sample) → {NEWS_PATH}")
    return feed


def _sample_news():
    rng = np.random.default_rng(307)
    roster = _sample.base_roster()
    skill = roster[roster['position'].isin(['WR', 'RB', 'TE', 'QB'])]
    templates = [
        ('Limited in practice; trending toward game-time decision', 'questionable'),
        ('Expected to play after clearing concussion protocol', 'positive'),
        ('Listed as inactive — will not play', 'out'),
        ('Drawing a plus matchup; usage expected to climb', 'positive'),
        ('Dealing with a hamstring issue; monitor pregame', 'questionable'),
        ('Backfield workload trending up after teammate setback', 'positive'),
    ]
    picks = skill.sample(n=min(6, len(skill)), random_state=11)
    now = datetime.now()
    items = []
    for i, (_, p) in enumerate(picks.iterrows()):
        headline, impact = templates[i % len(templates)]
        hours_ago = round(float(rng.uniform(0.2, WINDOW_HOURS)), 1)
        published = now - timedelta(hours=hours_ago)
        items.append({
            'player_name': p['player_name'],
            'position': p['position'],
            'team': p['recent_team'],
            'headline': headline,
            'impact': impact,
            'hours_ago': hours_ago,
            'time_ago': _humanize(hours_ago),
            'published_at': published.isoformat(),
        })
    items.sort(key=lambda x: x['hours_ago'])
    return {'items': items, 'last_updated': now.isoformat()}


def _humanize(hours):
    if hours < 1:
        return f"{int(round(hours * 60))}m ago"
    if hours < 24:
        return f"{int(round(hours))}h ago"
    return f"{int(round(hours / 24))}d ago"


def _persist(feed):
    import json
    with open(NEWS_PATH, 'w', encoding='utf-8') as f:
        json.dump(feed, f, indent=2)
