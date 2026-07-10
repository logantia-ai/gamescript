# GAME SCRIPT — SESSION 2 COMPLETE FINAL PROMPT
# Paste this entire document into Claude Code
# Continues from Session 1 — frontend, backend, Sharp Report, Stripe all built

---

## CONTEXT

Continuing Game Script build at C:\Users\Home\gamescript.

Session 1 completed:
- Full React frontend scaffold with all 18 module shells
- Python backend pipeline — 17 steps verified, 132 sample players
- Sharp Report — fully built end to end with real API + The Tell tab
- Stripe checkout → webhook → tier upgrade flow
- FastAPI server — all endpoints verified
- usePlayerData + useSlateData wired to real API with Supabase → API → mock fallback

This session completes:
- 7 new advanced data sources
- 6 additional data sources (FantasyPros, 4for4, Rotoworld, NFLFastR, Stathead, Underdog ADP)
- Weekly CSV import workflow for manual data sources
- All 13 remaining frontend modules built end to end
- Stripe success return flow
- Real API key connection checklist
- Vercel + Railway deployment
- Logo file integration

---

## TASK 1 — NEW INGESTION MODULES (backend/ingestion/)

All modules follow existing pattern: try live source → fall back to sample data if unavailable. All free sources. All merge into master_dataset.csv.

### next_gen_stats.py
```
Source: nextgenstats.nfl.com (official NFL — FREE, no key)
Columns to add: separation_score, intended_air_yards, completion_probability,
  yards_after_contact, route_participation_rate
Elite thresholds:
  separation_score >= 2.5 = elite
  route_participation_rate >= 0.80 = full route runner
  yards_after_contact >= 3.0 = elite RB broken tackle
Merge on: player_name
```

### pass_rate_over_expected.py
```
Source: sharpfootballstats.com (FREE, public)
Columns to add: team_proe, team_early_down_pass_rate, team_pace
Merge on: team
Projection engine usage:
  team_proe >= 0.05 → WR/TE modifier +4%
  team_proe <= -0.05 → RB modifier +4%, WR/TE -3%
```

### dvoa_matchups.py
```
Source: footballoutsiders.com (FREE, public)
Columns to add: def_dvoa_vs_wr, def_dvoa_vs_rb, def_dvoa_vs_te, def_dvoa_vs_qb
Merge on: opponent team
Projection engine usage:
  dvoa <= -0.15 = elite matchup (+8%)
  dvoa -0.15 to 0 = good matchup (+3%)
  dvoa 0 to +0.15 = neutral
  dvoa >= +0.15 = tough matchup (-5%)
```

### historical_ownership.py
```
Source: rotoguru.net (FREE, public archive)
Pull: Historical DK ownership %, historical salaries, historical DFS scores
Store: outputs/historical_ownership.csv
Use in ownership_model.py to calibrate formula weights:
  Compare projected vs actual ownership
  Calculate mean absolute error by position
  Auto-adjust weights to minimize error
```

### line_movement.py
```
Source: The-Odds-API historical endpoint (existing key) + betlabs.com
Columns to add: line_movement_direction, public_bet_pct, sharp_signal (bool),
  total_movement
Projection engine usage:
  sharp_signal=True AND total_movement > 1.5 → confidence +10%,
  mild projection boost for all players in that game
```

### red_zone_opportunity.py
```
Source: nflverse (extend existing nflverse.py — already in stack)
Columns to add: rz_opportunity_share, rz_target_share, rz_carry_share,
  end_zone_target_rate
Projection engine usage:
  rz_opportunity_share >= 0.30 (WR/TE) → +8%
  rz_target_share >= 0.25 (TE) → +10%
  rz_carry_share >= 0.50 (RB) → +12%
```

### target_quality.py
```
Source: Next Gen Stats + existing air yards data
Columns to add: adot, target_separation, contested_catch_rate,
  target_quality_score (0-100 composite)
Simulation engine usage:
  adot >= 12 AND separation >= 2.5 → ceiling spike probability +3%
```

### fantasypros_consensus.py
```
Source: fantasypros.com (FREE public data, no key needed)
Pull weekly: consensus expert rankings, projected ownership estimates,
  start/sit recommendations, strength of schedule
Columns to add: fp_consensus_rank, fp_projected_pts, fp_expert_count,
  fp_ownership_proj
Why: Consensus of 100+ experts historically outperforms any single
  projection system. Divergence between our projection and FP consensus
  is meaningful signal — flag when difference > 20%.
Merge on: player_name + position
Update: Tuesday and Friday each week
```

