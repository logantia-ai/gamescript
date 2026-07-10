# GAME SCRIPT — SESSION 3 COMPLETE FINAL BUILD
# Save this file as session3.md in C:\Users\Home\gamescript\
# Then in Claude Code type: read the file session3.md and execute all tasks in priority order
# Or in PowerShell: claude "read the file session3.md and execute all tasks"

---

## CONTEXT

Game Script is a full-stack NFL DFS intelligence platform at C:\Users\Home\gamescript.
Sessions 1 and 2 completed the full frontend, backend pipeline, all 18 modules,
Stripe payments, Supabase auth, voice input, motion effects, and logo placement.

This session is the FINAL build pass. It combines:
- 8 visual and UX changes already planned
- 10 competitive differentiators that put Game Script above every tool on the market
- Stress test and production build verification

Execute every task. Do not skip anything. Measure twice cut once.

---

## PRE-BUILD STRESS TEST CHECKLIST

Before writing a single line of code run this audit:
1. List every file that will be modified
2. Check for any import conflicts in those files
3. Verify npm run build passes currently before changes
4. Check that all logo files exist at frontend/public/assets/ (GS_Shield.png, GS_Name.png, GS_Crest.png)
5. Confirm Supabase tables exist for any new persistence requirements
6. Note any new API endpoints needed in backend/api/server.py
7. Report findings before proceeding

---

## TASK 1 — SIDEBAR SHIELD

File: components/layout/Sidebar.jsx (or wherever sidebar nav is defined)

Remove the current small shield implementation.
Add GS_Shield.png at the bottom of the sidebar navigation:
- Width: 110px, height: auto, objectFit: contain
- Container: padding 20px top and bottom, centered horizontally
- Background: subtle dark navy gradient behind it
- Box shadow: 0 0 30px rgba(196,118,42,0.5) — copper beacon glow
- Border top: 1px solid rgba(196,118,42,0.2) to separate from nav items
- The shield should feel like a glowing coat of arms anchoring the entire sidebar
- Add invisible affiliate placeholder div with id="affiliate-sidebar" and comment:
  <!-- AFFILIATE MARKETING SECTION — POPULATE AFTER PARTNER APPROVAL -->
  directly above the shield container

---

## TASK 2 — HEADER REDESIGN — NAMEPLATE

File: components/layout/Header.jsx

Remove GS_Shield.png img tag from header entirely.

Create a branded nameplate container for GS_Name.png:
- Outer container: display flex, alignItems center, height 64px
- Inner nameplate box: background rgba(10,20,40,0.8), border-bottom 2px solid #C4762A,
  padding 8px 20px, border-radius 0 0 4px 4px on bottom corners only
- GS_Name.png inside: height 46px, width auto, objectFit contain, no stretching ever
- The nameplate should feel like a premium sports broadcast lower-third graphic
- Commanding. Clean. Every pixel intentional.

---

## TASK 3 — REMOVE THE TELL FROM SIDEBAR

Files: wherever routing and navigation are defined (App.jsx, router, nav config)

Delete The Tell completely from:
- Sidebar navigation items list
- Route definitions
- Any navigation registry or module list

The Tell already exists as a tab inside Sharp Report. The standalone route is redundant.
Clean navigation. Focused product.

---

## TASK 4 — COORDINATOR WATERMARK UPGRADE

File: modules/Coordinator/index.jsx (or wherever Coordinator chat renders)

Remove any existing play diagram SVG watermark from the chat background.

Add GS_Shield.png as the chat area watermark:
- Position: absolute, centered in the chat message area
- Width: 220px, height: auto, objectFit: contain
- Opacity: 0.08
- Pointer-events: none, z-index: 0
- Chat messages render at z-index: 1 above the watermark
- Subtle copper glow: filter: drop-shadow(0 0 20px rgba(196,118,42,0.15))
- Brand presence felt without interference

---

## TASK 5 — RED ZONE FOOTBALL FIELD BACKGROUND

File: modules/RedZone/index.jsx

Transform the Red Zone background into an atmospheric football field:

Create an SVG football field overlay as the background:
- Full width and height of the module content area
- Position absolute, z-index 0, overflow hidden
- Field color: very dark green #0A1A0A at 60% opacity
- Yard lines: thin white lines at 10-yard intervals, opacity 0.06
- Hash marks: small white dashes, opacity 0.05
- End zones: rgba(139,42,42,0.15) red glow filling both end zone areas
- Center field: subtle Game Script logo watermark (GS_Shield.png 80px opacity 0.04)

