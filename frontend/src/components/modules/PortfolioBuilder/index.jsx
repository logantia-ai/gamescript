// MODULE 17 — Portfolio Builder. Multi-lineup with controlled overlap (Coordinator+).
// Generates N differentiated lineups from the live projection pool, honoring a
// max-exposure cap, then reports overlap, portfolio stats, and a DK bulk export.
import { useMemo, useState } from 'react';
import { PageWrapper } from '../../layout/PageWrapper';
import { PaywallGate } from '../../ui/PaywallGate';
import { Card, StatCard } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Label } from '../../ui/Label';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { LoadingScreen } from '../../ui/Spinner';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { useTableRows } from '../../../hooks/useTableRows';
import { lineupsToDkCsv, downloadCsv } from '../../../lib/dkExport';
import { formatNum, formatPct } from '../../../lib/utils';

const SALARY_CAP = 50000;
const MIN_SLOT = 2800; // cheapest plausible slot — used to keep builds cap-feasible
// DK Classic roster: QB, RB, RB, WR, WR, WR, TE, FLEX, DST.
const SLOTS = [
  { pos: 'QB' }, { pos: 'RB' }, { pos: 'RB' }, { pos: 'WR' }, { pos: 'WR' },
  { pos: 'WR' }, { pos: 'TE' }, { pos: 'FLEX', elig: ['RB', 'WR', 'TE'] }, { pos: 'DST' },
];

export function PortfolioBuilder() {
  return (
    <PaywallGate feature="portfolio_builder_20_lineups">
      <PortfolioBuilderInner />
    </PaywallGate>
  );
}

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

// Greedily build one lineup. Per slot, pick the highest "score" eligible player
// that (a) isn't already in the lineup, (b) keeps the build cap-feasible, and
// (c) hasn't blown its exposure cap. `offset` rotates picks for differentiation.
function buildLineup(pool, exposure, maxAppearances, offset) {
  const used = new Set();
  const picks = [];
  let salary = 0;

  SLOTS.forEach((slot, slotIdx) => {
    const elig = slot.elig || [slot.pos];
    const remainingSlots = SLOTS.length - slotIdx - 1;
    const budgetLeft = SALARY_CAP - salary - remainingSlots * MIN_SLOT;

    const candidates = pool
      .filter((p) => elig.includes(p.position) && !used.has(p.player_name) && num(p.salary, 5000) <= budgetLeft)
      .map((p) => {
        const over = (exposure[p.player_name] || 0) >= maxAppearances;
        return { p, score: num(p.projection) - (over ? 1000 : 0) };
      })
      .sort((a, b) => b.score - a.score);

    if (!candidates.length) return;
    // Rotate among the top few for differentiation across lineups.
    const pick = candidates[(offset + slotIdx) % Math.min(candidates.length, 4)] || candidates[0];
    picks.push(pick.p);
    used.add(pick.p.player_name);
    salary += num(pick.p.salary, 5000);
  });

  return picks;
}