### fourfour_projections.py
```
Source: 4for4.com (one of most accurate DFS projection services — FREE weekly)
Pull weekly: player projections, ownership estimates, value scores, leverage plays
Columns to add: ff_projection, ff_ownership, ff_value_score, ff_leverage_flag
Why: Cross-reference projections. When our model AND 4for4 agree on a
  high leverage play, confidence score increases. When they disagree,
  flag for manual review in Scout Report.
Merge on: player_name
Update: Wednesday and Saturday each week
```

### rotoworld_news.py
```
Source: rotoworld.com / NBC Sports player news (FREE public feed)
Pull: Real-time breaking news, injury updates, lineup changes, beat reporter notes
Store: outputs/news_feed.json — rolling 48 hour window
Why: Rotoworld news hits before official NFL injury reports. Late scratches,
  surprise inactives, weather changes — this is the Sunday morning edge.
Integration:
  - Parse news for player name mentions
  - Flag any player in current lineup with news in last 6 hours
  - Surface in Dashboard as BREAKING ALERT
  - Feed into Late Swap module automatically
Update: Every 2 hours Tuesday-Saturday, every 30 minutes Sunday morning
```

### nflfastr_advanced.py
```
Source: nflfastr (open source Python package — FREE, GitHub hosted, no key)
Install: pip install nfl-data-py (already in requirements — nflfastr included)
Pull: Expected points added (EPA), win probability, play-by-play game script,
  pass/run tendency by game state, actual vs expected performance
Columns to add: epa_per_play, cpoe (completion % over expected),
  game_script_tendency, situational_pass_rate
Why: Most granular game script data available. EPA tells you which players
  are creating value beyond their raw stats.
Merge on: player_id
```

### underdog_adp.py
```
Source: Underdog Fantasy ADP (publicly available — FREE)
Pull: Season-long best ball ADP, dynasty ADP
Columns to add: underdog_adp, adp_vs_salary_divergence
Why: Divergence between Underdog ADP (smart season-long money) and DFS
  projected ownership reveals where sharp money disagrees with DFS public.
  Large divergence = potential leverage play or trap.
Formula: adp_vs_salary_divergence = (underdog_adp_rank - dk_salary_rank)
  Large positive = market undervaluing vs DFS price → potential value
  Large negative = DFS price ahead of market → potential trap
Merge on: player_name
```

---

## TASK 2 — WEEKLY CSV IMPORT WORKFLOW

Build a complete CSV import system for manual data sources. User drops CSV files into a watched folder once or twice per week and the pipeline reads them automatically.

### backend/ingestion/csv_import.py
```python
"""
Weekly CSV Import System
Watches backend/csv_imports/ folder for new files
Supported sources: Daily Fantasy Fuel, Draft Sharks, Pro Football Network,
  FantasyPros export, any DFS projection CSV

Run schedule: Check folder on every pipeline run (main.py calls this first)
User workflow:
  1. Download CSV from DFF/Draft Sharks/PFN account
  2. Drop into backend/csv_imports/ folder
  3. Run python main.py — pipeline auto-detects and ingests
  4. Processed files move to backend/csv_imports/processed/ with timestamp

File detection logic:
  - Detect source from filename or column headers
  - Normalize column names to standard format
  - Merge into master_dataset on player_name + position
  - Log which files were processed and which columns were added
"""

SUPPORTED_SOURCES = {
    'daily_fantasy_fuel': {
        'filename_patterns': ['dff', 'daily_fantasy_fuel', 'DFF'],
        'key_columns': ['player', 'projection', 'ownership', 'value'],
        'rename_map': {
            'player': 'player_name',
            'projection': 'dff_projection',
            'ownership': 'dff_ownership',
            'value': 'dff_value',
        }
    },
    'draft_sharks': {
        'filename_patterns': ['draftsharks', 'draft_sharks', 'DS'],
        'key_columns': ['name', 'pts', 'own', 'boom', 'bust'],
        'rename_map': {
            'name': 'player_name',
            'pts': 'ds_projection',
            'own': 'ds_ownership',
            'boom': 'ds_boom_pct',
            'bust': 'ds_bust_pct',
        }
    },
    'pro_football_network': {
        'filename_patterns': ['pfn', 'pro_football_network', 'PFN'],
        'key_columns': ['player_name', 'fantasy_pts', 'ownership_pct'],
        'rename_map': {
            'fantasy_pts': 'pfn_projection',
            'ownership_pct': 'pfn_ownership',
        }
    },
    'fantasypros': {
        'filename_patterns': ['fantasypros', 'fp_', 'FantasyPros'],
        'key_columns': ['player_name', 'proj_pts', 'owned_pct'],
        'rename_map': {
            'proj_pts': 'fp_projection',
            'owned_pct': 'fp_ownership',
        }
    },
    'generic_dfs': {
        'filename_patterns': [],  # Fallback for any DFS CSV
        'detection': 'auto',      # Auto-detect columns
        'required_columns': ['player_name', 'projection'],
    }
}

# After ingestion — calculate consensus metrics
def build_consensus_projection(master_df):
    """
    Average all available expert projections into consensus projection.
    More sources = higher confidence score.
    Divergence from consensus flagged for Scout Report.
    """
    projection_cols = [
        'projection',      # Our model
        'dff_projection',  # Daily Fantasy Fuel
        'ds_projection',   # Draft Sharks
        'pfn_projection',  # Pro Football Network
        'fp_projection',   # FantasyPros
        'ff_projection',   # 4for4
    ]
    
    available = [c for c in projection_cols if c in master_df.columns]
    
    master_df['consensus_projection'] = master_df[available].mean(axis=1)
    master_df['consensus_source_count'] = master_df[available].notna().sum(axis=1)
    master_df['model_vs_consensus_gap'] = (
        master_df['projection'] - master_df['consensus_projection']
    )
    master_df['consensus_confidence'] = (
        master_df['consensus_source_count'] / len(available) * 100
    ).round(0)
    
    return master_df
```

