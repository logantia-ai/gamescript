# Game Script — Backend

Python data pipeline + FastAPI server. Requires **Python 3.10+**.

## Setup

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

## Run the pipeline

```bash
python main.py            # full pipeline → backend/outputs/
python main.py 12345678   # with a DraftKings contest id (live salaries)
```

**Runs with zero keys.** Every ingestion source tries live data and falls back
to coherent sample data (`ingestion/_sample.py`) when a key is missing. Control
this with `SAMPLE_MODE` in `.env`: `auto` (default), `true`, or `false`.

Outputs written to `backend/outputs/`:
`master_dataset.csv`, `projections.csv`, `ownership.csv`, `leverage.csv`,
`simulations.csv`, `lineups.json`, `gto_lineups.json`, `slate_report.json`.

If `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` are set, results are also pushed to
Supabase (`player_projections`, `weekly_slates`); otherwise that step is skipped.

## Run the API server

```bash
uvicorn api.server:app --reload --port 8000
```

Endpoints (all degrade to mock when keys are absent — matching the frontend):

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/claude` | Claude proxy — keeps the API key server-side |
| POST | `/api/checkout` | Stripe checkout session |
| POST | `/api/webhook` | Stripe webhook (TODO: sync `profiles.tier`) |
| GET | `/api/projections?position=WR` | Read `projections.csv` |
| GET | `/api/slate` | Read `slate_report.json` |
| GET | `/api/lineups` / `/api/gto` | Read optimizer / GTO output |
| GET | `/api/health` | Key/capability status |

Point the frontend at it with `VITE_API_BASE_URL=http://localhost:8000`.

## Pipeline stages

```
ingestion/ → master dataset → ProjectionEngine → OwnershipModel → LeverageModel
          → SimulationEngine (Monte Carlo) → LineupOptimizer (PuLP, 3 lineups)
          → GTOEngine → OpponentModel → slate report → (Supabase)
```

## Environment

Reads the **root** `.env` (and a backend-local `.env` if present). See
`../.env.example` style keys: `ANTHROPIC_API_KEY`, `ODDS_API_KEY`,
`OPENWEATHER_API_KEY`, `APIFY_API_TOKEN`, `SUPABASE_*`, `STRIPE_*`,
`CURRENT_SEASON`, `CURRENT_WEEK`, `SAMPLE_MODE`.

> **Note:** In sample mode the synthetic roster spans 12 teams / 6 games with
> 4 weeks of generated history, so projections are illustrative — not real Week 1
> data. Provide keys (or a DK contest id) for live numbers.
```
