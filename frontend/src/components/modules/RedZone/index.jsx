// MODULE 6 — Red Zone. Lineup audit → graded, persisted to the lineups table.
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { PageWrapper } from '../../layout/PageWrapper';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Label } from '../../ui/Label';
import { Textarea } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { Spinner } from '../../ui/Spinner';
import { useSubscription } from '../../../hooks/useSubscription';
import { useLineups } from '../../../hooks/useLineups';
import { askClaude } from '../../../lib/claude';
import { gradeColor } from '../../../lib/utils';
import { parseGrade, parseLabeledLine, bulletsAfter } from '../../../lib/parseOutput';

const SYSTEM = `You are Red Zone, the lineup audit engine inside Game Script. Given a 9-player DraftKings NFL
lineup and a contest type, output markdown with these labels:
GRADE: <A-F>
CORRELATION: <STRONG|ADEQUATE|WEAK|NONE> — one line on stack quality
SALARY CONSTRUCTION: <efficiency, wasted cap>
BIAS FLAGS:
- <emotional picks by name>
GAME SCRIPT FIT: <alignment with Vegas>
OWNERSHIP PROFILE: <right for the contest type?>
SPECIFIC FIXES:
- <2-3 concrete swaps with reasoning>`;

const CORR_COLOR = { STRONG: 'var(--green-text)', ADEQUATE: 'var(--copper)', WEAK: 'var(--copper-bright)', NONE: 'var(--red-bright)' };

// Best-effort parse of a pasted DK lineup into players + total salary.
function parseLineup(text) {
  const players = [];
  let total = 0;
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const pos = (line.match(/\b(QB|RB|WR|TE|DST|FLEX|D\/ST)\b/i) || [])[1]?.toUpperCase();
    const salMatch = line.match(/\$?\s*([0-9]{3,5})\b/);
    const salary = salMatch ? Number(salMatch[1]) : null;
    let name = line;
    if (pos) name = name.replace(new RegExp(`\\b${pos.replace('/', '\\/')}\\b`, 'i'), '');
    if (salMatch) name = name.replace(salMatch[0], '');
    name = name.replace(/[$]/g, '').trim().replace(/\s{2,}/g, ' ');
    if (!name) continue;
    if (salary) total += salary;
    players.push({ position: pos === 'D/ST' ? 'DST' : pos || null, name, salary });
  }
  return { players, total_salary: total || null };
}

// --- Atmospheric football-field background with cycling play formations ---
// viewBox 0 0 100 160. Routes copper @0.12, players @0.10. War-room overlay.
const FORMATIONS = [
  { // I-formation — curl / post / out route tree
    routes: ['22,112 22,84 27,90', '40,112 40,80 54,66', '78,112 78,86 92,86', '60,112 60,92 50,86'],
    players: [[22, 112], [40, 112], [78, 112], [60, 112], [50, 112], [50, 126]],
  },
  { // Spread 4-wide — crossing routes
    routes: ['12,112 34,78', '34,112 12,78', '66,112 88,78', '88,112 66,78'],
    players: [[12, 112], [34, 112], [66, 112], [88, 112], [50, 112]],
  },
  { // Empty backfield — mesh concept
    routes: ['18,112 78,92', '82,112 22,92', '40,112 40,74', '62,112 62,74'],
    players: [[18, 112], [40, 112], [50, 112], [62, 112], [82, 112]],
  },
];

function RedZoneField() {
  const [f, setF] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setF((n) => (n + 1) % FORMATIONS.length), 8000);
    return () => clearInterval(t);
  }, []);
  const form = FORMATIONS[f];
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <svg viewBox="0 0 100 160" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* dark green field */}
        <rect x="0" y="0" width="100" height="160" fill="#0A1A0A" opacity="0.6" />
        {/* end zones — red glow top & bottom */}
        <rect x="0" y="0" width="100" height="16" fill="rgba(139,42,42,0.15)" />
        <rect x="0" y="144" width="100" height="16" fill="rgba(139,42,42,0.15)" />
        {/* yard lines every 10 yards */}
        {[16, 32, 48, 64, 80, 96, 112, 128, 144].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#FFFFFF" strokeWidth="0.4" opacity="0.06" />
        ))}
        {/* hash marks */}
        {[16, 32, 48, 64, 80, 96, 112, 128, 144].map((y) =>
          [30, 50, 70].map((x) => (
            <line key={`${y}-${x}`} x1={x} y1={y - 1} x2={x} y2={y + 1} stroke="#FFFFFF" strokeWidth="0.3" opacity="0.05" />
          ))
        )}
        {/* animated formation — remounts on cycle to re-run the draw-in */}
        <g key={f}>
          {form.routes.map((pts, i) => (
            <polyline key={i} className="gs-rz-route" points={pts} style={{ animationDelay: `${i * 120}ms` }} />
          ))}
          {form.players.map(([cx, cy], i) => (
            <circle key={i} className="gs-rz-player" cx={cx} cy={cy} r="1.6" />
          ))}
        </g>
      </svg>
      {/* center-field shield watermark */}
      <img
        src="/assets/GS_Shield.png"
        alt=""
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80px', height: 'auto', opacity: 0.04 }}
      />
    </div>
  );
}