### CSV Import Folder Structure
```
backend/
├── csv_imports/           ← DROP YOUR CSV FILES HERE
│   ├── README.txt         ← Instructions for user
│   └── processed/         ← Auto-moved after ingestion with timestamp
```

### backend/csv_imports/README.txt
```
GAME SCRIPT — WEEKLY CSV IMPORT FOLDER

Drop your weekly DFS projection CSV files here before running the pipeline.

SUPPORTED SOURCES:
  - Daily Fantasy Fuel (DFF) — download from dailyfantasyfuel.com
  - Draft Sharks — download from draftsharks.com
  - Pro Football Network — download from profootballnetwork.com
  - FantasyPros — download from fantasypros.com
  - Any DFS projection CSV with player_name and projection columns

HOW IT WORKS:
  1. Log into your account at each site
  2. Download their weekly NFL DFS projections CSV
  3. Drop the file into this folder (csv_imports/)
  4. Run: python main.py
  5. Pipeline auto-detects the source, ingests the data, merges it
  6. Processed files move to csv_imports/processed/ automatically

RECOMMENDED SCHEDULE:
  TUESDAY:  Download DFF + Draft Sharks after DK salaries drop
  FRIDAY:   Download updated projections after injury reports
  SATURDAY: Final download if sites update late week

WHY THIS MATTERS:
  Each source you add improves consensus projection accuracy.
  When 4+ expert sources agree on a play, confidence score goes up.
  When sources disagree, Scout Report flags it for your review.

YOUR ACCOUNTS:
  - Daily Fantasy Fuel: dailyfantasyfuel.com
  - Draft Sharks: draftsharks.com
  - Pro Football Network: profootballnetwork.com
```

---

## TASK 3 — UPDATE PROJECTION ENGINE

Add to backend/models/projection_engine.py in project_player() after existing modifiers:

```python
# PASS RATE OVER EXPECTED
proe = player.get('team_proe', 0)
if pos in ['WR', 'TE'] and proe >= 0.05:
    modifier *= 1.04
    notes.append(f'Pass-heavy team PROE +{proe:.0%}')
elif pos == 'RB' and proe <= -0.05:
    modifier *= 1.04
    notes.append(f'Run-heavy team PROE {proe:.0%}')

# DVOA MATCHUP (replaces basic matchup grade)
dvoa = player.get(f'def_dvoa_vs_{pos.lower()}', 0)
if dvoa <= -0.15:
    modifier *= 1.08; notes.append(f'Elite DVOA matchup {dvoa:.0%}')
elif dvoa <= 0:
    modifier *= 1.03; notes.append(f'Good DVOA matchup {dvoa:.0%}')
elif dvoa >= 0.15:
    modifier *= 0.95; notes.append(f'Tough DVOA matchup {dvoa:.0%}')

# SEPARATION SCORE
sep = player.get('separation_score', 0)
if pos in ['WR', 'TE'] and sep >= 2.5:
    modifier *= 1.05; notes.append(f'Elite separation {sep:.1f}')

# RED ZONE OPPORTUNITY SHARE
rz = player.get('rz_opportunity_share', 0)
if pos in ['WR', 'TE'] and rz >= 0.30:
    modifier *= 1.08; notes.append(f'RZ threat {rz:.0%} share')
elif pos == 'RB' and rz >= 0.50:
    modifier *= 1.12; notes.append(f'Goal line back {rz:.0%}')

# ROUTE PARTICIPATION
route_pct = player.get('route_participation_rate', 0.70)
if pos in ['WR', 'TE'] and route_pct < 0.60:
    modifier *= 0.90; notes.append(f'Limited routes {route_pct:.0%}')

# SHARP MONEY SIGNAL
if player.get('sharp_signal') and player.get('total_movement', 0) > 1.5:
    modifier *= 1.03; notes.append('Sharp money on game total')

# EPA ADJUSTMENT
epa = player.get('epa_per_play', 0)
if epa >= 0.15:
    modifier *= 1.04; notes.append(f'High EPA {epa:.2f}')
elif epa <= -0.10:
    modifier *= 0.97; notes.append(f'Negative EPA {epa:.2f}')

# CONSENSUS PROJECTION CROSS-REFERENCE
consensus = player.get('consensus_projection', 0)
our_proj = base * modifier  # pre-consensus projection
if consensus > 0:
    gap = (our_proj - consensus) / consensus
    if abs(gap) > 0.25:  # 25% divergence from consensus
        notes.append(f'NOTE: {abs(gap):.0%} divergence from expert consensus')
    # Blend 80% our model + 20% consensus for final number
    final_blend = (our_proj * 0.80) + (consensus * 0.20)
    return_projection = final_blend
else:
    return_projection = our_proj

# ADP DIVERGENCE SIGNAL
adp_div = player.get('adp_vs_salary_divergence', 0)
if adp_div >= 10:  # Market significantly undervaluing vs DFS price
    notes.append(f'Market undervaluing vs DFS price (ADP div: +{adp_div})')
elif adp_div <= -10:  # DFS price ahead of market
    notes.append(f'DFS price ahead of market — possible trap (ADP div: {adp_div})')
```

---

## TASK 4 — UPDATE main.py PIPELINE

Add all new ingestion calls to the 17-step orchestrator. New schedule:

```
TUESDAY:   Full pipeline — new salaries, nflverse, odds, NGS, PROE, DVOA
           + check csv_imports/ folder for new DFF/DS/PFN files
FRIDAY:    Full pipeline — injury updates, weather, line movement
           + check csv_imports/ folder for updated projections
SATURDAY:  Weather + line movement update only
           + Rotoworld news check
SUNDAY AM: Rotoworld news every 30 min (automated alert system)
MONDAY:    Debrief generation after results lock
```

Add to main.py run_pipeline():
```python
print("📁 Step 0: Checking CSV imports folder...")
from ingestion.csv_import import ingest_csv_folder, build_consensus_projection
csv_data = ingest_csv_folder('csv_imports/')

print("📡 Step 1b: Next Gen Stats...")
from ingestion.next_gen_stats import get_next_gen_stats
ngs = get_next_gen_stats()

print("📈 Step 1c: Pass Rate Over Expected...")
from ingestion.pass_rate_over_expected import get_proe
proe = get_proe()

print("🛡️  Step 1d: DVOA Matchups...")
from ingestion.dvoa_matchups import get_dvoa
dvoa = get_dvoa()

print("🎯 Step 1e: FantasyPros Consensus...")
from ingestion.fantasypros_consensus import get_fp_consensus
fp = get_fp_consensus()

print("4️⃣  Step 1f: 4for4 Projections...")
from ingestion.fourfour_projections import get_4for4
ff = get_4for4()

print("📰 Step 1g: Rotoworld News Feed...")
from ingestion.rotoworld_news import get_news_feed
news = get_news_feed()

print("⚡ Step 1h: NFLFastR Advanced Metrics...")
from ingestion.nflfastr_advanced import get_epa_data
epa = get_epa_data()

print("📊 Step 1i: Underdog ADP...")
from ingestion.underdog_adp import get_underdog_adp
adp = get_underdog_adp()

print("🔴 Step 1j: Red Zone Opportunity Share...")
from ingestion.red_zone_opportunity import get_rz_opportunity
rz = get_rz_opportunity()

print("🎯 Step 1k: Target Quality Metrics...")
from ingestion.target_quality import get_target_quality
tq = get_target_quality()

print("📉 Step 1l: Line Movement + Sharp Money...")
from ingestion.line_movement import get_line_movement
lm = get_line_movement()

# After building master_dataset, add consensus
master = build_consensus_projection(master)
```