Animated play diagram overlay cycling through 3 formations every 8 seconds:
- Formation 1: Standard I-formation with route tree (curl, post, out routes)
- Formation 2: Spread 4-wide with crossing routes
- Formation 3: Empty backfield with mesh concept
- Each formation draws in with CSS stroke-dasharray animation over 2 seconds
- Fades out over 1 second before next formation
- Routes in copper #C4762A at 0.12 opacity
- Players as small circles at 0.10 opacity

Audit form and content sits on top at z-index: 1.
The field should feel atmospheric like a war room overlay. Not distracting.

---

## TASK 6 — SCOUT REPORT — THREE PLAYER SIMULTANEOUS COMPARISON

File: modules/ScoutReport/index.jsx

Complete redesign. This is the most complex UI change in this session.

LAYOUT: Three side-by-side player card columns. On mobile stack vertically.
Each column is identical and independent.

INPUTS PER PLAYER CARD (dropdowns only, no free text):
1. Position: QB | RB | WR | TE | DST
2. Player: Auto-populated dropdown based on position selected,
   pulls from /api/projections?position={pos} sorted by projected points
   Shows: player name + salary + projection in the dropdown option
3. Recency: Last 1 Game | Last 3 Games | Last 5 Games | Last 10 Games | Full Season
   (controls which time window snap/target data is shown)
4. Contest Type: GPP | Cash

WHEN PLAYER IS SELECTED — auto-populate as read-only stat chips below player name:
- Salary: $X,XXX
- Implied Total: XX.X
- Game Total: XX.X
- Matchup: [opponent] [position rank vs position]
- Snap%: XX% (last 3 wks)
- Target Share: XX% (last 3 wks) — only for WR/TE
- Ownership: XX% projected
- Leverage: XX/100

These populate from /api/projections player data. Display as copper badge chips.
Show loading skeleton while fetching. Show "No data available" gracefully if missing.

SINGLE "GRADE ALL THREE" BUTTON:
- Full width below all three cards
- Copper background #C4762A
- Sends all three players simultaneously to Claude with contest type context
- Shows loading state on button while Claude responds

OUTPUT — three side-by-side result cards:
Each card shows:
- GRADE: Large letter A/B/C/D/F in color (A=green, B=copper, C=yellow, D=orange, F=red)
- VERDICT: Data-supported or Emotional Bias in bold
- CONFIDENCE: XX% data-backed / YY% speculative
- SUPPORTING SIGNALS: 3 bulleted points
- RED FLAGS: 2-3 bulleted points
- RECOMMENDATION: One sentence specific action

WINNER HIGHLIGHT:
After grades render, the highest graded player card gets:
- Copper border 2px
- Subtle copper glow box-shadow
- "BEST PLAY" badge in copper top right corner
If tied: both highlighted.

Save all three evaluations to Supabase play_evaluations table simultaneously.

---

## TASK 7 — FILM ROOM TRANSFORMATION

File: modules/FilmRoom/index.jsx

TWO MAJOR CHANGES:

CHANGE A — LIVE DATA DASHBOARD:
Transform each research step from static instructional content to live data display.
Each step shows real data when available, falls back to instructions when not.

Step 01 — Vegas Lines & Implied Totals:
  Live: Pull from /api/slate, show a table of all this week's games with
  home team, away team, game total, home implied, away implied, spread.
  Color code: green for implied totals 24+, yellow 20-24, gray below 20.
  Fallback: Show instructional content about what implied totals mean.

Step 02 — Ownership Projections:
  Live: Pull from /api/projections, show top 15 most owned players this week
  as a sortable table: player, position, projected ownership%, leverage score.
  Fallback: Instructional content about ownership strategy.

Step 03 — Snap Count & Target Share Trends:
  Live: Pull from /api/projections, show WR/TE sorted by target share,
  RB sorted by snap count. Toggle between positions.
  Fallback: Instructional content.

Step 04 — Matchup Grades:
  Live: Pull DVOA data from /api/projections, show defensive rankings
  by position with color coded grades.
  Fallback: Instructional content.

Step 05 — Weather:
  Live: Pull weather alerts from /api/slate weather_alerts field.
  Show outdoor games with wind speed, conditions, impact rating.
  Dome games show as "Dome — Weather Neutral" in green.
  Fallback: Instructional content.

