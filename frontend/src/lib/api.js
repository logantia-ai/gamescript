// ============================================================
// FastAPI backend client (pipeline outputs + health).
// Claude/Stripe have their own modules (claude.js, stripe.js).
// All calls throw on failure so hooks can fall through to the
// next data source (Supabase → mock).
// ============================================================

const apiBase = import.meta.env.VITE_API_BASE_URL || '';
export const isApiConfigured = Boolean(apiBase);

async function apiGet(path) {
  const res = await fetch(`${apiBase}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

// CSV-sourced rows arrive as strings; coerce numeric-looking values to numbers
// so components can do math/formatting without per-field parsing.
function coerceNumbers(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))
      ? Number(v)
      : v;
  }
  return out;
}

export async function fetchProjections({ position, limit = 300 } = {}) {
  const q = new URLSearchParams();
  if (position) q.set('position', position);
  if (limit) q.set('limit', String(limit));
  const data = await apiGet(`/api/projections?${q.toString()}`);
  return (data.players || []).map(coerceNumbers);
}

export async function fetchSlate() {
  const data = await apiGet('/api/slate');
  // Endpoint returns { note } when the pipeline hasn't run yet.
  if (!data || (data.note && data.week === undefined)) {
    throw new Error('slate not generated');
  }
  return data;
}

export async function fetchLineups() {
  return apiGet('/api/lineups');
}

export async function fetchGto() {
  return apiGet('/api/gto');
}

export async function fetchOpponent() {
  return apiGet('/api/opponent');
}

export async function fetchNews() {
  return apiGet('/api/news');
}

// Contest simulation (Task 10). Posts a lineup + contest params, returns the
// Monte Carlo result JSON. Throws when no backend is configured so the caller
// can show a mock/instructional state.
export async function runSimulation({ lineup, contest_size, num_sims }) {
  if (!isApiConfigured) throw new Error('simulation backend not configured');
  const res = await fetch(`${apiBase}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lineup, contest_size, num_sims }),
  });
  if (!res.ok) throw new Error(`API /api/simulate → ${res.status}`);
  return res.json();
}

export async function fetchHealth() {
  return apiGet('/api/health');
}
