// ============================================================
// Stripe client — hybrid mode.
// Lazily loads Stripe.js only when a publishable key is present.
// ============================================================
import { loadStripe } from '@stripe/stripe-js';

const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const apiBase = import.meta.env.VITE_API_BASE_URL || '';

export const isStripeConfigured = Boolean(key);

let _stripePromise = null;
export function getStripe() {
  if (!isStripeConfigured) return Promise.resolve(null);
  if (!_stripePromise) _stripePromise = loadStripe(key);
  return _stripePromise;
}

// Kick off a checkout session via the backend. Pass the signed-in user so the
// webhook can map the subscription back to their profile. In mock mode (or
// without a backend) this resolves to a notice instead of redirecting.
export async function startCheckout(priceId, { userId, email, tier } = {}) {
  if (!isStripeConfigured || !apiBase) {
    return {
      ok: false,
      mock: true,
      message:
        'Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY and VITE_API_BASE_URL to enable checkout.',
    };
  }
  const res = await fetch(`${apiBase}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, userId, email, tier }),
  });
  if (!res.ok) return { ok: false, message: 'Checkout failed to start.' };
  const data = await res.json();
  if (data.mock) return { ok: false, mock: true, message: data.message };
  if (data.url) {
    window.location.href = data.url;
    return { ok: true };
  }
  const stripe = await getStripe();
  await stripe.redirectToCheckout({ sessionId: data.sessionId });
  return { ok: true };
}

// Open the Stripe Customer Portal (manage payment method, cancel subscription).
// Degrades to a notice when Stripe/backend aren't configured.
export async function openBillingPortal(customerId) {
  if (!isStripeConfigured || !apiBase) {
    return { ok: false, mock: true, message: 'Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY and VITE_API_BASE_URL.' };
  }
  const res = await fetch(`${apiBase}/api/portal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, returnUrl: `${window.location.origin}/account` }),
  });
  if (!res.ok) return { ok: false, message: 'Could not open the billing portal.' };
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
    return { ok: true };
  }
  return { ok: false, mock: data.mock, message: data.message || 'Billing portal unavailable.' };
}