---

## TASK 5 — DASHBOARD BREAKING NEWS ALERT

Add to Dashboard module — pulls from Rotoworld news feed:

```jsx
// NewsAlert component — shows at top of Dashboard
// Pulls from /api/news endpoint (new endpoint in server.py)
// Updates every 30 minutes Sunday, every 2 hours weekdays

function NewsAlert({ news }) {
  if (!news || news.length === 0) return null;
  
  return (
    <div style={{ background: '#3A1010', border: '1px solid #8B2A2A',
      borderRadius: '2px', padding: '12px 16px', marginBottom: '16px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#E05A5A',
        marginBottom: '8px' }}>⚑ BREAKING — PLAYER NEWS</div>
      {news.slice(0, 3).map((item, i) => (
        <div key={i} style={{ fontSize: '12px', color: '#EDE8DC',
          marginBottom: '6px', lineHeight: '1.5' }}>
          <span style={{ color: '#C4762A', fontWeight: '700' }}>
            {item.player_name}
          </span> — {item.headline}
          <span style={{ color: '#9A9488', fontSize: '10px',
            marginLeft: '8px' }}>{item.time_ago}</span>
        </div>
      ))}
    </div>
  );
}
```

Add /api/news endpoint to server.py:
```python
@app.get("/api/news")
def get_news():
    path = out('news_feed.json')
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {"items": [], "last_updated": None}
```

---

## TASK 6 — COMPLETE ALL 13 REMAINING FRONTEND MODULES

Build each end to end: UI + Claude API call + Supabase persistence.
Use existing Sharp Report as the template pattern.

### Scout Report (play_evaluations table)
```
6 question guided flow — questions pulled from existing SCOUT_QS constant
Pre-populate Q1 (player/salary) from /api/projections player search
Pre-populate Q2 (implied total) from /api/slate game data
Computed confidence: count data points available / 7 total = XX% data-backed
Grade A-F with full reasoning including athleticism check
Save to Supabase play_evaluations on completion
Free: 3/week with counter shown (X of 3 remaining)
Sharp+: unlimited
Show consensus divergence warning if model_vs_consensus_gap > 20%
```

### Red Zone Lineup Audit (lineups table)
```
Input: textarea paste OR select from saved lineups dropdown (from Supabase)
Contest type: GPP / Cash / Double Up / 50-50 / Satellite
Inject real chalk data from /api/slate into Claude prompt for field context
Grade A-F covering: correlation, salary, bias flags, game script, ownership
Save to Supabase lineups table with lineup_type='audit'
Free: 1/week
Sharp+: unlimited
Show projected field ownership for each rostered player
```

### Stack Builder (Sharp+)
```
QB selector: searchable dropdown from /api/projections?position=QB
  Shows: name, salary, projection, ownership%, implied total
Auto-load all same-team WR/TE from /api/projections
Sort by correlation score:
  (target_share * 0.40) + (snap_pct * 0.25) +
  (route_participation_rate * 0.20) + (rz_opportunity_share * 0.15)
Stack type: Mini (QB+1) / Standard (QB+2) / Mega (QB+3) / Bring-back
Bring-back: show opposing pass catchers sorted by leverage score
Stack summary card: total salary, total projection, combined ownership
Save stack button: stores in localStorage for Sunday Mode
Export: copy stack to clipboard in DK format
```

### Late Swap (Sharp+)
```
Input: paste current lineup + scratched player name
Auto-detect: position, salary slot, remaining cap
Pull post-scratch ownership projections from /api/projections
Claude prompt: include scratch news, field ownership impact, cap constraint
Return 3 ranked replacements:
  Rank | Player | Salary | Post-scratch ownership | Leverage | Recommendation
Salary adjustment section: if replacement costs more, show who to downgrade
Lock timer: calculate time to next game kickoff, color red under 15 min
Export: updated lineup in DK paste format
```

### Bankroll (Sharp+)
```
Inputs: starting bankroll, contest type mix (GPP % slider), confidence level
Kelly Criterion DFS formula:
  f = (expected_roi * win_rate) / (1 - win_rate)
  Use historical cash rate from The Record if available
Outputs:
  Total recommended spend this week
  GPP allocation + Cash allocation breakdown  
  Max per single tournament entry
  Max per lineup
  Recommended lineup count
  Max any player exposure (33% / 50% / 67% toggle)
Weekly log: save to Supabase bankroll_entries table
Chart: season bankroll curve from bankroll_entries history
```

