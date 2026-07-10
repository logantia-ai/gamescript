// MODULE 11 — Late Swap. Sunday-morning emergency adjustment (Coordinator+).
// Paste lineup + name the scratch → 3 leverage-ranked replacements + DK export.
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PageWrapper } from '../../layout/PageWrapper';
import { PaywallGate } from '../../ui/PaywallGate';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Label } from '../../ui/Label';
import { Input, Textarea } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { Spinner } from '../../ui/Spinner';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { askClaude } from '../../../lib/claude';
import { leverageColor, formatNum } from '../../../lib/utils';
import { lineupToDkCsv, downloadCsv } from '../../../lib/dkExport';

const SYSTEM = `You are Late Swap inside Game Script. A DraftKings NFL player has been scratched from a locked
lineup. Given the lineup, the scratched player, and three candidate replacements (same position, salary
that fits), recommend the best swap. Output markdown:
SCRATCH IMPACT: <salary slot freed, ownership shift, one line>
RECOMMENDED SWAP: <player> — <one-line why (leverage, matchup, salary fit)>
RANKED OPTIONS:
1. <player> — <reason>
2. <player> — <reason>
3. <player> — <reason>
SALARY CHECK: <does it fit under cap>`;

// Next Sunday 1:00 PM ET as the default lock. Pure client-side, so Date is fine.
function nextLock() {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay();
  const daysUntilSun = (7 - day) % 7;
  d.setDate(d.getDate() + daysUntilSun);
  d.setHours(13, 0, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 7);
  return d;
}

export function LateSwap() {
  return (
    <PaywallGate feature="late_swap">
      <LateSwapInner />
    </PaywallGate>
  );
}

function LateSwapInner() {
  const { players } = usePlayerData();
  const [lineupText, setLineupText] = useState('');
  const [scratch, setScratch] = useState('');
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lock] = useState(nextLock);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const msLeft = lock - now;
  const locked = msLeft <= 0;
  const mins = Math.max(0, Math.floor(msLeft / 60000));
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  const ss = String(Math.max(0, Math.floor((msLeft % 60000) / 1000))).padStart(2, '0');
  const urgent = mins < 15;

  // Replacement pool: same position as the scratched player, ranked by leverage.
  const scratchPlayer = useMemo(
    () => players.find((p) => p.player_name?.toLowerCase() === scratch.trim().toLowerCase()),
    [players, scratch]
  );
  const options = useMemo(() => {
    if (!scratchPlayer) return [];
    return players
      .filter((p) => p.position === scratchPlayer.position && p.player_name !== scratchPlayer.player_name)
      .filter((p) => (Number(p.salary) || 0) <= (Number(scratchPlayer.salary) || 99999) + 500)
      .sort((a, b) => (b.leverage_score || 0) - (a.leverage_score || 0))
      .slice(0, 3);
  }, [players, scratchPlayer]);

  async function run() {
    setBusy(true);
    const optText = options.length
      ? options.map((o, i) => `${i + 1}. ${o.player_name} $${o.salary} · lev ${formatNum(o.leverage_score, 0)} · proj ${formatNum(o.projection)}`).join('\n')
      : 'No projection pool loaded — infer reasonable same-position replacements.';
    const prompt = `Locked lineup:\n${lineupText}\n\nScratched: ${scratch}${scratchPlayer ? ` (${scratchPlayer.position}, $${scratchPlayer.salary})` : ''}\n\nCandidate replacements:\n${optText}`;
    const { text, mock } = await askClaude({ module: 'late-swap', system: SYSTEM, prompt });
    setOut({ text, mock });
    setBusy(false);
  }

  function exportDk() {
    // Swap the scratched line for the top option in the pasted lineup, best-effort.
    const top = options[0];
    const lines = lineupText.split('\n').map((l) =>
      top && scratch && l.toLowerCase().includes(scratch.toLowerCase())
        ? `${scratchPlayer?.position || ''} ${top.player_name} $${top.salary}`.trim()
        : l
    );
    const parsed = lines.map((l) => {
      const pos = (l.match(/\b(QB|RB|WR|TE|DST|FLEX)\b/i) || [])[1]?.toUpperCase();
      const name = l.replace(/\b(QB|RB|WR|TE|DST|FLEX)\b/i, '').replace(/\$?\s*\d{3,5}/, '').trim();
      return { position: pos, name };
    }).filter((p) => p.name);
    downloadCsv('gamescript_late_swap.csv', lineupToDkCsv(parsed));
  }

  return (
    <PageWrapper
      eyebrow="EMERGENCY ADJUSTMENT"
      title="Late Swap"
      desc="A scratch isn't a disaster — it's a swap."
      actions={
        <Badge color={locked ? 'var(--red-bright)' : urgent ? 'var(--red-bright)' : 'var(--copper)'}>
          {locked ? 'LOCKED' : `${hh}:${mm}:${ss} to lock`}
        </Badge>
      }
    >
      <Card style={{ marginBottom: '16px' }}>
        <Label>Current locked lineup</Label>
        <Textarea rows={9} value={lineupText} onChange={(e) => setLineupText(e.target.value)} placeholder={'QB Josh Allen $8200\nRB ...'} />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <Label>Scratched player</Label>
            <Input value={scratch} onChange={(e) => setScratch(e.target.value)} placeholder="exact player name" />
          </div>
          <Button onClick={run} disabled={busy || !lineupText.trim() || !scratch.trim()}>{busy ? <Spinner size={14} /> : 'Find Replacements'}</Button>
        </div>
        {scratchPlayer && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--silver)', fontFamily: 'var(--font-data)' }}>
            Detected: {scratchPlayer.player_name} · {scratchPlayer.position} · ${scratchPlayer.salary} — freeing this slot.
          </div>
        )}
      </Card>

      {options.length > 0 && (
        <Card style={{ marginBottom: '16px' }}>
          <div className="eyebrow" style={{ marginBottom: '8px' }}>Replacement Options (leverage-ranked)</div>
          {options.map((o, i) => (
            <div key={o.player_name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-data)', fontSize: '12px' }}>
              <span style={{ color: 'var(--copper)', width: '18px' }}>{i + 1}</span>
              <span style={{ flex: 1, color: 'var(--chalk)' }}>{o.player_name}</span>
              <span style={{ color: leverageColor(o.leverage_score), width: '80px', textAlign: 'right' }}>lev {formatNum(o.leverage_score, 0)}</span>
              <span style={{ color: 'var(--silver)', width: '80px', textAlign: 'right' }}>{formatNum(o.projection)} pts</span>
              <span style={{ color: 'var(--silver)', width: '64px', textAlign: 'right' }}>${o.salary}</span>
            </div>
          ))}
          <Button variant="copper" onClick={exportDk} style={{ marginTop: '12px', padding: '7px 14px' }}>Export Updated DK CSV</Button>
        </Card>
      )}

      {out && (
        <Card>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
            <div className="eyebrow" style={{ flex: 1 }}>Swap Recommendation</div>
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
