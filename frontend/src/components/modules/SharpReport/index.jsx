// MODULE 2 — Sharp Report (+ The Tell tab). Data-driven decisions + AI read.
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PageWrapper } from '../../layout/PageWrapper';
import { Card } from '../../ui/Card';
import { RadarPulse } from '../../ui/Effects';
import { VoiceBriefing } from '../../ui/VoiceBriefing';
import { Tabs } from '../../ui/Tabs';
import { Button } from '../../ui/Button';
import { Label } from '../../ui/Label';
import { Textarea } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { Spinner, LoadingScreen } from '../../ui/Spinner';
import { PaywallGate } from '../../ui/PaywallGate';
import { useSubscription } from '../../../hooks/useSubscription';
import { useSlateData } from '../../../hooks/useSlateData';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { askClaude } from '../../../lib/claude';
import { formatNum, formatPct, leverageColor } from '../../../lib/utils';
import { deriveDecisions, buildSlateContext } from './deriveDecisions';

const SOURCE_LABEL = { supabase: 'Live · Supabase', api: 'Live · Pipeline', mock: 'Sample data' };

// ---- Slate archetype classification (Task 16), client-side from slate signals ---- //
const ARCHETYPES = [
  { name: 'High Scoring Shootout', winners: 'QB1 with pass catchers, points stacks, receiver-heavy builds.', matches: ['Week 14 2023', 'Week 6 2022', 'Week 11 2021'] },
  { name: 'Low Total Grind', winners: 'RBs, defense, contrarian pass catchers in other games.', matches: ['Week 9 2023', 'Week 13 2022'] },
  { name: 'Injury Ravaged Slate', winners: 'Replacement-level players at low ownership.', matches: ['Week 12 2023', 'Week 4 2022'] },
  { name: 'Weather Impacted', winners: 'RBs, DST, dome-game pass catchers.', matches: ['Week 17 2022', 'Week 14 2021'] },
  { name: 'Primetime Heavy', winners: 'Fade primetime chalk, target afternoon games for leverage.', matches: [] },
];

function classifyArchetype(slate) {
  const weather = slate?.weather_alerts || [];
  const stacks = slate?.top_stacks || [];
  const topImplied = Math.max(0, ...stacks.map((s) => s.implied_total || 0));
  let name = 'High Scoring Shootout';
  let confidence = 64;
  if (weather.length >= 2) { name = 'Weather Impacted'; confidence = 74; }
  else if (topImplied && topImplied < 22) { name = 'Low Total Grind'; confidence = 70; }
  else if (topImplied >= 27) { name = 'High Scoring Shootout'; confidence = 76; }
  const a = ARCHETYPES.find((x) => x.name === name) || ARCHETYPES[0];
  return { ...a, confidence };
}

// Build the sports-radio briefing script (Task 12) from live slate data.
function buildBriefingScript(slate, decisions, players, contest) {
  const h = new Date().getHours();
  const tod = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  const week = slate?.week ?? '—';
  const year = slate?.season ?? '';
  const stack = slate?.top_stacks?.[0];
  const topLev = [...(players || [])].sort((a, b) => (b.leverage_score || 0) - (a.leverage_score || 0))[0];
  const fade = slate?.chalk_warnings?.[0];
  const diff = slate?.contrarian_spots?.[0];
  const cash = [...(players || [])].sort((a, b) => (b.confidence_pct || 0) - (a.confidence_pct || 0))[0];
  const pct = (v) => (v == null ? '—' : `${Math.round(v)} percent`);
  const lines = [
    `Good ${tod}. Here is your Game Script Sharp Report for Week ${week} of the ${year} NFL season.`,
  ];
  if (stack) lines.push(`Your best stack this week: ${stack.qb} with ${(stack.partners || []).join(' and ')} off a ${stack.implied_total} implied total. Leverage score: ${stack.leverage}.`);
  if (topLev) lines.push(`Top leverage play: ${topLev.player_name}, ${topLev.position}, projected at just ${pct(topLev.projected_ownership)} owned with a projection of ${topLev.projection} points.`);
  if (fade) lines.push(`Top fade: ${fade.player_name} at ${pct(fade.projected_ownership)} owned.`);
  if (diff) lines.push(`Best GPP differentiator: ${diff.player_name} at ${pct(diff.projected_ownership)} owned with a leverage score of ${diff.leverage_score}.`);
  if (cash) lines.push(`Best cash anchor: ${cash.player_name} with ${pct(cash.confidence_pct)} confidence.`);
  lines.push(`You are building for ${contest.toUpperCase()} this week. Game Script says: Read the script. Win the slate. Good luck.`);
  return lines.join(' ');
}

