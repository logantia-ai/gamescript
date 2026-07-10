# GAME SCRIPT — SETUP CHECKLIST

Complete these steps to go live with real data. The whole stack runs with **no
keys at all** (every source falls back to coherent sample data), so you can build
and demo first, then wire real data when you're ready.

## API KEYS NEEDED

### Already have:
- [x] ANTHROPIC_API_KEY — set in environment

### Get these (all free):
- [ ] ODDS_API_KEY — https://the-odds-api.com → dashboard → API key
- [ ] APIFY_API_TOKEN — https://apify.com → settings → API & Integrations
- [ ] OPENWEATHER_API_KEY — https://openweathermap.org → API keys tab

### From your Stripe account:
- [ ] STRIPE_SECRET_KEY — https://dashboard.stripe.com → Developers → API keys
- [ ] STRIPE_WEBHOOK_SECRET — https://dashboard.stripe.com → Developers → Webhooks
  Create webhook pointing to: https://your-api-url.com/api/webhook
  Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted

### From your Supabase project:
- [ ] SUPABASE_URL — Project Settings → API → Project URL
- [ ] SUPABASE_ANON_KEY — Project Settings → API → anon public key
- [ ] SUPABASE_SERVICE_KEY — Project Settings → API → service_role key

## STRIPE PRODUCTS TO CREATE
In Stripe Dashboard → Products → Add product, then paste each price ID into
backend/config.py (or set the matching STRIPE_PRICE_* env vars):
- [ ] Sharp Monthly: $29/month → STRIPE_PRICE_SHARP_MONTHLY
- [ ] Sharp Annual: $199/year → STRIPE_PRICE_SHARP_ANNUAL
- [ ] Coordinator Monthly: $99/month → STRIPE_PRICE_COORD_MONTHLY
- [ ] Coordinator Annual: $699/year → STRIPE_PRICE_COORD_ANNUAL
- [ ] Creator License: $299/month → STRIPE_PRICE_CREATOR

## SUPABASE SETUP
- [ ] Run the SQL schema from GAMESCRIPT_FINAL_BUILD.md in Supabase SQL Editor
- [ ] Verify all 9 tables created: profiles, player_projections, weekly_slates,
      lineups, play_evaluations, weekly_debriefs, bias_profiles,
      bankroll_entries, portfolios

## FIRST REAL DATA RUN
After all keys are in .env:
- [ ] cd backend
- [ ] .venv\Scripts\activate
- [ ] python main.py
- [ ] Verify: outputs/master_dataset.csv has real player names
- [ ] Verify: outputs/slate_report.json has real implied totals
- [ ] Verify: outputs/news_feed.json has a player-news feed
- [ ] Start: uvicorn api.server:app --port 8000
- [ ] Verify: http://localhost:8000/api/health shows all services connected

## CSV IMPORT FIRST RUN
- [ ] Log into dailyfantasyfuel.com → download this week's DFS projections CSV
- [ ] Log into draftsharks.com → download this week's DFS projections CSV
- [ ] Log into profootballnetwork.com → download this week's DFS projections CSV
- [ ] Drop all three files into backend/csv_imports/ folder
- [ ] Run python main.py again
- [ ] Verify: consensus_projection column populated in outputs/projections.csv
- [ ] Verify: processed files moved to backend/csv_imports/processed/

## LOGO FILES
- [ ] Copy GS_Shield.png to frontend/public/assets/GS_Shield.png
- [ ] Copy GS_Name.png to frontend/public/assets/GS_Name.png
- [ ] Copy GS_Crest.png to frontend/public/assets/GS_Crest.png
- [ ] Run npm run dev → verify shield appears as browser tab icon

## LOCAL VERIFICATION
- [ ] npm run dev (frontend)
- [ ] uvicorn api.server:app --port 8000 (backend)
- [ ] Open http://localhost:5173
- [ ] Source badge shows "Live · Pipeline" (not "Sample data")
- [ ] Dashboard shows the BREAKING news alert from the Rotoworld feed
- [ ] Sharp Report generates real decisions from real data
- [ ] Register a test account → verify free tier limits work
- [ ] Upgrade to Sharp in Stripe test mode → verify tier changes + success banner

## DEPLOYMENT
### Frontend (Vercel):
- [ ] npm run build (verify clean build)
- [ ] vercel --prod
- [ ] Add env vars in Vercel dashboard:
      VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
      VITE_STRIPE_PUBLISHABLE_KEY, VITE_API_BASE_URL

### Backend (Railway — recommended):
- [ ] Create account at railway.app (free tier available)
- [ ] Connect GitHub repo
- [ ] Add all backend env vars in Railway dashboard
- [ ] Deploy — Railway auto-detects FastAPI
- [ ] Copy Railway URL → paste as VITE_API_BASE_URL in Vercel
- [ ] Redeploy Vercel with updated API URL

## WEEKLY WORKFLOW (once live)
TUESDAY:   Drop CSV files in csv_imports/ → python main.py
WEDNESDAY: python main.py (injury updates)
FRIDAY:    Drop updated CSVs → python main.py (final designations)
SATURDAY:  python main.py (weather + line movement)
SUNDAY AM: Monitor Rotoworld alerts in Dashboard
MONDAY:    Log results in The Record → Debrief auto-generates
