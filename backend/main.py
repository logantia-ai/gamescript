# backend/main.py
"""
Game Script Master Pipeline
Run: python main.py [optional_dk_contest_id]
Schedule: Tuesday + Wednesday + Friday + Saturday

Runs end-to-end with NO keys: every ingestion step falls back to coherent
sample data (see ingestion/_sample.py). Supabase push is skipped unless
SUPABASE_URL + SUPABASE_SERVICE_KEY are set.
"""
import json
import math
import sys
from datetime import datetime

import pandas as pd

# Windows consoles default to cp1252, which can't encode the emoji used in
# progress output. Force UTF-8 so the pipeline runs anywhere.
try:
    sys.stdout.reconfigure(encoding='utf-8')
except (AttributeError, ValueError):
    pass

from config import (CURRENT_SEASON, CURRENT_WEEK, SUPABASE_ENABLED,
                    SUPABASE_URL, SUPABASE_SERVICE_KEY, SALARY_CAP, out)
from ingestion.nflverse import get_weekly_stats, get_snap_counts
from ingestion.odds import get_nfl_odds
from ingestion.injuries import get_practice_reports
from ingestion.player_profiler import build_athleticism_dataset
from ingestion.air_yards import scrape_air_yards
from ingestion.weather import get_all_game_weather
from ingestion.salaries import get_draftkings_salaries
from ingestion.next_gen_stats import get_next_gen_stats, NGS_COLS
from ingestion.pass_rate_over_expected import get_pass_rate_over_expected, PROE_COLS
from ingestion.dvoa_matchups import get_dvoa_matchups, DVOA_COLS
from ingestion.line_movement import get_line_movement, LINE_COLS
from ingestion.red_zone_opportunity import get_red_zone_opportunity, RZ_COLS
from ingestion.target_quality import get_target_quality, TQ_COLS
from ingestion.historical_ownership import get_historical_ownership
from ingestion.fantasypros_consensus import get_fp_consensus, FP_COLS
from ingestion.fourfour_projections import get_4for4, FF_COLS
from ingestion.nflfastr_advanced import get_epa_data, EPA_COLS
from ingestion.underdog_adp import get_underdog_adp, ADP_COLS
from ingestion.rotoworld_news import get_news_feed
from ingestion.csv_import import ingest_csv_folder, build_consensus_projection
from models.projection_engine import ProjectionEngine
from models.ownership_model import OwnershipModel
from models.leverage_model import LeverageModel
from models.simulation_engine import SimulationEngine
from models.optimizer import LineupOptimizer
from models.gto_engine import GTOEngine
from models.opponent_model import OpponentModel


