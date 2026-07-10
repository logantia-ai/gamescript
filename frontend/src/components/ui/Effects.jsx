// Premium visual-effect primitives shared across modules.
// Each effect degrades gracefully under prefers-reduced-motion (handled in CSS).
import { useEffect, useRef, useState } from 'react';

// --------------------------------------------------------------------------- //
// FlipNumber — splitflap-style per-digit flip with a 50ms stagger.
// Re-flips whenever `children` changes (keyed on the string value).
export function FlipNumber({ children, style }) {
  const value = children == null ? '' : String(children);
  return (
    <span style={style} aria-label={value}>
      {value.split('').map((ch, i) => (
        // key includes value so a changed value remounts and re-triggers the flip
        <span
          key={`${value}-${i}`}
          className="gs-flip-digit"
          aria-hidden="true"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
}

// --------------------------------------------------------------------------- //
// RadarPulse — concentric copper rings. Sweeps slowly; pass active to speed up.
export function RadarPulse({ active = false, title }) {
  return (
    <span className={`gs-radar${active ? ' gs-radar--fast' : ''}`} role="img" aria-label={title || 'radar'} title={title}>
      <span className="gs-radar-ring" />
      <span className="gs-radar-ring" />
      <span className="gs-radar-dot" />
    </span>
  );
}

// --------------------------------------------------------------------------- //
// ChalkBackdrop — the play diagram drawn once and held static at 0.04 opacity.
// Used as a faint backdrop layer (e.g. behind the Coordinator chat).
export function ChalkBackdrop({ style }) {
  return (
    <svg
      className="gs-chalk-static"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', ...style }}
    >
      <line data-d="0" x1="40" y1="180" x2="360" y2="180" />
      <polyline data-d="1" points="120,180 150,120 210,90" />
      <polyline data-d="2" points="200,180 200,110 250,70" />
      <polyline data-d="3" points="280,180 300,130 280,90 320,80" />
      <polyline data-d="4" points="90,180 70,130 95,100" />
      <path data-d="5" d="M200,200 C180,215 170,235 185,250" />
      <circle data-d="1" cx="120" cy="180" r="6" />
      <circle data-d="3" cx="280" cy="180" r="6" />
      <circle data-d="0" cx="200" cy="200" r="6" />
      <path className="gs-x" data-d="2" d="M150,140 l8,8 M158,140 l-8,8" />
      <path className="gs-x" data-d="4" d="M300,150 l8,8 M308,150 l-8,8" />
    </svg>
  );
}

// --------------------------------------------------------------------------- //
// Confetti — one-shot copper/green burst. Render when `fire` is true; it
// self-removes after the animation. Fixed piece layout (no Math.random).
const CONFETTI = [
  { left: '8%', color: 'var(--green-text)', delay: 0, dur: 820 },
  { left: '18%', color: 'var(--copper-bright)', delay: 40, dur: 900 },
  { left: '28%', color: 'var(--green-bright)', delay: 90, dur: 760 },
  { left: '38%', color: 'var(--copper)', delay: 30, dur: 880 },
  { left: '48%', color: 'var(--green-text)', delay: 120, dur: 840 },
  { left: '58%', color: 'var(--copper-bright)', delay: 60, dur: 800 },
  { left: '68%', color: 'var(--green-bright)', delay: 100, dur: 900 },
  { left: '78%', color: 'var(--copper)', delay: 20, dur: 780 },
  { left: '88%', color: 'var(--green-text)', delay: 80, dur: 860 },
  { left: '94%', color: 'var(--copper-bright)', delay: 50, dur: 820 },
];

export function Confetti({ fire }) {
  const [show, setShow] = useState(false);
  const timer = useRef(null);
  useEffect(() => {
    if (!fire) return;
    setShow(true);
    timer.current = setTimeout(() => setShow(false), 1100);
    return () => clearTimeout(timer.current);
  }, [fire]);

  if (!show) return null;
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 5 }}>
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="gs-confetti-piece"
          style={{ left: c.left, background: c.color, animationDelay: `${c.delay}ms`, animationDuration: `${c.dur}ms` }}
        />
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------- //
// ModuleWatermark — faint GS_Shield fixed to the bottom-right of every module.
export function ModuleWatermark() {
  return <img src="/assets/GS_Shield.png" alt="" aria-hidden="true" className="gs-module-watermark" />;
}
