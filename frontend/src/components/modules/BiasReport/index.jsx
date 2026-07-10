// MODULE 18 — Personal Bias Report. Self-scout from your own lineup history (Coordinator+).
// Requires >= 6 weeks of lineup data. Generates at Week 9 / end of season, or on demand.
import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PageWrapper } from '../../layout/PageWrapper';
import { PaywallGate } from '../../ui/PaywallGate';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Spinner } from '../../ui/Spinner';
import { useLineups } from '../../../hooks/useLineups';
import { useTableRows } from '../../../hooks/useTableRows';
import { askClaude } from '../../../lib/claude';

const MIN_WEEKS = 6;

const SYSTEM = `You are the Personal Bias Report engine inside Game Script, an NFL DFS platform.
Given a summary of a user's historical lineups, self-scout their tendencies. Output markdown with exactly these sections:
## Team Bias
Teams over-rostered relative to leverage; flag fan/recency bias by team name.
## Position Bias
Positions consistently overpaid or underpaid vs optimal salary allocation.
## Ownership Tendency
Their average GPP ownership vs the recommended contrarian range.
## Stacking Grade
A single A-F grade for the correlation quality of their lineups, with one line of reasoning.
## Emotional Play Frequency
Estimate the % of plays that look like emotional/biased picks.
## Cash Rate & GPP ROI
Comment on their results in context.
## Improvement Plan
A specific 5-point plan for next season, each point tied to a bias you identified above.
Be direct and specific. Reference real team and position patterns from the data.`;

export function BiasReport() {
  return (
    <PaywallGate feature="personal_bias_report">
      <BiasReportInner />
    </PaywallGate>
  );
}

function summarizeLineups(lineups) {
  const teamCounts = {};
  const posSpend = {};
  let ownSum = 0;
  let ownN = 0;
  let pnl = 0;
  const weeks = new Set();

  lineups.forEach((l) => {
    if (l.week != null) weeks.add(`${l.season}-${l.week}`);
    if (typeof l.winnings === 'number' && typeof l.entry_fee === 'number') pnl += l.winnings - l.entry_fee;
    const players = Array.isArray(l.players) ? l.players : l.lineup || [];
    players.forEach((p) => {
      const team = p.team || p.recent_team;
      if (team) teamCounts[team] = (teamCounts[team] || 0) + 1;
      if (p.position) posSpend[p.position] = (posSpend[p.position] || 0) + (Number(p.salary) || 0);
      if (p.projected_ownership != null) {
        ownSum += Number(p.projected_ownership);
        ownN++;
      }
    });
  });

  const topTeams = Object.entries(teamCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return {
    weekCount: weeks.size,
    lineupCount: lineups.length,
    text: [
      `Lineups tracked: ${lineups.length} across ${weeks.size} weeks.`,
      `Most-rostered teams: ${topTeams.map(([t, n]) => `${t} (${n})`).join(', ') || 'n/a'}.`,
      `Salary by position: ${Object.entries(posSpend).map(([p, s]) => `${p} $${Math.round(s).toLocaleString()}`).join(', ') || 'n/a'}.`,
      `Average rostered ownership: ${ownN ? (ownSum / ownN).toFixed(1) + '%' : 'n/a'}.`,
      `Net P&L over the sample: $${pnl.toFixed(0)}.`,
    ].join('\n'),
  };
}

function BiasReportInner() {
  const { lineups, loading } = useLineups();
  const { save } = useTableRows('bias_profiles');

  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const summary = useMemo(() => summarizeLineups(lineups || []), [lineups]);
  const enoughData = summary.weekCount >= MIN_WEEKS;

  async function generate() {
    setBusy(true);
    setSaved(false);
    const { text, mock } = await askClaude({
      module: 'bias-report',
      system: SYSTEM,
      prompt: `Here is the user's lineup history:\n\n${summary.text}\n\nProduce their Personal Bias Report.`,
    });
    const { error } = await save({
      week_count: summary.weekCount,
      lineup_count: summary.lineupCount,
      report: text,
    });
    setOut({ text, mock });
    setSaved(!error);
    setBusy(false);
  }

  if (loading) return <PageWrapper eyebrow="SELF-SCOUT" title="Personal Bias Report" desc="Loading your history…" />;

  return (
    <PageWrapper
      eyebrow="SELF-SCOUT"
      title="Personal Bias Report"
      desc="The patterns you can't see in your own play."
      actions={<Badge color={enoughData ? 'var(--copper)' : 'var(--silver)'}>{summary.weekCount} / {MIN_WEEKS} weeks</Badge>}
    >
      {!enoughData ? (
        <Card>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '13px', color: 'var(--silver)', lineHeight: 1.7 }}>
            The Bias Report needs at least <strong style={{ color: 'var(--chalk)' }}>{MIN_WEEKS} weeks</strong> of lineup data
            to find reliable patterns. You currently have <strong style={{ color: 'var(--copper)' }}>{summary.weekCount}</strong>.
            Keep logging lineups in The Record — it auto-generates at Week 9 and end of season once you cross the threshold.
          </div>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="eyebrow">Self-Scout — {summary.lineupCount} lineups, {summary.weekCount} weeks</div>
              <Button onClick={generate} disabled={busy}>{busy ? <Spinner size={14} /> : out ? 'Regenerate' : 'Generate Bias Report'}</Button>
            </div>
          </Card>

          {out && (
            <Card>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                {out.mock && <Badge color="var(--copper)">Mock output — set ANTHROPIC_API_KEY on the backend</Badge>}
                {saved && <Badge color="var(--green-text)">Saved</Badge>}
              </div>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: '13px', lineHeight: 1.7 }}>
                <ReactMarkdown>{out.text}</ReactMarkdown>
              </div>
            </Card>
          )}
        </>
      )}
    </PageWrapper>
  );
}
