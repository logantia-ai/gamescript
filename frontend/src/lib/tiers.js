// ============================================================
// Subscription tiers, feature flags, and resolution helpers
// ============================================================

export const PRICE_IDS = {
  sharp_monthly: 'price_SHARP_MONTHLY', // $29/mo
  sharp_annual: 'price_SHARP_ANNUAL', // $199/yr
  coordinator_monthly: 'price_COORD_MONTHLY', // $99/mo
  coordinator_annual: 'price_COORD_ANNUAL', // $699/yr
  creator_license: 'price_CREATOR_MONTHLY', // $299/mo
};

// Tier hierarchy (low → high). Each tier inherits everything below it.
export const TIER_ORDER = ['free', 'sharp', 'coordinator', 'creator'];

export const TIER_PARENT = {
  free: null,
  sharp: 'free',
  coordinator: 'sharp',
  creator: 'coordinator',
};

export const TIER_FEATURES = {
  free: [
    'dashboard_view_only',
    'film_room_full',
    'sharp_report_top3_only',
    'scout_report_3_per_week',
    'red_zone_1_per_week',
    'coordinator_5_messages_per_week',
    'record_3_weeks_only',
    'weather_basic',
    'slate_main_only',
  ],
  sharp: [
    'dashboard_full',
    'sharp_report_full',
    'the_tell_full',
    'scout_report_unlimited',
    'red_zone_unlimited',
    'coordinator_unlimited',
    'chalkbreaker',
    'stack_builder',
    'sunday_mode',
    'optimizer_all_three_lineups',
    'dk_csv_import_export',
    'late_swap',
    'record_full_season',
    'performance_charts',
    'bankroll_module',
    'contest_iq',
    'position_scarcity_alerts',
    'all_slate_types',
    'player_profiler_data',
    'monte_carlo_full',
    'weekly_debrief',
  ],
  coordinator: [
    'everything_in_sharp',
    'gto_mode',
    'opponent_modeling',
    'portfolio_builder_20_lineups',
    'personal_bias_report',
    'slate_simulation_engine',
    'historical_backtesting',
    'real_time_projection_refresh',
    'api_access',
    'early_feature_access',
    'win_probability_estimates',
  ],
  creator: [
    'everything_in_coordinator',
    'white_label_branding',
    'creator_dashboard',
    'subscriber_analytics',
    'custom_domain',
    'priority_support',
  ],
};

// User-facing tier display names. Internal keys stay 'sharp'/'coordinator'
// so existing subscriptions, Stripe price IDs, and feature flags keep working —
// only the branding shown to users changed (Sharp→Coordinator, Coordinator→Head Coach).
export const TIER_DISPLAY_NAMES = {
  free: 'Free',
  sharp: 'Coordinator',
  coordinator: 'Head Coach',
  creator: 'Creator License',
};

export const TIER_LABELS = {
  sharp: 'COORDINATOR — $29/mo',
  coordinator: 'HEAD COACH — $99/mo',
  creator: 'CREATOR LICENSE — $299/mo',
};

export const TIER_COLORS = {
  free: '#8a9ba8',
  sharp: '#c4762a',
  coordinator: '#8a6fd4',
  creator: '#2a8b6c',
};

// Expand a tier into the full flat set of features it grants,
// inheriting from all lower tiers and stripping `everything_in_*` tokens.
export function resolveFeatures(tier) {
  const own = (TIER_FEATURES[tier] || []).filter(
    (f) => !f.startsWith('everything_in_')
  );
  const parent = TIER_PARENT[tier];
  return parent ? [...resolveFeatures(parent), ...own] : own;
}

// Lowest tier that grants a given feature. Defaults to 'sharp' for
// unknown features so paywalls fail closed rather than open.
export function tierForFeature(feature) {
  for (const tier of TIER_ORDER) {
    if (resolveFeatures(tier).includes(feature)) return tier;
  }
  return 'sharp';
}

export function tierGrantsFeature(tier, feature) {
  return resolveFeatures(tier).includes(feature);
}
