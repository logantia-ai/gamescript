// MODULE 14 — Debrief. Monday post-slate analysis (Coordinator+).
// Compare a saved lineup to the optimizer's, surface accuracy, persist learnings.
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PageWrapper } from '../../layout/PageWrapper';
import { PaywallGate } from '../../ui/PaywallGate';
import { Card, StatCard } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Label } from '../../ui/Label';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { Spinner } from '../../ui/Spinner';
import { Table } from '../../ui/Table';
import { useLineups } from '../../../hooks/useLineups';
import { useTableRows } from '../../../hooks/useTableRows';
import { fetchLineups } from '../../../lib/api';
import { askClaude } from '../../../lib/claude';
import { formatNum } from '../../../lib/utils';

const SYSTEM = `You are the Debrief engine inside Game Script. Given a user's lineup, its projected vs actual
points, and the week's optimal lineup, produce a Monday-morning debrief in markdown:
WEEK SUMMARY: <score vs optimal, one line>
WHAT WORKED:
- ...
WHAT MISSED:
- ...
BIAS FLAGS:
- <recurring tendencies if visible>
KEY LEARNINGS:
- <3 concrete changes for next week>`;

export function Debrief() {
  return (
    <PaywallGate feature="weekly_debrief">
      <DebriefInner />
    </PaywallGate>
  );
}

function DebriefInner() {
  const { lineups } = useLineups();
  const { save } = useTableRows('weekly_debriefs');

  const [selId, setSelId] = useState('');
  const [optimal, setOptimal] = useState(null);
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchLineups().then(setOptimal).catch(() => setOptimal(null));
  }, []);

  const selected = useMemo(
    () => lineups.find((l) => String(l.id) === selId) || lineups[0],
    [lineups, selId]
  );

  const projTotal = useMemo(
    () => (selected?.players || []).reduce((s, p) => s + (Number(p.projection) || 0), 0),
    [selected]
  );
  const actualTotal = useMemo(
    () => (selected?.players || []).reduce((s, p) => s + (Number(p.actual) || 0), 0),
    [selected]
  );

  const optimalProj = useMemo(() => {
    if (!optimal) return null;
    const pools = optimal.lineups || optimal;
    const first = Array.isArray(pools) ? pools[0] : Object.values(pools || {})[0];
    const ps = first?.players || first?.lineup || [];
    return ps.reduce((s, p) => s + (Number(p.projection) || Number(p.median) || 0), 0) || null;
  }, [optimal]);

  async function run() {
    if (!selected) return;
    setBusy(true);
    const roster = (selected.players || []).map((p) => `${p.position || ''} ${p.name || p.player_name} — proj ${formatNum(p.projection)} / actual ${p.actual ?? 'pending'}`).join('\n');
    const prompt = `Your lineup (${selected.contest_type || 'GPP'}):\n${roster}\n\nProjected total: ${formatNum(projTotal)}\nActual total: ${actualTotal ? formatNum(actualTotal) : 'pending'}\nOptimal projected total: ${optimalProj ? formatNum(optimalProj) : 'n/a'}`;
    const { text, mock } = await askClaude({ module: 'debrief', system: SYSTEM, prompt });
    setOut({ text, mock });
    setBusy(false);
  }

  async function persist() {
    if (!out) return;
    const { error } = await save({
      lineup_id: selected?.id ?? null,
      projected_total: Number(projTotal.toFixed(1)),
      actual_total: actualTotal || null,
      optimal_total: optimalProj ? Number(optimalProj.toFixed(1)) : null,
      debrief: out.text,
    });
    setSaved(!error);
  }

  const cols = [
    { key: 'name', label: 'Player', render: (_, r) => r.name || r.player_name || '—' },
    { key: 'position', label: 'Pos', align: 'center' },
    { key: 'projection', label: 'Proj', align: 'right', render: (v) => formatNum(v) },
    { key: 'actual', label: 'Actual', align: 'right', render: (v) => (v == null ? 'pending' : formatNum(v)) },
  ];

  if (!lineups.length) {
    return (
      <PageWrapper eyebrow="POST-SLATE" title="Debrief" desc="Monday's mirror.">
        <Card><div style={{ color: 'var(--chalk-dim)', fontFamily: 'var(--font-data)', fontSize: '13px' }}>No saved lineups yet. Build and save a lineup (Sunday Mode / Red Zone) to generate a debrief.</div></Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      eyebrow="POST-SLATE"
      title="Debrief"
      desc="What worked, what didn't, and why."
      actions={<Badge color={optimalProj ? 'var(--green-text)' : 'var(--silver)'}>{optimalProj ? 'Optimal loaded' : 'No optimal'}</Badge>}
    >
      <Card style={{ marginBottom: '16px' }}>
        <Label>Lineup to debrief</Label>
        <Select value={selected ? String(selected.id) : ''} onChange={(e) => setSelId(e.target.value)}
          options={lineups.map((l) => ({ value: String(l.id), label: `${l.lineup_type || 'lineup'} · ${l.contest_type || ''} · ${l.players?.length || 0}p` }))} />
        <Button onClick={run} disabled={busy} style={{ marginTop: '14px' }}>{busy ? <Spinner size={14} /> : 'Generate Debrief'}</Button>
      </Card>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <StatCard label="Your Projection" value={formatNum(projTotal)} />
        <StatCard label="Your Actual" value={actualTotal ? formatNum(actualTotal) : 'pending'} accent="var(--green-text)" />
        <StatCard label="Optimal" value={optimalProj ? formatNum(optimalProj) : '—'} accent="var(--copper-bright)" />
        <StatCard label="Pts Left" value={optimalProj && actualTotal ? formatNum(optimalProj - actualTotal) : '—'} accent="var(--red-bright)" />
      </div>

      <Card style={{ marginBottom: '16px' }}>
        <div className="eyebrow" style={{ marginBottom: '10px' }}>Projection Accuracy</div>
        <Table columns={cols} rows={selected?.players || []} empty="No players on this lineup" />
      </Card>

      {out && (
        <Card>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
            <div className="eyebrow" style={{ flex: 1 }}>Debrief</div>
            {out.mock && <Badge color="var(--copper)">Mock</Badge>}
            <Button onClick={persist} style={{ padding: '7px 14px' }}>Save Debrief</Button>
            {saved && <Badge color="var(--green-text)">Saved</Badge>}
          </div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '13px', lineHeight: 1.7 }}>
            <ReactMarkdown>{out.text}</ReactMarkdown>
          </div>
        </Card>
      )}
    </PageWrapper>
  );
}
