// ============================================================
// Subscription — resolves the current user's tier into feature
// access. Powers <PaywallGate> and any conditional UI.
// ============================================================
import { useAuth } from './useAuth';
import { tierGrantsFeature, tierForFeature, resolveFeatures } from '../lib/tiers';

export function useSubscription() {
  const { profile } = useAuth();
  const tier = profile?.tier || 'free';
  const active = profile?.subscription_status === 'active' || tier === 'free';

  return {
    tier,
    active,
    features: resolveFeatures(tier),
    hasFeature: (feature) => tierGrantsFeature(tier, feature),
    requiresTier: (feature) => tierForFeature(feature),
  };
}
