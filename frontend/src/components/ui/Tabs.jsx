import { useState } from 'react';

export function Tabs({ tabs, initial = 0 }) {
  const [active, setActive] = useState(initial);
  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${i === active ? 'var(--copper)' : 'transparent'}`,
              color: i === active ? 'var(--chalk)' : 'var(--silver)',
              padding: '10px 16px',
              fontSize: '11px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-data)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs[active]?.content}</div>
    </div>
  );
}
