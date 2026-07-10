// Shared centered card layout for Login / Register, with the wordmark.
import { Link } from 'react-router-dom';

export function AuthShell({ title, subtitle, children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-data)',
      }}
    >
      <div style={{ width: '380px', maxWidth: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Link to="/" className="gs-crest-glow" style={{ position: 'relative', display: 'block', width: '200px', maxWidth: '100%', margin: '0 auto' }}>
            <img src="/assets/GS_Crest.png" width="200" alt="Game Script" style={{ position: 'relative', zIndex: 1, display: 'block', width: '200px', maxWidth: '100%', margin: '0 auto', objectFit: 'contain', mixBlendMode: 'screen', background: 'transparent' }} />
          </Link>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--chalk)', textTransform: 'uppercase', textAlign: 'center' }}>{title}</h2>
          {subtitle && <div style={{ fontSize: '11px', color: 'var(--silver)', textAlign: 'center', marginBottom: '20px' }}>{subtitle}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