Step 06 — Injury & Practice Reports:
  Live: Pull injury_status from /api/projections, show all players
  with non-Active status grouped by designation (Questionable, Doubtful, Out).
  Fallback: Instructional content.

Step 07 — Player Profiler:
  Add a player search input at the top of this step.
  User types a player name, system pulls all available Player Profiler
  data from master_dataset for that player and displays:
  Speed Score, Burst Score, Dominator Rating, Air Yards Market Share,
  WOPR, Target Share, Route Participation Rate, Athleticism Grade.
  Show as visual stat bars with elite threshold markers.
  Fallback: Instructional content with PlayerProfiler.com link.

CHANGE B — FILM PROJECTOR VISUAL:
Create a film projector animation in the upper right quadrant of Film Room.

Design:
- A subtle projector body shape (CSS or SVG) in the upper right corner
- A beam of light emanating from the projector lens, fanning outward
- The beam hits a subtle rectangular screen shape on the right side
- Film grain texture (CSS noise filter) on the screen
- Projector flicker: subtle opacity pulse on the beam (0.7 to 1.0) every 100ms

On the screen, cycle through the three logos:
- GS_Crest.png: display for 10 seconds at 180px width, fade in over 1s
- Fade out over 1 second
- GS_Shield.png: display for 10 seconds at 140px width, fade in over 1s
- Fade out over 1 second
- GS_Name.png: display for 10 seconds at 200px width, fade in over 1s
- Fade out over 1 second
- Loop back to GS_Crest.png
- Total cycle: 33 seconds per full rotation

The projector and screen should feel like ambient atmosphere.
Positioned in the corner, never interfering with the research content.
On mobile: hide the projector, show only the research steps.

---

## TASK 8 — STRATEGIC LOGO PLACEMENT THROUGHOUT APP

Apply these logo placements. Each one is intentional and purposeful:

Login page: GS_Crest.png, width 200px, centered above the login form card.
  Copper glow: box-shadow 0 0 40px rgba(196,118,42,0.3)

Register page: GS_Crest.png, width 200px, centered above the register form card.
  Same copper glow as login.

Pricing page: GS_Crest.png, width 240px, centered at very top of page above tier cards.
  Larger on this page — this is a conversion moment, brand should be maximum.

Onboarding splash screen: GS_Crest.png, width 260px, centered as hero.
  This is first impression. Make it count.

Chalkbreaker: GS_Crest.png, width 260px, centered BELOW the output results section.
  Copper glow. Appears after results load, not before.
  Psychological reward — you see the intelligence then the brand stamp.

All module pages (every single one):
  GS_Shield.png, width 140px, opacity 0.09
  Position: fixed, bottom 90px, right 24px
  Pointer-events: none, z-index: 0
  This watermark should be present on EVERY module page without exception.
  It should feel subliminal — users notice it subconsciously without it
  distracting from the content.

Dashboard stat cards area:
  GS_Crest.png, width 200px, opacity 0.05
  Position: absolute, centered behind the stat cards row
  Pointer-events: none, z-index: 0

---

## TASK 9 — RED FLAG DASHBOARD INTEGRATION

File: modules/Dashboard/index.jsx

Add a Red Flag Alert section directly on the Dashboard command center.
Position: ABOVE the Top Leverage Plays table, below the stat cards.

Design:
- Section header: "⚑ RED FLAGS THIS WEEK" in small copper caps letterspacing
- Background: rgba(139,42,42,0.08) subtle red tint
- Border-left: 3px solid #8B2A2A

Generate 2-3 red flags from available slate data:
Pull chalk_warnings from /api/slate and weather_alerts.
For each flag show:
- Severity badge: HIGH (red), MEDIUM (amber), LOW (yellow)
- Player/situation name in bold white
- Risk in copper: "41% owned — ownership trap if chalk busts"
- Mitigation in gray: "Consider fading toward De'Von Achane at 27% own"

Tier gating:
- Free tier: shows 1 flag only, others blurred with "Upgrade to Coordinator" overlay
- Coordinator and above: sees all flags

If no slate data available: show 1 sample flag from static data as example.

---

## TASK 10 — REAL CONTEST SIMULATION

Files: New component modules/ContestSim/index.jsx + new API endpoint

