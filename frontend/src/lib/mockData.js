// ============================================================
// Mock data — used whenever real services aren't configured.
// Keeps the whole app explorable with zero backend.
// ============================================================

export const MOCK_USER = {
  id: 'mock-user-0001',
  email: 'dam2176@gmail.com',
  full_name: 'Demo Sharp',
};

export const MOCK_PROFILE = {
  id: 'mock-user-0001',
  email: 'dam2176@gmail.com',
  full_name: 'Demo Sharp',
  tier: 'sharp', // change to 'free' / 'coordinator' / 'creator' to preview gating
  subscription_status: 'active',
  onboarding_complete: true,
  favorite_team: 'BUF',
  experience_level: 'intermediate',
  primary_contest_type: 'gpp',
  bankroll_range: '50-200',
};

export const MOCK_PROJECTIONS = [
  mk('Josh Allen', 'QB', 'BUF', 'MIA', 8200, 24.6, 31.8, 18.1, 14.2, 78, 95),
  mk('Christian McCaffrey', 'RB', 'SF', 'SEA', 9400, 22.1, 29.5, 15.3, 32.5, 41, 58),
  mk('Tyreek Hill', 'WR', 'MIA', 'BUF', 8800, 19.8, 30.2, 11.0, 28.1, 39, 61),
  mk('Amon-Ra St. Brown', 'WR', 'DET', 'GB', 8100, 18.4, 27.1, 10.9, 19.7, 52, 72),
  mk('Sam LaPorta', 'TE', 'DET', 'GB', 6300, 13.2, 21.4, 6.8, 14.1, 24, 81),
  mk('De’Von Achane', 'RB', 'MIA', 'BUF', 7000, 16.9, 26.8, 8.2, 16.4, 27, 88),
  mk('CeeDee Lamb', 'WR', 'DAL', 'PHI', 8500, 19.1, 28.9, 10.4, 24.0, 44, 66),
  mk('Jalen Hurts', 'QB', 'PHI', 'DAL', 7900, 22.8, 30.1, 16.9, 13.0, 35, 79),
  mk('Bills DST', 'DST', 'BUF', 'MIA', 3400, 7.8, 16.0, 1.0, null, 18, 74),
  mk('Travis Kelce', 'TE', 'KC', 'LV', 6800, 12.6, 20.3, 6.0, 11.4, 31, 60),
];

function mk(name, pos, team, opp, salary, proj, ceiling, floor, own, lev, conf) {
  return {
    player_name: name,
    position: pos,
    team,
    opponent: opp,
    salary,
    projection: proj,
    ceiling,
    floor,
    p10: floor,
    p90: ceiling,
    projected_ownership: own,
    leverage_score: lev,
    leverage_tier: lev >= 70 ? 'ELITE' : lev >= 50 ? 'STRONG' : 'NEUTRAL',
    confidence_pct: conf,
    confidence_label: conf >= 85 ? 'HIGH' : conf >= 60 ? 'MEDIUM' : 'LOW',
    salary_efficiency: +((proj / salary) * 1000).toFixed(2),
  };
}

export const MOCK_SLATE_REPORT = {
  week: 1,
  season: 2025,
  slate_status: 'UPCOMING',
  top_stacks: [
    { qb: 'Josh Allen', partners: ['Khalil Shakir', 'Dalton Kincaid'], implied_total: 27.5, leverage: 78 },
  ],
  chalk_warnings: [{ player_name: 'Christian McCaffrey', projected_ownership: 41, leverage_score: 41 }],
  contrarian_spots: [{ player_name: 'De’Von Achane', projected_ownership: 27, leverage_score: 88 }],
  weather_alerts: [{ team: 'CHI', weather_note: '18 mph wind — shift to RBs', weather_modifier: 0.91 }],
  leverage_plays: MOCK_PROJECTIONS.filter((p) => p.leverage_score >= 70).slice(0, 10),
  gpp_strategy: 'Leverage the Allen stack; the field is over-indexed on McCaffrey at 41% — fade for tournaments.',
  cash_strategy: 'Anchor on St. Brown (52 lev / 72 conf) and LaPorta. Avoid the weather game.',
  position_scarcity: { TE: { count: 6, threshold: 8, alert: 'THIN — only 6 viable TEs' } },
};

export const MOCK_RECORD = {
  stats: { season_pnl: 412.5, total_roi: 18.4, cash_rate: 54.0, weeks_tracked: 6, best_week: 220, worst_week: -90, avg_score: 142.3 },
  pnl_series: [
    { week: 1, cumulative: 40, accuracy: 88 },
    { week: 2, cumulative: -50, accuracy: 81 },
    { week: 3, cumulative: 110, accuracy: 90 },
    { week: 4, cumulative: 90, accuracy: 86 },
    { week: 5, cumulative: 310, accuracy: 92 },
    { week: 6, cumulative: 412.5, accuracy: 89 },
  ],
  lineups: [
    { week: 6, lineup_type: 'high_ceiling', actual_score: 168.2, contest_name: 'Milly Maker', entry_fee: 20, winnings: 220, result: 'cash', roi: 1000 },
    { week: 5, lineup_type: 'max_ev', actual_score: 151.0, contest_name: 'Double Up', entry_fee: 50, winnings: 90, result: 'win', roi: 80 },
    { week: 4, lineup_type: 'chalkbreaker', actual_score: 119.4, contest_name: 'Small GPP', entry_fee: 10, winnings: 0, result: 'loss', roi: -100 },
  ],
};
