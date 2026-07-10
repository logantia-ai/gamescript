"""Injury / practice reports (Rotowire-style). Sample fallback included."""
import pandas as pd
from config import CURRENT_SEASON, use_sample
from . import _sample

# A handful of sample designations applied to depth players, by player_id.
_SAMPLE_STATUS = {
    'MIA-WR-2': 'Questionable',
    'GB-RB-1': 'Questionable',
    'KC-TE-1': 'Out',
    'CIN-WR-3': 'Doubtful',
}


def get_practice_reports():
    """Return player_id -> report_status. Live via nfl_data_py injuries, else sample."""
    if not use_sample('injuries'):
        try:
            import nfl_data_py as nfl
            df = nfl.import_injuries([CURRENT_SEASON])
            if not df.empty and 'gsis_id' in df.columns:
                latest = df.sort_values('week').groupby('gsis_id').tail(1)
                out = latest[['gsis_id', 'report_status']].rename(columns={'gsis_id': 'player_id'})
                out = out.dropna(subset=['report_status'])
                print(f"   ✅ injuries: {len(out)} designations (live)")
                return out
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠️  injuries live fetch failed ({e}); using sample data")
    rows = [{'player_id': pid, 'report_status': status} for pid, status in _SAMPLE_STATUS.items()]
    df = pd.DataFrame(rows)
    print(f"   ✅ injuries: {len(df)} designations (sample)")
    return df
