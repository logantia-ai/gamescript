// MODULE 16 — Opponent Model. Field construction analysis (Coordinator+).
// Reads the pipeline's /api/opponent output: most common field stacks, player
// pair co-ownership, team stack saturation, and guaranteed-differentiation plays.
import { useEffect, useState } from 'react';
import { PageWrapper } from '../../layout/PageWrapper';
import { PaywallGate } from '../../ui/PaywallGate';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Table } from '../../ui/Table';
import { LoadingScreen } from '../../ui/Spinner';
import { fetchOpponent } from '../../../lib/api';
import { formatPct, formatNum } from '../../../lib/utils';

export function OpponentModel() {
  return (
    <PaywallGate feature="opponent_modeling">
      <OpponentModelInner />
    </PaywallGate>
  );
}

function saturationColor(level) {
  if (level === 'SATURATED') return 'var(--red-bright)';
  if (level === 'BALANCED') return 'var(--copper)';
  return 'var(--green-text)';
}

function OpponentModelInner() {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpponent().then(setModel).catch(() => setModel(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen label="Modeling the field…" />;

  const constructions = model?.common_constructions || [];
  const coOwn = model?.co_ownership || [];
  const saturation = model?.stack_saturation || [];
  const diff = model?.differentiation_plays || [];
  const hasData = constructions.length || coOwn.length || saturation.length;

  if (!hasData) {
    return (
      <PageWrapper eyebrow="FIELD ANALYSIS" title="Opponent Model" desc="What the field is about to build.">
        <Card>
          <div style={{ color: 'var(--chalk-dim)', fontFamily: 'var(--font-data)', fontSize: '13px' }}>
            {model?.note || 'No opponent model available. Run the pipeline (python main.py) and set VITE_API_BASE_URL.'}
          </div>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      eyebrow="FIELD ANALYSIS"
      title="Opponent Model"
      desc="Build to beat what the field is about to roster — not the optimizer."
    >
      {/* Most common field constructions */}
      <Card style={{ marginBottom: '16px' }}>
        <div className="eyebrow" style={{ marginBottom: '10px' }}>Most Common Field Constructions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '12px' }}>
          {constructions.map((c, i) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontFamily: 'var(--font-data)', color: 'var(--chalk)', fontSize: '13px' }}>{c.qb}</span>
                <Badge color="var(--copper-bright)">{formatPct(c.estimated_field_pct || 0, 1)} of field</Badge>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--silver)', fontFamily: 'var(--font-data)' }}>
                + {(c.stack || []).join(', ') || '—'}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Player pair co-ownership */}
      <Card style={{ marginBottom: '16px' }}>
        <div className="eyebrow" style={{ marginBottom: '10px' }}>Player Pair Co-Ownership</div>
        <Table
          columns={[
            { key: 'pair', label: 'Pair', render: (v) => (Array.isArray(v) ? v.join(' + ') : v) },
            { key: 'estimated_co_ownership', label: 'Co-Own%', align: 'right', render: (v) => formatPct(v, 1) },
            { key: 'implication', label: 'Implication' },
          ]}
          rows={coOwn}
        />
      </Card>

      {/* Team saturation heatmap */}
      <Card style={{ marginBottom: '16px' }}>
        <div className="eyebrow" style={{ marginBottom: '10px' }}>Team Stack Saturation</div>
        <div style={{ fontSize: '10px', color: 'var(--chalk-dim)', marginBottom: '10px' }}>
          Red = over-saturated (avoid for GPP edge) · Green = under-stacked (leverage)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))', gap: '8px' }}>
          {saturation.map((t) => (
            <div
              key={t.team}
              style={{
                border: `1px solid ${saturationColor(t.level)}`,
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius)',
                padding: '10px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--chalk)' }}>{t.team}</div>
              <div style={{ fontSize: '11px', color: saturationColor(t.level), fontFamily: 'var(--font-data)' }}>
                {formatNum(t.total_ownership, 0)}%
              </div>
              <div style={{ fontSize: '8px', letterSpacing: '1px', color: 'var(--chalk-dim)' }}>{t.level}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Counter strategies / differentiation */}
      <Card>
        <div className="eyebrow" style={{ marginBottom: '10px' }}>Counter Strategies — Guaranteed Differentiation</div>
        {diff.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {diff.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-data)', fontSize: '12px' }}>
                <span style={{ color: 'var(--chalk)' }}>{p.player_name || p.name}{p.position ? ` · ${p.position}` : ''}</span>
                <span style={{ color: 'var(--green-text)' }}>{p.field_pct != null ? `${formatPct(p.field_pct * 100, 1)} of field` : 'Under-owned'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--silver)', fontFamily: 'var(--font-data)', lineHeight: 1.6 }}>
            No isolated sub-5% plays this slate — the field is concentrated in the saturated teams above.
            Leverage comes from under-stacked teams (green) and the low-co-ownership pairs, not from a single contrarian punt.
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
