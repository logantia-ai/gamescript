// PreLockChecklist (Task 11) — mandatory 5-point verification before a lineup
// can be locked/saved. All five must be checked to enable Confirm Lock.
// Completion vs skip is tracked in localStorage so The Record can report the rate.
import { useState } from 'react';

const QUESTIONS = [
  'Did you verify all player injury statuses are Active or confirmed playing?',
  'Did you check weather for all outdoor games in your lineup?',
  'Does your QB have at least one pass catcher from the same team?',
  'Is your ownership level appropriate for your contest type (GPP vs Cash)?',
  'Did you run The Tell or Red Zone audit on this lineup?',
];

const STATS_KEY = 'gs_prelock_stats';

export function recordChecklistStat(kind /* 'completed' | 'skipped' */) {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{"completed":0,"skipped":0}');
    s[kind] = (s[kind] || 0) + 1;
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch { /* storage unavailable */ }
}

export function getChecklistStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || '{"completed":0,"skipped":0}');
  } catch {
    return { completed: 0, skipped: 0 };
  }
}

export function PreLockChecklist({ open, onConfirm, onSkip, onClose }) {
  const [checked, setChecked] = useState(() => QUESTIONS.map(() => false));
  if (!open) return null;

  const allChecked = checked.every(Boolean);
  const toggle = (i) => setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)));

  function confirm() {
    recordChecklistStat('completed');
    onConfirm?.();
  }
  function skip() {
    recordChecklistStat('skipped');
    (onSkip || onClose)?.();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pre-lock checklist"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(4,8,18,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', width: '440px', maxWidth: '100%', background: 'var(--navy)', border: '1px solid var(--copper)', borderRadius: 'var(--radius)', padding: '24px', overflow: 'hidden' }}
      >
        {/* Shield watermark @30% behind the checklist */}
        <img src="/assets/GS_Shield.png" alt="" aria-hidden="true" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '220px', opacity: 0.3, pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="eyebrow" style={{ color: 'var(--copper)', marginBottom: '4px' }}>Pre-Lock Checklist</div>
          <div style={{ fontSize: '12px', color: 'var(--silver)', marginBottom: '16px' }}>Confirm all five before you lock.</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {QUESTIONS.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <span
                  className={checked[i] ? 'gs-check-flash' : undefined}
                  style={{
                    flexShrink: 0, width: '22px', height: '22px', borderRadius: '4px', marginTop: '1px',
                    border: `1px solid ${checked[i] ? 'var(--copper)' : 'var(--border)'}`,
                    background: checked[i] ? 'var(--copper)' : 'transparent',
                    color: 'var(--bg)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {checked[i] ? '✓' : ''}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--chalk)', fontFamily: 'var(--font-data)', lineHeight: 1.5 }}>{q}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={confirm}
            disabled={!allChecked}
            style={{
              width: '100%', marginTop: '20px', padding: '13px', borderRadius: 'var(--radius)', border: 'none',
              background: allChecked ? 'var(--copper)' : 'var(--border)', color: allChecked ? 'var(--bg)' : 'var(--chalk-dim)',
              fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, cursor: allChecked ? 'pointer' : 'not-allowed',
            }}
          >
            Lock My Lineup
          </button>
          <button type="button" onClick={skip} style={{ display: 'block', margin: '10px auto 0', background: 'transparent', border: 'none', color: 'var(--chalk-dim)', fontSize: '10px', cursor: 'pointer' }}>
            Skip checklist (not recommended)
          </button>
        </div>
      </div>
    </div>
  );
}
