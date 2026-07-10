// Top header — uses GS_Shield + GS_Name brand assets.
import { TIER_DISPLAY_NAMES } from '../../lib/tiers';

export function Header({ tier }) {
  return (
    <header
      style={{
        borderBottom: '1px solid var(--border)',
        padding: '10px 20px',
        background: 'var(--navy)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Branded nameplate — premium sports-broadcast lower-third graphic */}
      <a href="/" style={{ display: 'flex', alignItems: 'center', height: '64px', textDecoration: 'none' }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(10,20,40,0.8)',
            borderBottom: '2px solid #C4762A',
            padding: '8px 20px',
            borderRadius: '0 0 4px 4px',
          }}
        >
          <img
            src="/assets/GS_Name.png"
            alt="Game Script"
            style={{ height: '46px', width: 'auto', objectFit: 'contain' }}
          />
        </span>
      </a>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            background: 'var(--green-bg)',
            border: '1px solid var(--green-bright)',
            borderRadius: 'var(--radius)',
            padding: '4px 10px',
            fontSize: '8px',
            letterSpacing: '2px',
            color: 'var(--green-text)',
            fontFamily: 'var(--font-data)',
          }}
        >
          ◈ NFL · DK
        </div>
        {tier && (
          <div
            style={{
              fontSize: '9px',
              letterSpacing: '2px',
              color: 'var(--copper)',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-data)',
            }}
          >
            {(TIER_DISPLAY_NAMES[tier] || tier).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
