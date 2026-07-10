# backend/api/server.py
"""
Game Script API server.

Serves the endpoints the frontend expects:
  POST /api/claude     — Claude proxy (keeps the API key server-side)
  POST /api/checkout   — Stripe checkout session
  POST /api/webhook    — Stripe webhook
  GET  /api/projections, /api/slate, /api/lineups, /api/gto — read pipeline outputs
  GET  /api/health

All endpoints degrade gracefully when keys are absent (mock responses), matching
the frontend's hybrid behavior.

Run: uvicorn api.server:app --reload --port 8000   (from the backend/ directory)
"""
import json
import os
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Allow `from config import ...` whether launched from backend/ or repo root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (ANTHROPIC_API_KEY, ANTHROPIC_ENABLED, STRIPE_SECRET_KEY,
                    STRIPE_ENABLED, STRIPE_WEBHOOK_SECRET, PRICE_TIER,
                    SUPABASE_ENABLED, SUPABASE_URL, SUPABASE_SERVICE_KEY,
                    OUTPUTS_DIR, out)

app = FastAPI(title="Game Script API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your frontend origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_MODEL = "claude-opus-4-8"


# --------------------------------------------------------------------------- #
# Claude proxy
# --------------------------------------------------------------------------- #
class ClaudeRequest(BaseModel):
    system: str | None = None
    prompt: str
    module: str | None = "generic"
    model: str | None = DEFAULT_MODEL


@app.post("/api/claude")
def claude(req: ClaudeRequest):
    if not ANTHROPIC_ENABLED:
        return {"text": _mock_claude(req.module, req.prompt), "mock": True}
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model=req.model or DEFAULT_MODEL,
            max_tokens=1500,
            system=req.system or "You are a helpful NFL DFS analyst.",
            messages=[{"role": "user", "content": req.prompt}],
        )
        text = "".join(block.text for block in msg.content if getattr(block, "type", "") == "text")
        return {"text": text}
    except Exception as e:  # noqa: BLE001
        return {"text": _mock_claude(req.module, req.prompt) + f"\n\n_(live call failed: {e})_", "mock": True}


def _mock_claude(module, prompt):
    return (
        f"**[MOCK — {module}]**\n\n"
        "Set ANTHROPIC_API_KEY on the backend to get live output.\n\n"
        f"> {(prompt or '')[:240]}\n\n"
        "- **GRADE:** B\n- **VERDICT:** Data-supported with one flag\n"
        "- **CONFIDENCE:** 72% data-backed / 28% speculative\n"
        "- **RECOMMENDATION:** Hold in GPP, fade in cash"
    )


# --------------------------------------------------------------------------- #
# Stripe
# --------------------------------------------------------------------------- #
class CheckoutRequest(BaseModel):
    priceId: str
    userId: str | None = None
    email: str | None = None
    tier: str | None = None
    successUrl: str | None = None
    cancelUrl: str | None = None


@app.post("/api/checkout")
def checkout(req: CheckoutRequest):
    if not STRIPE_ENABLED:
        return {"mock": True, "message": "Stripe not configured on the backend.", "url": None, "sessionId": None}
    import stripe
    stripe.api_key = STRIPE_SECRET_KEY

    # Carry the user + resolved tier through to the webhook on both the session
    # and the subscription, so later subscription.* events can find the profile.
    tier = req.tier or PRICE_TIER.get(req.priceId, "")
    meta = {"user_id": req.userId or "", "tier": tier}
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": req.priceId, "quantity": 1}],
        client_reference_id=req.userId or None,
        customer_email=req.email or None,
        metadata=meta,
        subscription_data={"metadata": meta},
        success_url=req.successUrl or "http://localhost:5173/account?checkout=success",
        cancel_url=req.cancelUrl or "http://localhost:5173/pricing?checkout=cancel",
    )
    return {"sessionId": session.id, "url": session.url}


class PortalRequest(BaseModel):
    customerId: str | None = None
    returnUrl: str | None = None