def run_pipeline(contest_id=None):
    print(f"\n{'=' * 60}")
    print(f"GAME SCRIPT — Week {CURRENT_WEEK}, {CURRENT_SEASON} Season")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'=' * 60}\n")

    print("📁 Step 0: Checking CSV imports folder...")
    csv_data = ingest_csv_folder('csv_imports/')

    print("📊 Step 1: NFL Stats (nflverse)...")
    stats = get_weekly_stats()
    snaps = get_snap_counts()

    print("🎰 Step 2: Vegas Odds (The-Odds-API)...")
    odds = get_nfl_odds()

    print("🏥 Step 3: Injury Reports...")
    injuries = get_practice_reports()

    print("💨 Step 4: Weather (outdoor games only)...")
    weather = get_all_game_weather(odds)

    print("🎯 Step 5: Air Yards + WOPR...")
    air = scrape_air_yards()

    print("💰 Step 6: DraftKings Salaries...")
    salaries = get_draftkings_salaries(contest_id)

    print("\n🛰️  Step 6b: Advanced Tracking & Market Signals...")
    ngs = get_next_gen_stats()
    proe = get_pass_rate_over_expected()
    dvoa = get_dvoa_matchups()
    line_mv = get_line_movement(odds)
    red_zone = get_red_zone_opportunity()
    target_q = get_target_quality(ngs, air)
    get_historical_ownership()  # persists outputs/historical_ownership.csv for calibration

    print("\n🧠 Step 6c: Expert Consensus, EPA & Market ADP...")
    fp = get_fp_consensus()
    ff = get_4for4()
    epa = get_epa_data()
    adp = get_underdog_adp()

    print("\n📰 Step 6d: Rotoworld News Feed...")
    get_news_feed()  # persists outputs/news_feed.json for the Dashboard alert + Late Swap

    print("\n🔄 Step 7: Building Master Dataset...")
    master = build_master_dataset(stats, snaps, odds, injuries, weather, air, salaries,
                                  ngs, proe, dvoa, line_mv, red_zone, target_q,
                                  fp, ff, epa, adp, csv_data)
    master = build_consensus_projection(master)
    master.to_csv(out('master_dataset.csv'), index=False)
    print(f"   ✅ {len(master)} players")

    print("\n🏃 Step 8: Player Profiler Athleticism...")
    athleticism = build_athleticism_dataset(master)
    if not athleticism.empty:
        master = master.merge(athleticism, on='player_name', how='left')

    print("\n🧮 Step 9: Projection Engine...")
    projections = ProjectionEngine().project_all(master)

    print("\n📈 Step 10: Ownership Model...")
    projections = OwnershipModel().add_ownership(projections)
    projections.to_csv(out('ownership.csv'), index=False)

    print("\n⚡ Step 11: Leverage Model...")
    projections = LeverageModel().add_leverage(projections)
    projections.to_csv(out('leverage.csv'), index=False)
    projections.to_csv(out('projections.csv'), index=False)

    print("\n🎲 Step 12: Monte Carlo (1,000 per player)...")
    simulated = SimulationEngine().simulate_all(projections)
    simulated.to_csv(out('simulations.csv'), index=False)

    print("\n🏆 Step 13: Lineup Optimizer (3 lineup types)...")
    lineups = LineupOptimizer().build_all_lineups(simulated)
    dump_json(lineups, out('lineups.json'))

    print("\n♟️  Step 14: GTO Engine...")
    gto_lineups = GTOEngine().build_gto_lineup(simulated)
    dump_json(gto_lineups, out('gto_lineups.json'))

    print("\n🔍 Step 15: Opponent Model...")
    opponent_data = OpponentModel().build_field_model(simulated)
    dump_json(opponent_data, out('opponent_model.json'))

    print("\n📋 Step 16: Building Slate Report...")
    slate_report = build_slate_report(simulated, lineups, gto_lineups, opponent_data, weather)
    dump_json(slate_report, out('slate_report.json'))

    print("\n☁️  Step 17: Pushing to Supabase...")
    if SUPABASE_ENABLED:
        push_to_supabase(simulated, slate_report, lineups, gto_lineups, opponent_data)
    else:
        print("   ⏭️  Supabase not configured — skipped (outputs written to backend/outputs/).")

    print(f"\n{'=' * 60}")
    print(f"✅ PIPELINE COMPLETE — {datetime.now().strftime('%H:%M:%S')}")
    print(f"{'=' * 60}\n")
    return slate_report


