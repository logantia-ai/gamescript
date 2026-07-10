// MODULE 10 — Stack Builder. Correlation engine (Coordinator+).
// QB selector → team pass-catchers ranked by correlation score → save a stack
// that locks into Sunday Mode and the optimizer.
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
import { formatNum, formatPct } from '../../../lib/utils';

const STACK_TYPES = {
  Mini: { partners: 1, bringback: 0, desc: 'QB + top pass-catcher' },
  Standard: { partners: 2, bringback: 0, desc: 'QB + WR1 + TE/WR2' },
  Mega: { partners: 3, bringback: 0, desc: 'QB + three pass-catchers' },
  'Bring-back': { partners: 2, bringback: 1, desc: 'QB + 2 + an opposing receiver' },
};

// Correlation score per the spec:
// target_share·0.40 + snap_pct·0.25 + route_participation·0.20 + rz_opportunity·0.15
function correlationScore(p) {
  const ts = Number(p.target_share) || 0;
  const snap = Number(p.snap_pct) || 0;
  const route = Number(p.route_participation_rate) || 0;
  const rz = Number(p.rz_opportunity_share) || Number(p.rz_target_share) || 0;
  return ts * 0.4 + snap * 0.25 + route * 0.2 + rz * 0.15;
}

export function StackBuilder() {
  return (
    <PaywallGate feature="stack_builder">
      <StackBuilderInner />
    </PaywallGate>
  );
}

function StackBuilderInner() {
  const { players, loading, source } = usePlayerData();
  const { save } = useTableRows('stacks');

  const [qbName, setQbName] = useState('');
  const [stackType, setStackType] = useState('Standard');
  const [saved, setSaved] = useState(false);

  const qbs = useMemo(
    () => players.filter((p) => p.position === 'QB').sort((a, b) => (b.projection || 0) - (a.projection || 0)),
    [players]
  );
  const qb = useMemo(() => qbs.find((q) => q.player_name === qbName) || qbs[0], [qbs, qbName]);

  const { partners, bringbacks } = useMemo(() => {
    if (!qb) return { partners: [], bringbacks: [] };
    const team = qb.team || qb.recent_team;
    const opp = qb.opponent;
    const rank = (rows) =>
      rows
        .map((p) => ({ ...p, _corr: correlationScore(p) }))
        .sort((a, b) => b._corr - a._corr);
    const same = rank(
      players.filter((p) => (p.team || p.recent_team) === team && ['WR', 'TE'].includes(p.position))
    );
    const opposing = rank(
      players.filter((p) => (p.team || p.recent_team) === opp && ['WR', 'TE'].includes(p.position))
    );
    return { partners: same, bringbacks: opposing };
  }, [qb, players]);

  const cfg = STACK_TYPES[stackType];
  const selectedPartners = partners.slice(0, cfg.partners);
  const selectedBringback = bringbacks.slice(0, cfg.bringback);
  const stackPlayers = qb ? [qb, ...selectedPartners, ...selectedBringback] : [];
  const stackSalary = stackPlayers.reduce((s, p) => s + (Number(p.salary) || 0), 0);
  const stackProj = stackPlayers.reduce((s, p) => s + (Number(p.projection) || 0), 0);

  async function saveStack() {
    if (!qb) return;
    const { error } = await save({
      stack_type: stackType,
      qb: qb.player_name,
      team: qb.team || qb.recent_team,
      players: stackPlayers.map((p) => ({ name: p.player_name, position: p.position, salary: p.salary })),
      total_salary: stackSalary,
      total_projection: Number(stackProj.toFixed(1)),
      lineup_type: 'stack',
    });
    setSaved(!error);
  }

  if (loading) return <LoadingScreen label="Loading projections…" />;

  const partnerRow = (p, tag) => (
    <div
      key={p.player_name + tag}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-data)', fontSize: '12px' }}
    >
      <Badge color={tag === 'bringback' ? 'var(--copper-bright)' : 'var(--copper)'}>{p.position}</Badge>
      <span style={{ flex: 1, color: 'var(--chalk)' }}>{p.player_name}</span>
      <span style={{ color: 'var(--silver)', width: '70px', textAlign: 'right' }}>tgt {formatPct((Number(p.target_share) || 0) * 100, 0)}</span>
      <span style={{ color: 'var(--copper-bright)', width: '80px', textAlign: 'right' }}>corr {formatNum(p._corr, 3)}</span>
      <span style={{ color: 'var(--silver)', width: '64px', textAlign: 'right' }}>${p.salary || '—'}</span>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="CORRELATION ENGINE"
      title="Stack Builder"
      desc="Pair your QB with the receivers his points flow through."
      actions={<Badge color={source === 'mock' ? 'var(--silver)' : 'var(--green-text)'}>{source === 'api' ? 'Live · Pipeline' : source}</Badge>}
    >
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: '14px' }}>
          <div>
            <Label>Quarterback</Label>
            <Select value={qb?.player_name || ''} onChange={(e) => setQbName(e.target.value)}
              options={qbs.map((q) => ({ value: q.player_name, label: `${q.player_name} · ${q.team || q.recent_team} · ${formatNum(q.projection)}pts` }))} />
          </div>
          <div>
            <Label>Stack type</Label>
            <Select value={stackType} onChange={(e) => setStackType(e.target.value)} options={Object.keys(STACK_TYPES)} />
            <div style={{ fontSize: '10px', color: 'var(--chalk-dim)', marginTop: '6px' }}>{cfg.desc}</div>
          </div>
        </div>
      </Card>

      {qb && (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <StatCard label="Stack Salary" value={`$${stackSalary.toLocaleString()}`} sub={`${stackPlayers.length} players`} />
            <StatCard label="Projected" value={`${formatNum(stackProj)} pts`} accent="var(--green-text)" />
            <StatCard label="Implied Total" value={formatNum(qb.team_implied_total)} sub={qb.team || qb.recent_team} />
            <StatCard label="QB Leverage" value={formatNum(qb.leverage_score, 0)} accent="var(--copper-bright)" />
          </div>

          <Card style={{ marginBottom: '16px' }}>
            <div className="eyebrow" style={{ marginBottom: '6px' }}>Stack Partners — {qb.team || qb.recent_team} (ranked by correlation)</div>
            {partners.length ? partners.map((p, i) => partnerRow({ ...p, _selected: i < cfg.partners }, i < cfg.partners ? 'in' : 'pool')) : <div style={{ color: 'var(--chalk-dim)', fontSize: '12px' }}>No pass-catchers found for this team.</div>}
          </Card>

          {cfg.bringback > 0 && (
            <Card style={{ marginBottom: '16px' }}>
              <div className="eyebrow" style={{ marginBottom: '6px' }}>Bring-back — {qb.opponent}</div>
              {bringbacks.length ? bringbacks.slice(0, 3).map((p) => partnerRow(p, 'bringback')) : <div style={{ color: 'var(--chalk-dim)', fontSize: '12px' }}>No opposing receivers found.</div>}
            </Card>
          )}

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Button onClick={saveStack}>Save Stack</Button>
            {saved && <Badge color="var(--green-text)">Saved — locks into Sunday Mode & optimizer</Badge>}
          </div>
        </>
      )}
    </PageWrapper>
  );
}
