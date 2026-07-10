// MODULE — Contest Sim (Task 10). Monte Carlo contest simulation that ranks
// your lineup against a projected-ownership field. Coordinator+ tier.
import { useState } from 'react';
import { PageWrapper } from '../../layout/PageWrapper';
import { Card, StatCard } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Label } from '../../ui/Label';
import { Textarea } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { Spinner } from '../../ui/Spinner';
import { PaywallGate } from '../../ui/PaywallGate';
import { useLineups } from '../../../hooks/useLineups';
import { runSimulation } from '../../../lib/api';

const CONTEST_SIZES = [
  { value: 1000, label: '1k entries' },
  { value: 5000, label: '5k entries' },
  { value: 10000, label: '10k entries' },
  { value: 50000, label: '50k entries' },
  { value: 100000, label: '100k+ entries' },
];
const SIM_COUNTS = [
  { value: 1000, label: '1,000' },
  { value: 5000, label: '5,000' },
  { value: 10000, label: '10,000' },
];

// Parse a pasted DK lineup into [{player_name, position, salary}].
function parseLineup(text) {
  const players = [];
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const pos = (line.match(/\b(QB|RB|WR|TE|DST|FLEX|D\/ST)\b/i) || [])[1]?.toUpperCase();
    const salMatch = line.match(/\$?\s*([0-9]{3,5})\b/);
    const salary = salMatch ? Number(salMatch[1]) : null;
    let name = line;
    if (pos) name = name.replace(new RegExp(`\\b${pos.replace('/', '\\/')}\\b`, 'i'), '');
    if (salMatch) name = name.replace(salMatch[0], '');
    name = name.replace(/[$]/g, '').trim().replace(/\s{2,}/g, ' ');
    if (!name) continue;
    players.push({ player_name: name, position: pos === 'D/ST' ? 'DST' : pos || null, salary });
  }
  return players;
}

const gaugeColor = (v) => (v >= 15 ? 'var(--green-text)' : v >= 5 ? 'var(--copper)' : 'var(--red-bright)');

function WinGauge({ value }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const color = gaugeColor(value);
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label={`Win probability ${value}%`}>
      <circle cx="80" cy="80" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
      <circle
        cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        transform="rotate(-90 80 80)" style={{ transition: 'stroke-dashoffset 700ms ease' }}
      />
      <text x="80" y="76" textAnchor="middle" fontFamily="var(--font-display)" fontSize="30" fontWeight="700" fill={color}>
        {value.toFixed(1)}%
      </text>
      <text x="80" y="98" textAnchor="middle" fontSize="8" letterSpacing="2" fill="var(--chalk-dim)">WIN PROB</text>
    </svg>
  );
}

// Mock result so the module is explorable without a backend.
function mockResult(size, sims) {
  return {
    simulations_run: sims, contest_size: size,
    win_probability: 8.4, cash_probability: 34.2, average_percentile: 61.5, expected_roi: 22.0,
    comparison: {
      your_ownership: 19.8, field_ownership: 24.6, your_projected: 142.1, field_projected: 138.4,
      your_ceiling: 178.3, field_ceiling: 171.2, differentiation_score: 68,
      your_stack: 'Josh Allen + 2 pass-catchers', field_stack: 'QB + 1 WR (most common)',
    },
    slate_archetype: {
      name: 'High Scoring Shootout', confidence: 72,
      historical_matches: ['Week 14 2023', 'Week 6 2022', 'Week 11 2021'],
      construction: 'QB1 with pass catchers, points stack, receiver-heavy builds',
    },
    disclaimer: 'Sample output — connect the backend for a live simulation.',
    mock: true,
  };
}