### Contest IQ (Sharp+)
```
Inputs: avg ownership (slider), leverage score (slider), ceiling rating,
  entry budget, lineup count
Pull field size context from /api/slate for realistic GPP pool estimates
Ranked recommendations (1-5):
  Contest type | Why it fits | Entry strategy | Expected ROI range
Mismatch warnings:
  "High ownership in large GPP = very low upside"
  "Contrarian lineup in double-up = too much variance"
  "Single game stack in 20-team league = insufficient differentiation"
```

### Sunday Mode (Sharp+)
```
Step 1: Budget ($50,000 / $49,800 / $49,500 / custom input)
Step 2: Anchor — searchable player input with autocomplete from /api/projections
Step 3: Constraints — textarea for fades, injuries to avoid, max ownership cap
Claude prompt: inject real /api/lineups optimizer output as starting point
  Claude then modifies based on anchor + constraints
Output: Complete 9-player lineup with salaries
  WHY THIS WINS section: correlation logic, leverage play, field differentiation
  WATCH FOR: late scratch risk, weather flag, ownership spike warning
Export: DraftKings paste format (one click copy)
Save to The Record: auto-save with pending result status
```

### The Record (lineups table — Sharp+)
```
Stat cards: Season P&L | Total ROI | Cash Rate | Weeks Tracked |
  Best Week | Worst Week | Avg Lineup Score | Projection Accuracy
P&L Chart (Recharts AreaChart):
  X-axis: week number
  Y-axis: cumulative P&L in dollars
  Copper line (#C4762A) on dark background (#06090D)
  Projection accuracy line overlay in green
Lineup History Table:
  Week | Type | Contest | Entry | Score | Winnings | Result | ROI
  Click row → expand full lineup with player breakdown
  Sort by any column
Projection Accuracy Table:
  Player | Our Proj | Consensus Proj | Actual | Our Variance | Consensus Variance
  Weekly model accuracy % — shows where model is systematically off
DK CSV Import (SHARP+):
  Upload DraftKings results CSV
  Auto-parse: contest name, entry fee, winnings, score, rank
  Match players to projections automatically
  Populate variance tracking
Manual Entry Dialog:
  Week, contest type, contest name, entry fee, lineup (paste),
  score, winnings, result, notes
Full season CSV export button
Free: last 3 weeks visible, upgrade prompt for history
```

### Weekly Debrief (Sharp+)
```
Auto-generates Monday morning when results are logged
Trigger: user logs result in The Record → debrief generates automatically
  OR manual Generate Debrief button
Sections:
  WEEK SUMMARY: score vs field average vs top score, your result, ROI
  OPTIMAL LINEUP: what the best possible lineup was (from /api/lineups)
  COMPARISON TABLE: your lineup vs optimal side by side, pts left on table
  PROJECTION ACCURACY: player by player our proj vs actual, variance
  LEVERAGE REPORT: which leverage plays hit, which busted and why
  FIELD REPORT: most owned players, where chalk hit vs busted
  BIAS FLAGS: any emotional picks identified by player name
  KEY LEARNINGS: Claude generates 3 things to do differently + 1 thing done well
  MODEL NOTE: where projection was systematically off this week
Save to Supabase weekly_debriefs table
```

### GTO Mode (Coordinator+)
```
Pull lineup from /api/gto endpoint (already built)
Display:
  GTO SCORE: large number 0-100 with color coding
    < 40 = red (not GTO optimal)
    40-70 = yellow (moderate)
    > 70 = green (GTO optimal)
  FIELD SCENARIO ANALYSIS:
    Heavy chalk field (70%+): estimated Xth percentile finish
    Mixed field (50/50): estimated Xth percentile finish
    Contrarian field (60%+): estimated Xth percentile finish
  GTO EXPLANATION: Claude explains why this lineup is/isn't GTO optimal
  ADJUSTMENTS: Claude suggests 2-3 swaps to improve GTO score
Locked behind Coordinator+ with upgrade prompt for free/sharp
```

### Portfolio Builder (Coordinator+)
```
Inputs:
  Number of lineups: slider 2-20
  Max player exposure: 25% / 33% / 50% / 67%
  Stack correlation: Tight / Balanced / Loose
  Locked players: multi-select from /api/projections
Generation: calls /api/lineups N times with differentiation constraints
  Each subsequent lineup must differ by minimum X% from previous
Correlation Matrix: grid visualization showing player overlap
  Red cell: player appears together above max threshold
  Green cell: well-diversified
Portfolio Stats:
  Avg projected score | Avg ownership | Avg leverage
  Differentiation score (0-100) | Estimated top-10% probability
Export: all lineups in DK bulk upload CSV format (one file, multiple lineups)
Save to Supabase portfolios table
```