def build_master_dataset(stats, snaps, odds, injuries, weather, air, salaries,
                         ngs=None, proe=None, dvoa=None, line_mv=None,
                         red_zone=None, target_q=None,
                         fp=None, ff=None, epa=None, adp=None, csv_data=None):
    latest_week = stats['week'].max()
    current = stats[stats['week'] == latest_week].copy()

    avgs = stats.groupby('player_id').agg(
        season_avg=('fantasy_points_ppr', 'mean'),
        last3_avg=('fantasy_points_ppr', lambda x: x.tail(3).mean()),
    ).reset_index()
    master = current.merge(avgs, on='player_id', how='left')

    if snaps is not None and not snaps.empty:
        master = master.merge(snaps[['player_id', 'snap_pct']], on='player_id', how='left')

    if odds is not None and not odds.empty:
        totals = {}
        for _, g in odds.iterrows():
            totals[g['home_team']] = g['home_implied_total']
            totals[g['away_team']] = g['away_implied_total']
        master['team_implied_total'] = master['recent_team'].map(totals)

    if weather is not None and not weather.empty:
        wmap = weather.set_index('team')['weather_modifier'].to_dict()
        wnote = weather.set_index('team')['weather_note'].to_dict()
        master['weather_modifier'] = master['recent_team'].map(wmap).fillna(1.0)
        master['weather_note'] = master['recent_team'].map(wnote).fillna('Normal')

    # Receiving usage — merge on display name, avoiding column collisions.
    if air is not None and not air.empty and 'player_name' in air.columns:
        air2 = air.rename(columns={'player_name': '_air_name'})
        master = master.merge(
            air2[['_air_name', 'wopr', 'air_yards_share', 'target_share']],
            left_on='player_display_name', right_on='_air_name', how='left',
        ).drop(columns=['_air_name'], errors='ignore')

    if injuries is not None and not injuries.empty:
        master = master.merge(
            injuries[['player_id', 'report_status']].rename(columns={'report_status': 'injury_status'}),
            on='player_id', how='left',
        )
    if 'injury_status' not in master.columns:
        master['injury_status'] = 'Active'
    master['injury_status'] = master['injury_status'].fillna('Active')

    # Canonical display name.
    master['player_name'] = master['player_display_name'] if 'player_display_name' in master.columns else master['player_name']

    # Salaries — merge on player_name; derive a fallback if still missing.
    if salaries is not None and not salaries.empty:
        master = master.merge(salaries[['player_name', 'salary']], on='player_name', how='left')
    if 'salary' not in master.columns or master['salary'].isna().any():
        master = _fill_missing_salaries(master)

    master['opponent'] = master['recent_team'].map(_opponent_map(odds))

    # ---- Advanced tracking & market signals --------------------------------
    # Player-keyed enrichments merge on the canonical display name.
    for frame, cols in ((ngs, NGS_COLS), (red_zone, RZ_COLS), (target_q, TQ_COLS),
                        (fp, FP_COLS), (ff, FF_COLS), (epa, EPA_COLS), (adp, ADP_COLS)):
        master = _merge_on_player(master, frame, cols)

    # Team-keyed: PROE + line movement on the player's own team.
    for frame, cols in ((proe, PROE_COLS), (line_mv, LINE_COLS)):
        master = _merge_on_team(master, frame, cols, left_key='recent_team')

    # DVOA grades the OPPONENT defense, so merge on the opponent team.
    master = _merge_on_team(master, dvoa, DVOA_COLS, left_key='opponent')

    # Manual CSV imports (DFF / Draft Sharks / PFN / FantasyPros) — merge every
    # normalized column the dropped files contributed, keyed on player_name.
    if csv_data is not None and not csv_data.empty:
        csv_cols = [c for c in csv_data.columns if c not in ('player_name', 'position')]
        master = _merge_on_player(master, csv_data, csv_cols)
    return master


def _merge_on_player(master, frame, cols):
    if frame is None or frame.empty or 'player_name' not in frame.columns:
        return master
    f = frame.rename(columns={'player_name': '_enrich_name'})
    keep = ['_enrich_name'] + [c for c in cols if c in f.columns]
    master = master.merge(
        f[keep], left_on='player_name', right_on='_enrich_name', how='left',
    ).drop(columns=['_enrich_name'], errors='ignore')
    return master


def _merge_on_team(master, frame, cols, left_key):
    if frame is None or frame.empty or 'team' not in frame.columns:
        return master
    f = frame.rename(columns={'team': '_enrich_team'})
    keep = ['_enrich_team'] + [c for c in cols if c in f.columns]
    master = master.merge(
        f[keep], left_on=left_key, right_on='_enrich_team', how='left',
    ).drop(columns=['_enrich_team'], errors='ignore')
    return master


