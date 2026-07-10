// Standard module page wrapper: eyebrow + title + optional actions.
// The title renders in Rajdhani Bold 36px copper, and a (?) toggle next to it
// opens a collapsible info panel explaining what the module does.
import { useState } from 'react';
import { MODULE_INFO } from '../modules/registry';

export function PageWrapper({ eyebrow, title, desc, actions, info, children }) {
  const [showInfo, setShowInfo] = useState(false);
  // Explicit `info` prop wins; otherwise fall back to the registry copy by title.
  const infoText = info ?? MODULE_INFO[title];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          {eyebrow && <div className="eyebrow" style={{ marginBottom: '8px' }}>{eyebrow}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '36px',
                color: '#C4762A',
                textTransform: 'uppercase',
                lineHeight: 1.05,
              }}
            >
              {title}
            </h1>
            {infoText && (
              <button
                type="button"
                onClick={() => setShowInfo((v) => !v)}
                aria-label={showInfo ? 'Hide module info' : 'What does this module do?'}
                aria-expanded={showInfo}
                title="What does this module do?"
                style={{
                  flexShrink: 0,
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '1px solid var(--copper)',
                  background: showInfo ? 'var(--copper)' : 'transparent',
                  color: showInfo ? 'var(--bg)' : 'var(--copper)',
                  fontSize: '13px',
                  fontWeight: 700,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                ?
              </button>
            )}
          </div>
          {desc && (
            <div style={{ fontSize: '13px', color: 'var(--silver)', marginTop: '6px', fontFamily: 'var(--font-data)' }}>
              {desc}
            </div>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>{actions}</div>}
      </div>

      {/* Collapsible info panel — explains what the module does */}
      {infoText && showInfo && (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderLeft: '2px solid var(--copper)',
            borderRadius: 'var(--radius)',
            padding: '16px 18px',
            marginBottom: '24px',
            fontFamily: 'var(--font-data)',
            fontSize: '13px',
            lineHeight: 1.7,
            color: 'var(--chalk-dim)',
          }}
        >
          <div style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--copper)', textTransform: 'uppercase', marginBottom: '8px' }}>
            What this module does
          </div>
          {infoText}
        </div>
      )}

      {children}
    </div>
  );
}