### Opponent Model (Coordinator+)
```
Pull data from /api/slate opponent_model field
Display:
  MOST COMMON FIELD CONSTRUCTIONS (top 3 estimated stacks)
  PLAYER PAIR CO-OWNERSHIP table: pair | est. co-ownership% | implication
  TEAM SATURATION HEATMAP: grid of teams, color = ownership concentration
    Red = over-saturated (avoid for GPP edge)
    Green = under-stacked (leverage opportunity)
  COUNTER STRATEGIES: plays in < 5% of lineups with real upside
  FIELD SCENARIO: if chalk stack hits vs if it busts — your lineup in both
```

### Personal Bias Report (Coordinator+)
```
Requires: minimum 6 weeks of lineup data in Supabase lineups table
Generate button + auto-generate at Week 9 and end of season
Analysis sections:
  TEAM BIAS: teams over-rostered vs leverage score, fan bias detection
  POSITION BIAS: positions overpaid/underpaid vs optimal salary allocation
  OWNERSHIP TENDENCY: your avg GPP ownership vs recommended range
  STACKING GRADE: correlation quality of historical lineups A-F
  EMOTIONAL FREQUENCY: % plays flagged as emotional by Scout Report
  CASH RATE & GPP ROI: season numbers with context vs expected
IMPROVEMENT PLAN: Claude generates 5-point plan for next season
  Based specifically on identified bias patterns
Save to Supabase bias_profiles table
Display: locked with message if fewer than 6 weeks of data
```

---

## TASK 7 — STRIPE SUCCESS RETURN FLOW

In Account page (src/pages/Account.jsx):
```javascript
// On mount — check for ?checkout=success in URL params
// If present:
//   1. Wait 2 seconds for webhook to process
//   2. Refresh profile from Supabase (get updated tier)
//   3. Show success animation with new tier badge
//   4. Display list of what's now unlocked
//   5. Clear the URL param after 5 seconds

// Account page sections:
// CURRENT PLAN: tier badge + renewal date + next billing amount
// MANAGE: Stripe Customer Portal button (calls /api/portal)
// CANCEL: cancel subscription with confirmation dialog
//   On confirm: call Stripe, tier drops to free on period end
//   Show: "Access continues until [date]"
// USAGE THIS WEEK:
//   Scout Report: X of 3 used (free) or Unlimited (sharp+)
//   Red Zone: X of 1 used (free) or Unlimited (sharp+)
//   Coordinator messages: X of 5 used (free) or Unlimited (sharp+)
```

---

## TASK 8 — API KEY CHECKLIST

When all code is written, generate this checklist as a file:
backend/SETUP_CHECKLIST.md