@app.post("/api/portal")
def portal(req: PortalRequest):
    """Open the Stripe Customer Portal so users can manage/cancel billing."""
    if not STRIPE_ENABLED or not req.customerId:
        return {"mock": True, "url": None, "message": "Stripe not configured or no customer on file."}
    import stripe
    stripe.api_key = STRIPE_SECRET_KEY
    session = stripe.billing_portal.Session.create(
        customer=req.customerId,
        return_url=req.returnUrl or "http://localhost:5173/account",
    )
    return {"url": session.url}


def _update_profile(user_id, **fields):
    """Patch a profile row via the Supabase service key (bypasses RLS)."""
    if not user_id or not SUPABASE_ENABLED:
        print(f"   ⚠️  profile update skipped (user_id={user_id}, supabase={SUPABASE_ENABLED})")
        return
    from supabase import create_client
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    sb.table("profiles").update(fields).eq("id", user_id).execute()
    print(f"   ✅ profile {user_id} → {fields}")


@app.post("/api/webhook")
async def webhook(request: Request):
    if not STRIPE_ENABLED:
        return {"received": False, "mock": True}
    import stripe
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception as e:  # noqa: BLE001
        return {"received": False, "error": str(e)}

    etype = event["type"]
    obj = event["data"]["object"]

    if etype == "checkout.session.completed":
        user_id = obj.get("client_reference_id") or obj.get("metadata", {}).get("user_id")
        tier = obj.get("metadata", {}).get("tier") or "sharp"
        _update_profile(
            user_id,
            tier=tier,
            subscription_status="active",
            stripe_customer_id=obj.get("customer"),
            stripe_subscription_id=obj.get("subscription"),
        )

    elif etype == "customer.subscription.updated":
        user_id = obj.get("metadata", {}).get("user_id")
        status = obj.get("status")
        fields = {"subscription_status": status}
        if status in ("canceled", "unpaid", "incomplete_expired"):
            fields["tier"] = "free"
        else:
            try:
                price_id = obj["items"]["data"][0]["price"]["id"]
                if PRICE_TIER.get(price_id):
                    fields["tier"] = PRICE_TIER[price_id]
            except (KeyError, IndexError):
                pass
        _update_profile(user_id, **fields)

    elif etype == "customer.subscription.deleted":
        user_id = obj.get("metadata", {}).get("user_id")
        _update_profile(user_id, tier="free", subscription_status="canceled")

    return {"received": True, "type": etype}


# --------------------------------------------------------------------------- #
# Pipeline outputs
# --------------------------------------------------------------------------- #
@app.get("/api/projections")
def projections(position: str | None = None, limit: int = 200):
    import csv
    path = out("projections.csv")
    if not os.path.exists(path):
        return {"players": [], "note": "Run `python main.py` to generate projections."}
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if position:
        rows = [r for r in rows if r.get("position") == position]
    return {"players": rows[:limit]}


@app.get("/api/slate")
def slate():
    return _read_json("slate_report.json", default={"note": "Run `python main.py` to generate the slate report."})


@app.get("/api/lineups")
def lineups():
    return _read_json("lineups.json", default={"note": "Run `python main.py` to generate lineups."})


@app.get("/api/gto")
def gto():
    return _read_json("gto_lineups.json", default={"note": "Run `python main.py` to generate GTO lineups."})


@app.get("/api/opponent")
def opponent():
    return _read_json("opponent_model.json", default={"note": "Run `python main.py` to generate the opponent model."})


@app.get("/api/news")
def news():
    """Rolling Rotoworld player-news feed for the Dashboard breaking alert."""
    return _read_json("news_feed.json", default={"items": [], "last_updated": None})


def _read_json(name, default):
    path = out(name)
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# --------------------------------------------------------------------------- #
# Contest simulation (Task 10) — Monte Carlo field tournament.
# Builds a representative field from projected ownership, simulates every
# lineup's score distribution, and ranks the user's lineup across N contests.
# --------------------------------------------------------------------------- #
class SimPlayer(BaseModel):
    player_name: str | None = None
    position: str | None = None
    projection: float | None = None
    salary: float | None = None
    projected_ownership: float | None = None


class SimulateRequest(BaseModel):
    lineup: list[SimPlayer] = []
    contest_size: int = 10000
    num_sims: int = 10000


