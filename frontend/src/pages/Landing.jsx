// Public landing page — premium sports war room.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Cycling copper social-proof line, swapped every 3 seconds (#7).
const SOCIAL_PROOF = [
  '+2,847 sharps joined for Week 14',
  '+1,902 lineups cashed last Sunday',
  '+318 upgraded to Coordinator this week',
  '+41% average ROI lift, tracked Records',
];

function SocialProofRotator() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % SOCIAL_PROOF.length), 3000);
    return () => clearInterval(id);
  }, []);
  return (
    // key forces a remount so the fade-in animation replays each swap
    <strong key={i} className="gs-rotator" style={{ color: 'var(--copper)', fontWeight: 700 }}>
      {SOCIAL_PROOF[i]}
    </strong>
  );
}

// The Vault — blurred premium board with an upgrade-to-reveal overlay (#8).
function VaultCard() {
  const LOCKED_ROWS = [
    ['QB', 'Elite Leverage Stack', '94'],
    ['RB', 'Contrarian Anchor', '88'],
    ['WR', 'Field Pivot', '81'],
    ['TE', 'Scarcity Edge', '77'],
  ];
  return (
    <div className="gs-vault" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderLeft: '2px solid var(--copper)', borderRadius: 'var(--radius)' }}>
      <div className="gs-vault-content" style={{ padding: '20px' }}>
        <div className="eyebrow" style={{ marginBottom: '12px' }}>This Week's Sharp Leverage Board</div>
        {LOCKED_ROWS.map(([pos, name, lev]) => (
          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-data)', fontSize: '13px' }}>
            <span style={{ color: 'var(--silver)' }}>{pos} · {name}</span>
            <span style={{ color: 'var(--copper)', fontWeight: 700 }}>LEV {lev}</span>
          </div>
        ))}
      </div>
      <div className="gs-vault-overlay">
        <div style={{ fontSize: '26px' }}>🔒</div>
        <div style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--copper)', textTransform: 'uppercase' }}>The Vault</div>
        <div style={{ fontSize: '13px', color: 'var(--chalk)', maxWidth: '260px', lineHeight: 1.6 }}>
          The exact players sharps are leveraging this week — locked.
        </div>
        <Link
          to="/pricing"
          className="gs-glow-pulse"
          style={{ marginTop: '6px', background: 'var(--green-bg)', border: '1px solid var(--green-bright)', color: 'var(--green-text)', padding: '10px 22px', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', borderRadius: 'var(--radius)' }}
        >
          Upgrade to reveal
        </Link>
      </div>
    </div>
  );
}

const STATS = [
  ['18', 'Modules'],
  ['7+', 'Data Sources'],
  ['3', 'Lineup Types'],
  ['1', 'Platform'],
];

const PLATFORM_MODULES = [
  { icon: '◈', name: 'Sharp Report', desc: 'What the smart money knows', preview: 'The smart-money read on the slate before you touch an optimizer — the chalk to fade, the contrarian spots to attack, and the reasoning behind every call.' },
  { icon: '◎', name: 'Film Room', desc: 'Where champions prepare', preview: 'A seven-step research process that walks you through every source and signal the way pros prepare. Build your read methodically instead of guessing.' },
  { icon: '◆', name: 'Scout Report', desc: 'Data vs emotional bias', preview: "A verdict on any player you're weighing: data-supported play or emotional bias. Get the honest case for and against starting them." },
  { icon: '⬡', name: 'Chalkbreaker', desc: 'Break from the field', preview: 'A contrarian GPP engine that finds where the field is piling on chalk and surfaces the leverage plays and stacks that let you differentiate.' },
  { icon: '◻', name: 'Red Zone', desc: 'Lineup audit system', preview: 'A full lineup audit scoring correlation, salary use, bias, and game script — then telling you exactly what to fix before lock.' },
  { icon: '▲', name: 'The Coordinator', desc: 'Your AI strategist', preview: 'Your AI strategist on call. Direct, opinionated chat that challenges your assumptions, corrects bias, and pressure-tests your slate plan.' },
  { icon: '⊕', name: 'Sunday Mode', desc: 'Fast lineup generator', preview: "The fast path when time's short — three guided steps to a locked, optimized lineup built for Sunday-morning crunch." },
  { icon: '▣', name: 'The Record', desc: 'Proof of concept tracker', preview: "Your season-long proof of concept. Every lineup, every week, every result tracked so you see what's actually working." },
];

// Trust badges shown beneath the primary CTA.
const TRUST_BADGES = ['✓ No card required', '✓ Cancel anytime', '✓ Secure checkout'];

// Hero floating particles — fixed positions/timings (no Math.random for SSR safety).
const PARTICLES = [
  { left: '8%', size: 4, dur: 11, delay: 0 },
  { left: '18%', size: 3, dur: 14, delay: 2.5 },
  { left: '29%', size: 5, dur: 9, delay: 1.2 },
  { left: '40%', size: 3, dur: 13, delay: 4 },
  { left: '51%', size: 4, dur: 10, delay: 0.6 },
  { left: '62%', size: 3, dur: 15, delay: 3.2 },
  { left: '71%', size: 5, dur: 12, delay: 1.8 },
  { left: '82%', size: 4, dur: 9.5, delay: 5 },
  { left: '90%', size: 3, dur: 13.5, delay: 2 },
  { left: '46%', size: 2, dur: 16, delay: 6 },
];

