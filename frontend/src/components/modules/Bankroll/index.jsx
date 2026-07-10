// MODULE 12 — Bankroll. Kelly-based bet sizing & weekly log (Coordinator+).
import { useEffect, useMemo, useState } from 'react';
import { PageWrapper } from '../../layout/PageWrapper';
import { PaywallGate } from '../../ui/PaywallGate';
import { Card, StatCard } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Label } from '../../ui/Label';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { PnlChart } from '../../ui/Chart';
import { useTableRows } from '../../../hooks/useTableRows';
import { useRecord } from '../../../hooks/useRecord';
import { formatCurrency, formatPct } from '../../../lib/utils';

// Placeholder season averages, used until The Record has real numbers to pull.
const PLACEHOLDER_WIN_RATE = 0.18; // GPP cash-rate-ish
const PLACEHOLDER_ROI = 0.5;       // expected ROI on winning entries

const RISK = {
  Conservative: { kellyFraction: 0.25, maxExposure: 0.33, gpp: 0.4 },
  Standard: { kellyFraction: 0.5, maxExposure: 0.5, gpp: 0.6 },
  Aggressive: { kellyFraction: 1.0, maxExposure: 0.67, gpp: 0.75 },
};

export function Bankroll() {
  return (
    <PaywallGate feature="bankroll_module">
      <BankrollInner />
    </PaywallGate>
  );
}

function BankrollInner() {
  const { rows, save } = useTableRows('bankroll_entries');
  const { record } = useRecord();

  const [bankroll, setBankroll] = useState(1000);
  const [winRate, setWinRate] = useState(PLACEHOLDER_WIN_RATE);
  const [roi, setRoi] = useState(PLACEHOLDER_ROI);
  const [risk, setRisk] = useState('Standard');
  const [saved, setSaved] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  // The Record stores cash rate as a percentage; Kelly here works in fractions.
  // Pull historical win rate (cash rate) when available. Expected ROI is NOT
  // auto-filled — it stays a manual placeholder input.
  const hist = useMemo(() => {
    const s = record?.stats;
    if (!s || s.cash_rate == null) return null;
    return {
      winRate: Number((s.cash_rate / 100).toFixed(4)),
    };
  }, [record]);

  // Auto-populate Win Rate from The Record once, before the user has touched it.
  // Manual edits afterward are preserved. ROI is left untouched (manual input).
  useEffect(() => {
    if (!autoFilled && hist) {
      setWinRate(hist.winRate);
      setAutoFilled(true);
    }
  }, [hist, autoFilled]);

  const cfg = RISK[risk];

  // Kelly fraction of bankroll to put in play this week.
  // f* = (ROI·p − (1−p)) / ROI, then scaled by the risk-tolerance fraction.
  const calc = useMemo(() => {
    const p = Math.min(0.99, Math.max(0.01, Number(winRate) || 0));
    const b = Math.max(0.01, Number(roi) || 0);
    const fullKelly = (b * p - (1 - p)) / b;
    const f = Math.max(0, fullKelly) * cfg.kellyFraction;
    const totalSpend = bankroll * f;
    return {
      fullKelly,
      f,
      totalSpend,
      gppSpend: totalSpend * cfg.gpp,
      cashSpend: totalSpend * (1 - cfg.gpp),
      maxPerLineup: totalSpend * cfg.maxExposure,
    };
  }, [bankroll, winRate, roi, cfg]);

  async function logWeek() {
    const { error } = await save({
      bankroll,
      win_rate: winRate,
      expected_roi: roi,
      risk_profile: risk,
      recommended_spend: Number(calc.totalSpend.toFixed(2)),
      gpp_spend: Number(calc.gppSpend.toFixed(2)),
      cash_spend: Number(calc.cashSpend.toFixed(2)),
    });
    setSaved(!error);
  }

  // Season curve from logged entries (oldest → newest).
  const curve = useMemo(() => {
    const sorted = [...rows].reverse();
    return sorted.map((r, i) => ({ week: r.week ?? i + 1, cumulative: Number(r.bankroll) || 0 }));
  }, [rows]);

  return (
    <PageWrapper
      eyebrow="BET SIZING"
      title="Bankroll"
      desc="Bet the math, not the gut. Kelly-sized allocation."
      actions={<Badge>{risk}</Badge>}
    >
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px' }}>
          <div><Label>Bankroll ($)</Label><Input type="number" value={bankroll} onChange={(e) => setBankroll(Number(e.target.value))} /></div>
          <div><Label>Win / cash rate</Label><Input type="number" step="0.01" value={winRate} placeholder={String(PLACEHOLDER_WIN_RATE)} onChange={(e) => { setAutoFilled(true); setWinRate(Number(e.target.value)); }} /></div>
          <div><Label>Expected ROI (on wins)</Label><Input type="number" step="0.05" value={roi} placeholder={String(PLACEHOLDER_ROI)} onChange={(e) => setRoi(Number(e.target.value))} /></div>
          <div><Label>Risk profile</Label><Select value={risk} onChange={(e) => setRisk(e.target.value)} options={Object.keys(RISK)} /></div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--silver)', fontFamily: 'var(--font-data)' }}>
          {hist
            ? '◈ Win rate auto-filled from The Record. Edit to override. Expected ROI is a manual placeholder.'
            : '◈ No history yet — showing season-average placeholders. Track lineups in The Record to auto-fill win rate.'}
        </div>
      </Card>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <StatCard label="Kelly Edge (full)" value={formatPct(calc.fullKelly * 100, 1)} sub={`${formatPct(cfg.kellyFraction * 100, 0)} Kelly applied`} accent={calc.fullKelly > 0 ? 'var(--green-text)' : 'var(--red-bright)'} />
        <StatCard label="Weekly Spend" value={formatCurrency(calc.totalSpend)} sub={`${formatPct(calc.f * 100, 1)} of bankroll`} />
        <StatCard label="GPP / Cash" value={`${formatCurrency(calc.gppSpend)}`} sub={`+ ${formatCurrency(calc.cashSpend)} cash`} accent="var(--copper-bright)" />
        <StatCard label="Max / Lineup" value={formatCurrency(calc.maxPerLineup)} sub={`${formatPct(cfg.maxExposure * 100, 0)} max exposure`} accent="var(--silver)" />
      </div>

      {calc.fullKelly <= 0 && (
        <Card style={{ marginBottom: '16px', borderColor: 'var(--red-bright)' }}>
          <div style={{ color: 'var(--red-bright)', fontFamily: 'var(--font-data)', fontSize: '12px' }}>
            Negative Kelly edge — at this win rate and ROI the math says sit out or lower stakes until your edge is positive.
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
        <Button onClick={logWeek}>Log This Week</Button>
        {saved && <Badge color="var(--green-text)">Saved to bankroll log</Badge>}
      </div>

      {curve.length > 0 && (
        <Card>
          <div className="eyebrow" style={{ marginBottom: '10px' }}>Bankroll Curve</div>
          <PnlChart data={curve} xKey="week" valueKey="cumulative" accuracyKey={null} />
        </Card>
      )}
    </PageWrapper>
  );
}
