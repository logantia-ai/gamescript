"""nflverse — weekly stats, snap counts, target shares (free, GitHub-backed)."""
import pandas as pd
from config import CURRENT_SEASON, use_sample
from . import _sample


def get_weekly_stats():
    """Weekly player fantasy points. Real via nfl_data_py, else sample."""
    if not use_sample('nflverse'):
        try:
            import nfl_data_py as nfl
            df = nfl.import_weekly_data([CURRENT_SEASON])
            keep = ['player_id', 'player_name', 'player_display_name', 'recent_team',
                    'position', 'week', 'fantasy_points_ppr']
            cols = [c for c in keep if c in df.columns]
            df = df[cols].dropna(subset=['position'])
            if not df.empty:
                print(f"   ✅ nflverse: {len(df)} weekly rows (live)")
                return df
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  nflverse live fetch failed ({e}); using sample data")
    df = _sample.weekly_stats()
    print(f"   ✅ nflverse: {len(df)} weekly rows (sample)")
    return df


def get_snap_counts():
    """Snap share per player. Real via nfl_data_py snap counts, else sample."""
    if not use_sample('nflverse'):
        try:
            import nfl_data_py as nfl
            df = nfl.import_snap_counts([CURRENT_SEASON])
            if not df.empty and 'pfr_player_id' in df.columns:
                grp = (df.groupby('pfr_player_id')['offense_pct']
                         .mean().reset_index()
                         .rename(columns={'pfr_player_id': 'player_id', 'offense_pct': 'snap_pct'}))
                print(f"   ✅ snap counts: {len(grp)} players (live)")
                return grp
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  snap counts live fetch failed ({e}); using sample data")
    df = _sample.snap_counts()
    print(f"   ✅ snap counts: {len(df)} players (sample)")
    return df
