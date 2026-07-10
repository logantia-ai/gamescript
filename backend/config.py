# backend/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Load the root .env (one level up from backend/), then a backend-local .env if present.
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / '.env')
load_dotenv(Path(__file__).resolve().parent / '.env')

# ---- Season / week ----------------------------------------------------------
CURRENT_SEASON = int(os.getenv('CURRENT_SEASON', '2025'))
CURRENT_WEEK = int(os.getenv('CURRENT_WEEK', '1'))  # UPDATE THIS EVERY WEEK

# ---- Keys -------------------------------------------------------------------
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
ODDS_API_KEY = os.getenv('ODDS_API_KEY')
APIFY_API_TOKEN = os.getenv('APIFY_API_TOKEN')
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

# Stripe price IDs (override with real ones from your Stripe dashboard).
STRIPE_PRICES = {
    'sharp_monthly': os.getenv('STRIPE_PRICE_SHARP_MONTHLY', 'price_SHARP_MONTHLY'),
    'sharp_annual': os.getenv('STRIPE_PRICE_SHARP_ANNUAL', 'price_SHARP_ANNUAL'),
    'coordinator_monthly': os.getenv('STRIPE_PRICE_COORD_MONTHLY', 'price_COORD_MONTHLY'),
    'coordinator_annual': os.getenv('STRIPE_PRICE_COORD_ANNUAL', 'price_COORD_ANNUAL'),
    'creator_license': os.getenv('STRIPE_PRICE_CREATOR', 'price_CREATOR_MONTHLY'),
}

# Reverse map: price id -> tier, so webhooks can resolve a tier from a price.
PRICE_TIER = {
    STRIPE_PRICES['sharp_monthly']: 'sharp',
    STRIPE_PRICES['sharp_annual']: 'sharp',
    STRIPE_PRICES['coordinator_monthly']: 'coordinator',
    STRIPE_PRICES['coordinator_annual']: 'coordinator',
    STRIPE_PRICES['creator_license']: 'creator',
}

# When true, ingestion modules skip live fetches and emit realistic sample data
# so the whole pipeline runs with no keys / no network. Forced on if a module's
# required key is missing.
SAMPLE_MODE = os.getenv('SAMPLE_MODE', 'auto')  # 'auto' | 'true' | 'false'

def use_sample(required_key=None):
    """Decide whether a given ingestion step should use sample data."""
    if SAMPLE_MODE == 'true':
        return True
    if SAMPLE_MODE == 'false':
        return False
    # auto: sample when the required key is absent
    return required_key is None or not required_key

# ---- Capability flags -------------------------------------------------------
SUPABASE_ENABLED = bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)
ANTHROPIC_ENABLED = bool(ANTHROPIC_API_KEY)
STRIPE_ENABLED = bool(STRIPE_SECRET_KEY)

# ---- Platform / scoring -----------------------------------------------------
PLATFORM = 'draftkings'
SALARY_CAP = 50000
SCORING = 'half_ppr'
SCRAPE_DELAY = 2.5
TIMEOUT = 10

# ---- Paths ------------------------------------------------------------------
OUTPUTS_DIR = Path(__file__).resolve().parent / 'outputs'
OUTPUTS_DIR.mkdir(exist_ok=True)

def out(name):
    return str(OUTPUTS_DIR / name)

# ---- Stadiums ---------------------------------------------------------------
DOME_TEAMS = ['IND', 'MIN', 'DET', 'LV', 'LAC', 'LAR', 'ARI', 'DAL', 'ATL', 'NO', 'HOU']

OUTDOOR_STADIUMS = {
    'BUF': {'lat': 42.7738, 'lon': -78.7870},
    'NE':  {'lat': 42.0909, 'lon': -71.2643},
    'NYJ': {'lat': 40.8135, 'lon': -74.0745},
    'NYG': {'lat': 40.8135, 'lon': -74.0745},
    'PHI': {'lat': 39.9008, 'lon': -75.1675},
    'PIT': {'lat': 40.4468, 'lon': -80.0158},
    'CLE': {'lat': 41.5061, 'lon': -81.6995},
    'BAL': {'lat': 39.2780, 'lon': -76.6227},
    'CIN': {'lat': 39.0955, 'lon': -84.5160},
    'TEN': {'lat': 36.1665, 'lon': -86.7713},
    'JAX': {'lat': 30.3239, 'lon': -81.6373},
    'CHI': {'lat': 41.8623, 'lon': -87.6167},
    'GB':  {'lat': 44.5013, 'lon': -88.0622},
    'KC':  {'lat': 39.0489, 'lon': -94.4839},
    'DEN': {'lat': 39.7439, 'lon': -105.0201},
    'SF':  {'lat': 37.4032, 'lon': -121.9698},
    'SEA': {'lat': 47.5952, 'lon': -122.3316},
    'WAS': {'lat': 38.9076, 'lon': -76.8645},
    'CAR': {'lat': 35.2258, 'lon': -80.8528},
    'TB':  {'lat': 27.9759, 'lon': -82.5033},
    'MIA': {'lat': 25.9580, 'lon': -80.2389},
}
