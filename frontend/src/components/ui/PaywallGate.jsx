// Wrap any feature with <PaywallGate feature="..."> to enforce tier access.
import { Link } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { TIER_LABELS, TIER_COLORS } from '../../lib/tiers';

export function PaywallGate({ feature, children, fallback }) {
  const { hasFeature, requiresTier } = useSubscription();
  if (hasFeature(feature)) return children;

  const required = requiresTier(feature);
  if (fallback) return fallback;

  return (
    <div
      style={{
        background: 'var(--navy)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '32px',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: TIER_COLORS[required],
          color: 'var(--chalk)',
          fontSize: '9px',
          letterSpacing: '2px',
          padding: '4px 10px',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-data)',
        }}
      >
        {TIER_LABELS[required]}
      </div>

      <img
        src="/assets/GS_Shield.png"
        width="48"
        alt=""
        style={{ marginBottom: '12px', opacity: 0.6, borderRadius: 'var(--radius)', mixBlendMode: 'screen', background: 'transparent' }}
      />
      <div style={{ fontSize: '14px', color: 'var(--chalk)', marginBottom: '8px' }}>
        Requires {TIER_LABELS[required]}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--chalk-dim)', marginBottom: '20px', lineHeight: 1.6 }}>
        Upgrade to unlock this module and everything else in the tier.
      </div>
      <Link
        to="/pricing"
        style={{
          display: 'inline-block',
          background: 'var(--green-bg)',
          border: '1px solid var(--green-bright)',
          color: 'var(--green-text)',
          padding: '10px 24px',
          fontSize: '11px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          borderRadius: 'var(--radius)',
        }}
      >
        View Pricing
      </Link>
    </div>
  );
}
