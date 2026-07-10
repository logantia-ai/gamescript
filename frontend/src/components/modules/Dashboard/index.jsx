// MODULE 1 — Dashboard. Command center.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// GAMEDAY banner — visible Sundays 8 AM–8 PM local (Task 13 auto-activation).
function GamedayBanner() {
  const d = new Date();
  const active = d.getDay() === 0 && d.getHours() >= 8 && d.getHours() < 20;
  if (!active) return null;
  return (
    <Link to="/gameday" style={{ textDecoration: 'none', display: 'block', marginBottom: '16px' }}>
      <div className="gs-glow-pulse" style={{ background: 'rgba(196,118,42,0.12)', border: '1px solid var(--copper)', borderRadius: 'var(--radius)', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', letterSpacing: '2px', color: 'var(--copper)', fontWeight: 700 }}>GAMEDAY MODE AVAILABLE</span>
        <span style={{ fontSize: '12px', color: 'var(--chalk)' }}>Launch War Room →</span>
      </div>
    </Link>
  );
}
import { PageWrapper } from '../../layout/PageWrapper';
import { Card, StatCard } from '../../ui/Card';
import { FlipNumber } from '../../ui/Effects';
import { Badge } from '../../ui/Badge';
import { Table } from '../../ui/Table';
import { PaywallGate } from '../../ui/PaywallGate';
import { LoadingScreen } from '../../ui/Spinner';
import { useSlateData } from '../../../hooks/useSlateData';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { useSubscription } from '../../../hooks/useSubscription';
import { useRecord } from '../../../hooks/useRecord';
import { MODULES } from '../registry';
import { fetchNews } from '../../../lib/api';
import { formatCurrency, formatPct, formatNum, leverageColor } from '../../../lib/utils';

// Breaking player news — pulls /api/news (Rotoworld feed). Rotoworld news hits
// before official injury reports, so any name here is the Sunday-morning edge.
function NewsAlert({ news }) {
  if (!news || news.length === 0) return null;
  return (
    <div style={{ background: '#3A1010', border: '1px solid #8B2A2A', borderRadius: '2px', padding: '12px 16px', marginBottom: '16px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#E05A5A', marginBottom: '8px' }}>⚑ BREAKING — PLAYER NEWS</div>
      {news.slice(0, 3).map((item, i) => (
        <div key={i} style={{ fontSize: '12px', color: '#EDE8DC', marginBottom: '6px', lineHeight: '1.5' }}>
          <span style={{ color: '#C4762A', fontWeight: '700' }}>{item.player_name}</span> — {item.headline}
          <span style={{ color: '#9A9488', fontSize: '10px', marginLeft: '8px' }}>{item.time_ago}</span>
        </div>
      ))}
    </div>
  );
}

// Tuesday/Friday workflow reminders (built into the Dashboard per the spec).
const WEEKLY_REMINDERS = {
  2: 'New slate dropped. Download projections from DFF, Draft Sharks, and PFN. Drop them in csv_imports/ and run the pipeline.',
  5: 'Final injury reports are out. Download updated projections and re-run the pipeline for finalized numbers.',
};

function WorkflowReminder() {
  const day = new Date().getDay();
  const msg = WEEKLY_REMINDERS[day];
  if (!msg) return null;
  return (
    <div style={{ background: 'rgba(196,118,42,0.10)', border: '1px solid var(--copper)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '16px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--copper)', marginBottom: '6px' }}>
        ◷ {day === 2 ? 'TUESDAY' : 'FRIDAY'} WORKFLOW
      </div>
      <div style={{ fontSize: '12px', color: 'var(--silver)', fontFamily: 'var(--font-data)', lineHeight: 1.5 }}>{msg}</div>
    </div>
  );
}

// 0-100 slate-quality read derived from the top leverage plays. Color coded:
// green (strong leverage on the board), amber (neutral), red (thin/chalky).
function scoreColor(v) {
  if (v >= 67) return 'var(--green-text)';
  if (v >= 34) return 'var(--copper)';
  return 'var(--red-bright)';
}
function scoreLabel(v) {
  if (v >= 67) return 'LEVERAGE-RICH SLATE';
  if (v >= 34) return 'NEUTRAL SLATE';
  return 'CHALKY — TREAD CAREFULLY';
}

function GameScriptScore({ players }) {
  const top = [...players].sort((a, b) => b.leverage_score - a.leverage_score).slice(0, 5);
  const raw = top.length ? top.reduce((s, p) => s + (p.leverage_score || 0), 0) / top.length : 0;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const color = scoreColor(score);
  return (
    <Card style={{ flex: 2, minWidth: '260px', display: 'flex', alignItems: 'center', gap: '18px' }}>
      <div style={{ textAlign: 'center', minWidth: '78px' }}>
        <FlipNumber style={{ fontFamily: 'var(--font-display)', fontSize: '46px', fontWeight: 700, lineHeight: 1, color }}>
          {score}
        </FlipNumber>
        <div style={{ fontSize: '8px', letterSpacing: '2px', color: 'var(--chalk-dim)', marginTop: '2px' }}>/ 100</div>
      </div>
      <div style={{ flex: 1 }}>
        <div className="eyebrow" style={{ marginBottom: '8px' }}>Game Script Score</div>
        <div style={{ height: '8px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 360ms cubic-bezier(0.2,0.75,0.3,1)' }} />
        </div>
        <div style={{ fontSize: '10px', letterSpacing: '1px', color, fontFamily: 'var(--font-data)' }}>{scoreLabel(score)}</div>
      </div>
    </Card>
  );
}

// Live "sharps building right now" counter — drifts upward every few seconds.
function LiveActivity() {
  const [count, setCount] = useState(2847);
  const [bump, setBump] = useState(false);
  const timer = useRef(null);
  useEffect(() => {
    timer.current = setInterval(() => {
      setCount((c) => c + 1 + Math.floor(Math.random() * 3));
      setBump(true);
      setTimeout(() => setBump(false), 320);
    }, 4000);
    return () => clearInterval(timer.current);
  }, []);
  return (
    <Card style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span className="gs-live-pip" />
        <span className="eyebrow" style={{ color: 'var(--green-text)' }}>Live now</span>
      </div>
      <div className={bump ? 'gs-count-tick' : undefined} style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: 'var(--chalk)' }}>
        {count.toLocaleString()}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--chalk-dim)', marginTop: '2px' }}>sharps building lineups</div>
    </Card>
  );
}

