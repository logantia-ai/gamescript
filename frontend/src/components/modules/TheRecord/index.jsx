// MODULE 9 — The Record. Personal results tracker.
import { useEffect, useRef, useState } from 'react';
import { PageWrapper } from '../../layout/PageWrapper';
import { Card, StatCard } from '../../ui/Card';
import { Table } from '../../ui/Table';
import { Badge } from '../../ui/Badge';
import { PnlChart } from '../../ui/Chart';
import { Confetti } from '../../ui/Effects';
import { PaywallGate } from '../../ui/PaywallGate';
import { LoadingScreen } from '../../ui/Spinner';
import { useRecord } from '../../../hooks/useRecord';
import { useSubscription } from '../../../hooks/useSubscription';
import { formatCurrency, formatPct, formatNum } from '../../../lib/utils';

const RESULT_COLOR = { win: 'var(--green-text)', cash: 'var(--copper)', loss: 'var(--red-bright)', pending: 'var(--silver)' };

export function TheRecord() {
  const { record, loading } = useRecord();
  const { hasFeature } = useSubscription();

  // Celebrate when a winning result is logged (on load if one's on the books,
  // or live when the win count climbs). Green flash + confetti, one-shot.
  const [celebrate, setCelebrate] = useState(false);
  const prevWins = useRef(null);
  useEffect(() => {
    if (!record) return;
    const wins = (record.lineups || []).filter((l) => l.result === 'win').length;
    if ((prevWins.current === null && wins > 0) || (prevWins.current !== null && wins > prevWins.current)) {
      setCelebrate(false);
      // next frame so the animation re-triggers even on repeat wins
      requestAnimationFrame(() => setCelebrate(true));
      const id = setTimeout(() => setCelebrate(false), 1200);
      prevWins.current = wins;
      return () => clearTimeout(id);
    }
    prevWins.current = wins;
  }, [record]);

  if (loading) return <LoadingScreen label="Pulling your receipts…" />;

  const full = hasFeature('record_full_season');
  const s = record.stats;
  const lineups = full ? record.lineups : record.lineups.slice(0, 3);

  return (
    <PageWrapper eyebrow="RESULTS TRACKER" title="The Record" desc="Receipts don't lie. Every lineup. Every week.">
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <StatCard label="Season P&L" value={formatCurrency(s.season_pnl, { sign: true })} accent="var(--green-text)" />
        <StatCard label="Total ROI" value={formatPct(s.total_roi)} accent="var(--copper)" />
        <StatCard label="Cash Rate" value={formatPct(s.cash_rate)} accent="var(--green-text)" />
        <StatCard label="Best Week" value={formatCurrency(s.best_week, { sign: true })} accent="var(--copper)" />
        <StatCard label="Avg Score" value={formatNum(s.avg_score)} accent="var(--chalk)" />
      </div>

      <PaywallGate feature="performance_charts">
        <Card style={{ marginBottom: '24px' }}>
          <div className="eyebrow" style={{ marginBottom: '12px' }}>Cumulative P&L · Projection Accuracy</div>
          <PnlChart data={record.pnl_series} />
        </Card>
      </PaywallGate>

      <Card style={{ position: 'relative', overflow: 'hidden' }} className={celebrate ? 'gs-win-flash' : undefined}>
        <Confetti fire={celebrate} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="eyebrow">Lineup History</div>
          {!full && <Badge color="var(--copper)">Last 3 weeks — Coordinator unlocks full season</Badge>}
        </div>
        <Table
          columns={[
            { key: 'week', label: 'Wk' },
            { key: 'lineup_type', label: 'Type' },
            { key: 'actual_score', label: 'Score', align: 'right', render: (v) => formatNum(v) },
            { key: 'contest_name', label: 'Contest' },
            { key: 'entry_fee', label: 'Entry', align: 'right', render: (v) => formatCurrency(v) },
            { key: 'winnings', label: 'Won', align: 'right', render: (v) => formatCurrency(v) },
            { key: 'roi', label: 'ROI', align: 'right', render: (v) => formatPct(v, 0) },
            { key: 'result', label: 'Result', render: (v) => <span style={{ color: RESULT_COLOR[v] }}>{String(v).toUpperCase()}</span> },
          ]}
          rows={lineups}
          empty="No lineups tracked yet."
        />
      </Card>
    </PageWrapper>
  );
}
