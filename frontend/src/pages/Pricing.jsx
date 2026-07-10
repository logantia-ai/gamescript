// Pricing page — Free / Coordinator / Head Coach tiers.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { startCheckout } from '../lib/stripe';
import { useAuth } from '../hooks/useAuth';

const TIERS = [
  {
    name: 'Free',
    key: 'free',
    price: '$0',
    period: '',
    color: 'var(--silver)',
    features: [
      '✅ Dashboard (view only)',
      '✅ Film Room (full research checklist)',
      '✅ Sharp Report (top 3 decisions)',
      '✅ Scout Report (3 evaluations/week)',
      '✅ Red Zone (1 audit/week)',
      '✅ The Coordinator (5 messages/week)',
      '✅ The Record (3 weeks)',
      '❌ Chalkbreaker · Stack Builder · Sunday Mode',
      '❌ Late Swap · Bankroll · Portfolio Builder',
      '❌ Contest IQ · Weekly Debrief',
    ],
    cta: 'Start Free',
    ctaHref: '/register',
    badge: null,
    priceIds: { monthly: null, annual: null },
  },
  {
    name: 'Coordinator',
    key: 'sharp',
    price: '$29',
    annualPrice: '$199',
    period: '/month',
    annualPeriod: '/year',
    color: 'var(--copper)',
    features: [
      '✅ Everything in Free',
      '✅ Full Sharp Report + The Tell',
      '✅ Unlimited Scout / Red Zone / Coordinator',
      '✅ Chalkbreaker · Stack Builder · Sunday Mode',
      '✅ Late Swap · DK CSV import/export',
      '✅ Bankroll · Contest IQ',
      '✅ All slate types · Player Profiler data',
      '✅ Monte Carlo P10–P99 · Full season Record',
      '✅ Performance charts · Weekly Debrief',
      '❌ GTO · Portfolio · Opponent · Bias Report',
    ],
    cta: 'Start Coordinator',
    badge: 'MOST POPULAR',
    priceIds: { monthly: 'price_SHARP_MONTHLY', annual: 'price_SHARP_ANNUAL' },
    annualSavings: 'Save $149 — 5 months free',
    lossAversion: 'Coordinator users averaged +31% ROI vs. free players last season',
  },
  {
    name: 'Head Coach',
    key: 'coordinator',
    price: '$99',
    annualPrice: '$699',
    period: '/month',
    annualPeriod: '/year',
    color: 'var(--tier-coordinator)',
    features: [
      '✅ Everything in Coordinator',
      '✅ GTO Mode (game theory optimal)',
      '✅ Opponent Modeling (field construction)',
      '✅ Portfolio Builder (up to 20 lineups)',
      '✅ Personal Bias Report',
      '✅ Advanced slate simulation (5k–10k)',
      '✅ Historical backtesting',
      '✅ Real-time projection refresh',
      '✅ API access · Early feature access',
      '✅ Win probability estimates per lineup',
    ],
    cta: 'Go Head Coach',
    badge: null,
    priceIds: { monthly: 'price_COORD_MONTHLY', annual: 'price_COORD_ANNUAL' },
    annualSavings: 'Save $489 — almost 5 months free',
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [notice, setNotice] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function checkout(tier) {
    const priceId = annual ? tier.priceIds.annual : tier.priceIds.monthly;
    if (!priceId) return;
    if (!user) {
      // Checkout needs an account so the subscription maps to a profile.
      navigate('/register');
      return;
    }
    const res = await startCheckout(priceId, {
      userId: user.id,
      email: user.email,
      tier: tier.key,
    });
    if (res.mock || !res.ok) setNotice(res.message || 'Could not start checkout.');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: 'var(--chalk)', fontFamily: 'var(--font-data)', padding: '48px 24px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <Link to="/" style={{ fontSize: '10px', letterSpacing: '3px', color: 'var(--silver)' }}>← BACK</Link>
        </div>
        <div className="gs-crest-glow" style={{ position: 'relative', width: '240px', maxWidth: '100%', margin: '0 auto 16px' }}>
          <img
            src="/assets/GS_Crest.png"
            width="240"
            alt="Game Script"
            style={{ position: 'relative', zIndex: 1, display: 'block', width: '240px', maxWidth: '100%', margin: '0 auto', objectFit: 'contain', mixBlendMode: 'screen', background: 'transparent' }}
          />
        </div>
        <h1 style={{ textAlign: 'center', fontSize: '32px', textTransform: 'uppercase' }}>Pricing</h1>
        <p style={{ textAlign: 'center', color: 'var(--silver)', fontSize: '13px', marginBottom: '24px' }}>
          Read the script. Win the slate.
        </p>

        {/* Monthly/annual toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {[['Monthly', false], ['Annual', true]].map(([label, val]) => (
            <button
              key={label}
              onClick={() => setAnnual(val)}
              style={{
                background: annual === val ? 'var(--copper)' : 'transparent',
                border: '1px solid var(--copper)',
                color: annual === val ? 'var(--bg)' : 'var(--copper)',
                padding: '8px 20px',
                fontSize: '10px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                borderRadius: 'var(--radius)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {notice && (
          <div style={{ textAlign: 'center', color: 'var(--copper)', fontSize: '12px', marginBottom: '20px' }}>{notice}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {TIERS.map((t) => {
            const showAnnual = annual && t.annualPrice;
            return (
              <div
                key={t.name}
                style={{
                  background: 'var(--card)',
                  border: `1px solid ${t.badge ? t.color : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  padding: '24px',
                  position: 'relative',
                }}
              >
                {t.badge && (
                  <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: t.color, color: 'var(--bg)', fontSize: '8px', letterSpacing: '2px', padding: '3px 10px', borderRadius: 'var(--radius)' }}>
                    {t.badge}
                  </div>
                )}
                <div style={{ fontSize: '14px', letterSpacing: '3px', color: t.color, textTransform: 'uppercase', marginBottom: '12px' }}>{t.name}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', color: 'var(--chalk)' }}>
                  {showAnnual ? t.annualPrice : t.price}
                  <span style={{ fontSize: '12px', color: 'var(--silver)', fontFamily: 'var(--font-data)' }}>
                    {showAnnual ? t.annualPeriod : t.period}
                  </span>
                </div>
                {showAnnual && t.annualSavings && (
                  <div style={{ fontSize: '10px', color: 'var(--green-text)', marginTop: '4px' }}>{t.annualSavings}</div>
                )}

                {t.lossAversion && (
                  <div
                    style={{
                      marginTop: '14px',
                      background: 'rgba(196,118,42,0.10)',
                      border: '1px solid var(--copper)',
                      borderRadius: 'var(--radius)',
                      padding: '10px 12px',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ color: 'var(--green-text)', fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, lineHeight: 1 }}>+31%</span>
                    <span style={{ fontSize: '10px', color: 'var(--silver)', lineHeight: 1.5 }}>{t.lossAversion}</span>
                  </div>
                )}

                <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', fontSize: '11px', lineHeight: 2, color: 'var(--silver)' }}>
                  {t.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>

                {t.ctaHref ? (
                  <Link to={t.ctaHref} style={{ display: 'block', textAlign: 'center', background: 'var(--green-bg)', border: '1px solid var(--green-bright)', color: 'var(--green-text)', padding: '11px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', borderRadius: 'var(--radius)' }}>
                    {t.cta}
                  </Link>
                ) : (
                  <button onClick={() => checkout(t)} style={{ width: '100%', background: t.color, border: 'none', color: 'var(--bg)', padding: '11px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', borderRadius: 'var(--radius)' }}>
                    {t.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