This is the feature that competes directly with Stokastic Sims.

FRONTEND — New module "Contest Sim" added to navigation (Coordinator+ tier):

Input section:
- Your lineup (paste or select from saved lineups)
- Contest size: 1k entries | 5k entries | 10k entries | 50k entries | 100k+ entries
- Simulations to run: 1,000 | 5,000 | 10,000
- Run Simulation button

Simulation runs in backend Python using existing simulation_engine.py
Extended to simulate full contest:
1. Generate N field lineups based on projected ownership distribution
2. Simulate all player outcomes using Monte Carlo for each field lineup
3. Score all lineups including user's lineup
4. Rank user's lineup in each simulated contest
5. Calculate: win probability (top 1%), cash probability (top 20%),
   average percentile finish, expected ROI based on contest payout structure

OUTPUT display:
Large circular gauge showing WIN PROBABILITY percentage.
Color: green above 15%, amber 5-15%, red below 5%.

Stat cards row:
- Win Probability: X.X% (top 1% finish)
- Cash Probability: XX.X% (top 20% finish)
- Average Percentile: Xth
- Expected ROI: +XX% or -XX%
- Simulations Run: X,XXX

LINEUP VS FIELD COMPARISON:
Side by side comparison of user lineup versus average field lineup:
- Your avg ownership: XX% vs Field avg: XX%
- Your projected score: XX.X vs Field avg: XX.X
- Your ceiling (P90): XX.X vs Field ceiling: XX.X
- Differentiation score: XX/100 (how unique your lineup is vs field)
- Stack comparison: Your stack vs most common field stack

HISTORICAL PATTERN MATCH — Slate Archetype:
After simulation, pull historical slate data and show:
"This week's slate profile matches 3 historical slates:
Week 14 2023 — Contrarian RBs won | Week 7 2022 — QB1 chalk dominated
Week 11 2021 — Weather shifted value to RBs"
Each historical slate shows what construction won that week.

Add /api/simulate endpoint to backend server.py that accepts lineup
and contest parameters, runs the simulation, returns results JSON.

---

## TASK 11 — PRE-LOCK CHECKLIST

Files: New component components/ui/PreLockChecklist.jsx

A mandatory checklist modal that activates when user clicks any
"Lock Lineup" or "Save Lineup" button throughout the app.

5 questions that must all be checked before lineup can be saved:

☐ Did you verify all player injury statuses are Active or confirmed playing?
☐ Did you check weather for all outdoor games in your lineup?
☐ Does your QB have at least one pass catcher from the same team?
☐ Is your ownership level appropriate for your contest type (GPP vs Cash)?
☐ Did you run The Tell or Red Zone audit on this lineup?

Design:
- Modal overlay with dark navy background
- Game Script shield watermark at 30% opacity behind checklist
- Copper checkboxes that animate with a satisfying copper flash when checked
- All 5 must be checked before the "Confirm Lock" button becomes active
- Confirm Lock button: copper background, "Lock My Lineup" text
- Skip button: small gray text "Skip checklist (not recommended)"

Track checklist completion rate in The Record — shows users how often
they complete the checklist vs skip it. Correlates with win rate over time.

---

## TASK 12 — VOICE BRIEFING MODE

Files: New component components/ui/VoiceBriefing.jsx
       Add to Sharp Report module

Add a "Listen" button to the Sharp Report Top 5 Decisions section.
When clicked, uses Web Speech API SpeechSynthesis to read the
Sharp Report aloud like a sports radio segment.

Script format read aloud:
"Good [morning/afternoon/evening]. Here is your Game Script Sharp Report
for Week [X] of the [YEAR] NFL season.

Your best stack this week: [QB name] with [partners] off a [implied total] implied total.
Leverage score: [score].

Top leverage play: [player name], [position], projected at just [ownership]% owned
with a projection of [points] points. [Reason].

Top fade: [player name] at [ownership]% owned. [Reason].

Best GPP differentiator: [player name] at [ownership]% owned with ceiling of [ceiling].
[Reason].

Best cash anchor: [player name] with [confidence] confidence and a floor of [floor].
[Reason].

Game Script says: Read the script. Win the slate. Good luck."

Voice controls:
- Play/Pause button
- Stop button
- Speed: 0.75x | 1.0x | 1.25x | 1.5x
- Voice selection: use default system voice

