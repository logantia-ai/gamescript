# Game Script — Frontend

Vite + React SPA. **Read the script. Win the slate.**

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Data sources

The data hooks (`useSlateData`, `usePlayerData`) resolve in this order, falling
through on failure or empty result:

1. **Supabase** — `weekly_slates` / `player_projections` (production store)
2. **FastAPI backend** — `/api/slate`, `/api/projections` from pipeline outputs
   (local dev; set `VITE_API_BASE_URL`, run `backend/main.py` + the server)
3. **Mock** — `src/lib/mockData.js`

Claude calls go through the backend (`/api/claude`); without a backend they
return a mock response. Each module shows a small badge indicating which source
it's reading from.

## Mock mode (default)

The app runs with **zero backend or keys** — it falls back to mock data and mock
Claude responses. You're auto-signed-in as a demo `sharp`-tier user.

To preview tier gating, edit `MOCK_PROFILE.tier` in `src/lib/mockData.js`
(`free` / `sharp` / `coordinator` / `creator`).

Copy `.env.example` → `.env` and fill in keys to use real services.

## Architecture

| Path | What |
| --- | --- |
| `src/lib/tiers.js` | Feature flags + tier resolution (`PaywallGate` source of truth) |
| `src/lib/{supabase,stripe,claude}.js` | Service clients, all hybrid (real ⟷ mock) |
| `src/hooks/` | `useAuth`, `useSubscription`, `useSlateData`, `usePlayerData`, `useRecord` |
| `src/components/ui/` | Brand-styled primitives (Button, Card, Table, Chart, PaywallGate, …) |
| `src/components/layout/` | Header (wordmark), Sidebar, BottomNav (shield badge), PageWrapper |
| `src/components/modules/` | All 18 modules + `registry.js` (drives nav + routing) |
| `src/pages/` | Landing, Login, Register, Onboarding, Pricing, Account, App shell |

### Brand assets

Drop `GS_Shield.png`, `GS_Name.png`, `GS_Crest.png` into `public/assets/`
(see that folder's README). Until then the `<img>` tags show alt text.

## Build status

| State | Modules |
| --- | --- |
| Interactive (Claude/Supabase wired) | Dashboard, Sharp Report (+ The Tell), Scout Report, Film Room, Red Zone, The Coordinator, The Record |
| Scaffolded (nav + gating + spec outline) | Chalkbreaker, Sunday Mode, Stack Builder, Late Swap, Bankroll, Portfolio Builder, Contest IQ, Debrief, GTO Mode, Opponent Model, Bias Report, The Tell page |
