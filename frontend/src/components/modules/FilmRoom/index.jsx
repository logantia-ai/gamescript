// MODULE 3 — Film Room. Seven research steps, now backed by LIVE slate data
// (falls back to the instructional checklist when data isn't available yet),
// plus an ambient film-projector cycling the three brand logos.
import { useEffect, useState } from 'react';
import { PageWrapper } from '../../layout/PageWrapper';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';
import { PaywallGate } from '../../ui/PaywallGate';
import { useSlateData } from '../../../hooks/useSlateData';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { formatNum, formatPct, leverageColor } from '../../../lib/utils';

const STORAGE_KEY = 'gs_filmroom_completed';

function readCompleted() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function useChecklist() {
  const [done, setDone] = useState(readCompleted);
  const toggle = (n) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* storage unavailable — keep in-memory only */
      }
      return next;
    });
  return [done, toggle];
}

const STEPS = [
  { n: '01', title: 'Vegas Lines & Implied Totals', why: 'High over/unders = more scoring', where: 'The-Odds-API, DraftKings Sportsbook, Vegas Insider', action: 'Target team implied totals 24+, avoid game totals under 42' },
  { n: '02', title: 'Ownership Projections', why: 'Contrarian + right = GPP wins', where: 'FantasyPros, RotoGrinders, Stokastic', action: 'Cash own 30%+, GPP target under 15%' },
  { n: '03', title: 'Snap Count & Target Share Trends', why: 'Opportunity predicts production', where: 'nflverse, Pro Football Reference', action: '3-week trends, rising snaps = coaching trust' },
  { n: '04', title: 'Matchup Grades', why: 'Weak CB2/CB3 = value opportunity', where: 'PFF, CBS Sports, Stokastic', action: 'Find where the defense is weakest, attack it' },
  { n: '05', title: 'Weather (Outdoor Only)', why: '15+ mph wind kills passing', where: 'NFLWeather.com, Weather.com', action: 'Flag 15+ mph wind, shift to RBs' },
  { n: '06', title: 'Injury & Practice Reports', why: 'WR1 limited = WR2 value', where: 'Rotowire, ESPN, beat reporters on X', action: 'Check Thu/Fri, lock after Sunday inactives' },
  { n: '07', title: 'Player Profiler Athleticism Layer', why: 'Physical ceiling determines upside', where: 'PlayerProfiler.com (public pages)', action: 'Speed Score 105+, Dominator 30%+, WOPR, Air Yards Share', gated: true },
];

// ---- Film projector: cycles GS_Crest → GS_Shield → GS_Name, ~11s each ---- //
const PROJ_LOGOS = [
  { src: '/assets/GS_Crest.png', w: 180 },
  { src: '/assets/GS_Shield.png', w: 140 },
  { src: '/assets/GS_Name.png', w: 200 },
];

function FilmProjector() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % PROJ_LOGOS.length), 11000);
    return () => clearInterval(t);
  }, []);
  const logo = PROJ_LOGOS[i];
  return (
    <div className="gs-projector" aria-hidden="true">
      {/* screen with film grain */}
      <div className="gs-proj-screen">
        <img key={i} src={logo.src} alt="" style={{ width: `${logo.w}px`, maxWidth: '80%', height: 'auto', objectFit: 'contain' }} className="gs-proj-logo" />
      </div>
      {/* beam of light from lens to screen */}
      <div className="gs-proj-beam gs-proj-flicker" />
      {/* projector body */}
      <div className="gs-proj-body">
        <span className="gs-proj-reel" />
        <span className="gs-proj-reel" />
        <span className="gs-proj-lens" />
      </div>
    </div>
  );
}

