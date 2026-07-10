// MODULE 4 — Scout Report. Three-player simultaneous comparison.
// Pick up to three players from dropdowns, auto-populate live stat chips,
// then grade all three at once. Highest grade is flagged BEST PLAY.
import { useMemo, useState } from 'react';
import { PageWrapper } from '../../layout/PageWrapper';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Label } from '../../ui/Label';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { Spinner } from '../../ui/Spinner';
import { useSubscription } from '../../../hooks/useSubscription';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { usePlayEvaluations } from '../../../hooks/usePlayEvaluations';
import { askClaude } from '../../../lib/claude';
import { gradeColor, formatPct, formatNum } from '../../../lib/utils';
import { parseGrade, parseConfidence, parseLabeledLine, bulletsAfter } from '../../../lib/parseOutput';

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'DST'];
const RECENCY = ['Last 1 Game', 'Last 3 Games', 'Last 5 Games', 'Last 10 Games', 'Full Season'];
const CONTESTS = ['GPP', 'Cash'];

const EMPTY_CARD = { position: 'QB', player: '', recency: 'Last 3 Games', contest: 'GPP' };

const SYSTEM = `You are the Scout Report engine inside Game Script. Given structured data about an NFL DFS player
and the contest type, output markdown with exactly these labels and nothing else:
GRADE: <A-F>
VERDICT: <Data-supported or Emotional Bias — in bold, one line>
CONFIDENCE: <XX>% data-backed / <YY>% speculative
SUPPORTING SIGNALS:
- <exactly three bullets>
RED FLAGS:
- <two to three bullets>
RECOMMENDATION: <one specific, actionable sentence>`;

// Grade ranking for winner detection (A best → F worst).
const GRADE_RANK = { A: 5, B: 4, C: 3, D: 2, F: 1 };

// Read a player field with graceful fallbacks across possible column names.
const pick = (p, ...keys) => {
  for (const k of keys) {
    if (p && p[k] != null && p[k] !== '') return p[k];
  }
  return null;
};