function PortfolioBuilderInner() {
  const { players, loading, source } = usePlayerData();
  const { save } = useTableRows('portfolios');

  const [count, setCount] = useState(8);
  const [maxExposure, setMaxExposure] = useState(50);
  const [correlation, setCorrelation] = useState('Balanced');
  const [portfolio, setPortfolio] = useState(null);
  const [saved, setSaved] = useState(false);

  const pool = useMemo(
    () => players.filter((p) => p.player_name && p.position).map((p) => ({ ...p, team: p.team || p.recent_team })),
    [players]
  );

  function generate() {
    setSaved(false);
    const maxAppearances = Math.max(1, Math.round((maxExposure / 100) * count));
    // Tighter correlation → less rotation (more overlap); looser → more rotation.
    const spread = { Tight: 1, Balanced: 2, Loose: 3 }[correlation] || 2;
    const exposure = {};
    const lineups = [];

    for (let i = 0; i < count; i++) {
      const lu = buildLineup(pool, exposure, maxAppearances, i * spread);
      lu.forEach((p) => {
        exposure[p.player_name] = (exposure[p.player_name] || 0) + 1;
      });
      lineups.push(lu);
    }

    // Portfolio stats.
    const lineupStats = lineups.map((lu) => ({
      proj: lu.reduce((s, p) => s + num(p.projection), 0),
      own: lu.reduce((s, p) => s + num(p.projected_ownership), 0) / (lu.length || 1),
      lev: lu.reduce((s, p) => s + num(p.leverage_score), 0) / (lu.length || 1),
      salary: lu.reduce((s, p) => s + num(p.salary, 5000), 0),
    }));
    const avg = (k) => lineupStats.reduce((s, x) => s + x[k], 0) / (lineupStats.length || 1);

    // Differentiation = 1 - average pairwise player overlap.
    let overlapSum = 0;
    let pairs = 0;
    for (let a = 0; a < lineups.length; a++) {
      for (let b = a + 1; b < lineups.length; b++) {
        const sa = new Set(lineups[a].map((p) => p.player_name));
        const shared = lineups[b].filter((p) => sa.has(p.player_name)).length;
        overlapSum += shared / 9;
        pairs++;
      }
    }
    const differentiation = pairs ? Math.round((1 - overlapSum / pairs) * 100) : 100;

    setPortfolio({
      lineups,
      exposure,
      maxAppearances,
      stats: {
        avgProj: avg('proj'),
        avgOwn: avg('own'),
        avgLev: avg('lev'),
        differentiation,
        // Heuristic: more differentiation + ceiling → higher top-10% odds.
        topTen: Math.min(95, Math.round(differentiation * 0.6 + avg('lev') * 0.3)),
      },
    });
  }

  async function savePortfolio() {
    if (!portfolio) return;
    const { error } = await save({
      lineup_count: portfolio.lineups.length,
      max_exposure: maxExposure,
      correlation_style: correlation,
      differentiation_score: portfolio.stats.differentiation,
      lineups: portfolio.lineups.map((lu) => lu.map((p) => ({ name: p.player_name, position: p.position, salary: p.salary }))),
    });
    setSaved(!error);
  }

  function exportCsv() {
    if (!portfolio) return;
    const csv = lineupsToDkCsv(
      portfolio.lineups.map((lu) => lu.map((p) => ({ position: p.position, name: p.player_name })))
    );
    downloadCsv('game-script-portfolio.csv', csv);
  }

  if (loading) return <LoadingScreen label="Loading projection pool…" />;

  const exposureRows = portfolio
    ? Object.entries(portfolio.exposure)
        .map(([name, n]) => ({ name, n, pct: (n / portfolio.lineups.length) * 100 }))
        .sort((a, b) => b.n - a.n)
    : [];

  return (
    <PageWrapper
      eyebrow="MULTI-LINEUP"
      title="Portfolio Builder"
      desc="Build a differentiated set of lineups with controlled player overlap."
      actions={<Badge color={source === 'mock' ? 'var(--silver)' : 'var(--green-text)'}>{source === 'api' ? 'Live · Pipeline' : source}</Badge>}
    >
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '14px' }}>
          <div>
            <Label>Number of lineups: {count}</Label>
            <input type="range" min={2} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Max player exposure</Label>
            <Select value={String(maxExposure)} onChange={(e) => setMaxExposure(Number(e.target.value))}
              options={[{ value: '25', label: '25%' }, { value: '33', label: '33%' }, { value: '50', label: '50%' }, { value: '67', label: '67%' }]} />
          </div>
          <div>
            <Label>Stack correlation</Label>
            <Select value={correlation} onChange={(e) => setCorrelation(e.target.value)} options={['Tight', 'Balanced', 'Loose']} />
          </div>
        </div>
        <Button onClick={generate} disabled={!pool.length} style={{ marginTop: '16px' }}>Generate Portfolio</Button>
      </Card>

      {portfolio && (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <StatCard label="Lineups" value={portfolio.lineups.length} />
            <StatCard label="Avg Projection" value={formatNum(portfolio.stats.avgProj)} accent="var(--green-text)" />
            <StatCard label="Avg Ownership" value={formatPct(portfolio.stats.avgOwn, 1)} accent="var(--copper-bright)" />
            <StatCard label="Differentiation" value={`${portfolio.stats.differentiation}/100`} accent="var(--copper)" />
            <StatCard label="Est. Top 10%" value={`${portfolio.stats.topTen}%`} accent="var(--green-text)" />
          </div>

          {/* Exposure / overlap grid */}
          <Card style={{ marginBottom: '16px' }}>
            <div className="eyebrow" style={{ marginBottom: '10px' }}>Player Exposure & Overlap</div>
            <div style={{ fontSize: '10px', color: 'var(--chalk-dim)', marginBottom: '10px' }}>
              Red = at or above your {maxExposure}% exposure cap · Green = well-diversified
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '6px' }}>
              {exposureRows.map((r) => {
                const over = r.n >= portfolio.maxAppearances;
                return (
                  <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-data)', fontSize: '11px', padding: '4px 8px', border: `1px solid ${over ? 'var(--red-bright)' : 'var(--border)'}`, borderRadius: 'var(--radius)' }}>
                    <span style={{ color: 'var(--chalk)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                    <span style={{ color: over ? 'var(--red-bright)' : 'var(--green-text)' }}>{formatPct(r.pct, 0)}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Button onClick={exportCsv}>Export DK Bulk CSV</Button>
            <Button variant="ghost" onClick={savePortfolio}>Save Portfolio</Button>
            {saved && <Badge color="var(--green-text)">Saved</Badge>}
          </div>
        </>
      )}
    </PageWrapper>
  );
}