// FAQ shown in the support modal.
const FAQ = [
  ['Do I need a credit card to start?', 'No. Start Free gives you full access to the core modules — no card, no commitment.'],
  ['Which sports are supported?', 'Game Script is built for NFL DraftKings DFS, from cash games to large-field GPPs.'],
  ['Can I cancel anytime?', 'Yes. Upgrade or cancel from your account in one click. No contracts, no retention games.'],
  ['How is this different from other tools?', 'We don\'t just hand you projections — every module teaches the pro process behind the read.'],
];

const linkBtn = {
  primary: { background: 'var(--green-bg)', border: '1px solid var(--green-bright)', color: 'var(--green-text)' },
  ghost: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--silver)' },
};
const btn = (kind) => ({
  ...linkBtn[kind],
  padding: '12px 28px',
  fontSize: '11px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  borderRadius: 'var(--radius)',
});

// Animated chalk play-diagram drawn into the hero background.
// Routes + X/O markers stroke-draw on a loop via the .gs-chalk keyframes.
function ChalkPlay() {
  return (
    <svg
      className="gs-chalk"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {/* Line of scrimmage */}
      <line data-d="0" x1="40" y1="180" x2="360" y2="180" />
      {/* Routes — slant, post, wheel, curl */}
      <polyline data-d="1" points="120,180 150,120 210,90" />
      <polyline data-d="2" points="200,180 200,110 250,70" />
      <polyline data-d="3" points="280,180 300,130 280,90 320,80" />
      <polyline data-d="4" points="90,180 70,130 95,100" />
      {/* QB drop + handoff arc */}
      <path data-d="5" d="M200,200 C180,215 170,235 185,250" />
      {/* O — offensive markers */}
      <circle data-d="1" cx="120" cy="180" r="6" />
      <circle data-d="3" cx="280" cy="180" r="6" />
      <circle data-d="0" cx="200" cy="200" r="6" />
      {/* X — defensive markers */}
      <path className="gs-x" data-d="2" d="M150,140 l8,8 M158,140 l-8,8" />
      <path className="gs-x" data-d="4" d="M300,150 l8,8 M308,150 l-8,8" />
    </svg>
  );
}

// Floating copper particles drifting up through the hero.
function HeroParticles() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="gs-particle"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Fixed copper support button (bottom-right) + help/FAQ modal.
function SupportWidget() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Get help"
        className="gs-glow-pulse"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 900,
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          border: '1px solid var(--copper-bright)',
          background: 'linear-gradient(180deg, var(--copper-bright), var(--copper))',
          color: '#06090d',
          fontSize: '24px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        ?
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6,9,13,0.82)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderLeft: '2px solid var(--copper)',
              borderRadius: 'var(--radius)',
              width: '520px',
              maxWidth: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ fontSize: '20px', color: 'var(--chalk)' }}>Need a hand?</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ background: 'transparent', border: 'none', color: 'var(--silver)', fontSize: '22px' }}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--silver)', marginBottom: '20px' }}>
              Quick answers — or email{' '}
              <a href="mailto:support@logantia.com" style={{ color: 'var(--copper)' }}>
                support@logantia.com
              </a>
              .
            </div>

            {FAQ.map(([q, a]) => (
              <div key={q} style={{ borderTop: '1px solid var(--border)', padding: '14px 0' }}>
                <div style={{ fontSize: '13px', color: 'var(--chalk)', marginBottom: '6px', fontWeight: 600 }}>{q}</div>
                <div style={{ fontSize: '12px', color: 'var(--chalk-dim)', lineHeight: 1.6 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Preview modal shown when a platform module card is clicked.
function ModulePreviewModal({ module, onClose }) {
  if (!module) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6,9,13,0.82)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderLeft: '2px solid var(--copper)',
          borderRadius: 'var(--radius)',
          width: '460px',
          maxWidth: '100%',
          padding: '28px',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: '16px', right: '18px', background: 'transparent', border: 'none', color: 'var(--silver)', fontSize: '22px', lineHeight: 1 }}
        >
          ×
        </button>
        <div style={{ fontSize: '32px', marginBottom: '12px', color: 'var(--copper)' }}>{module.icon}</div>
        <div style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--copper)', textTransform: 'uppercase', marginBottom: '6px' }}>
          Module Preview
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--chalk)', marginBottom: '4px' }}>{module.name}</h3>
        <div style={{ fontSize: '12px', color: 'var(--silver)', marginBottom: '16px' }}>{module.desc}</div>
        <div style={{ fontSize: '13px', color: 'var(--chalk-dim)', lineHeight: 1.7, fontFamily: 'var(--font-body)', marginBottom: '24px' }}>
          {module.preview}
        </div>
        <Link
          to="/pricing"
          className="gs-glow-pulse"
          style={{
            display: 'block',
            textAlign: 'center',
            background: 'var(--green-bg)',
            border: '1px solid var(--green-bright)',
            color: 'var(--green-text)',
            padding: '12px',
            fontSize: '11px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            borderRadius: 'var(--radius)',
          }}
        >
          Unlock with a plan — View Pricing
        </Link>
        <Link
          to="/register"
          style={{ display: 'block', textAlign: 'center', marginTop: '10px', fontSize: '10px', letterSpacing: '1px', color: 'var(--chalk-dim)', textTransform: 'uppercase' }}
        >
          Or start free →
        </Link>
      </div>
    </div>
  );
}

