// MODULE 13 — Contest IQ. Contest selection advisor (Coordinator+).
import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PageWrapper } from '../../layout/PageWrapper';
import { PaywallGate } from '../../ui/PaywallGate';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Label } from '../../ui/Label';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { Spinner } from '../../ui/Spinner';
import { useSlateData } from '../../../hooks/useSlateData';
import { askClaude } from '../../../lib/claude';

const SYSTEM = `You are Contest IQ inside Game Script. Given a lineup profile (average ownership, leverage, stack
type, ceiling) and bankroll context, recommend which DraftKings contests to enter. Output markdown:
BEST FIT: <contest type + field size, one line>
RANKED CONTESTS:
1. <contest type / field size> — <why it fits this lineup>
2. ...
3. ...
ENTRY STRATEGY: <how many entries, what % of bankroll>
MISMATCH WARNINGS:
- <e.g. high-ownership lineup in a large-field GPP = bad>`;

export function ContestIQ() {
  return (
    <PaywallGate feature="contest_iq">
      <ContestIQInner />
    </PaywallGate>
  );
}

function ContestIQInner() {
  const { slate } = useSlateData();
  const [ownership, setOwnership] = useState(18);
  const [leverage, setLeverage] = useState('Medium');
  const [stack, setStack] = useState('Standard');
  const [ceiling, setCeiling] = useState('High');
  const [risk, setRisk] = useState('Balanced');
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);

  // Field-size context from the slate report, when available.
  const fieldCtx = useMemo(() => {
    if (!slate) return 'No slate context loaded.';
    const chalk = (slate.chalk_warnings || []).slice(0, 3).map((c) => `${c.player_name} (${c.projected_ownership}%)`).join(', ');
    return `Slate week ${slate.week ?? '?'} — top chalk: ${chalk || 'n/a'}.`;
  }, [slate]);

  async function run() {
    setBusy(true);
    const prompt = `Lineup profile:\n- Average ownership: ${ownership}%\n- Leverage: ${leverage}\n- Stack type: ${stack}\n- Ceiling: ${ceiling}\n- Risk tolerance: ${risk}\n\nField context: ${fieldCtx}\n\nWeight your contest recommendations to the user's risk tolerance: Safe = prioritize cash/50-50 and small-field, capital preservation; Balanced = a mix of cash and mid-size GPPs; Aggressive = lean into large-field GPPs and tournament upside.`;
    const { text, mock } = await askClaude({ module: 'contest-iq', system: SYSTEM, prompt });
    setOut({ text, mock });
    setBusy(false);
  }

  // Quick heuristic mismatch flag, shown before Claude even runs.
  const heuristicWarning =
    ownership >= 25 ? 'High average ownership — risky in large-field GPPs; better suited to cash/50-50.' :
    ownership <= 8 ? 'Very low ownership — high variance; reserve for large GPPs, avoid cash.' : null;

  return (
    <PageWrapper
      eyebrow="CONTEST SELECTION"
      title="Contest IQ"
      desc="The right lineup in the wrong contest still loses."
    >
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px' }}>
          <div><Label>Avg ownership %</Label><Input type="number" value={ownership} onChange={(e) => setOwnership(Number(e.target.value))} /></div>
          <div><Label>Leverage</Label><Select value={leverage} onChange={(e) => setLeverage(e.target.value)} options={['Low', 'Medium', 'High']} /></div>
          <div><Label>Stack type</Label><Select value={stack} onChange={(e) => setStack(e.target.value)} options={['None', 'Mini', 'Standard', 'Mega', 'Bring-back']} /></div>
          <div><Label>Ceiling</Label><Select value={ceiling} onChange={(e) => setCeiling(e.target.value)} options={['Low', 'Medium', 'High']} /></div>
          <div><Label>Risk tolerance</Label><Select value={risk} onChange={(e) => setRisk(e.target.value)} options={['Safe', 'Balanced', 'Aggressive']} /></div>
        </div>
        {heuristicWarning && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--copper-bright)', fontFamily: 'var(--font-data)' }}>⚠ {heuristicWarning}</div>
        )}
        <Button onClick={run} disabled={busy} style={{ marginTop: '14px' }}>{busy ? <Spinner size={14} /> : 'Recommend Contests'}</Button>
      </Card>

      {out && (
        <Card>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
            <div className="eyebrow" style={{ flex: 1 }}>Recommendations</div>
            {out.mock && <Badge color="var(--copper)">Mock</Badge>}
          </div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '13px', lineHeight: 1.7 }}>
            <ReactMarkdown>{out.text}</ReactMarkdown>
          </div>
        </Card>
      )}
    </PageWrapper>
  );
}
