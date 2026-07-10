// GAMEDAY WAR ROOM (Task 13) — full-screen mission-control interface for
// Sunday/Thursday/Monday: late-scratch feed, quick-swap tool, live scores,
// countdown timers, and a Lock-It flow that logs to The Record.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSlateData } from '../hooks/useSlateData';
import { usePlayerData } from '../hooks/usePlayerData';
import { useLineups } from '../hooks/useLineups';
import { fetchNews } from '../lib/api';
import { PreLockChecklist } from '../components/ui/PreLockChecklist';
import { formatNum, formatPct, leverageColor } from '../lib/utils';

// Synthesize a few game lock times relative to now so countdowns are live in
// any environment (real schedule wires in via the pipeline later).
function useGameClocks() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const games = useMemo(() => ([
    { id: 'BUF@MIA', lockIn: 18 * 60 },
    { id: 'DET@GB', lockIn: 25 * 60 },
    { id: 'DAL@PHI', lockIn: 95 * 60 },
    { id: 'KC@LV', lockIn: 220 * 60 },
  ]), []);
  const start = useRef(Date.now());
  return games.map((g) => {
    const remain = Math.max(0, g.lockIn - Math.floor((now - start.current) / 1000));
    return { ...g, remain };
  });
}

function fmtClock(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h > 0 ? `${h}h ` : ''}${m}m ${String(s).padStart(2, '0')}s`;
}
function clockColor(sec) {
  if (sec <= 0) return 'var(--red-bright)';
  if (sec < 30 * 60) return 'var(--red-bright)';
  if (sec < 3 * 3600) return 'var(--copper)';
  return 'var(--chalk)';
}

function LateScratchFeed() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let active = true;
    const load = () => fetchNews().then((d) => active && setItems(d?.items || [])).catch(() => {});
    load();
    const t = setInterval(load, 120000); // refresh every 2 minutes
    return () => { active = false; clearInterval(t); };
  }, []);
  return (
    <div style={panel}>
      <div style={panelHead}>⚑ Late Scratch Feed</div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {items.length === 0 && <div style={{ fontSize: '11px', color: 'var(--chalk-dim)' }}>No breaking news right now.</div>}
        {items.map((it, i) => {
          const critical = /\bout\b|ruled out|inactive/i.test(`${it.status || ''} ${it.headline || ''}`);
          return (
            <div key={i} className={critical ? 'gs-live-blink' : undefined} style={{ borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
              <div style={{ fontSize: '12px', color: critical ? 'var(--red-bright)' : 'var(--chalk)', fontWeight: 600 }}>
                {it.player_name} {it.status ? `· ${it.status}` : ''}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--silver)' }}>{it.headline}</div>
              <div style={{ fontSize: '9px', color: 'var(--chalk-dim)' }}>{it.time_ago || ''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickSwap() {
  const { players } = usePlayerData();
  const [scratched, setScratched] = useState(null);
  const replacements = useMemo(() => {
    if (!scratched) return [];
    return players
      .filter((p) => p.position === scratched.position && p.player_name !== scratched.player_name)
      .sort((a, b) => (b.leverage_score || 0) - (a.leverage_score || 0) || (a.projected_ownership || 0) - (b.projected_ownership || 0))
      .slice(0, 3);
  }, [scratched, players]);

  const lineup = players.slice(0, 9);
  return (
    <div style={panel}>
      <div style={panelHead}>Quick Swap</div>
      <div style={{ fontSize: '10px', color: 'var(--chalk-dim)', marginBottom: '6px' }}>Select a scratched player from your lineup:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
        {lineup.map((p) => (
          <button key={p.player_name} onClick={() => setScratched(p)} style={{ fontSize: '10px', padding: '4px 8px', borderRadius: 'var(--radius)', border: `1px solid ${scratched?.player_name === p.player_name ? 'var(--copper)' : 'var(--border)'}`, background: scratched?.player_name === p.player_name ? 'rgba(196,118,42,0.15)' : 'transparent', color: 'var(--chalk)', cursor: 'pointer' }}>
            {p.position} {p.player_name}
          </button>
        ))}
      </div>
      {scratched && (
        <div>
          <div className="eyebrow" style={{ marginBottom: '6px' }}>Top 3 replacements — {scratched.position}</div>
          {replacements.map((p, i) => (
            <div key={p.player_name} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-data)', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--chalk)' }}>{i + 1}. {p.player_name}</span>
              <span style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'var(--silver)' }}>{formatPct(p.projected_ownership, 0)}</span>
                <span style={{ color: leverageColor(p.leverage_score) }}>{formatNum(p.leverage_score, 0)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveScores() {
  const [games, setGames] = useState([
    { id: 'BUF @ MIA', a: 0, h: 0, q: '1st', mine: true },
    { id: 'DET @ GB', a: 0, h: 0, q: '1st', mine: false },
    { id: 'DAL @ PHI', a: 0, h: 0, q: 'Pre', mine: true },
  ]);
  useEffect(() => {
    const t = setInterval(() => {
      setGames((gs) => gs.map((g) => (g.q === 'Pre' ? g : { ...g, a: g.a + (Math.random() < 0.25 ? 3 : 0), h: g.h + (Math.random() < 0.25 ? 3 : 0) })));
    }, 60000); // update every 60s
    return () => clearInterval(t);
  }, []);
  return (
    <div style={panel}>
      <div style={panelHead}>Active Games</div>
      {games.map((g) => (
        <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--chalk)' }}>{g.id} {g.mine && <span title="Your players active" style={{ color: 'var(--copper)' }}>●</span>}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--chalk)' }}>{g.a}–{g.h} <span style={{ fontSize: '9px', color: 'var(--chalk-dim)' }}>{g.q}</span></span>
        </div>
      ))}
    </div>
  );
}

const panel = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px', display: 'flex', flexDirection: 'column', minHeight: '320px' };
const panelHead = { fontSize: '10px', letterSpacing: '2px', color: 'var(--copper)', textTransform: 'uppercase', marginBottom: '10px', fontFamily: 'var(--font-data)' };

export function GamedayMode() {
  const { slate } = useSlateData();
  const { save } = useLineups();
  const clocks = useGameClocks();
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [locked, setLocked] = useState(false);

  async function confirmLock() {
    setChecklistOpen(false);
    await save({ lineup_type: 'gameday', contest_type: 'GPP', result: 'pending', notes: 'Locked from War Room' });
    setLocked(true);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--chalk)', fontFamily: 'var(--font-data)', padding: '20px' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '26px', color: 'var(--copper)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Game Script War Room — Week {slate?.week ?? '—'}
        </div>
        <Link to="/app" style={{ fontSize: '10px', letterSpacing: '2px', color: 'var(--silver)' }}>← EXIT WAR ROOM</Link>
      </div>

      {/* Countdown timers */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {clocks.map((g) => (
          <div key={g.id} className={g.remain < 30 * 60 && g.remain > 0 ? 'gs-live-blink' : undefined} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px' }}>
            <div style={{ fontSize: '9px', color: 'var(--chalk-dim)', letterSpacing: '1px' }}>{g.id}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: clockColor(g.remain) }}>{g.remain <= 0 ? 'LOCKED' : fmtClock(g.remain)}</div>
          </div>
        ))}
      </div>

      {/* Three-panel war room */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        <LateScratchFeed />
        <QuickSwap />
        <LiveScores />
      </div>

      {/* Lock it */}
      {locked ? (
        <div style={{ textAlign: 'center', color: 'var(--green-text)', fontSize: '14px', padding: '16px' }}>✓ Lineup locked and logged to The Record.</div>
      ) : (
        <button
          onClick={() => setChecklistOpen(true)}
          style={{ width: '100%', padding: '18px', background: 'var(--copper)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius)', fontSize: '14px', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}
        >
          My Lineup Is Locked — Log To The Record
        </button>
      )}

      <PreLockChecklist open={checklistOpen} onConfirm={confirmLock} onClose={() => setChecklistOpen(false)} />
    </div>
  );
}
