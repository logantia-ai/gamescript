// Generic row persistence for module-specific tables (bankroll_entries,
// weekly_debriefs, bias_profiles, stacks). Supabase for signed-in users,
// localStorage in mock mode — mirrors useLineups so every module persists the
// same way without a bespoke hook each.
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';
import { CURRENT_SEASON, CURRENT_WEEK } from '../lib/season';

export function useTableRows(table, { stampWeek = true } = {}) {
  const { user } = useAuth();
  const lsKey = `gs_${table}`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const lsAll = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(lsKey) || '[]');
    } catch {
      return [];
    }
  }, [lsKey]);

  const load = useCallback(async () => {
    if (isSupabaseConfigured && user) {
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setRows(data || []);
    } else {
      setRows(lsAll());
    }
    setLoading(false);
  }, [table, user, lsAll]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (rec) => {
      const row = { ...rec };
      if (stampWeek) {
        row.season = row.season ?? CURRENT_SEASON;
        row.week = row.week ?? CURRENT_WEEK;
      }
      if (isSupabaseConfigured && user) {
        row.user_id = user.id;
        const { data, error } = await supabase.from(table).insert(row).select().single();
        if (!error && data) setRows((prev) => [data, ...prev]);
        return { data, error };
      }
      row.id = `local-${Date.now()}`;
      row.created_at = new Date().toISOString();
      const next = [row, ...lsAll()];
      localStorage.setItem(lsKey, JSON.stringify(next));
      setRows(next);
      return { data: row, error: null };
    },
    [table, user, lsAll, lsKey, stampWeek]
  );

  return { rows, loading, save, reload: load };
}
