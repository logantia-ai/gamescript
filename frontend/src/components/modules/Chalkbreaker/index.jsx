// MODULE 5 — Chalkbreaker. Contrarian GPP engine.
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PageWrapper } from '../../layout/PageWrapper';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Label } from '../../ui/Label';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { Spinner } from '../../ui/Spinner';
import { PaywallGate } from '../../ui/PaywallGate';
import { askClaude } from '../../../lib/claude';

// Output sections, in the exact order Claude is told to emit them. `accent`
// drives the chip dot; every header itself stays copper per the app's style.
const SECTIONS = [
  { key: 'chalk', title: 'WHERE THE CHALK IS', accent: 'var(--copper)' },
  { key: 'breaks', title: 'THE BREAKS', accent: 'var(--green-text)' },
  { key: 'stack', title: 'THE LEVERAGE STACK', accent: 'var(--copper)' },
  { key: 'warning', title: 'CHALK WARNING', accent: 'var(--red-bright)' },
  { key: 'identity', title: 'TOURNAMENT IDENTITY', accent: 'var(--copper)' },
];

// NFL Week 1–18 plus Playoffs.
const WEEKS = [
  ...Array.from({ length: 18 }, (_, i) => `Week ${i + 1}`),
  'Playoffs',
];

const SLATE_TYPES = ['Main Slate', 'Thursday Night', 'Monday Night', 'Sunday Night', 'Showdown'];

const CONTEST_TYPES = [
  { value: 'large_gpp', label: 'Large GPP (10k+ entries)', hint: 'large-field GPP over 10,000 entries' },
  { value: 'small_gpp', label: 'Small GPP (under 1k entries)', hint: 'small-field GPP under 1,000 entries' },
  { value: 'double_up', label: 'Double Up', hint: 'double up' },
  { value: '50_50', label: '50-50', hint: '50-50' },
  { value: 'cash', label: 'Cash', hint: 'cash game' },
];

const THRESHOLDS = [
  { value: 'conservative', label: 'Conservative — fade over 30% owned', name: 'Conservative', pct: 30 },
  { value: 'standard', label: 'Standard — fade over 25% owned', name: 'Standard', pct: 25 },
  { value: 'aggressive', label: 'Aggressive — fade over 20% owned', name: 'Aggressive', pct: 20 },
];

const SYSTEM = `You are Chalkbreaker, the contrarian GPP engine inside Game Script, an NFL DraftKings DFS platform.
The user selects the NFL week, slate type, contest type, and ownership threshold. Given those, find the leverage against the field.
Be specific, name real players, cite the data or narrative driving ownership, and do not hedge.
Output markdown using EXACTLY these five section headers, in this order, each on its own line starting with "## ":

## WHERE THE CHALK IS
The 3 most heavily owned plays this week. For each: player name, why the field is on them, and projected ownership %.

## THE BREAKS
The top 3 contrarian plays projected UNDER the ownership threshold. For each: player name, projected ownership %, and the data/matchup support that justifies the pivot.

## THE LEVERAGE STACK
One specific correlated stack — name the exact players and the game — to build around, and why it differentiates from the field.

## CHALK WARNING
One high-owned trap play to avoid, and the specific reason it busts.

## TOURNAMENT IDENTITY
How to construct a lineup that looks different from the field this week — the overall plan to separate from the majority of entries.`;

// Slice Claude's markdown into our five sections by header line. Tolerates
// #/** decoration and trailing punctuation. Returns {} if nothing matched
// (e.g. mock output) so the caller can fall back to raw rendering.
function splitSections(text) {
  const lines = String(text || '').split('\n');
  const norm = (l) =>
    l.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').replace(/[:_*\s]+$/, '').trim().toUpperCase();

  const marks = [];
  lines.forEach((l, idx) => {
    const n = norm(l);
    const sec = SECTIONS.find((s) => n === s.title || n.startsWith(s.title));
    if (sec) marks.push({ key: sec.key, idx });
  });

  const out = {};
  marks.forEach((mk, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].idx : lines.length;
    out[mk.key] = lines.slice(mk.idx + 1, end).join('\n').trim();
  });
  return out;
}

