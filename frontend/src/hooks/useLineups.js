// Lineup persistence — Supabase `lineups` for signed-in users, localStorage in
// mock mode. Used by Red Zone (audits) and any module that saves lineups.
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';
import { CURRENT_SEASON, CURRENT_WEEK } from '../lib/season';

const LS_KEY = 'gs_lineups';

const lsAll = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
};
const lsSave = (rows) => localStorage.setItem(LS_KEY, JSON.stringify(rows));

export function useLineups() {
  const { user } = useAuth();
  const [lineups, setLineups] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (isSupabaseConfigured && user) {
      const { data } = await supabase
        .from('lineups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setLineups(data || []);
    } else {
      setLineups(lsAll());
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const auditWeekCount = lineups.filter(
    (l) => l.lineup_type === 'audit' && l.season === CURRENT_SEASON && l.week === CURRENT_WEEK
  ).length;

  const save = useCallback(
    async (rec) => {
      const row = { ...rec, season: CURRENT_SEASON, week: CURRENT_WEEK };
      if (isSupabaseConfigured && user) {
        row.user_id = user.id;
        const { data, error } = await supabase.from('lineups').insert(row).select().single();
        if (!error && data) setLineups((prev) => [data, ...prev]);
        return { data, error };
      }
      row.id = `local-${Date.now()}`;
      row.created_at = new Date().toISOString();
      const next = [row, ...lsAll()];
      lsSave(next);
      setLineups(next);
      return { data: row, error: null };
    },
    [user]
  );

  return { lineups, auditWeekCount, loading, save };
}