function StatChip({ label, value }) {
  const has = value != null && value !== '';
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        background: has ? 'rgba(196,118,42,0.12)' : 'var(--card)',
        border: `1px solid ${has ? 'var(--copper)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '4px 8px',
        minWidth: '70px',
      }}
    >
      <span style={{ fontSize: '7px', letterSpacing: '1px', color: 'var(--chalk-dim)', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: '12px', color: has ? 'var(--copper)' : 'var(--chalk-dim)', fontFamily: 'var(--font-data)' }}>
        {has ? value : 'No data'}
      </span>
    </span>
  );
}

function StatChips({ player, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="gs-stat-shimmer" style={{ width: '70px', height: '32px', borderRadius: 'var(--radius)', background: 'var(--card)' }} />
        ))}
      </div>
    );
  }
  if (!player) return null;
  const isRec = player.position === 'WR' || player.position === 'TE';
  const salary = pick(player, 'salary');
  const impliedTotal = pick(player, 'implied_total', 'team_implied', 'team_implied_total');
  const gameTotal = pick(player, 'game_total', 'total');
  const snap = pick(player, 'snap_pct', 'snap_pct_l3', 'snap_share');
  const target = pick(player, 'target_share', 'target_share_l3', 'tgt_share');
  const own = pick(player, 'projected_ownership');
  const lev = pick(player, 'leverage_score');
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
      <StatChip label="Salary" value={salary != null ? `$${Number(salary).toLocaleString()}` : null} />
      <StatChip label="Implied" value={impliedTotal != null ? formatNum(impliedTotal, 1) : null} />
      <StatChip label="Game Tot" value={gameTotal != null ? formatNum(gameTotal, 1) : null} />
      <StatChip label="Matchup" value={pick(player, 'opponent') ? `vs ${pick(player, 'opponent')}` : null} />
      <StatChip label="Snap%" value={snap != null ? `${formatNum(snap, 0)}%` : null} />
      {isRec && <StatChip label="Tgt Share" value={target != null ? `${formatNum(target, 0)}%` : null} />}
      <StatChip label="Own%" value={own != null ? formatPct(own, 0) : null} />
      <StatChip label="Leverage" value={lev != null ? `${formatNum(lev, 0)}/100` : null} />
    </div>
  );
}

export function ScoutReport() {
  const { hasFeature } = useSubscription();
  const unlimited = hasFeature('scout_report_unlimited');
  const { evaluations, weekCount, save } = usePlayEvaluations();
  const { players, loading: playersLoading } = usePlayerData();

  const [cards, setCards] = useState([{ ...EMPTY_CARD }, { ...EMPTY_CARD, position: 'RB' }, { ...EMPTY_CARD, position: 'WR' }]);
  const [results, setResults] = useState(null); // [{grade, verdict, ...} | null]
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const setCard = (i, patch) =>
    setCards((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  // Player dropdown options per card, filtered by position + sorted by projection.
  const optionsByPos = useMemo(() => {
    const map = {};
    for (const pos of POSITIONS) {
      map[pos] = [...players]
        .filter((p) => p.position === pos)
        .sort((a, b) => (b.projection || 0) - (a.projection || 0))
        .map((p) => ({
          value: p.player_name,
          label: `${p.player_name} · $${Number(p.salary || 0).toLocaleString()} · ${formatNum(p.projection, 1)}`,
        }));
    }
    return map;
  }, [players]);

  const selectedFor = (card) =>
    players.find((p) => p.player_name === card.player && p.position === card.position) || null;

  const selectedCount = cards.filter((c) => c.player).length;
  const remaining = unlimited ? Infinity : Math.max(0, 3 - weekCount);
  const overLimit = !unlimited && selectedCount > remaining;

  async function gradeAll() {
    setBusy(true);
    setSaved(false);
    setResults(null);

    // Grade each selected player in parallel (empty cards → null slot).
    const jobs = cards.map((card) => {
      const p = selectedFor(card);
      if (!p) return Promise.resolve(null);
      const dash = (v, s = '') => (v == null || v === '' ? '—' : `${v}${s}`);
      const prompt = [
        `Player: ${p.player_name} (${p.position}, ${p.team || '—'} vs ${p.opponent || '—'})`,
        `DK salary: ${p.salary ? `$${p.salary}` : '—'}`,
        `Projection: ${dash(formatNum(p.projection, 1))}  Ceiling: ${dash(formatNum(p.ceiling, 1))}  Floor: ${dash(formatNum(p.floor, 1))}`,
        `Projected ownership: ${dash(formatNum(p.projected_ownership, 0), '%')}  Leverage: ${dash(formatNum(p.leverage_score, 0))}/100`,
        `Implied total: ${dash(formatNum(pick(p, 'implied_total', 'team_implied'), 1))}  Game total: ${dash(formatNum(pick(p, 'game_total'), 1))}`,
        `Snap%: ${dash(formatNum(pick(p, 'snap_pct', 'snap_pct_l3'), 0), '%')}  Target share: ${dash(formatNum(pick(p, 'target_share', 'target_share_l3'), 0), '%')}`,
        `Recency window requested: ${card.recency}`,
        `Contest type: ${card.contest}`,
      ].join('\n');
      return askClaude({ module: 'scout-report', system: SYSTEM, prompt }).then(({ text, mock }) => {
        const rec = {
          player_name: p.player_name,
          position: p.position,
          salary: p.salary ? Number(p.salary) : null,
          grade: parseGrade(text),
          verdict: parseLabeledLine(text, 'VERDICT'),
          confidence_pct: parseConfidence(text),
          signals: bulletsAfter(text, /SUPPORTING SIGNALS/i),
          red_flags: bulletsAfter(text, /RED FLAGS/i),
          recommendation: parseLabeledLine(text, 'RECOMMENDATION'),
          answers: { ...card, contest_type: card.contest },
        };
        return { ...rec, text, mock };
      });
    });

    const out = await Promise.all(jobs);
    setResults(out);

    // Persist every graded card simultaneously.
    const toSave = out.filter(Boolean).map(({ text, mock, ...rec }) => save(rec));
    const saves = await Promise.all(toSave);
    setSaved(saves.length > 0 && saves.every((s) => !s.error));
    setBusy(false);
  }

  // Winning grade = the best grade present across result cards.
  const topRank = results
    ? Math.max(0, ...results.filter(Boolean).map((r) => GRADE_RANK[r.grade] || 0))
    : 0;

  return (
    <PageWrapper
      eyebrow="PLAYER EVALUATION"
      title="Scout Report"
      desc="Compare three players side by side — data-supported play or emotional bias."
      actions={<Badge color={remaining ? 'var(--copper)' : 'var(--red-bright)'}>{unlimited ? 'UNLIMITED' : `${remaining} of 3 left`}</Badge>}
    >
      {/* Three input columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '16px' }}>
        {cards.map((card, i) => {
          const player = selectedFor(card);
          return (
            <Card key={i} style={{ padding: '16px' }}>
              <div className="eyebrow" style={{ marginBottom: '10px' }}>Player {i + 1}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <Label>Position</Label>
                  <Select value={card.position} onChange={(e) => setCard(i, { position: e.target.value, player: '' })} options={POSITIONS} />
                </div>
                <div>
                  <Label>Player</Label>
                  <Select
                    value={card.player}
                    onChange={(e) => setCard(i, { player: e.target.value })}
                    options={[{ value: '', label: playersLoading ? 'Loading…' : '— Select player —' }, ...(optionsByPos[card.position] || [])]}
                  />
                </div>
                <div>
                  <Label>Recency</Label>
                  <Select value={card.recency} onChange={(e) => setCard(i, { recency: e.target.value })} options={RECENCY} />
                </div>
                <div>
                  <Label>Contest type</Label>
                  <Select value={card.contest} onChange={(e) => setCard(i, { contest: e.target.value })} options={CONTESTS} />
                </div>
              </div>
              {card.player && <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--chalk)', fontWeight: 600 }}>{card.player}</div>}
              <StatChips player={player} loading={playersLoading && !!card.player} />
            </Card>
          );
        })}
      </div>

      <Button
        variant="copper"
        onClick={gradeAll}
        disabled={busy || selectedCount === 0 || overLimit}
        style={{ width: '100%', padding: '16px', fontSize: '13px', letterSpacing: '3px', marginBottom: '8px' }}
      >
        {busy ? <Spinner size={16} /> : `Grade All Three${selectedCount ? ` (${selectedCount})` : ''}`}
      </Button>
      {selectedCount === 0 && (
        <div style={{ fontSize: '11px', color: 'var(--silver)', textAlign: 'center', marginBottom: '16px' }}>
          Select at least one player to grade.
        </div>
      )}
      {overLimit && (
        <div style={{ fontSize: '11px', color: 'var(--red-bright)', textAlign: 'center', marginBottom: '16px' }}>
          Grading {selectedCount} uses more than your {remaining} remaining this week — upgrade to Coordinator for unlimited.
        </div>
      )}

      {/* Three result columns */}
      {results && (
        <>
          {saved && <Badge color="var(--green-text)" style={{ marginBottom: '10px' }}>Saved</Badge>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {results.map((r, i) => {
              if (!r) return <Card key={i} style={{ padding: '16px', opacity: 0.5 }}><div className="eyebrow">Player {i + 1}</div><div style={{ fontSize: '12px', color: 'var(--chalk-dim)', marginTop: '8px' }}>No player selected.</div></Card>;
              const isWinner = topRank > 0 && (GRADE_RANK[r.grade] || 0) === topRank;
              return (
                <Card
                  key={i}
                  style={{
                    padding: '16px',
                    position: 'relative',
                    border: isWinner ? '2px solid var(--copper)' : '1px solid var(--border)',
                    boxShadow: isWinner ? '0 0 22px rgba(196,118,42,0.35)' : 'none',
                  }}
                >
                  {isWinner && (
                    <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '8px', letterSpacing: '1px', fontWeight: 700, color: 'var(--bg)', background: 'var(--copper)', padding: '3px 8px', borderRadius: 'var(--radius)' }}>
                      BEST PLAY
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '40px', lineHeight: 1, color: gradeColor(r.grade) }}>{r.grade || '—'}</div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--chalk)', fontWeight: 600 }}>{r.player_name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--chalk-dim)' }}>{r.position} · {r.answers?.contest_type}</div>
                    </div>
                    {r.mock && <Badge color="var(--copper)">Mock</Badge>}
                  </div>
                  {r.verdict && <div style={{ fontSize: '12px', color: 'var(--chalk)', fontWeight: 700, marginBottom: '6px' }}>{r.verdict}</div>}
                  {r.confidence_pct != null && <div style={{ fontSize: '11px', color: 'var(--silver)', marginBottom: '10px' }}>{r.confidence_pct}% data-backed</div>}

                  {r.signals?.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <div className="eyebrow" style={{ color: 'var(--green-text)', marginBottom: '4px' }}>Supporting signals</div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--chalk)', lineHeight: 1.6 }}>
                        {r.signals.slice(0, 3).map((s, k) => <li key={k}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {r.red_flags?.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <div className="eyebrow" style={{ color: 'var(--red-bright)', marginBottom: '4px' }}>Red flags</div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--chalk)', lineHeight: 1.6 }}>
                        {r.red_flags.slice(0, 3).map((s, k) => <li key={k}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {r.recommendation && (
                    <div style={{ fontSize: '11px', color: 'var(--copper)', fontFamily: 'var(--font-data)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                      → {r.recommendation}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Recent evaluations history */}
      {evaluations.length > 0 && (
        <Card style={{ marginTop: '16px' }}>
          <div className="eyebrow" style={{ marginBottom: '10px' }}>Recent Evaluations</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {evaluations.slice(0, 8).map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'var(--font-data)', fontSize: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                <span style={{ color: gradeColor(e.grade), fontWeight: 600, width: '24px' }}>{e.grade || '—'}</span>
                <span style={{ color: 'var(--chalk)', flex: 1 }}>{e.player_name || 'Unknown'}{e.position ? ` · ${e.position}` : ''}</span>
                <span style={{ color: 'var(--silver)' }}>{(typeof e.verdict === 'string' ? e.verdict : '')?.slice(0, 40) || ''}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageWrapper>
  );
}
