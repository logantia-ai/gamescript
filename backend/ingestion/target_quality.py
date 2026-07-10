"""Target quality — whether a player's volume is sustainable and high-ceiling.

Source: Next Gen Stats + nflverse air-yards data (already in the stack).
Eight targets on open slants is not eight targets on contested deep balls.
Low aDOT + high volume = safe floor; high aDOT + elite separation = ceiling.

Output columns (keyed by player_name):
  adot                   average depth of target (yds)
  target_separation      separation at the catch point (yds)
  contested_catch_rate   share of targets that were contested
  target_quality_score   0–100 composite

simulation_engine.py: high aDOT (>= 12) + elite separation (>= 2.5)
raises ceiling-spike probability.
"""
import numpy as np
import pandas as pd
from config import use_sample
from . import _sample

TQ_COLS = ['adot', 'target_separation', 'contested_catch_rate', 'target_quality_score']


def get_target_quality(ngs=None, air=None):
    """Return per-receiver target-quality metrics.

    If NGS and/or air-yards frames are supplied (already pulled upstream),
    derive the composite from them; otherwise fall back to sample data.
    """
    if ngs is not None and not ngs.empty:
        try:
            df = _derive_from_sources(ngs, air)
            if df is not None and not df.empty:
                print(f"   ✅ target_quality: {len(df)} receivers (derived)")
                return df
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  target_quality derive failed ({e}); using sample data")

    df = _sample_target_quality()
    print(f"   ✅ target_quality: {len(df)} receivers (sample)")
    return df


def _composite(adot, separation, contested):
    """0–100 score: reward separation & a productive aDOT, penalize contested."""
    sep_n = np.clip((separation - 1.5) / (3.5 - 1.5), 0, 1)        # 1.5→3.5 yds
    adot_n = np.clip(adot / 16.0, 0, 1)                            # deeper = more ceiling
    contested_pen = np.clip(contested, 0, 1)
    score = 100 * (0.5 * sep_n + 0.3 * adot_n + 0.2 * (1 - contested_pen))
    return score.round(1) if hasattr(score, 'round') else round(float(score), 1)


def _derive_from_sources(ngs, air):
    cols = ['player_name']
    df = ngs[[c for c in ['player_name', 'separation_score', 'intended_air_yards']
              if c in ngs.columns]].copy()
    df = df.rename(columns={'separation_score': 'target_separation',
                            'intended_air_yards': 'adot'})
    if 'adot' not in df.columns:
        df['adot'] = 9.0
    if 'target_separation' not in df.columns:
        df['target_separation'] = 2.6
    # Contested rate falls as separation rises.
    df['contested_catch_rate'] = (1 - np.clip((df['target_separation'] - 1.5) / 2.0, 0, 1)) * 0.45
    df['contested_catch_rate'] = df['contested_catch_rate'].round(3)
    df['target_quality_score'] = _composite(df['adot'], df['target_separation'],
                                             df['contested_catch_rate'])
    return df[['player_name'] + TQ_COLS]


def _sample_target_quality():
    rng = np.random.default_rng(173)
    roster = _sample.base_roster()
    pc = roster[roster['position'].isin(['WR', 'TE'])]
    rows = []
    for _, p in pc.iterrows():
        depth = p['depth']
        adot = float(np.clip(rng.normal(10.5 if p['position'] == 'WR' else 7.5, 3.0), 1.0, 20.0))
        sep = float(np.clip(rng.normal(3.0 if depth == 1 else 2.5, 0.4), 1.0, 4.0))
        contested = float(np.clip((1 - np.clip((sep - 1.5) / 2.0, 0, 1)) * 0.45 + rng.normal(0, 0.04), 0.02, 0.6))
        rows.append({
            'player_name': p['player_name'],
            'adot': round(adot, 1),
            'target_separation': round(sep, 2),
            'contested_catch_rate': round(contested, 3),
            'target_quality_score': _composite(adot, sep, contested),
        })
    return pd.DataFrame(rows)
