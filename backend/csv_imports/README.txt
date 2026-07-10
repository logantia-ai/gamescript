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