// --------------------------------------------------------------------------- //
function DecisionCard({ d }) {
  return (
    <Card style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--copper)' }}>
          {String(d.n).padStart(2, '0')}
        </span>
        <span className="eyebrow">{d.title}</span>
      </div>
      <div style={{ fontSize: '16px', color: 'var(--chalk)', fontFamily: 'var(--font-data)', marginBottom: '10px' }}>
        {d.headline}
      </div>
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {d.stats.map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: '8px', letterSpacing: '2px', color: 'var(--chalk-dim)', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '14px', color: s.color || 'var(--chalk)' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--silver)', lineHeight: 1.6 }}>{d.rationale}</div>
    </Card>
  );
}

function PlayerList({ title, rows, accent }) {
  if (!rows?.length) return null;
  return (
    <Card style={{ marginBottom: '12px' }}>
      <div className="eyebrow" style={{ marginBottom: '10px' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {rows.slice(0, 5).map((p, i) => (
          <div key={(p.player_name || '') + i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-data)', fontSize: '12px' }}>
            <span style={{ color: 'var(--chalk)' }}>{p.player_name}{p.position ? ` · ${p.position}` : ''}</span>
            <span style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: 'var(--silver)' }}>{formatPct(p.projected_ownership, 0)}</span>
              <span style={{ color: accent || leverageColor(p.leverage_score) }}>{formatNum(p.leverage_score, 0)}</span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------------- //
const SHARP_SYSTEM = `You are the Sharp Report engine inside Game Script, an NFL DraftKings DFS platform.
You are given the slate's pre-computed Top 5 Decisions plus chalk, contrarian, weather and scarcity data.
Write a concise, opinionated strategic read in markdown with these sections:
## The Read  (2-3 sentences tying the decisions together)
## GPP Strategy  (how to build for tournaments this slate)
## Cash Strategy  (how to build for cash)
Be specific, reference the players by name, and don't hedge.`;

function SharpReportTab() {
  const { hasFeature } = useSubscription();
  const full = hasFeature('sharp_report_full');
  const { slate, loading, source } = useSlateData();
  const { players } = usePlayerData();

  const [contest, setContest] = useState('gpp');
  const [notes, setNotes] = useState('');
  const [read, setRead] = useState(null);
  const [busy, setBusy] = useState(false);
  // Radar sweeps fast while generating and briefly after the read lands.
  const [radarFast, setRadarFast] = useState(false);
  const radarTimer = useRef(null);
  useEffect(() => {
    if (!read) return;
    setRadarFast(true);
    radarTimer.current = setTimeout(() => setRadarFast(false), 2500);
    return () => clearTimeout(radarTimer.current);
  }, [read]);

  const decisions = useMemo(() => deriveDecisions(slate, players), [slate, players]);
  const archetype = useMemo(() => classifyArchetype(slate), [slate]);
  const briefing = useMemo(() => buildBriefingScript(slate, decisions, players, contest), [slate, decisions, players, contest]);

  async function generate() {
    setBusy(true);
    const context = buildSlateContext(slate, decisions);
    const { text, mock } = await askClaude({
      module: 'sharp-report',
      system: SHARP_SYSTEM,
      prompt: `Contest focus: ${contest.toUpperCase()}\n\n${context}${notes ? `\n\nUser notes: ${notes}` : ''}`,
    });
    setRead({ text, mock });
    setBusy(false);
  }

  if (loading) return <LoadingScreen label="Reading the slate…" />;

  const visible = full ? decisions : decisions.slice(0, 3);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span className="eyebrow">Top 5 Decisions</span>
        <VoiceBriefing script={briefing} />
        {source && <Badge color="var(--silver)">{SOURCE_LABEL[source]}</Badge>}
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {['gpp', 'cash'].map((c) => (
            <Button key={c} variant={contest === c ? 'copper' : 'ghost'} onClick={() => setContest(c)} style={{ padding: '7px 14px' }}>
              {c}
            </Button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {visible.map((d) => (
          <DecisionCard key={d.n} d={d} />
        ))}
      </div>

      {/* THIS WEEK'S SLATE ARCHETYPE (Task 16) */}
      <Card style={{ marginBottom: '16px', borderLeft: '3px solid var(--copper)' }}>
        <div className="eyebrow" style={{ marginBottom: '8px' }}>This Week's Slate Archetype</div>
        <div style={{ fontSize: '18px', color: 'var(--copper)', fontFamily: 'var(--font-display)' }}>
          {archetype.name}
          <span style={{ fontSize: '11px', color: 'var(--chalk-dim)', fontFamily: 'var(--font-data)' }}> · {archetype.confidence}% confidence</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--silver)', marginTop: '6px' }}>
          <span style={{ color: 'var(--chalk-dim)' }}>Construction: </span>{archetype.winners}
        </div>
        {archetype.matches.length > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--chalk-dim)', marginTop: '6px' }}>
            Historical matches: {archetype.matches.join(' · ')}
          </div>
        )}
      </Card>

      {/* Everything below decisions 1-3 is Sharp+. */}
      <PaywallGate feature="sharp_report_full">
        <PlayerList title="Chalk Warnings" rows={slate?.chalk_warnings} accent="var(--red-bright)" />
        <PlayerList title="Contrarian Opportunities" rows={slate?.contrarian_spots} accent="var(--green-text)" />

        {slate?.weather_alerts?.length > 0 && (
          <Card style={{ marginBottom: '12px' }}>
            <div className="eyebrow" style={{ marginBottom: '10px' }}>Weather Alerts</div>
            {slate.weather_alerts.map((w, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-data)', fontSize: '12px', color: 'var(--copper)' }}>
                {w.team} — {w.weather_note} {w.weather_modifier ? `(${formatNum(w.weather_modifier * 100, 0)}% passing)` : ''}
              </div>
            ))}
          </Card>
        )}

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RadarPulse active={busy || radarFast} title="Slate scan" />
              <div className="eyebrow">Sharp Read — AI Strategy</div>
            </div>
            <Button onClick={generate} disabled={busy} style={{ padding: '8px 16px' }}>
              {busy ? <Spinner size={14} /> : read ? 'Regenerate' : 'Generate Sharp Read'}
            </Button>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <Label>Notes for the Coordinator (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything specific you want addressed…" />
          </div>
          {read ? (
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '13px', lineHeight: 1.7 }}>
              {read.mock && <Badge color="var(--copper)" style={{ marginBottom: '10px' }}>Mock output — set ANTHROPIC_API_KEY on the backend</Badge>}
              <ReactMarkdown>{read.text}</ReactMarkdown>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--chalk-dim)', fontFamily: 'var(--font-data)' }}>
              Generate a grounded {contest.toUpperCase()} read built from this slate's real numbers.
            </div>
          )}
        </Card>
      </PaywallGate>
    </div>
  );
}

// --------------------------------------------------------------------------- //
const TELL_SYSTEM = `You are The Tell inside Game Script. Given a lineup or situation, output markdown:
**RISK SCORE: X/100**
**RED FLAGS:** bulleted failure modes
**PROJECTED DOWNSIDE:** what happens if you're wrong
**FIELD EXPOSURE:** estimated % of the field sharing this risk
**VERDICT:** adjust or hold, with specific reasoning.`;

function TheTellTab() {
  const { slate } = useSlateData();
  const [input, setInput] = useState('');
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const fieldCtx = slate?.chalk_warnings?.length
      ? `\n\nKnown chalk this slate: ${slate.chalk_warnings.slice(0, 5).map((c) => c.player_name).join(', ')}.`
      : '';
    const { text, mock } = await askClaude({ module: 'the-tell', system: TELL_SYSTEM, prompt: input + fieldCtx });
    setOut({ text, mock, risk: parseRisk(text) });
    setBusy(false);
  }

  return (
    <div>
      <Card style={{ marginBottom: '16px' }}>
        <Label>Lineup or Situation</Label>
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste a lineup or describe the spot…" />
        <Button onClick={run} disabled={busy || !input.trim()} style={{ marginTop: '12px' }}>
          {busy ? <Spinner size={14} /> : 'Find The Tell'}
        </Button>
      </Card>
      {out && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            {out.risk != null && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '40px', lineHeight: 1, color: riskColor(out.risk) }}>{out.risk}</div>
                <div className="eyebrow">Risk / 100</div>
              </div>
            )}
            {out.mock && <Badge color="var(--copper)">Mock output</Badge>}
          </div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '13px', lineHeight: 1.7 }}>
            <ReactMarkdown>{out.text}</ReactMarkdown>
          </div>
        </Card>
      )}
    </div>
  );
}

function parseRisk(text) {
  const m = String(text).match(/RISK SCORE[:\s*]*([0-9]{1,3})/i);
  return m ? Math.min(100, Number(m[1])) : null;
}
function riskColor(r) {
  if (r >= 70) return 'var(--red-bright)';
  if (r >= 40) return 'var(--copper)';
  return 'var(--green-text)';
}

// --------------------------------------------------------------------------- //
export function SharpReport() {
  return (
    <PageWrapper eyebrow="SLATE INTELLIGENCE" title="Sharp Report" desc="What the smart money already knows.">
      <Tabs
        tabs={[
          { label: 'Sharp Report', content: <SharpReportTab /> },
          { label: 'The Tell', content: <PaywallGate feature="the_tell_full"><TheTellTab /></PaywallGate> },
        ]}
      />
    </PageWrapper>
  );
}