export function RedZone() {
  const { hasFeature } = useSubscription();
  const unlimited = hasFeature('red_zone_unlimited');
  const { lineups, auditWeekCount, save } = useLineups();

  const [lineupText, setLineupText] = useState('');
  const [contest, setContest] = useState('GPP');
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const remaining = unlimited ? Infinity : Math.max(0, 1 - auditWeekCount);

  async function run() {
    setBusy(true);
    setSaved(false);
    const { text, mock } = await askClaude({
      module: 'red-zone',
      system: SYSTEM,
      prompt: `Contest type: ${contest}\n\nLineup:\n${lineupText}`,
    });

    const parsed = parseLineup(lineupText);
    const grade = parseGrade(text);
    const correlation = (parseLabeledLine(text, 'CORRELATION') || '').match(/STRONG|ADEQUATE|WEAK|NONE/i)?.[0]?.toUpperCase();
    const fixes = bulletsAfter(text, /SPECIFIC FIXES/i);
    const bias = bulletsAfter(text, /BIAS FLAGS/i);

    const record = {
      players: parsed.players,
      total_salary: parsed.total_salary,
      lineup_type: 'audit',
      contest_type: contest,
      lineup_grade: grade,
      notes: text,
      result: 'pending',
    };
    const { error } = await save(record);
    setOut({ text, mock, grade, correlation, fixes, bias });
    setSaved(!error);
    setBusy(false);
  }

  return (
    <PageWrapper
      eyebrow="LINEUP AUDIT"
      title="Red Zone"
      desc="Get your lineup where it needs to score."
      actions={<Badge color={remaining ? 'var(--copper)' : 'var(--red-bright)'}>{unlimited ? 'UNLIMITED' : `${remaining} of 1 left`}</Badge>}
    >
      <div style={{ position: 'relative' }}>
      <RedZoneField />
      <div style={{ position: 'relative', zIndex: 1 }}>
      <Card style={{ marginBottom: '16px' }}>
        <Label>Lineup (DraftKings format)</Label>
        <Textarea value={lineupText} onChange={(e) => setLineupText(e.target.value)} rows={9} placeholder={'QB Josh Allen $8200\nRB ...'} />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '12px' }}>
          <div style={{ width: '180px' }}>
            <Label>Contest type</Label>
            <Select value={contest} onChange={(e) => setContest(e.target.value)} options={['GPP', 'Cash', 'Double Up', '50-50', 'Satellite']} />
          </div>
          <Button onClick={run} disabled={busy || !lineupText.trim() || remaining <= 0}>
            {busy ? <Spinner size={14} /> : 'Audit Lineup'}
          </Button>
        </div>
        {remaining <= 0 && !unlimited && (
          <span style={{ marginLeft: '12px', fontSize: '12px', color: 'var(--red-bright)', fontFamily: 'var(--font-data)' }}>
            Weekly limit reached — upgrade to Coordinator for unlimited audits.
          </span>
        )}
      </Card>

      {out && (
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {out.grade && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '44px', lineHeight: 1, color: gradeColor(out.grade) }}>{out.grade}</div>
                <div className="eyebrow">Grade</div>
              </div>
            )}
            {out.correlation && <Badge color={CORR_COLOR[out.correlation] || 'var(--silver)'}>Correlation: {out.correlation}</Badge>}
            {out.mock && <Badge color="var(--copper)">Mock</Badge>}
            {saved && <Badge color="var(--green-text)">Saved</Badge>}
          </div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '13px', lineHeight: 1.7 }}>
            <ReactMarkdown>{out.text}</ReactMarkdown>
          </div>
        </Card>
      )}

      {lineups.filter((l) => l.lineup_type === 'audit').length > 0 && (
        <Card>
          <div className="eyebrow" style={{ marginBottom: '10px' }}>Recent Audits</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {lineups.filter((l) => l.lineup_type === 'audit').slice(0, 6).map((l) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'var(--font-data)', fontSize: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                <span style={{ color: gradeColor(l.lineup_grade), fontWeight: 600, width: '24px' }}>{l.lineup_grade || '—'}</span>
                <span style={{ color: 'var(--chalk)', flex: 1 }}>{l.contest_type} · {l.players?.length || 0} players</span>
                <span style={{ color: 'var(--silver)' }}>{l.total_salary ? `$${l.total_salary}` : ''}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      </div>
      </div>
    </PageWrapper>
  );
}