function SectionCard({ title, accent, children }) {
  return (
    <Card style={{ marginBottom: '14px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: accent, flexShrink: 0 }} />
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: '12px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: 'var(--copper)',
            fontWeight: 600,
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-data)', fontSize: '13px', lineHeight: 1.7, color: 'var(--chalk)' }}>
        {children}
      </div>
    </Card>
  );
}

export function Chalkbreaker() {
  const [week, setWeek] = useState('Week 1');
  const [slateType, setSlateType] = useState('Main Slate');
  const [contest, setContest] = useState('large_gpp');
  const [threshold, setThreshold] = useState('conservative');
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);

    const ct = CONTEST_TYPES.find((c) => c.value === contest);
    const thr = THRESHOLDS.find((t) => t.value === threshold);
    const prompt = [
      `NFL WEEK: ${week}`,
      `SLATE TYPE: ${slateType}`,
      `CONTEST TYPE: ${ct.label} (${ct.hint})`,
      `OWNERSHIP THRESHOLD: ${thr.name} — fade plays projected over ${thr.pct}% ownership; treat anything under ${thr.pct}% as a viable break.`,
    ].join('\n');

    const { text, mock } = await askClaude({ module: 'chalkbreaker', system: SYSTEM, prompt });
    setOut({ text, mock, sections: splitSections(text) });
    setBusy(false);
  }

  const hasSections = out && Object.keys(out.sections).length > 0;

  const body = (
    <PageWrapper
      eyebrow="CONTRARIAN ENGINE"
      title="Chalkbreaker"
      desc="Break from the field before the field catches on."
    >
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px' }}>
          <div>
            <Label>NFL Week</Label>
            <Select value={week} onChange={(e) => setWeek(e.target.value)} options={WEEKS} />
          </div>
          <div>
            <Label>Slate Type</Label>
            <Select value={slateType} onChange={(e) => setSlateType(e.target.value)} options={SLATE_TYPES} />
          </div>
          <div>
            <Label>Contest Type</Label>
            <Select value={contest} onChange={(e) => setContest(e.target.value)} options={CONTEST_TYPES} />
          </div>
          <div>
            <Label>Ownership Threshold</Label>
            <Select value={threshold} onChange={(e) => setThreshold(e.target.value)} options={THRESHOLDS} />
          </div>
        </div>

        <Button
          variant="copper"
          onClick={run}
          disabled={busy}
          style={{ marginTop: '22px', width: '100%', padding: '16px 24px', fontSize: '13px', letterSpacing: '3px' }}
        >
          {busy ? <Spinner size={16} /> : 'Run Chalkbreaker'}
        </Button>
      </Card>

      {out && (
        <div>
          {out.mock && (
            <Badge color="var(--copper)" style={{ marginBottom: '12px' }}>
              Mock output — set ANTHROPIC_API_KEY on the backend
            </Badge>
          )}

          {hasSections ? (
            SECTIONS.map((s) =>
              out.sections[s.key] ? (
                <SectionCard key={s.key} title={s.title} accent={s.accent}>
                  <ReactMarkdown>{out.sections[s.key]}</ReactMarkdown>
                </SectionCard>
              ) : null,
            )
          ) : (
            <Card>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: '13px', lineHeight: 1.7 }}>
                <ReactMarkdown>{out.text}</ReactMarkdown>
              </div>
            </Card>
          )}

          {/* Crest sign-off beneath the contrarian read */}
          <div className="gs-crest-glow" style={{ position: 'relative', width: '260px', maxWidth: '100%', margin: '28px auto 8px' }}>
            <img
              src="/assets/GS_Crest.png"
              width="260"
              alt=""
              aria-hidden="true"
              style={{ position: 'relative', zIndex: 1, display: 'block', width: '260px', maxWidth: '100%', margin: '0 auto', objectFit: 'contain', mixBlendMode: 'screen', background: 'transparent', opacity: 0.92 }}
            />
          </div>
        </div>
      )}
    </PageWrapper>
  );

  return <PaywallGate feature="chalkbreaker">{body}</PaywallGate>;
}