Button placement: Small speaker icon button next to "TOP 5 DECISIONS" header.
Tooltip: "Listen to your Sharp Report"

---

## TASK 13 — GAMEDAY WAR ROOM MODE

Files: New page pages/GamedayMode.jsx + add to navigation

A completely different interface that activates on Sunday (and Thursday/Monday).
This is not a regular module — it is a mission control interface.

AUTO-ACTIVATION: On Sunday between 8 AM and 8 PM local time,
show a banner on Dashboard: "GAMEDAY MODE AVAILABLE — Launch War Room →"
Banner pulses with copper glow.

WAR ROOM INTERFACE:
Full screen takeover with dark background and red accent elements.

TOP BAR: "GAME SCRIPT WAR ROOM — WEEK [X]" in large Rajdhani Bold
Countdown timers for each game lock time — shows time remaining
per game, turns red under 30 minutes.

LATE SCRATCH FEED:
Left panel — real-time news feed from Rotoworld/pipeline news_feed.json
Auto-refreshes every 2 minutes.
Each news item shows: Player | Team | Status | Time posted
Critical items (OUT designations) flash red.

QUICK SWAP TOOL:
Center panel — user selects a scratched player from their lineup.
Instantly shows top 3 replacement options ranked by:
1. Same position, fits salary slot
2. Highest post-scratch leverage score
3. Lowest projected ownership (tournament leverage)

ACTIVE GAMES SCORES:
Right panel — shows current game scores for games in progress.
Updates every 60 seconds.
Flags games where your players are active.

LOCK IT BUTTON:
Large copper button at bottom: "MY LINEUP IS LOCKED — LOG TO THE RECORD"
Clicking opens mini-form to save lineup details to The Record.

---

## TASK 14 — SALARY EFFICIENCY HEAT MAP

Files: New component in Dashboard or new module

Add to Dashboard as a collapsible section "SALARY EFFICIENCY MAP"
Below the Red Flag alerts, above the Top Leverage Plays.

Visual heat map grid:
- X axis: Position (QB, RB, WR, TE, DST)
- Y axis: Salary tiers ($9k+, $8k-$9k, $7k-$8k, $6k-$7k, $5k-$6k, Under $5k)
- Each cell shows: player count in that tier and average value score
- Color: Dark green = elite value (score 3.0+), Medium green = good value (2.0-3.0),
  Yellow = average (1.5-2.0), Orange = below average (1.0-1.5), Red = salary trap (<1.0)
- Click any cell: expands to show all players in that tier sorted by value score

This gives users immediate visual intelligence about where value lives
on this week's slate without reading a single number.

Title: "WHERE VALUE LIVES THIS WEEK"
Pulls from /api/projections data (salary_efficiency field).
Fallback: shows example heat map with mock data and "Run pipeline for live data" prompt.

---

## TASK 15 — INCENTIVE CLAUSE AWARENESS IN COORDINATOR

File: Update The Coordinator system prompt in the Coordinator module

Add this section to The Coordinator's system prompt:

"INCENTIVE CLAUSE AWARENESS:
Late in NFL seasons (Weeks 12-18), many players are chasing contract incentives.
A receiver 50 yards from a 1,000-yard incentive target will run harder routes
and fight for targets. A QB near a passing yards incentive will stay in games
longer. When relevant, factor incentive situations into your analysis.
Signs of incentive hunting: targets to specific players increase late season,
players returning from injury push through minor issues, game script abandonment
to get stats even in blowouts. Always mention if a player appears to be in
an incentive-relevant situation."

Also add to Film Room Step 07 (Player Profiler) a note:
"Check if player has incentive clauses in their contract — overthecap.com
shows full contract details including incentive thresholds."

---

## TASK 16 — SLATE ARCHETYPE PATTERN MATCHING

Files: New component in Sharp Report or Dashboard
       New data in backend/outputs/slate_archetypes.json

Create slate_archetypes.json in backend outputs with these historical patterns:

High Scoring Shootout (game total 52+, both teams 26+ implied):
  Historical winners: QB1 with pass catchers, points stack, receiver-heavy
  Sample weeks: Week 14 2023, Week 6 2022, Week 11 2021

Low Total Grind (game total under 42, weather factor):
  Historical winners: RBs, defense, contrarian pass catchers in other games
  Sample weeks: Week 9 2023, Week 13 2022