def _fill_missing_salaries(master):
    """Derive a plausible salary from season average when a real one is absent."""
    base = {'QB': 6200, 'RB': 5400, 'WR': 5200, 'TE': 4000, 'DST': 2800}
    if 'salary' not in master.columns:
        master['salary'] = pd.NA
    need = master['salary'].isna()
    est = master['position'].map(base).fillna(5000) + master.get('season_avg', 12).fillna(12) * 120
    master.loc[need, 'salary'] = est[need]
    master['salary'] = (master['salary'].astype(float) / 100).round() * 100
    master['salary'] = master['salary'].clip(lower=2500, upper=int(SALARY_CAP * 0.2)).astype(int)
    return master


def _opponent_map(odds):
    mp = {}
    if odds is not None and not odds.empty:
        for _, g in odds.iterrows():
            mp[g['home_team']] = g['away_team']
            mp[g['away_team']] = g['home_team']
    return mp


def push_to_supabase(players_df, slate_report, lineups, gto_lineups, opponent_data):
    from supabase import create_client
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    sb.table('player_projections').delete().match({
        'season': CURRENT_SEASON, 'week': CURRENT_WEEK
    }).execute()

    # Keep only columns that exist in the player_projections table.
    allowed = {
        'season', 'week', 'player_id', 'player_name', 'team', 'opponent', 'position',
        'salary', 'projection', 'ceiling', 'floor', 'median', 'p10', 'p25', 'p75', 'p90', 'p99',
        'boom_probability', 'bust_probability', 'projected_ownership', 'leverage_score',
        'leverage_tier', 'confidence_pct', 'confidence_label', 'salary_efficiency', 'snap_pct',
        'target_share', 'air_yards_share', 'wopr', 'season_avg', 'last3_avg',
        'team_implied_total', 'weather_modifier', 'weather_note', 'injury_status',
        'speed_score', 'burst_score', 'dominator_rating', 'athleticism_grade', 'modifier_notes',
        # advanced tracking & market signals (Session 2)
        'separation_score', 'intended_air_yards', 'completion_probability',
        'yards_after_contact', 'route_participation_rate',
        'team_proe', 'team_early_down_pass_rate', 'team_neutral_pass_rate', 'team_pace',
        'def_dvoa_vs_wr', 'def_dvoa_vs_rb', 'def_dvoa_vs_te', 'def_dvoa_vs_qb',
        'line_movement_direction', 'public_bet_pct', 'sharp_signal', 'total_movement',
        'rz_opportunity_share', 'rz_target_share', 'rz_carry_share',
        'end_zone_target_rate', 'goal_line_carry_rate',
        'adot', 'target_separation', 'contested_catch_rate', 'target_quality_score',
        # expert consensus, EPA & market ADP (Session 2)
        'consensus_projection', 'consensus_source_count', 'consensus_confidence',
        'model_vs_consensus_gap', 'fp_projection', 'fp_consensus_rank',
        'fp_expert_count', 'fp_ownership_proj', 'ff_projection', 'ff_ownership',
        'ff_value_score', 'ff_leverage_flag', 'epa_per_play', 'cpoe',
        'game_script_tendency', 'situational_pass_rate',
        'underdog_adp', 'adp_vs_salary_divergence',
    }
    df = players_df.copy()
    if 'team' not in df.columns and 'recent_team' in df.columns:
        df['team'] = df['recent_team']
    records = df.fillna(0).to_dict('records')
    records = [{k: v for k, v in r.items() if k in allowed} for r in records]
    for r in records:
        r['season'] = CURRENT_SEASON
        r['week'] = CURRENT_WEEK
    for i in range(0, len(records), 100):
        sb.table('player_projections').insert(records[i:i + 100]).execute()

    sb.table('weekly_slates').upsert({
        'season': CURRENT_SEASON, 'week': CURRENT_WEEK, 'slate_type': 'main',
        'sharp_report': slate_report, 'lineups': lineups, 'gto_lineups': gto_lineups,
        'opponent_model': opponent_data,
        'top_stacks': slate_report.get('top_stacks'),
        'chalk_warnings': slate_report.get('chalk_warnings'),
        'contrarian_spots': slate_report.get('contrarian_spots'),
        'weather_alerts': slate_report.get('weather_alerts'),
        'leverage_plays': slate_report.get('leverage_plays'),
        'position_scarcity': slate_report.get('position_scarcity'),
    }).execute()
    print(f"   ✅ {len(records)} players pushed to Supabase")