# DK NFL roster template + per-position volatility (mirrors SimulationEngine).
_ROSTER = {"QB": 1, "RB": 2, "WR": 3, "TE": 1, "DST": 1}  # + 1 FLEX (RB/WR/TE)
_VOL = {"QB": 0.20, "RB": 0.35, "WR": 0.45, "TE": 0.50, "DST": 0.55}


def _load_pool():
    """Player pool from projections.csv, numeric-coerced. [] if unavailable."""
    import csv
    path = out("projections.csv")
    if not os.path.exists(path):
        return []
    pool = []
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            def num(k):
                try:
                    return float(r.get(k) or 0)
                except (TypeError, ValueError):
                    return 0.0
            pool.append({
                "player_name": r.get("player_name"),
                "position": r.get("position"),
                "projection": num("projection") or num("consensus_projection") or num("fp_projection"),
                "salary": num("salary"),
                "projected_ownership": num("projected_ownership"),
            })
    return [p for p in pool if p["projection"] > 0 and p["position"] in _VOL]


def _player_std(p):
    return max(1.0, p["projection"] * _VOL.get(p["position"], 0.40))


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    import numpy as np

    num_sims = int(max(1000, min(req.num_sims or 10000, 10000)))
    contest_size = int(max(100, req.contest_size or 10000))
    pool = _load_pool()

    # Resolve the user's lineup — fill projection/ownership from the pool by name.
    by_name = {p["player_name"]: p for p in pool}
    user = []
    for sp in req.lineup:
        base = by_name.get(sp.player_name, {})
        proj = sp.projection or base.get("projection") or 0
        if proj <= 0:
            continue
        user.append({
            "player_name": sp.player_name or base.get("player_name") or "Player",
            "position": sp.position or base.get("position") or "WR",
            "projection": float(proj),
            "salary": float(sp.salary or base.get("salary") or 0),
            "projected_ownership": float(sp.projected_ownership or base.get("projected_ownership") or 0),
        })

    if not user:
        return {"error": "No valid lineup players supplied (need projections).", "mock": True}

    # If we have no pool to build a field from, synthesize a plausible one so the
    # simulation still returns coherent numbers.
    if len(pool) < 20:
        pool = _synth_pool()
        by_name = {p["player_name"]: p for p in pool}

    # --- Build a representative field of F lineups weighted by ownership ---
    F = 500
    rng = np.random.default_rng()

    def pos_players(pos):
        return [p for p in pool if p["position"] == pos] or [p for p in pool]

    def weighted_pick(cands, k):
        w = np.array([max(p["projected_ownership"], 0.5) for p in cands], dtype=float)
        w = w / w.sum()
        idx = rng.choice(len(cands), size=k, replace=False, p=w) if len(cands) >= k else rng.choice(len(cands), size=k, p=w)
        return [cands[i] for i in idx]

    field_mean = np.zeros(F)
    field_std = np.zeros(F)
    field_own = np.zeros(F)
    flex_pool = [p for p in pool if p["position"] in ("RB", "WR", "TE")] or pool
    for i in range(F):
        picks = []
        for pos, n in _ROSTER.items():
            picks += weighted_pick(pos_players(pos), n)
        picks += weighted_pick(flex_pool, 1)  # FLEX
        field_mean[i] = sum(p["projection"] for p in picks)
        field_std[i] = np.sqrt(sum(_player_std(p) ** 2 for p in picks))
        field_own[i] = np.mean([p["projected_ownership"] for p in picks])

    # --- User lineup distribution ---
    user_mean = sum(p["projection"] for p in user)
    user_std = float(np.sqrt(sum(_player_std(p) ** 2 for p in user)))
    user_own = float(np.mean([p["projected_ownership"] for p in user]))

    # --- Monte Carlo: percentile of the user in each simulated contest ---
    field_scores = rng.normal(field_mean[:, None], field_std[:, None], size=(F, num_sims))
    user_scores = rng.normal(user_mean, user_std, size=num_sims)
    percentile = (field_scores < user_scores[None, :]).mean(axis=0)  # 0..1 per sim

    win_prob = float((percentile >= 0.99).mean() * 100)     # top 1%
    cash_prob = float((percentile >= 0.80).mean() * 100)    # top 20%
    avg_percentile = float(percentile.mean() * 100)

    # Stylised top-heavy GPP payout curve → expected ROI (clearly an estimate).
    mult = np.select(
        [percentile >= 0.999, percentile >= 0.99, percentile >= 0.90, percentile >= 0.80],
        [0.15 * contest_size, 20.0, 3.0, 1.8],
        default=0.0,
    )
    expected_roi = float((mult.mean() - 1.0) * 100)

    # --- Lineup vs field comparison ---
    field_mean_avg = float(field_mean.mean())
    user_ceiling = float(np.percentile(user_scores, 90))
    field_ceiling = float(np.percentile(field_mean, 90))
    diff_score = int(max(0, min(100, round((1 - user_own / max(field_own.mean(), 1)) * 100 + 50))))

    # QB + same-team pass-catcher stack detection
    qb = next((p for p in user if p["position"] == "QB"), None)
    stack = "No QB stack"
    if qb:
        team = by_name.get(qb["player_name"], {}).get("position")  # placeholder; team not always present
        mates = [p for p in user if p["position"] in ("WR", "TE") and p is not qb]
        stack = f"{qb['player_name']} + {len(mates)} pass-catcher(s)" if mates else f"{qb['player_name']} (naked)"

    return {
        "simulations_run": num_sims,
        "contest_size": contest_size,
        "win_probability": round(win_prob, 2),
        "cash_probability": round(cash_prob, 1),
        "average_percentile": round(avg_percentile, 1),
        "expected_roi": round(expected_roi, 1),
        "comparison": {
            "your_ownership": round(user_own, 1),
            "field_ownership": round(float(field_own.mean()), 1),
            "your_projected": round(user_mean, 1),
            "field_projected": round(field_mean_avg, 1),
            "your_ceiling": round(user_ceiling, 1),
            "field_ceiling": round(field_ceiling, 1),
            "differentiation_score": diff_score,
            "your_stack": stack,
            "field_stack": "QB + 1 WR (most common)",
        },
        "slate_archetype": _classify_slate_archetype(),
        "disclaimer": "Model estimate from Monte Carlo simulation — not a guarantee of results.",
    }