Injury Ravaged Slate (3+ skill position starters ruled out by Saturday):
  Historical winners: replacement-level players at low ownership
  Sample weeks: Week 12 2023, Week 4 2022

Weather Impacted (wind 15+ in multiple outdoor games):
  Historical winners: RBs, DST, dome game pass catchers
  Sample weeks: Week 17 2022, Week 14 2021

Primetime Heavy (Thursday + Sunday Night + Monday Night):
  Historical winners: primetime players at inflated ownership
  Strategy: Fade primetime chalk, target afternoon games for leverage

ADD TO SHARP REPORT: After Top 5 Decisions, add a section:
"THIS WEEK'S SLATE ARCHETYPE"
Analyze this week's slate data and classify it into the closest archetype.
Show: archetype name, confidence %, historical matches, construction recommendation.
Pulls from /api/slate and weather data to classify automatically.

---

## TASK 17 — MOTION EFFECTS (COMPLETE IMPLEMENTATION)

Implement ALL motion effects. Each one unique to its module:

Dashboard stat cards: Splitflap mechanical digit flip on page load.
Each digit flips individually with 50ms stagger between digits.
Numbers count from 0 to final value with flip animation.
CSS keyframe: transform rotateX from 90deg to 0deg with perspective.

Sharp Report: Radar pulse animation in the header area.
Concentric rings pulse outward slowly from center.
Copper color #C4762A at 0.3 opacity.
Accelerates briefly when decisions load, settles to slow 3s pulse.

The Coordinator: Play diagram SVG that very slowly draws itself in
the chat background on load. Copper strokes at 0.04 opacity.
stroke-dasharray animation over 8 seconds.

Sunday Mode: Countdown timer to next NFL game kickoff.
Calculate time to next Sunday 1:00 PM ET (or Thursday/Monday for those slates).
Timer format: Xh Xm Xs remaining
Color: white normally, amber under 3 hours, red under 1 hour with pulse.

The Record: When user logs a result with positive winnings —
Green flash (background briefly flashes rgba(42,107,60,0.4)) and
subtle confetti burst using CSS animation of colored dots.
Duration: 1.5 seconds. Cannot be triggered more than once per result log.

Stack Builder: Players connect with animated lines as stack is built.
When user selects QB + partner — copper line draws between them
with an arrow animation. Each additional player adds a new line.

Chalkbreaker: Chalk board erasing animation when results generate.
White dusty wipe effect sweeps across then copper text draws in.

Landing page: Cycling social proof in copper text below CTA buttons.
Examples rotating every 4 seconds with fade transition:
"+$2,847 — Week 14 Main Slate"
"+$1,203 — Week 9 Showdown"
"+$4,100 — Week 11 Large GPP"
"$1 to $1,000 — Million Dollar Tournament"

Pricing page: Tier cards animate in with 200ms stagger.
Scale from 0.95 to 1.0 with fade in. Smooth. Confident.

Film Room projector: Already specified in Task 7. Implement here.

All animations: respect prefers-reduced-motion media query.
All animations: complete in under 500ms (except projector cycle which is ongoing).

---

## TASK 18 — AFFILIATE PLACEHOLDER INFRASTRUCTURE

Add these invisible reserved spaces throughout the app.
No visible content. Clean commented code. Ready to activate.

Locations:
1. Dashboard sidebar, below the shield watermark:
   <div id="affiliate-sidebar-1" className="affiliate-placeholder" style={{display:'none'}}>
   {/* AFFILIATE MARKETING — ACTIVATE AFTER PARTNER APPROVAL */}
   </div>

2. Landing page, between module grid and footer:
   <div id="affiliate-landing-1" className="affiliate-placeholder" style={{display:'none'}}>
   {/* AFFILIATE MARKETING — ACTIVATE AFTER PARTNER APPROVAL */}
   </div>

3. Pricing page, below tier cards:
   <div id="affiliate-pricing-1" className="affiliate-placeholder" style={{display:'none'}}>
   {/* AFFILIATE MARKETING — ACTIVATE AFTER PARTNER APPROVAL */}
   </div>

4. The Record, below P&L chart:
   <div id="affiliate-record-1" className="affiliate-placeholder" style={{display:'none'}}>
   {/* TOOLS RECOMMENDATIONS — AFFILIATE — ACTIVATE AFTER APPROVAL */}
   </div>

Add CSS class .affiliate-placeholder { display: none !important; }
These will never show until explicitly activated.