export function ContestSim() {
  const { lineups } = useLineups();
  const [text, setText] = useState('');
  const [size, setSize] = useState(10000);
  const [sims, setSims] = useState(10000);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  function loadSaved(e) {
    const l = lineups.find((x) => String(x.id) === e.target.value);
    if (!l) return;
    const lines = (l.players || []).map((p) => `${p.position || ''} ${p.name || p.player_name || ''} ${p.salary ? `$${p.salary}` : ''}`.trim());
    setText(lines.join('\n'));
  }

  async function run() {
    setBusy(true);
    const lineup = parseLineup(text);
    try {
      const r = await runSimulation({ lineup, contest_size: Number(size), num_sims: Number(sims) });
      setResult(r);
    } catch {
      setResult(mockResult(Number(size), Number(sims)));
    }
    setBusy(false);
  }

  const body = (
    <PageWrapper
      eyebrow="TOURNAMENT SIMULATION"
      title="Contest Sim"
      desc="Rank your lineup against a simulated field. Win probability, cash rate, and ROI."
    >
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Label>Your lineup (paste DK format)</Label>
          {lineups.length > 0 && (
            <div style={{ minWidth: '200px' }}>
              <Select onChange={loadSaved} options={[{ value: '', label: '— Load a saved lineup —' }, ...lineups.map((l) => ({ value: String(l.id), label: `${l.contest_type || l.lineup_type || 'Lineup'} · ${l.players?.length || 0} players` }))]} />
            </div>
          )}
        </div>
        <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={'QB Josh Allen $8200\nRB Christian McCaffrey $9400\n...'} />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '12px', flexWrap: 'wrap' }}>
          <div style={{ width: '180px' }}>
            <Label>Contest size</Label>
            <Select value={size} onChange={(e) => setSize(e.target.value)} options={CONTEST_SIZES} />
          </div>
          <div style={{ width: '160px' }}>
            <Label>Simulations</Label>
            <Select value={sims} onChange={(e) => setSims(e.target.value)} options={SIM_COUNTS} />
          </div>
          <Button variant="copper" onClick={run} disabled={busy || !text.trim()}>
            {busy ? <Spinner size={14} /> : 'Run Simulation'}
          </Button>
        </div>
      </Card>

      {busy && (
        <Card style={{ textAlign: 'center', padding: '32px' }}>
          <Spinner size={22} />
          <div style={{ fontSize: '12px', color: 'var(--silver)', marginTop: '10px' }}>Simulating {Number(sims).toLocaleString()} contests…</div>
        </Card>
      )}

      {result && !busy && (
        <>
          {result.mock && <Badge color="var(--copper)" style={{ marginBottom: '12px' }}>Sample — connect backend for live sim</Badge>}
          {result.error ? (
            <Card><div style={{ color: 'var(--red-bright)', fontSize: '13px' }}>{result.error}</div></Card>
          ) : (
            <>
              {/* Gauge + stat cards */}
              <Card style={{ marginBottom: '16px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                <WinGauge value={result.win_probability} />
                <div style={{ flex: 1, display: 'flex', gap: '12px', flexWrap: 'wrap', minWidth: '260px' }}>
                  <StatCard label="Win Prob (top 1%)" value={`${result.win_probability}%`} accent={gaugeColor(result.win_probability)} />
                  <StatCard label="Cash Prob (top 20%)" value={`${result.cash_probability}%`} accent="var(--green-text)" />
                  <StatCard label="Avg Percentile" value={`${result.average_percentile}th`} accent="var(--chalk)" />
                  <StatCard label="Expected ROI" value={`${result.expected_roi > 0 ? '+' : ''}${result.expected_roi}%`} accent={result.expected_roi >= 0 ? 'var(--green-text)' : 'var(--red-bright)'} />
                  <StatCard label="Simulations" value={Number(result.simulations_run).toLocaleString()} accent="var(--silver)" />
                </div>
              </Card>

              {/* Lineup vs field */}
              <Card style={{ marginBottom: '16px' }}>
                <div className="eyebrow" style={{ marginBottom: '12px' }}>Your Lineup vs The Field</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '12px' }}>
                  <Compare label="Avg Ownership" you={`${result.comparison.your_ownership}%`} field={`${result.comparison.field_ownership}%`} />
                  <Compare label="Projected Score" you={result.comparison.your_projected} field={result.comparison.field_projected} />
                  <Compare label="Ceiling (P90)" you={result.comparison.your_ceiling} field={result.comparison.field_ceiling} />
                  <div style={{ borderLeft: '2px solid var(--copper)', paddingLeft: '10px' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '2px', color: 'var(--copper)', textTransform: 'uppercase' }}>Differentiation</div>
                    <div style={{ fontSize: '22px', fontFamily: 'var(--font-display)', color: 'var(--chalk)' }}>{result.comparison.differentiation_score}<span style={{ fontSize: '11px', color: 'var(--chalk-dim)' }}>/100</span></div>
                  </div>
                </div>
                <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--silver)' }}>
                  Your stack: <span style={{ color: 'var(--chalk)' }}>{result.comparison.your_stack}</span> · Field stack: <span style={{ color: 'var(--chalk)' }}>{result.comparison.field_stack}</span>
                </div>
              </Card>

              {/* Historical archetype */}
              {result.slate_archetype && (
                <Card style={{ marginBottom: '16px', borderLeft: '3px solid var(--copper)' }}>
                  <div className="eyebrow" style={{ marginBottom: '8px' }}>This Week's Slate Archetype</div>
                  <div style={{ fontSize: '16px', color: 'var(--copper)', fontFamily: 'var(--font-display)' }}>
                    {result.slate_archetype.name} <span style={{ fontSize: '11px', color: 'var(--chalk-dim)' }}>· {result.slate_archetype.confidence}% confidence</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--silver)', marginTop: '6px' }}>{result.slate_archetype.construction}</div>
                  {result.slate_archetype.historical_matches?.length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--chalk-dim)', marginTop: '6px' }}>
                      Historical matches: {result.slate_archetype.historical_matches.join(' · ')}
                    </div>
                  )}
                </Card>
              )}

              {result.disclaimer && (
                <div style={{ fontSize: '10px', color: 'var(--chalk-dim)', fontStyle: 'italic', textAlign: 'center' }}>{result.disclaimer}</div>
              )}
            </>
          )}
        </>
      )}
    </PageWrapper>
  );

  return <PaywallGate feature="monte_carlo_full">{body}</PaywallGate>;
}

function Compare({ label, you, field }) {
  return (
    <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: '10px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '2px', color: 'var(--chalk-dim)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '14px', color: 'var(--green-text)', fontFamily: 'var(--font-data)' }}>You: {you}</div>
      <div style={{ fontSize: '12px', color: 'var(--silver)', fontFamily: 'var(--font-data)' }}>Field: {field}</div>
    </div>
  );
}