// ⚑ RED FLAGS — derive 2-3 weekly risk alerts from live slate data
// (chalk_warnings + weather_alerts). Falls back to one sample flag.
const SEVERITY = {
  HIGH: { color: '#E05A5A', bg: 'rgba(224,90,90,0.18)' },
  MEDIUM: { color: '#E0A24A', bg: 'rgba(224,162,74,0.16)' },
  LOW: { color: '#E0D24A', bg: 'rgba(224,210,74,0.14)' },
};

function deriveRedFlags(slate) {
  const flags = [];
  const chalk = slate?.chalk_warnings || [];
  const contrarian = slate?.contrarian_spots || [];
  const weather = slate?.weather_alerts || [];

  chalk.slice(0, 2).forEach((c, i) => {
    const own = Math.round((c.projected_ownership || 0) * (c.projected_ownership <= 1 ? 100 : 1));
    const alt = contrarian[i] || contrarian[0];
    flags.push({
      severity: own >= 35 ? 'HIGH' : own >= 25 ? 'MEDIUM' : 'LOW',
      name: c.player_name,
      risk: `${own}% owned — ownership trap if the chalk busts.`,
      mitigation: alt
        ? `Consider fading toward ${alt.player_name} at ${formatPct(alt.projected_ownership, 0)} own.`
        : 'Consider a lower-owned pivot at the same position.',
    });
  });

  weather.slice(0, 1).forEach((w) => {
    flags.push({
      severity: 'MEDIUM',
      name: `${w.team || 'Outdoor game'} — Weather`,
      risk: w.weather_note || 'Wind/precipitation could suppress passing volume.',
      mitigation: 'Lean run-game and dome pass-catchers for ceiling.',
    });
  });

  if (flags.length === 0) {
    flags.push({
      severity: 'MEDIUM',
      name: 'Example — chalk RB',
      risk: '41% owned — ownership trap if chalk busts.',
      mitigation: "Consider fading toward a contrarian back at ~27% own. (Sample — run the pipeline for live flags.)",
    });
  }
  return flags.slice(0, 3);
}

