// MODULE 15 — GTO Mode. Game-theory-optimal construction (Coordinator+).
// Reads the pipeline's /api/gto output: score, lineup, field-scenario percentiles.
import { useEffect, useState } from 'react';
import { PageWrapper } from '../../layout/PageWrapper';
import { PaywallGate } from '../../ui/PaywallGate';
import { Card, StatCard } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Table } from '../../ui/Table';
import { LoadingScreen } from '../../ui/Spinner';
import { fetchGto } from '../../../lib/api';
import { formatNum, formatPct } from '../../../lib/utils';

export function GTOMode() {
  return (
    <PaywallGate feature="gto_mode">
      <GTOModeInner />
    </PaywallGate>
  );
}

function scoreColor(s) {
  if (s == null) return 'var(--silver)';
  if (s >= 66) return 'var(--green-text)';
  if (s >= 40) return 'var(--copper)';
  return 'var(--red-bright)';
}

function GTOModeInner() {
  const [gto, setGto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGto().then(setGto).catch(() => setGto(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen label="Loading GTO build…" />;

  const hasData = gto && gto.lineup;
  const scenarios = gto?.field_scenarios || [];

  const cols = [
    { key: 'position', label: 'Pos', align: 'center' },
    { key: 'player_name', label: 'Player' },
    { key: 'salary', label: 'Salary', align: 'right', render: (v) => (v ? `$${Number(v).toLocaleString()}` : '—') },
    { key: 'projected_ownership', label: 'Own', align: 'right', render: (v) => formatPct(v, 0) },
    { key: 'leverage_score', label: 'Lev', align: 'right', render: (v) => formatNum(v, 0) },
  ];

  return (
    <PageWrapper
      eyebrow="GAME THEORY OPTIMAL"
      title="GTO Mode"
      desc="A lineup that profits no matter what the field does."
      actions={hasData && <Badge color={scoreColor(gto.gto_score)}>GTO {formatNum(gto.gto_score, 0)}/100</Badge>}
    >
      {!hasData ? (
        <Card><div style={{ color: 'var(--chalk-dim)', fontFamily: 'var(--font-data)', fontSize: '13px' }}>{gto?.note || 'No GTO lineup available. Run the pipeline (python main.py) and set VITE_API_BASE_URL.'}</div></Card>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <StatCard label="GTO Score" value={`${formatNum(gto.gto_score, 0)}`} sub="0–100, higher = less exploitable" accent={scoreColor(gto.gto_score)} />
            <StatCard label="Projection" value={`${formatNum(gto.total_projection)}`} accent="var(--green-text)" />
            <StatCard label="Salary" value={`$${Number(gto.total_salary || 0).toLocaleString()}`} />
            <StatCard label="Avg Ownership" value={formatPct(gto.avg_ownership, 1)} accent="var(--copper-bright)" />
          </div>

          <Card style={{ marginBottom: '16px' }}>
            <div className="eyebrow" style={{ marginBottom: '10px' }}>Field Scenario Modeling</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px' }}>
              {scenarios.map((s) => (
                <div key={s.scenario} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--silver)', fontFamily: 'var(--font-data)', marginBottom: '8px' }}>{s.scenario}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: scoreColor(s.estimated_percentile_finish) }}>
                    {formatNum(s.estimated_percentile_finish, 0)}<span style={{ fontSize: '13px', color: 'var(--chalk-dim)' }}>%ile</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="eyebrow" style={{ marginBottom: '10px' }}>GTO Lineup</div>
            <Table columns={cols} rows={gto.lineup} />
          </Card>
        </>
      )}
    </PageWrapper>
  );
}
