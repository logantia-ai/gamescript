// ============================================================
// Module registry — single source of truth for the 18 modules.
// Drives routing, sidebar, bottom nav, and dashboard tiles.
// `feature` is the flag checked by <PaywallGate>; null = open to all.
// ============================================================

export const MODULES = [
  { key: 'dashboard', name: 'Dashboard', icon: '⬢', path: '/app', desc: 'Command center', feature: null },
  { key: 'sharp-report', name: 'Sharp Report', icon: '◈', path: '/app/sharp-report', desc: 'What the smart money knows', feature: null },
  { key: 'film-room', name: 'Film Room', icon: '◎', path: '/app/film-room', desc: 'Where champions prepare', feature: 'film_room_full' },
  { key: 'scout-report', name: 'Scout Report', icon: '◆', path: '/app/scout-report', desc: 'Data vs emotional bias', feature: null },
  { key: 'chalkbreaker', name: 'Chalkbreaker', icon: '⬡', path: '/app/chalkbreaker', desc: 'Break from the field', feature: 'chalkbreaker' },
  { key: 'red-zone', name: 'Red Zone', icon: '◻', path: '/app/red-zone', desc: 'Lineup audit system', feature: null },
  { key: 'coordinator', name: 'The Coordinator', icon: '▲', path: '/app/coordinator', desc: 'Your AI strategist', feature: null },
  { key: 'sunday-mode', name: 'Sunday Mode', icon: '⊕', path: '/app/sunday-mode', desc: 'Fast lineup generator', feature: 'sunday_mode' },
  { key: 'the-record', name: 'The Record', icon: '▣', path: '/app/the-record', desc: 'Proof of concept tracker', feature: null },
  { key: 'stack-builder', name: 'Stack Builder', icon: '⧉', path: '/app/stack-builder', desc: 'Correlation engine', feature: 'stack_builder' },
  { key: 'late-swap', name: 'Late Swap', icon: '⟳', path: '/app/late-swap', desc: 'Sunday AM adjustments', feature: 'late_swap' },
  { key: 'bankroll', name: 'Bankroll', icon: '◧', path: '/app/bankroll', desc: 'Kelly & bet sizing', feature: 'bankroll_module' },
  { key: 'portfolio-builder', name: 'Portfolio Builder', icon: '▦', path: '/app/portfolio-builder', desc: 'Multi-lineup overlap', feature: 'portfolio_builder_20_lineups' },
  { key: 'contest-iq', name: 'Contest IQ', icon: '◬', path: '/app/contest-iq', desc: 'Contest selection advisor', feature: 'contest_iq' },
  { key: 'contest-sim', name: 'Contest Sim', icon: '◑', path: '/app/contest-sim', desc: 'Monte Carlo contest simulation', feature: 'monte_carlo_full' },
  { key: 'debrief', name: 'Debrief', icon: '◭', path: '/app/debrief', desc: 'Monday post-slate analysis', feature: 'weekly_debrief' },
  { key: 'gto-mode', name: 'GTO Mode', icon: '♟', path: '/app/gto-mode', desc: 'Game theory optimal', feature: 'gto_mode' },
  { key: 'opponent-model', name: 'Opponent Model', icon: '⬗', path: '/app/opponent-model', desc: 'Field construction', feature: 'opponent_modeling' },
  { key: 'bias-report', name: 'Bias Report', icon: '◔', path: '/app/bias-report', desc: 'Your personal tendencies', feature: 'personal_bias_report' },
];

export const MODULE_BY_KEY = Object.fromEntries(MODULES.map((m) => [m.key, m]));

// Plain-language "what this module does" copy, keyed by the exact title each
// module passes to <PageWrapper>. Powers the collapsible (?) info panel at the
// top of every module.
export const MODULE_INFO = {
  Dashboard:
    'Your command center. A single glance at the week — top slate decisions, your record, usage, and quick jumps into every module. Start here each week.',
  'Sharp Report':
    'The smart-money read on the slate. The top decisions sharp players are making before they touch an optimizer — chalk to fade, contrarian spots to attack, and why.',
  'Film Room':
    'A seven-step research process that walks you through every source and signal the same way pros prepare. Build your read methodically instead of guessing.',
  'Scout Report':
    "A verdict on any player you're considering: data-supported play or emotional bias. Paste a player and get the honest case for and against starting them.",
  Chalkbreaker:
    'A contrarian GPP engine. Finds where the field is piling on chalk and surfaces the leverage plays and stacks that let you differentiate before the field catches on.',
  'Red Zone':
    'A full lineup audit. Scores your build on correlation, salary use, bias, and game script, then tells you exactly what to fix before lock.',
  'The Coordinator':
    'Your AI strategist on call. Direct, opinionated chat that challenges your assumptions, corrects bias, and pressure-tests your slate plan week to week.',
  'Sunday Mode':
    "The fast path when time's short. Three guided steps to a locked, optimized lineup — built for Sunday-morning crunch.",
  'The Record':
    "Your season-long proof of concept. Every lineup, every week, every result tracked so you can see what's actually working instead of trusting memory.",
  'Stack Builder':
    'A correlation engine for stacks. Build and compare QB/pass-catcher and game stacks by correlation and ceiling so your lineup moves together when it hits.',
  'Late Swap':
    'Sunday-morning emergency adjustments. When news breaks before lock, get the optimal swap that protects correlation and salary without blowing up your build.',
  Bankroll:
    'Kelly-based bet sizing and a weekly log. Tells you how much to put in play given your edge and bankroll, and tracks it so you stay disciplined.',
  'Portfolio Builder':
    'Build up to 20 lineups as a portfolio. Manages overlap and exposure across entries so your bankroll is spread intelligently, not duplicated.',
  'Contest IQ':
    'A contest-selection advisor. Matches your lineup profile and bankroll to the right DraftKings contests and warns you about mismatches — the right lineup in the wrong contest still loses.',
  'Contest Sim':
    'A Monte Carlo tournament simulator. Runs your lineup against a projected-ownership field thousands of times to estimate win probability, cash rate, ROI, and how differentiated your build is. Estimates are model-based, not guarantees.',
  Debrief:
    "Monday's post-slate mirror. Reviews how your week actually played out, what drove it, and the lessons to carry into next week.",
  'GTO Mode':
    'Game-theory-optimal lineup construction. Balances ownership, leverage, and correlation to build lineups designed to beat the field, not just project well.',
  'Opponent Model':
    "Field construction modeling. Estimates what the field is about to build so you can position against it instead of blending into the crowd.",
  'Personal Bias Report':
    'A self-scout of your own tendencies. Surfaces the recurring biases in your lineups — favorite teams, stale stacks, chasing last week — so you can correct them.',
};
