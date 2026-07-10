// Mobile bottom nav — center badge uses GS_Shield.png.
import { NavLink } from 'react-router-dom';

const ITEMS = [
  { name: 'Sharp', icon: '◈', path: '/app/sharp-report' },
  { name: 'Scout', icon: '◆', path: '/app/scout-report' },
  { name: 'Home', icon: null, path: '/app', badge: true },
  { name: 'Coord', icon: '▲', path: '/app/coordinator' },
  { name: 'Record', icon: '▣', path: '/app/the-record' },
];

export function BottomNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'var(--navy)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 100,
      }}
    >
      {ITEMS.map((it) => (
        <NavLink
          key={it.name}
          to={it.path}
          end={it.path === '/app'}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            color: isActive ? 'var(--copper)' : 'var(--silver)',
            fontFamily: 'var(--font-data)',
            fontSize: '8px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          })}
        >
          {it.badge ? (
            <img
              src="/assets/GS_Shield.png"
              width="28"
              height="28"
              alt="Home"
              style={{ borderRadius: 'var(--radius)', mixBlendMode: 'screen', background: 'transparent' }}
            />
          ) : (
            <span style={{ fontSize: '16px' }}>{it.icon}</span>
          )}
          {it.name}
        </NavLink>
      ))}
    </nav>
  );
}
