// Account page — profile, tier, Stripe success flow, billing management, usage.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { TierBadge } from '../components/ui/TierBadge';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { usePlayEvaluations } from '../hooks/usePlayEvaluations';
import { useLineups } from '../hooks/useLineups';
import { openBillingPortal } from '../lib/stripe';
import { resolveFeatures, TIER_PARENT } from '../lib/tiers';

// Human-readable unlocks for the success banner — the features a tier adds
// over its parent, lightly prettified.
function newlyUnlocked(tier) {
  const parent = TIER_PARENT[tier];
  const own = resolveFeatures(tier).filter((f) => !(parent ? resolveFeatures(parent) : []).includes(f));
  return own.map((f) => f.replace(/_/g, ' ')).slice(0, 8);
}

export function Account() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { tier } = useSubscription();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const { weekCount: scoutUsed } = usePlayEvaluations();
  const { auditWeekCount: redZoneUsed } = useLineups();

  const [celebrate, setCelebrate] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [portalMsg, setPortalMsg] = useState(null);

  // Stripe success return: wait for the webhook, refresh the profile, celebrate,
  // then clear the URL param so a refresh doesn't re-trigger it.
  useEffect(() => {
    if (params.get('checkout') !== 'success') return;
    let t2;
    const t1 = setTimeout(async () => {
      await refreshProfile?.();
      setCelebrate(true);
      t2 = setTimeout(() => {
        setCelebrate(false);
        params.delete('checkout');
        setParams(params, { replace: true });
      }, 5000);
    }, 2000);
    return () => {
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await signOut();
    navigate('/');
  }

  async function manageBilling() {
    const res = await openBillingPortal(profile?.stripe_customer_id);
    if (!res.ok) setPortalMsg(res.message || 'Billing portal unavailable.');
  }

  async function confirmCancel() {
    setCancelOpen(false);
    const res = await openBillingPortal(profile?.stripe_customer_id);
    if (!res.ok) setPortalMsg(res.message || 'To cancel, manage billing in the Stripe portal.');
  }

  const unlimited = tier !== 'free';
  const usage = [
    { label: 'Scout Report', used: scoutUsed, cap: 3 },
    { label: 'Red Zone Audit', used: redZoneUsed, cap: 1 },
  ];

  const rows = [
    ['Email', profile?.email],
    ['Name', profile?.full_name],
    ['Favorite team', profile?.favorite_team],
    ['Experience', profile?.experience_level],
    ['Primary contest', profile?.primary_contest_type],
    ['Bankroll range', profile?.bankroll_range],
    ['Subscription', profile?.subscription_status],
  ];

  return (
    <div>
      <Header tier={tier} />
      <div style={{ padding: '28px 24px' }}>
        <PageWrapper
          eyebrow="ACCOUNT"
          title="Your Account"
          actions={<Link to="/app"><Button variant="ghost">← Back to app</Button></Link>}
        >
          {/* Stripe success banner */}
          {celebrate && (
            <Card style={{ marginBottom: '16px', border: '1px solid var(--green-text)', background: 'rgba(42,139,108,0.10)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span style={{ fontSize: '24px' }}>✓</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--chalk)' }}>You're upgraded</div>
                  <div style={{ fontSize: '11px', color: 'var(--silver)' }}>Welcome to <TierBadge tier={tier} /></div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--green-text)', fontFamily: 'var(--font-data)' }}>
                Now unlocked: {newlyUnlocked(tier).join(' · ') || 'all your tier features'}
              </div>
            </Card>
          )}

          {/* Current plan */}
          <Card style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span className="eyebrow">Current plan</span>
              <TierBadge tier={tier} />
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--silver)' }}>
                {profile?.subscription_status === 'active' ? 'Renews monthly' : 'No active billing'}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '13px' }}>
              {rows.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--silver)' }}>{k}</span>
                  <span style={{ color: 'var(--chalk)' }}>{v || '—'}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Usage this week */}
          <Card style={{ marginBottom: '16px' }}>
            <div className="eyebrow" style={{ marginBottom: '12px' }}>Usage this week</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '12px', fontFamily: 'var(--font-data)', fontSize: '12px' }}>
              {usage.map((u) => (
                <div key={u.label} style={{ borderLeft: '2px solid var(--copper)', paddingLeft: '10px' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: 'var(--copper)', textTransform: 'uppercase' }}>{u.label}</div>
                  <div style={{ color: 'var(--chalk)', fontSize: '14px' }}>
                    {unlimited ? 'Unlimited' : `${Math.min(u.used, u.cap)} of ${u.cap} used`}
                  </div>
                </div>
              ))}
              <div style={{ borderLeft: '2px solid var(--copper)', paddingLeft: '10px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: 'var(--copper)', textTransform: 'uppercase' }}>Coordinator</div>
                <div style={{ color: 'var(--chalk)', fontSize: '14px' }}>{unlimited ? 'Unlimited' : 'X of 5 used'}</div>
              </div>
            </div>
          </Card>

          {/* Manage / cancel */}
          <Card style={{ marginBottom: '16px' }}>
            <div className="eyebrow" style={{ marginBottom: '12px' }}>Manage billing</div>
            {portalMsg && <Badge color="var(--copper)" style={{ marginBottom: '10px' }}>{portalMsg}</Badge>}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {tier === 'free' ? (
                <Link to="/pricing"><Button>Upgrade →</Button></Link>
              ) : (
                <>
                  <Button onClick={manageBilling}>Manage in Stripe Portal</Button>
                  <Button variant="ghost" onClick={() => setCancelOpen(true)}>Cancel subscription</Button>
                </>
              )}
            </div>
          </Card>

          <Button variant="danger" onClick={logout}>Sign Out</Button>
        </PageWrapper>
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel subscription?">
        <div style={{ fontSize: '13px', color: 'var(--silver)', fontFamily: 'var(--font-data)', lineHeight: 1.7, marginBottom: '16px' }}>
          Your access continues until the end of the current billing period, then your tier drops to Free.
          You'll be taken to the Stripe portal to confirm.
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="danger" onClick={confirmCancel}>Yes, cancel</Button>
          <Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep my plan</Button>
        </div>
      </Modal>
    </div>
  );
}
