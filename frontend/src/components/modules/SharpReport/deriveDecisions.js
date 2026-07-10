// Derive the "Top 5 Decisions" deterministically from pipeline slate + player
// data, so the structured cards work without an AI call and tier-gating is exact.
import { formatNum, formatPct, leverageColor } from '../../../lib/utils';

const ceil = (p) => p?.p90 ?? p?.ceiling ?? (Number(p?.projection) || 0) * 1.5;

export function deriveDecisions(slate, players = []) {
  const byCeiling = [...players].sort((a, b) => ceil(b) - ceil(a));
  const byProj = [...players].sort((a, b) => (b.projection || 0) - (a.projection || 0));

  // 1 — Best Stack
  const stack = slate?.top_stacks?.[0];
  const d1 = {
    n: 1,
    title: 'Best Stack',
    locked: false,
    headline: stack ? `${stack.qb} + ${(stack.partners || []).join(' / ') || '—'}` : '—',
    stats: stack
      ? [
          { label: 'Implied', value: formatNum(stack.implied_total) },
          { label: 'Leverage', value: formatNum(stack.leverage, 0), color: leverageColor(stack.leverage) },
        ]
      : [],
    rationale: stack
      ? `QB + pass-catcher correlation off a ${formatNum(stack.implied_total)}-point implied team total. Onslaught upside if the game shoots out.`
      : 'No qualifying stack in the slate data.',
  };

  // 2 — Top Leverage Play
  const lev = slate?.leverage_plays?.[0] || slate?.contrarian_spots?.[0];
  const d2 = {
    n: 2,
    title: 'Top Leverage Play',
    locked: false,
    headline: lev?.player_name || '—',
    stats: lev
      ? [
          { label: 'Pos', value: lev.position || '—' },
          { label: 'Proj', value: formatNum(lev.projection) },
          { label: 'Own', value: formatPct(lev.projected_ownership, 0) },
          { label: 'Lev', value: formatNum(lev.leverage_score, 0), color: leverageColor(lev.leverage_score) },
        ]
      : [],
    rationale: lev
      ? `Under-owned (${formatPct(lev.projected_ownership, 0)}) with a top-tier leverage score — the field is sleeping on the ceiling.`
      : 'No leverage standout surfaced.',
  };

  // 3 — Top Fade (fall back to the chalkiest player if the slate list is empty)
  const byOwnership = [...players].sort(
    (a, b) => (b.projected_ownership || 0) - (a.projected_ownership || 0)
  );
  const fade = slate?.chalk_warnings?.[0] || byOwnership[0];
  const d3 = {
    n: 3,
    title: 'Top Fade',
    locked: false,
    headline: fade?.player_name || '—',
    stats: fade
      ? [
          { label: 'Own', value: formatPct(fade.projected_ownership, 0), color: 'var(--red-bright)' },
          { label: 'Lev', value: formatNum(fade.leverage_score, 0), color: leverageColor(fade.leverage_score) },
        ]
      : [],
    rationale: fade
      ? `High-owned (${formatPct(fade.projected_ownership, 0)}), low-leverage trap. If they hit, the field is with you; if they miss, you gain separation.`
      : 'No obvious chalk trap.',
  };

  // 4 — Best GPP Differentiator (low owned, high ceiling)
  const diff =
    byCeiling.find((p) => (p.projected_ownership ?? 100) <= 15) ||
    slate?.contrarian_spots?.[1] ||
    slate?.contrarian_spots?.[0];
  const d4 = {
    n: 4,
    title: 'Best GPP Differentiator',
    locked: true,
    headline: diff?.player_name || '—',
    stats: diff
      ? [
          { label: 'Ceiling', value: formatNum(ceil(diff)) },
          { label: 'Own', value: formatPct(diff.projected_ownership, 0) },
          { label: 'Lev', value: formatNum(diff.leverage_score, 0), color: leverageColor(diff.leverage_score) },
        ]
      : [],
    rationale: diff
      ? `Sub-15% ownership with one of the highest ceilings on the slate — pure tournament differentiation.`
      : 'No differentiator found in the data.',
  };

  // 5 — Best Cash Anchor (high floor, high confidence)
  const anchor =
    byProj.find((p) => p.confidence_label === 'HIGH' || (p.confidence_pct ?? 0) >= 85) || byProj[0];
  const d5 = {
    n: 5,
    title: 'Best Cash Anchor',
    locked: true,
    headline: anchor?.player_name || '—',
    stats: anchor
      ? [
          { label: 'Proj', value: formatNum(anchor.projection) },
          { label: 'Floor', value: formatNum(anchor.floor ?? anchor.p10) },
          { label: 'Conf', value: anchor.confidence_label || `${anchor.confidence_pct ?? '—'}%` },
        ]
      : [],
    rationale: anchor
      ? `High floor + high confidence. The kind of safe, every-week play that keeps cash lineups alive.`
      : 'No cash anchor found.',
  };

  return [d1, d2, d3, d4, d5];
}

// Compact context block fed to Claude so its narrative is grounded in real numbers.
export function buildSlateContext(slate, decisions) {
  const lines = [];
  lines.push(`Week ${slate?.week ?? '?'} / ${slate?.season ?? '?'} — DraftKings main slate.`);
  decisions.forEach((d) => {
    lines.push(`Decision ${d.n} (${d.title}): ${d.headline} — ${d.stats.map((s) => `${s.label} ${s.value}`).join(', ')}`);
  });
  if (slate?.chalk_warnings?.length) {
    lines.push(`Chalk to consider fading: ${slate.chalk_warnings.slice(0, 4).map((c) => c.player_name).join(', ')}`);
  }
  if (slate?.contrarian_spots?.length) {
    lines.push(`Contrarian spots: ${slate.contrarian_spots.slice(0, 4).map((c) => c.player_name).join(', ')}`);
  }
  if (slate?.weather_alerts?.length) {
    lines.push(`Weather alerts: ${slate.weather_alerts.map((w) => `${w.team} (${w.weather_note})`).join('; ')}`);
  }
  if (slate?.position_scarcity && Object.keys(slate.position_scarcity).length) {
    lines.push(`Position scarcity: ${Object.entries(slate.position_scarcity).map(([p, v]) => `${p} ${v.alert || v.count}`).join('; ')}`);
  }
  return lines.join('\n');
}
