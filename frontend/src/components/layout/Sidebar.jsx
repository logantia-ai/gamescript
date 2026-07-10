// Desktop sidebar nav. Locked modules show a small lock glyph.
// Footer carries a profile-completion meter and the copper-glow shield.
import { NavLink } from 'react-router-dom';
import { MODULES } from '../modules/registry';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';

// Fields that count toward a "complete" profile.
const PROFILE_FIELDS = ['full_name', 'favorite_team', 'experience_level', 'primary_contest_type', 'bankroll_range'];

function profileCompletion(profile) {
  if (!profile) return 0;
  let done = profile.onboarding_complete ? 1 : 0;
  for (const f of PROFILE_FIELDS) if (profile[f]) done += 1;
  return Math.round((done / (PROFILE_FIELDS.length + 1)) * 100);
}

export function Sidebar() {
  const { hasFeature } = useSubscription();
  const { profile } = useAuth();
  const pct = profileCompletion(profile);

  return (
    <nav
      style={{
        width: '220px',
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: 'var(--navy)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {MODULES.map((m) => {
          const locked = m.feature && !hasFeature(m.feature);
          return (
            <NavLink
              key={m.key}
              to={m.path}
              end={m.path === '/app'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 18px',
                fontFamily: 'var(--font-data)',
                fontSize: '12px',
                letterSpacing: '1px',
                color: isActive ? 'var(--chalk)' : locked ? 'var(--chalk-dim)' : 'var(--silver)',
                borderLeft: `2px solid ${isActive ? 'var(--copper)' : 'transparent'}`,
                background: isActive ? 'var(--card)' : 'transparent',
              })}
            >
              <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{m.icon}</span>
              <span style={{ flex: 1 }}>{m.name}</span>
              {locked && <span style={{ fontSize: '10px', opacity: 0.6 }}>🔒</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Footer — profile completion meter + copper-glow shield */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '14px 18px 18px' }}>
        <NavLink to="/account" style={{ textDecoration: 'none', display: 'block' }} title="Complete your profile">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <span style={{ fontSize: '8px', letterSpacing: '2px', color: 'var(--chalk-dim)', textTransform: 'uppercase' }}>
              Profile
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-data)', color: pct === 100 ? 'var(--green-text)' : 'var(--copper)' }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: '4px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: pct === 100 ? 'var(--green-bright)' : 'linear-gradient(90deg, var(--copper), var(--copper-bright))',
                borderRadius: '999px',
                transition: 'width 360ms cubic-bezier(0.2,0.75,0.3,1)',
              }}
            />
          </div>
        </NavLink>

      </div>

      {/* AFFILIATE MARKETING SECTION — POPULATE AFTER PARTNER APPROVAL */}
      <div id="affiliate-sidebar" className="affiliate-placeholder" style={{ display: 'none' }} />

      {/* Glowing coat-of-arms — anchors the entire sidebar with a copper beacon */}
      <div
        style={{
          borderTop: '1px solid rgba(196,118,42,0.2)',
          padding: '20px 0',
          display: 'flex',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, rgba(10,20,40,0) 0%, rgba(10,20,40,0.85) 100%)',
        }}
      >
        <img
          src="/assets/GS_Shield.png"
          alt=""
          aria-hidden="true"
          className="gs-glow-pulse"
          style={{
            width: '110px',
            height: 'auto',
            objectFit: 'contain',
            boxShadow: '0 0 30px rgba(196,118,42,0.5)',
            borderRadius: '50%',
          }}
        />
      </div>
    </nav>
  );
}