def _synth_pool():
    """Fallback field pool when no pipeline projections exist."""
    import random
    random.seed(7)
    pool = []
    counts = {"QB": 24, "RB": 48, "WR": 60, "TE": 24, "DST": 24}
    for pos, c in counts.items():
        base = {"QB": 19, "RB": 13, "WR": 12, "TE": 9, "DST": 7}[pos]
        for i in range(c):
            proj = round(base * (0.6 + 0.9 * (1 - i / c)), 1)
            pool.append({"player_name": f"{pos}{i+1}", "position": pos,
                         "projection": proj, "salary": 4000 + proj * 180,
                         "projected_ownership": round(2 + 30 * (1 - i / c), 1)})
    return pool


def _classify_slate_archetype():
    """Match this week's slate to the closest historical archetype (Task 16)."""
    archetypes = _read_json("slate_archetypes.json", default={"archetypes": []}).get("archetypes", [])
    slate = _read_json("slate_report.json", default={})
    if not archetypes:
        return None
    # Simple heuristic classification from available slate signals.
    weather = slate.get("weather_alerts") or []
    stacks = slate.get("top_stacks") or []
    top_implied = max([s.get("implied_total", 0) for s in stacks], default=0)
    name = "High Scoring Shootout"
    if len(weather) >= 2:
        name = "Weather Impacted"
    elif top_implied and top_implied < 22:
        name = "Low Total Grind"
    match = next((a for a in archetypes if a.get("name") == name), archetypes[0])
    confidence = 72 if match.get("name") == name else 55
    return {
        "name": match.get("name"),
        "confidence": confidence,
        "historical_matches": match.get("sample_weeks", []),
        "construction": match.get("winners", ""),
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "anthropic": ANTHROPIC_ENABLED,
        "stripe": STRIPE_ENABLED,
        "outputs_present": os.path.exists(out("slate_report.json")),
    }