```markdown
# GAME SCRIPT — SETUP CHECKLIST

Complete these steps to go live with real data.

## API KEYS NEEDED

### Already have:
- [x] ANTHROPIC_API_KEY — set in environment

### Get these (all free):
- [ ] ODDS_API_KEY — https://the-odds-api.com → dashboard → API key
- [ ] APIFY_API_TOKEN — https://apify.com → settings → API & Integrations
- [ ] OPENWEATHER_API_KEY — https://openweathermap.org → API keys tab

### From your Stripe account:
- [ ] STRIPE_SECRET_KEY — https://dashboard.stripe.com → Developers → API keys
- [ ] STRIPE_WEBHOOK_SECRET — https://dashboard.stripe.com → Developers → Webhooks
  Create webhook pointing to: https://your-api-url.com/api/webhook
  Events: checkout.session.completed, customer.subscription.updated, .deleted

### From your Supabase project:
- [ ] SUPABASE_URL — Project Settings → API → Project URL
- [ ] SUPABASE_ANON_KEY — Project Settings → API → anon public key
- [ ] SUPABASE_SERVICE_KEY — Project Settings → API → service_role key

## STRIPE PRODUCTS TO CREATE
In Stripe Dashboard → Products → Add product:
- [ ] Sharp Monthly: $29/month → copy price ID → paste in config.py
- [ ] Sharp Annual: $199/year → copy price ID → paste in config.py
- [ ] Coordinator Monthly: $99/month → copy price ID → paste in config.py
- [ ] Coordinator Annual: $699/year → copy price ID → paste in config.py
- [ ] Creator License: $299/month → copy price ID → paste in config.py

## SUPABASE SETUP
- [ ] Run the SQL schema from GAMESCRIPT_FINAL_BUILD.md in Supabase SQL Editor
- [ ] Verify all 9 tables created: profiles, player_projections, weekly_slates,
      lineups, play_evaluations, weekly_debriefs, bias_profiles,
      bankroll_entries, portfolios

## FIRST REAL DATA RUN
After all keys are in .env:
- [ ] cd backend
- [ ] .venv\Scripts\activate
- [ ] python main.py
- [ ] Verify: outputs/master_dataset.csv has real player names
- [ ] Verify: outputs/slate_report.json has real implied totals
- [ ] Start: uvicorn api.server:app --port 8000
- [ ] Verify: http://localhost:8000/api/health shows all services connected

## CSV IMPORT FIRST RUN
- [ ] Log into dailyfantasyfuel.com → download this week's DFS projections CSV
- [ ] Log into draftsharks.com → download this week's DFS projections CSV
- [ ] Log into profootballnetwork.com → download this week's DFS projections CSV
- [ ] Drop all three files into backend/csv_imports/ folder
- [ ] Run python main.py again
- [ ] Verify: consensus_projection column populated in projections.csv

## LOGO FILES
- [ ] Copy GS_Shield.png to frontend/public/assets/GS_Shield.png
- [ ] Copy GS_Name.png to frontend/public/assets/GS_Name.png
- [ ] Copy GS_Crest.png to frontend/public/assets/GS_Crest.png
- [ ] Run npm run dev → verify shield appears as browser tab icon

## LOCAL VERIFICATION
- [ ] npm run dev (frontend)
- [ ] uvicorn api.server:app --port 8000 (backend)
- [ ] Open http://localhost:5173
- [ ] Source badge shows "Live · Pipeline" (not "Mock")
- [ ] Sharp Report generates real decisions from real data
- [ ] Register a test account → verify free tier limits work
- [ ] Upgrade to Sharp in Stripe test mode → verify tier changes

## DEPLOYMENT
### Frontend (Vercel):
- [ ] npm run build (verify clean build)
- [ ] vercel --prod
- [ ] Add env vars in Vercel dashboard:
      VITE_ANTHROPIC_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
      VITE_STRIPE_PUBLISHABLE_KEY, VITE_API_BASE_URL

### Backend (Railway — recommended):
- [ ] Create account at railway.app (free tier available)
- [ ] Connect GitHub repo
- [ ] Add all backend env vars in Railway dashboard
- [ ] Deploy — Railway auto-detects FastAPI
- [ ] Copy Railway URL → paste as VITE_API_BASE_URL in Vercel
- [ ] Redeploy Vercel with updated API URL

## WEEKLY WORKFLOW (once live)
TUESDAY:   Drop CSV files in csv_imports/ → python main.py
WEDNESDAY: python main.py (injury updates)
FRIDAY:    Drop updated CSVs → python main.py (final designations)
SATURDAY:  python main.py (weather + line movement)
SUNDAY AM: Monitor Rotoworld alerts in Dashboard
MONDAY:    Log results in The Record → Debrief auto-generates
```

---

## TASK 9 — FINAL FRONTEND BUILD VERIFICATION

After all modules are complete:
```bash
cd frontend
npm run build
```

Verify: zero errors, all modules render, paywall gates work correctly.

---

## PRIORITY ORDER

1. CSV import system (Task 2) — enables your three accounts immediately
2. All new ingestion modules (Task 1) — adds data intelligence
3. Update projection engine (Task 3) — makes projections more accurate
4. Dashboard news alert (Task 5) — Sunday morning edge
5. Scout Report + Red Zone (Task 6) — highest user value modules
6. Sunday Mode + Stack Builder (Task 6) — core DFS workflow
7. The Record full build (Task 6) — proof of concept tracker
8. Remaining modules: Bankroll, Contest IQ, Late Swap, Debrief (Task 6)
9. Coordinator modules: GTO, Portfolio, Opponent Model, Bias Report (Task 6)
10. Stripe success flow (Task 7)
11. Generate setup checklist (Task 8)
12. Final build verification (Task 9)

---

## WEEKLY CSV SCHEDULE REMINDER

Build this reminder into the Dashboard:

```
TUESDAY reminder: "New slate dropped. Download projections from DFF,
  Draft Sharks, and PFN. Drop in csv_imports/ and run the pipeline."

FRIDAY reminder: "Final injury reports out. Download updated projections
  and re-run the pipeline for finalized numbers."
```

---

## GAME SCRIPT — READ THE SCRIPT. WIN THE SLATE.