function RedFlags({ slate, full }) {
  const flags = deriveRedFlags(slate);
  return (
    <Card style={{ marginBottom: '24px', background: 'rgba(139,42,42,0.08)', borderLeft: '3px solid #8B2A2A' }}>
      <div className="eyebrow" style={{ color: 'var(--copper)', letterSpacing: '3px', marginBottom: '12px' }}>
        ⚑ RED FLAGS THIS WEEK
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {flags.map((f, i) => {
          const blur = !full && i > 0;
          const sev = SEVERITY[f.severity];
          return (
            <div key={i} style={{ position: 'relative', paddingBottom: '10px', borderBottom: i < flags.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ filter: blur ? 'blur(5px)' : 'none', userSelect: blur ? 'none' : 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '9px', letterSpacing: '1px', fontWeight: 700, color: sev.color, background: sev.bg, padding: '2px 8px', borderRadius: '2px' }}>
                    {f.severity}
                  </span>
                  <span style={{ color: 'var(--chalk)', fontWeight: 700, fontSize: '13px' }}>{f.name}</span>
                </div>
                <div style={{ color: 'var(--copper)', fontSize: '12px', fontFamily: 'var(--font-data)' }}>{f.risk}</div>
                <div style={{ color: 'var(--silver)', fontSize: '11px', fontFamily: 'var(--font-data)' }}>{f.mitigation}</div>
              </div>
              {blur && (
                <Link
                  to="/pricing"
                  style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none', color: 'var(--copper)', fontSize: '11px', letterSpacing: '1px', fontWeight: 700,
                  }}
                >
                  🔒 Upgrade to Coordinator
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// SALARY EFFICIENCY MAP (Task 14) — where value lives on this week's slate.
const HEAT_POS = ['QB', 'RB', 'WR', 'TE', 'DST'];
const SALARY_TIERS = [
  { key: '$9k+', min: 9000, max: Infinity },
  { key: '$8k-$9k', min: 8000, max: 8999 },
  { key: '$7k-$8k', min: 7000, max: 7999 },
  { key: '$6k-$7k', min: 6000, max: 6999 },
  { key: '$5k-$6k', min: 5000, max: 5999 },
  { key: 'Under $5k', min: 0, max: 4999 },
];

function valueColor(v) {
  if (v == null) return 'var(--card)';
  if (v >= 3.0) return 'rgba(42,107,60,0.85)';
  if (v >= 2.0) return 'rgba(42,139,76,0.55)';
  if (v >= 1.5) return 'rgba(224,210,74,0.35)';
  if (v >= 1.0) return 'rgba(224,140,74,0.40)';
  return 'rgba(196,57,42,0.40)';
}

function SalaryHeatMap({ players }) {
  const [open, setOpen] = useState(true);
  const [sel, setSel] = useState(null); // {pos, tierKey}
  const hasData = players.some((p) => p.salary_efficiency != null);

  const cell = (pos, tier) => {
    const list = players.filter((p) => p.position === pos && p.salary >= tier.min && p.salary <= tier.max);
    const avg = list.length ? list.reduce((s, p) => s + (p.salary_efficiency || 0), 0) / list.length : null;
    return { list, avg, count: list.length };
  };

  return (
    <Card style={{ marginBottom: '24px' }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
        <div className="eyebrow" style={{ color: 'var(--copper)' }}>Where Value Lives This Week</div>
        <span style={{ color: 'var(--silver)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ marginTop: '12px', overflowX: 'auto' }}>
          {!hasData && (
            <div style={{ fontSize: '10px', color: 'var(--copper)', marginBottom: '8px' }}>Run the pipeline for live data — showing structure with current numbers.</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: `90px repeat(${HEAT_POS.length}, 1fr)`, gap: '3px', minWidth: '460px' }}>
            <div />
            {HEAT_POS.map((p) => (
              <div key={p} style={{ textAlign: 'center', fontSize: '9px', letterSpacing: '1px', color: 'var(--chalk-dim)' }}>{p}</div>
            ))}
            {SALARY_TIERS.map((tier) => (
              <FragmentRow key={tier.key} tier={tier} cell={cell} sel={sel} setSel={setSel} />
            ))}
          </div>
          {sel && (() => {
            const c = cell(sel.pos, SALARY_TIERS.find((t) => t.key === sel.tierKey));
            const sorted = [...c.list].sort((a, b) => (b.salary_efficiency || 0) - (a.salary_efficiency || 0));
            return (
              <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <div className="eyebrow" style={{ marginBottom: '6px' }}>{sel.pos} · {sel.tierKey} — {sorted.length} players</div>
                {sorted.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--chalk-dim)' }}>No players in this cell.</div>
                ) : sorted.map((p) => (
                  <div key={p.player_name} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-data)', fontSize: '12px', padding: '2px 0' }}>
                    <span style={{ color: 'var(--chalk)' }}>{p.player_name}</span>
                    <span style={{ color: 'var(--copper)' }}>{formatNum(p.salary_efficiency, 2)} · ${Number(p.salary).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </Card>
  );
}

function FragmentRow({ tier, cell, sel, setSel }) {
  return (
    <>
      <div style={{ fontSize: '9px', color: 'var(--chalk-dim)', display: 'flex', alignItems: 'center' }}>{tier.key}</div>
      {HEAT_POS.map((pos) => {
        const c = cell(pos, tier);
        const active = sel && sel.pos === pos && sel.tierKey === tier.key;
        return (
          <button
            key={pos}
            onClick={() => setSel(active ? null : { pos, tierKey: tier.key })}
            title={`${pos} ${tier.key}: ${c.count} players${c.avg != null ? `, avg value ${c.avg.toFixed(2)}` : ''}`}
            style={{
              height: '36px', borderRadius: '2px', cursor: 'pointer',
              border: active ? '1px solid var(--copper)' : '1px solid var(--border)',
              background: valueColor(c.avg), color: 'var(--chalk)', fontFamily: 'var(--font-data)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1,
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700 }}>{c.avg != null ? c.avg.toFixed(1) : '—'}</span>
            <span style={{ fontSize: '8px', color: 'var(--chalk-dim)' }}>{c.count}p</span>
          </button>
        );
      })}
    </>
  );
}

export function Dashboard() {
  const { slate, loading } = useSlateData();
  const { players } = usePlayerData();
  const { record } = useRecord();
  const { hasFeature } = useSubscription();

  const [news, setNews] = useState([]);
  useEffect(() => {
    let active = true;
    fetchNews()
      .then((d) => active && setNews(d?.items || []))
      .catch(() => active && setNews([]));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <LoadingScreen label="Reading the slate…" />;

  const full = hasFeature('dashboard_full');
  const leverage = [...players].sort((a, b) => b.leverage_score - a.leverage_score);
  const shownLeverage = full ? leverage.slice(0, 5) : leverage.slice(0, 2);
  const s = record?.stats || {};

  return (
    <PageWrapper
      eyebrow="COMMAND CENTER"
      title="Dashboard"
      desc={`Week ${slate?.week} · ${slate?.season} Season`}
      actions={<Badge color="var(--copper)" bg="rgba(196,118,42,0.12)">{slate?.slate_status || 'UPCOMING'}</Badge>}
    >
      <GamedayBanner />
      <NewsAlert news={news} />
      <WorkflowReminder />

      {/* Stat row — faint GS_Crest watermark centered behind the cards */}
      <div style={{ position: 'relative' }}>
        <img
          src="/assets/GS_Crest.png"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '200px', height: 'auto', opacity: 0.05, pointerEvents: 'none', zIndex: 0,
          }}
        />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <StatCard label="Week ROI" value={formatPct(s.total_roi)} accent="var(--green-text)" />
        <StatCard label="Season P&L" value={formatCurrency(s.season_pnl, { sign: true })} accent="var(--copper)" />
        <StatCard label="Lineups" value={record?.lineups?.length ?? 0} accent="var(--chalk)" />
        <StatCard label="Cash Rate" value={formatPct(s.cash_rate)} accent="var(--green-text)" />
        <StatCard label="Weeks" value={s.weeks_tracked ?? 0} accent="var(--silver)" />
      </div>
      </div>

      {/* Game Script Score + live activity */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <GameScriptScore players={players} />
        <LiveActivity />
      </div>

      {/* ⚑ Red Flags — above the leverage table, below the stat cards */}
      <RedFlags slate={slate} full={full} />

      {/* Salary efficiency heat map — below red flags, above leverage table */}
      <SalaryHeatMap players={players} />

      {/* Top leverage plays */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="eyebrow">Top Leverage Plays</div>
          {!full && <Badge color="var(--copper)">Top 2 of 5 — Coordinator unlocks all</Badge>}
        </div>
        <Table
          columns={[
            { key: 'position', label: 'Pos' },
            { key: 'player_name', label: 'Player' },
            { key: 'projection', label: 'Proj', align: 'right', render: (v) => formatNum(v) },
            { key: 'projected_ownership', label: 'Own%', align: 'right', render: (v) => formatPct(v, 0) },
            {
              key: 'leverage_score',
              label: 'Lev',
              align: 'right',
              render: (v) => <span style={{ color: leverageColor(v) }}>{formatNum(v, 0)}</span>,
            },
          ]}
          rows={shownLeverage}
        />
      </Card>

      {/* Slate report summary (Coordinator+) */}
      <PaywallGate feature="dashboard_full">
        <Card style={{ marginBottom: '24px' }}>
          <div className="eyebrow" style={{ marginBottom: '12px' }}>Slate Report Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '12px', fontFamily: 'var(--font-data)', fontSize: '12px' }}>
            <Summary label="Best Stack" value={slate?.top_stacks?.[0]?.qb} sub={slate?.top_stacks?.[0]?.partners?.join(', ')} />
            <Summary label="Top Fade" value={slate?.chalk_warnings?.[0]?.player_name} sub={`${formatPct(slate?.chalk_warnings?.[0]?.projected_ownership, 0)} owned`} />
            <Summary label="Contrarian" value={slate?.contrarian_spots?.[0]?.player_name} sub={`Lev ${formatNum(slate?.contrarian_spots?.[0]?.leverage_score, 0)}`} />
            <Summary label="Weather" value={slate?.weather_alerts?.[0]?.team || 'Clear'} sub={slate?.weather_alerts?.[0]?.weather_note} />
          </div>
        </Card>
      </PaywallGate>

      {/* Module grid */}
      <div className="eyebrow" style={{ marginBottom: '12px' }}>Modules</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '10px' }}>
        {MODULES.filter((m) => m.key !== 'dashboard').map((m) => {
          const locked = m.feature && !hasFeature(m.feature);
          return (
            <Link key={m.key} to={m.path} style={{ textDecoration: 'none' }}>
              <Card style={{ padding: '14px', position: 'relative', opacity: locked ? 0.7 : 1 }}>
                <div style={{ fontSize: '18px', marginBottom: '6px' }}>{m.icon}</div>
                <div style={{ fontSize: '11px', color: 'var(--chalk)', letterSpacing: '1px' }}>{m.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--chalk-dim)' }}>{m.desc}</div>
                {locked && <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '11px' }}>🔒</span>}
              </Card>
            </Link>
          );
        })}
      </div>
    </PageWrapper>
  );
}

function Summary({ label, value, sub }) {
  return (
    <div style={{ borderLeft: '2px solid var(--copper)', paddingLeft: '10px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '2px', color: 'var(--copper)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: 'var(--chalk)', fontSize: '14px' }}>{value || '—'}</div>
      {sub && <div style={{ color: 'var(--chalk-dim)', fontSize: '10px' }}>{sub}</div>}
    </div>
  );
}