def build_slate_report(players, lineups, gto_lineups, opponent_data, weather):
    if 'recent_team' not in players.columns and 'team' in players.columns:
        players = players.assign(recent_team=players['team'])

    qbs = players[players['position'] == 'QB'].sort_values('leverage_score', ascending=False)
    top_stacks = []
    for _, qb in qbs.head(3).iterrows():
        partners = players[
            (players['recent_team'] == qb['recent_team']) &
            (players['position'].isin(['WR', 'TE'])) &
            (players['leverage_score'] >= 50)
        ].head(3)
        top_stacks.append({
            'qb': qb['player_name'],
            'partners': partners['player_name'].tolist(),
            'implied_total': _num(qb.get('team_implied_total')),
            'leverage': _num(qb.get('leverage_score')),
        })

    # Chalk = the chalkiest plays (highest ownership). Prefer the low-leverage
    # traps, but always surface the top-owned players so the list isn't empty.
    chalk = players[(players['projected_ownership'] >= 30) & (players['leverage_score'] <= 45)]
    if len(chalk) < 5:
        extra = players[players['projected_ownership'] >= 25].sort_values('projected_ownership', ascending=False)
        chalk = pd.concat([chalk, extra]).drop_duplicates('player_name')
    if chalk.empty:
        chalk = players.sort_values('projected_ownership', ascending=False)
    chalk = chalk.sort_values('projected_ownership', ascending=False).head(5)

    contrarian = players[(players['projected_ownership'] <= 12) & (players['leverage_score'] >= 70)]
    if contrarian.empty:
        contrarian = players[players['leverage_score'] >= 65].sort_values('projected_ownership')
    contrarian = contrarian.head(5)
    weather_alerts = weather[weather['weather_modifier'] < 0.95].to_dict('records') if weather is not None and not weather.empty else []
    leverage_plays = players[players['leverage_score'] >= 70][
        ['player_name', 'position', 'projection', 'projected_ownership', 'leverage_score']
    ].head(10).to_dict('records')

    pos_counts = players[players['projection'] >= 15].groupby('position').size()
    scarcity = {}
    for pos, thresh in [('QB', 8), ('RB', 12), ('WR', 15), ('TE', 8), ('DST', 8)]:
        count = int(pos_counts.get(pos, 0))
        if count < thresh:
            scarcity[pos] = {'count': count, 'threshold': thresh, 'alert': f'THIN — only {count} viable {pos}s'}

    return {
        'week': CURRENT_WEEK, 'season': CURRENT_SEASON,
        'generated_at': datetime.now().isoformat(),
        'slate_status': 'UPCOMING',
        'top_stacks': top_stacks,
        'chalk_warnings': chalk.to_dict('records'),
        'contrarian_spots': contrarian.to_dict('records'),
        'weather_alerts': weather_alerts,
        'leverage_plays': leverage_plays,
        'position_scarcity': scarcity,
        'gto_score': gto_lineups.get('gto_score') if isinstance(gto_lineups, dict) else None,
    }


def _num(v):
    try:
        return round(float(v), 2)
    except (TypeError, ValueError):
        return None


def _clean(obj):
    """Recursively replace NaN/inf with None and coerce numpy scalars so the
    output is strict, browser-parseable JSON (JSON.parse rejects NaN)."""
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean(v) for v in obj]
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    # numpy scalars expose .item(); fall through to their python value.
    if hasattr(obj, 'item') and not isinstance(obj, (str, bytes)):
        try:
            return _clean(obj.item())
        except (ValueError, AttributeError):
            return obj
    return obj


def dump_json(data, path):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(_clean(data), f, indent=2, default=str)


if __name__ == '__main__':
    import sys
    run_pipeline(sys.argv[1] if len(sys.argv) > 1 else None)