// ---- Small live-data table helper ---- //
function MiniTable({ head, rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-data)', fontSize: '11px' }}>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h.k} style={{ textAlign: h.align || 'left', color: 'var(--chalk-dim)', fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 6px', borderBottom: '1px solid var(--border)' }}>{h.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {head.map((h) => (
              <td key={h.k} style={{ textAlign: h.align || 'left', padding: '4px 6px', borderBottom: '1px solid var(--border)', color: 'var(--chalk)' }}>
                {h.render ? h.render(r[h.k], r) : (r[h.k] ?? '—')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const impliedColor = (v) => (v >= 24 ? 'var(--green-text)' : v >= 20 ? 'var(--copper)' : 'var(--silver)');

// Returns live JSX for a step, or null to fall back to the instructional rows.
function LiveData({ n, slate, players, profiler, setProfiler }) {
  if (n === '01') {
    const games = slate?.games || slate?.vegas_lines || [];
    if (!games.length) return null;
    return (
      <MiniTable
        head={[
          { k: 'away', label: 'Away' }, { k: 'home', label: 'Home' },
          { k: 'game_total', label: 'Total', align: 'right', render: (v) => formatNum(v, 1) },
          { k: 'home_implied', label: 'Home Imp', align: 'right', render: (v) => <span style={{ color: impliedColor(v) }}>{formatNum(v, 1)}</span> },
          { k: 'away_implied', label: 'Away Imp', align: 'right', render: (v) => <span style={{ color: impliedColor(v) }}>{formatNum(v, 1)}</span> },
          { k: 'spread', label: 'Spread', align: 'right' },
        ]}
        rows={games.slice(0, 16)}
      />
    );
  }

  if (n === '02') {
    if (!players.length) return null;
    const top = [...players].sort((a, b) => (b.projected_ownership || 0) - (a.projected_ownership || 0)).slice(0, 15);
    return (
      <MiniTable
        head={[
          { k: 'player_name', label: 'Player' },
          { k: 'position', label: 'Pos' },
          { k: 'projected_ownership', label: 'Own%', align: 'right', render: (v) => formatPct(v, 0) },
          { k: 'leverage_score', label: 'Lev', align: 'right', render: (v) => <span style={{ color: leverageColor(v) }}>{formatNum(v, 0)}</span> },
        ]}
        rows={top}
      />
    );
  }

  if (n === '03') {
    const hasTrend = players.some((p) => p.snap_pct != null || p.target_share != null);
    if (!hasTrend) return null;
    const isRec = profiler.posToggle !== 'RB';
    const rows = [...players]
      .filter((p) => (isRec ? p.position === 'WR' || p.position === 'TE' : p.position === 'RB'))
      .sort((a, b) => (isRec ? (b.target_share || 0) - (a.target_share || 0) : (b.snap_pct || 0) - (a.snap_pct || 0)))
      .slice(0, 12);
    return (
      <div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          {['WR/TE', 'RB'].map((lab) => {
            const val = lab === 'RB' ? 'RB' : 'REC';
            const active = (val === 'RB') === (profiler.posToggle === 'RB');
            return (
              <button key={lab} onClick={() => setProfiler((s) => ({ ...s, posToggle: val }))} style={{ fontSize: '9px', letterSpacing: '1px', padding: '4px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--copper)', background: active ? 'var(--copper)' : 'transparent', color: active ? 'var(--bg)' : 'var(--copper)' }}>{lab}</button>
            );
          })}
        </div>
        <MiniTable
          head={[
            { k: 'player_name', label: 'Player' },
            { k: 'position', label: 'Pos' },
            isRec ? { k: 'target_share', label: 'Tgt%', align: 'right', render: (v) => (v != null ? `${formatNum(v, 0)}%` : '—') } : { k: 'snap_pct', label: 'Snap%', align: 'right', render: (v) => (v != null ? `${formatNum(v, 0)}%` : '—') },
          ]}
          rows={rows}
        />
      </div>
    );
  }

  if (n === '04') {
    const graded = players.filter((p) => p.dvoa != null || p.def_rank_vs_pos != null);
    if (!graded.length) return null;
    return (
      <MiniTable
        head={[
          { k: 'player_name', label: 'Player' },
          { k: 'position', label: 'Pos' },
          { k: 'def_rank_vs_pos', label: 'Def Rk', align: 'right' },
          { k: 'dvoa', label: 'DVOA', align: 'right', render: (v) => (v != null ? formatNum(v, 1) : '—') },
        ]}
        rows={graded.slice(0, 15)}
      />
    );
  }

  if (n === '05') {
    const alerts = slate?.weather_alerts || [];
    if (!alerts.length) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {alerts.map((w, i) => {
          const dome = /dome|neutral/i.test(w.weather_note || '');
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
              <span style={{ color: 'var(--chalk)', fontWeight: 600, minWidth: '44px' }}>{w.team}</span>
              <span style={{ color: dome ? 'var(--green-text)' : 'var(--copper)' }}>{dome ? 'Dome — Weather Neutral' : (w.weather_note || 'Wind advisory')}</span>
            </div>
          );
        })}
        <div style={{ fontSize: '10px', color: 'var(--chalk-dim)', marginTop: '4px' }}>Dome games are weather-neutral. Everything listed here is outdoor.</div>
      </div>
    );
  }

  if (n === '06') {
    const hurt = players.filter((p) => p.injury_status && !/active/i.test(p.injury_status));
    if (!hurt.length) return null;
    const groups = ['Questionable', 'Doubtful', 'Out'];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {groups.map((g) => {
          const list = hurt.filter((p) => new RegExp(g, 'i').test(p.injury_status));
          if (!list.length) return null;
          return (
            <div key={g}>
              <div className="eyebrow" style={{ color: g === 'Out' ? 'var(--red-bright)' : 'var(--copper)', marginBottom: '4px' }}>{g}</div>
              <div style={{ fontSize: '12px', color: 'var(--chalk)' }}>{list.map((p) => `${p.player_name} (${p.position})`).join(' · ')}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (n === '07') {
    const q = profiler.query.trim().toLowerCase();
    const match = q ? players.find((p) => p.player_name?.toLowerCase().includes(q)) : null;
    const BARS = [
      { k: 'speed_score', label: 'Speed Score', elite: 105, max: 130 },
      { k: 'burst_score', label: 'Burst Score', elite: 130, max: 150 },
      { k: 'dominator_rating', label: 'Dominator', elite: 30, max: 50 },
      { k: 'air_yards_share', label: 'Air Yards Share', elite: 35, max: 50 },
      { k: 'wopr', label: 'WOPR', elite: 0.6, max: 1 },
      { k: 'target_share', label: 'Target Share', elite: 25, max: 40 },
      { k: 'route_participation', label: 'Route Participation', elite: 85, max: 100 },
      { k: 'athleticism_grade', label: 'Athleticism', elite: 8, max: 10 },
    ];
    const hasAny = match && BARS.some((b) => match[b.k] != null);
    return (
      <div>
        <Input placeholder="Search a player…" value={profiler.query} onChange={(e) => setProfiler((s) => ({ ...s, query: e.target.value }))} />
        {q && !match && <div style={{ fontSize: '11px', color: 'var(--silver)', marginTop: '8px' }}>No player found for “{profiler.query}”.</div>}
        {match && !hasAny && (
          <div style={{ fontSize: '11px', color: 'var(--silver)', marginTop: '8px' }}>
            No Player Profiler metrics loaded for {match.player_name}. Pull full athleticism data at{' '}
            <a href="https://playerprofiler.com" target="_blank" rel="noreferrer" style={{ color: 'var(--copper)' }}>PlayerProfiler.com</a>.
          </div>
        )}
        {match && hasAny && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--chalk)', fontWeight: 600 }}>{match.player_name} · {match.position}</div>
            {BARS.filter((b) => match[b.k] != null).map((b) => {
              const val = match[b.k];
              const pct = Math.max(0, Math.min(100, (val / b.max) * 100));
              const elitePct = Math.min(100, (b.elite / b.max) * 100);
              const isElite = val >= b.elite;
              return (
                <div key={b.k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--silver)' }}>
                    <span>{b.label}</span><span style={{ color: isElite ? 'var(--green-text)' : 'var(--chalk)' }}>{formatNum(val, 1)}</span>
                  </div>
                  <div style={{ position: 'relative', height: '6px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: isElite ? 'var(--green-bright)' : 'var(--copper)' }} />
                    <span style={{ position: 'absolute', top: 0, bottom: 0, left: `${elitePct}%`, width: '2px', background: 'var(--chalk)' }} title="Elite threshold" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '10px', color: 'var(--chalk-dim)', lineHeight: 1.7 }}>
          <div>
            <span style={{ color: 'var(--copper)' }}>Incentives:</span> Check if the player has incentive clauses in their contract —{' '}
            <a href="https://overthecap.com" target="_blank" rel="noreferrer" style={{ color: 'var(--copper)' }}>overthecap.com</a>{' '}
            shows full contract details including incentive thresholds.
          </div>
          <div style={{ marginTop: '4px' }}>
            <span style={{ color: 'var(--copper)' }}>Blueprint:</span> Sal Vetri's Fantasy Football Club uses Player Profiler as a primary
            data source for identifying league-winning players. The same metrics that predict season-long value often predict DFS ceiling
            plays: high dominator rating, elite athleticism, age-appropriate target share.
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function Row({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
      <span style={{ color: 'var(--copper)', minWidth: '52px', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '2px', paddingTop: '3px' }}>{label}</span>
      <span style={{ color: accent ? 'var(--chalk)' : 'var(--silver)' }}>{value}</span>
    </div>
  );
}

function CheckMark({ checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-pressed={checked}
      aria-label={checked ? 'Mark step incomplete' : 'Mark step complete'}
      title={checked ? 'Completed' : 'Mark complete'}
      style={{
        flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%',
        border: `1px solid ${checked ? 'var(--green-bright)' : 'var(--border)'}`,
        background: checked ? 'var(--green-bg)' : 'transparent',
        color: checked ? 'var(--green-text)' : 'var(--chalk-dim)',
        fontSize: '13px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        transition: 'border-color 200ms ease, background 200ms ease',
      }}
    >
      {checked ? '✓' : ''}
    </button>
  );
}

function Step({ s, checked, onToggle, slate, players, profiler, setProfiler }) {
  const [open, setOpen] = useState(false);
  const live = open ? LiveData({ n: s.n, slate, players, profiler, setProfiler }) : null;
  return (
    <Card style={{ marginBottom: '10px', padding: 0, overflow: 'hidden', borderLeft: checked ? '2px solid var(--green-bright)' : '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', background: 'transparent', border: 'none', textAlign: 'left' }}
      >
        <CheckMark checked={checked} onToggle={onToggle} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--copper)' }}>{s.n}</span>
        <span style={{ flex: 1, color: checked ? 'var(--chalk-dim)' : 'var(--chalk)', fontSize: '14px', fontFamily: 'var(--font-data)', letterSpacing: '1px', textDecoration: checked ? 'line-through' : 'none' }}>{s.title}</span>
        {live && <Badge color="var(--green-text)">Live</Badge>}
        {s.gated && <Badge color="var(--copper)">Data: Coordinator+</Badge>}
        <span style={{ color: 'var(--silver)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 18px 18px 52px', fontFamily: 'var(--font-data)', fontSize: '12px', lineHeight: 1.8 }}>
          {live ? (
            <div style={{ marginTop: '4px' }}>{live}</div>
          ) : (
            <>
              <Row label="Why" value={s.why} />
              <Row label="Where" value={s.where} />
              <Row label="Action" value={s.action} accent />
            </>
          )}
          {s.gated && (
            <PaywallGate feature="player_profiler_data">
              <div style={{ marginTop: '10px', color: 'var(--green-text)' }}>✓ Athleticism data unlocked for your tier.</div>
            </PaywallGate>
          )}
        </div>
      )}
    </Card>
  );
}

export function FilmRoom() {
  const [done, toggle] = useChecklist();
  const { slate } = useSlateData();
  const { players } = usePlayerData();
  const [profiler, setProfiler] = useState({ query: '', posToggle: 'REC' });

  const completed = STEPS.filter((s) => done.has(s.n)).length;
  const pct = Math.round((completed / STEPS.length) * 100);

  return (
    <PageWrapper eyebrow="RESEARCH PROCESS" title="Film Room" desc="Where champions prepare before Sunday arrives.">
      <div style={{ position: 'relative' }}>
        <FilmProjector />

        {/* Checklist progress */}
        <Card style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: completed === STEPS.length ? 'var(--green-text)' : 'var(--copper)' }}>
            {completed}/{STEPS.length}
          </div>
          <div style={{ flex: 1 }}>
            <div className="eyebrow" style={{ marginBottom: '6px' }}>Research Checklist</div>
            <div style={{ height: '6px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: completed === STEPS.length ? 'var(--green-bright)' : 'linear-gradient(90deg, var(--copper), var(--copper-bright))', borderRadius: '999px', transition: 'width 320ms cubic-bezier(0.2,0.75,0.3,1)' }} />
            </div>
          </div>
        </Card>

        {STEPS.map((s) => (
          <Step key={s.n} s={s} checked={done.has(s.n)} onToggle={() => toggle(s.n)} slate={slate} players={players} profiler={profiler} setProfiler={setProfiler} />
        ))}
      </div>
    </PageWrapper>
  );
}
