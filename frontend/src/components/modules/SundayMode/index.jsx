// MODULE 8 — Sunday Mode. Fast guided lineup generator (Coordinator+).
// budget → anchor → constraints → optimizer seed refined by Claude → export/save.
import { useEffect, useMemo, useState } from 'react';
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
import { usePlayerData } from '../../../hooks/usePlayerData';
import { useLineups } from '../../../hooks/useLineups';
import { fetchLineups } from '../../../lib/api';
import { askClaude } from '../../../lib/claude';
import { lineupToDkCsv, downloadCsv } from '../../../lib/dkExport';

const STEPS = ['Budget', 'Anchor', 'Constraints'];

// Milliseconds until the next NFL main-slate lock (Sunday 1:00 PM ET).
// Both "now" and "target" are built from ET wall-clock numbers, so their
// difference is a valid duration regardless of the viewer's own timezone.
function msUntilLock() {
  const now = new Date();
  const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const target = new Date(etNow);
  target.setDate(etNow.getDate() + ((7 - etNow.getDay()) % 7));
  target.setHours(13, 0, 0, 0);
  if (target <= etNow) target.setDate(target.getDate() + 7);
  return target - etNow;
}

function fmtCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d > 0 ? `${d}d ` : ''}${pad(h)}:${pad(m)}:${pad(s)}`;
}

function CountdownToLock() {
  const [ms, setMs] = useState(() => msUntilLock());
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilLock()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = ms / 3_600_000;
  const color = hours < 1 ? 'var(--red-bright)' : hours < 3 ? 'var(--copper-bright)' : 'var(--green-text)';
  const status = hours < 1 ? 'LOCK IMMINENT' : hours < 3 ? 'LOCK APPROACHING' : 'TIME ON THE CLOCK';

  return (
    <Card style={{ marginBottom: '16px', borderLeft: `2px solid ${color}`, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: '6px' }}>Sunday Lock — 1:00 PM ET</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '34px', fontWeight: 700, lineHeight: 1, color, letterSpacing: '1px' }}>
          {fmtCountdown(ms)}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: '120px', textAlign: 'right' }}>
        <span style={{ fontSize: '10px', letterSpacing: '2px', color, fontFamily: 'var(--font-data)' }}>{status}</span>
      </div>
    </Card>
  );
}

const SYSTEM = `You are Sunday Mode, the fast lineup builder inside Game Script. You receive an optimizer-built
DraftKings NFL lineup as a starting point, plus the user's anchor player and constraints. Refine the
lineup to honor the anchor and constraints while staying under the $50,000 cap. Output markdown:
FINAL LINEUP:
- <POS> <Player> $<salary>  (9 players: QB, RB, RB, WR, WR, WR, TE, FLEX, DST)
TOTAL SALARY: $<n>
PROJECTED POINTS: <n>
CHANGES MADE:
- <what you swapped vs the optimizer seed and why>
GAME SCRIPT RATIONALE: <one paragraph>`;

export function SundayMode() {
  return (
    <PaywallGate feature="sunday_mode">
      <SundayModeInner />
    </PaywallGate>
  );
}

function parseFinalLineup(text) {
  const players = [];
  const lines = String(text || '').split('\n');
  const start = lines.findIndex((l) => /FINAL LINEUP/i.test(l));
  for (let i = start + 1; i < lines.length && start >= 0; i++) {
    const t = lines[i].trim();
    if (/^TOTAL SALARY|CHANGES MADE|PROJECTED/i.test(t)) break;
    const m = t.match(/^[-*•]\s*(QB|RB|WR|TE|DST|FLEX)\s+(.+?)\s*\$?\s*([0-9]{3,5})?$/i);
    if (m) players.push({ position: m[1].toUpperCase(), name: m[2].trim(), salary: m[3] ? Number(m[3]) : null });
  }
  return players;
}

function SundayModeInner() {
  const { players } = usePlayerData();
  const { save } = useLineups();

  const [step, setStep] = useState(0);
  const [budget, setBudget] = useState(50000);
  const [contest, setContest] = useState('GPP');
  const [anchor, setAnchor] = useState('');
  const [constraints, setConstraints] = useState('');
  const [seed, setSeed] = useState(null);
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchLineups().then((d) => setSeed(d)).catch(() => setSeed(null));
  }, []);

  const anchorOptions = useMemo(
    () => players.slice().sort((a, b) => (b.projection || 0) - (a.projection || 0))
      .map((p) => ({ value: p.player_name, label: `${p.player_name} · ${p.position} · ${(p.projection || 0).toFixed(1)}pts` })),
    [players]
  );

  // Pick the optimizer lineup that best matches the chosen contest type.
  const seedLineup = useMemo(() => {
    if (!seed) return null;
    const pools = seed.lineups || seed;
    if (Array.isArray(pools)) return pools[0];
    return pools?.[contest.toLowerCase()] || pools?.gpp || pools?.cash || Object.values(pools || {})[0];
  }, [seed, contest]);

  async function generate() {
    setBusy(true);
    setSaved(false);
    const seedText = seedLineup
      ? JSON.stringify(seedLineup).slice(0, 1500)
      : 'No optimizer seed available — build from scratch using strong values.';
    const prompt = `Contest: ${contest}\nSalary budget: $${budget}\nAnchor (must roster): ${anchor || 'none'}\nConstraints: ${constraints || 'none'}\n\nOptimizer seed lineup:\n${seedText}`;
    const { text, mock } = await askClaude({ module: 'sunday-mode', system: SYSTEM, prompt });
    setOut({ text, mock, players: parseFinalLineup(text) });
    setBusy(false);
  }

  async function saveToRecord() {
    if (!out) return;
    const total = out.players.reduce((s, p) => s + (p.salary || 0), 0);
    const { error } = await save({
      players: out.players,
      total_salary: total || null,
      lineup_type: 'sunday_mode',
      contest_type: contest,
      notes: out.text,
      result: 'pending',
    });
    setSaved(!error);
  }

  function exportDk() {
    if (!out?.players?.length) return;
    downloadCsv('gamescript_sunday_lineup.csv', lineupToDkCsv(out.players));
  }

  return (
    <PageWrapper
      eyebrow="FAST LINEUP GENERATOR"
      title="Sunday Mode"
      desc="Three quick decisions. One lineup. Out the door."
      actions={<Badge color={seedLineup ? 'var(--green-text)' : 'var(--silver)'}>{seedLineup ? 'Optimizer seed ready' : 'No seed'}</Badge>}
    >
      <CountdownToLock />

      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          {STEPS.map((s, i) => (
            <div key={s} onClick={() => setStep(i)} style={{ cursor: 'pointer', flex: 1, textAlign: 'center', padding: '8px', borderBottom: `2px solid ${i === step ? 'var(--copper)' : 'var(--border)'}`, color: i === step ? 'var(--copper)' : 'var(--chalk-dim)', fontFamily: 'var(--font-data)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' }}>
              {i + 1}. {s}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px' }}>
            <div><Label>Salary budget</Label><Input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></div>
            <div><Label>Contest type</Label><Select value={contest} onChange={(e) => setContest(e.target.value)} options={['GPP', 'Cash', 'Double Up', '50-50']} /></div>
          </div>
        )}
        {step === 1 && (
          <div><Label>Anchor player (build around)</Label><Select value={anchor} onChange={(e) => setAnchor(e.target.value)} options={[{ value: '', label: '— no anchor —' }, ...anchorOptions]} /></div>
        )}
        {step === 2 && (
          <div><Label>Constraints (e.g. "stack BUF", "avoid MIA", "max 1 TE")</Label><Input value={constraints} onChange={(e) => setConstraints(e.target.value)} placeholder="stack the QB with WR1, avoid chalk RBs" /></div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
          {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 2 && <Button variant="copper" onClick={() => setStep(step + 1)}>Next</Button>}
          {step === 2 && <Button onClick={generate} disabled={busy}>{busy ? <Spinner size={14} /> : 'Build Lineup'}</Button>}
        </div>
      </Card>

      {out && (
        <Card>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="eyebrow" style={{ flex: 1 }}>Refined Lineup</div>
            {out.mock && <Badge color="var(--copper)">Mock</Badge>}
            <Button variant="copper" onClick={exportDk} style={{ padding: '7px 14px' }}>Export DK CSV</Button>
            <Button onClick={saveToRecord} style={{ padding: '7px 14px' }}>Save to Record</Button>
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