---

## TASK 19 — SAL VETRI INTEGRATION PREP

Add to The Coordinator system prompt a new section:

"SAL VETRI METHODOLOGY AWARENESS:
Sal Vetri (SalVetriDFS) is a respected fantasy football analyst who uses
Player Profiler data to identify league-winning players. His methodology
focuses on: target share sustainability, age curves for WRs (typically
peak at 24-26), college dominator rating as a predictor of NFL success,
air yards share as a leading indicator of future production, and
situation-based value (role clarity = fantasy value).

When coaching users on player selection, incorporate these Sal Vetri
principles where relevant:
- High college dominator rating + age 24-26 + rising target share = breakout candidate
- ADP value: when a player's ADP undervalues their opportunity, flag it
- The 'blueprint' principle: identify the one metric that most predicts
  a player's fantasy success and weight it accordingly

This positions Game Script as aligned with the analytical community
Sal Vetri represents, without directly copying his content."

Also add to Film Room Step 07 (Player Profiler) a reference note:
"Sal Vetri's Fantasy Football Club uses Player Profiler as a primary
data source for identifying league-winning players. The same metrics
that predict season-long value often predict DFS ceiling plays:
high dominator rating, elite athleticism, age-appropriate target share."

---

## TASK 20 — PRODUCTION BUILD AND STRESS TEST

After all changes are implemented:

Step 1: Run npm run build in frontend folder.
If any errors: fix them all before proceeding.

Step 2: Verify these specific things work after build:
- All logo img tags resolve (GS_Shield.png, GS_Name.png, GS_Crest.png)
- No missing import errors
- No undefined component errors
- All new routes are accessible
- All motion CSS animations have proper keyframes defined
- All Claude API calls have proper error handling
- All new components have proper prop types or TypeScript types
- Pre-lock checklist modal opens and closes correctly
- Voice briefing uses feature detection (SpeechSynthesis exists check)
- Gameday mode countdown timer calculates correct time
- Contest simulation has proper loading states
- Three-player Scout Report handles case where fewer than 3 players selected
- Film Room projector respects prefers-reduced-motion

Step 3: Run npm run build one final time after all fixes.
Report: "BUILD COMPLETE — [X] modules, 0 errors"

Step 4: Output a summary of every file modified in this session.

Step 5: Output the complete Vercel deployment command and all environment
variables needed for Vercel dashboard.

---

## FINAL VERIFICATION CHECKLIST

Before reporting complete, verify each of these 20 items:

1. ✓ Sidebar shield 110px with copper beacon glow
2. ✓ Header nameplate with GS_Name.png 46px no distortion
3. ✓ The Tell removed from sidebar navigation
4. ✓ Coordinator shield watermark 220px opacity 0.08
5. ✓ Red Zone football field with animated play formations
6. ✓ Scout Report three player simultaneous comparison with auto-populate
7. ✓ Film Room live data + projector cycling logos 10s each
8. ✓ Logo placement on login, register, pricing, onboarding, Chalkbreaker, modules
9. ✓ Red Flag alerts on Dashboard above leverage plays table
10. ✓ Contest Simulation with 10,000 iterations win probability and field comparison
11. ✓ Pre-lock checklist mandatory 5 question verification
12. ✓ Voice briefing mode reads Sharp Report aloud
13. ✓ Gameday War Room mode with late scratch feed and countdown timers
14. ✓ Salary efficiency heat map on Dashboard
15. ✓ Incentive clause awareness in Coordinator system prompt
16. ✓ Slate archetype pattern matching in Sharp Report
17. ✓ All motion effects implemented with unique animations per module
18. ✓ Affiliate placeholder divs in 4 locations
19. ✓ Sal Vetri methodology in Coordinator system prompt
20. ✓ Production build passes with zero errors

---

## DEPLOYMENT COMMANDS (OUTPUT THESE AFTER BUILD)

Provide the exact commands for:
1. Starting backend: cd backend && .venv\Scripts\activate && uvicorn api.server:app --port 8000
2. Starting frontend dev: cd frontend && npm run dev
3. Production deploy: cd frontend && vercel --prod
4. All environment variables needed in Vercel dashboard

---

## GAME SCRIPT — READ THE SCRIPT. WIN THE SLATE.
## THIS IS THE FINAL BUILD. MEASURE TWICE. CUT ONCE. BUILD IT RIGHT.