export function Landing() {
  const [preview, setPreview] = useState(null);
  return (
    <div
      style={{
        minHeight: '100vh',
        // Background comes from the global deep radial gradient + hex grid (body).
        background: 'transparent',
        color: 'var(--chalk)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Social proof bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(10,22,40,0.6)',
          fontSize: '11px',
          letterSpacing: '1px',
          color: 'var(--silver)',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--green-text)',
            boxShadow: '0 0 8px 1px var(--green-text)',
          }}
        />
        <span>
          <strong style={{ color: 'var(--chalk)' }}>2,847</strong> sharps building lineups right now
        </span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <SocialProofRotator />
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <ChalkPlay />
        <HeroParticles />
        <div
          style={{
            position: 'relative',
            textAlign: 'center',
            padding: '72px 24px 60px',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          {/* Crest emblem (220px) with copper radial glow behind it */}
          <div
            className="gs-crest-glow"
            style={{ position: 'relative', width: '220px', maxWidth: '100%', margin: '0 auto 24px' }}
          >
            <img
              src="/assets/GS_Crest.png"
              width="220"
              alt=""
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'block',
                width: '220px',
                maxWidth: '100%',
                margin: '0 auto',
                mixBlendMode: 'screen',
                background: 'transparent',
              }}
            />
          </div>

          <div style={{ fontSize: '11px', letterSpacing: '4px', color: 'var(--copper)', marginBottom: '16px' }}>
            NFL · DRAFTKINGS · INTELLIGENCE
          </div>
          <div style={{ fontSize: '14px', color: 'var(--silver)', lineHeight: 1.8, maxWidth: '420px', margin: '0 auto 32px' }}>
            Read the script. Win the slate.
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="gs-glow-pulse" style={btn('primary')}>Start Free</Link>
            <Link to="/pricing" style={btn('ghost')}>View Pricing</Link>
          </div>

          {/* Urgency text near the Start Free button */}
          <div style={{ fontSize: '11px', color: 'var(--copper-bright)', letterSpacing: '1px', marginTop: '14px' }}>
            ⚡ Free through NFL Week 1 — lock in before kickoff
          </div>

          {/* Trust badges */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '18px',
              flexWrap: 'wrap',
              marginTop: '16px',
              fontSize: '10px',
              letterSpacing: '1px',
              color: 'var(--chalk-dim)',
            }}
          >
            {TRUST_BADGES.map((b) => (
              <span key={b}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '24px 20px', display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
        {STATS.map(([num, label], i) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div
              className="gs-stat-shimmer"
              style={{
                fontSize: '44px',
                fontWeight: 700,
                lineHeight: 1,
                fontFamily: 'var(--font-display)',
                animationDelay: `${i * 0.18}s`,
              }}
            >
              {num}
            </div>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--silver)', marginTop: '6px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* The Vault — blurred premium teaser */}
      <div style={{ padding: '52px 24px 0', maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '4px', color: 'var(--copper)', textAlign: 'center', marginBottom: '20px' }}>
          THE VAULT
        </div>
        <VaultCard />
      </div>

      {/* Module grid */}
      <div style={{ padding: '60px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '4px', color: 'var(--copper)', textAlign: 'center', marginBottom: '32px' }}>
          THE PLATFORM
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {PLATFORM_MODULES.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() => setPreview(m)}
              aria-label={`Preview ${m.name}`}
              className="gs-module-card"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>{m.icon}</div>
              <div style={{ fontSize: '11px', color: 'var(--chalk)', letterSpacing: '1px', marginBottom: '4px' }}>{m.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--chalk-dim)' }}>{m.desc}</div>
              <div style={{ fontSize: '9px', color: 'var(--copper)', letterSpacing: '1px', marginTop: '10px', textTransform: 'uppercase' }}>Preview →</div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '12px' }}>
          {[['Pricing', '/pricing'], ['Login', '/login'], ['Register', '/register']].map(([l, to]) => (
            <Link key={l} to={to} style={{ fontSize: '10px', color: 'var(--chalk-dim)', letterSpacing: '1px' }}>{l}</Link>
          ))}
        </div>
        <div style={{ fontSize: '9px', color: '#4a5a6a', letterSpacing: '2px' }}>
          GAME SCRIPT © 2025 · READ THE SCRIPT. WIN THE SLATE.
        </div>
      </div>

      {/* Module preview modal with pricing CTA */}
      <ModulePreviewModal module={preview} onClose={() => setPreview(null)} />

      {/* Fixed copper support button + FAQ modal */}
      <SupportWidget />
    </div>
  );
}
