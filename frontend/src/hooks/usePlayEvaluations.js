// Scout Report persistence — Supabase `play_evaluations` for signed-in users,
// localStorage fallback in mock mode. Powers the free-tier weekly counter.
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';
import { CURRENT_SEASON, CURRENT_WEEK } from '../lib/season';

const LS_KEY = 'gs_play_evaluations';

const lsAll = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
};
const lsSave = (rows) => localStorage.setItem(LS_KEY, JSON.stringify(rows));

export function usePlayEvaluations() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (isSupabaseConfigured && user) {
      const { data } = await supabase
        .from('play_evaluations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setEvaluations(data || []);
    } else {
      setEvaluations(lsAll());
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const weekCount = evaluations.filter(
    (e) => e.season === CURRENT_SEASON && e.week === CURRENT_WEEK
  ).length;

  const save = useCallback(
    async (rec) => {
      const row = {
        ...rec,
        season: CURRENT_SEASON,
        week: CURRENT_WEEK,
      };
      if (isSupabaseConfigured && user) {
        row.user_id = user.id;
        const { data, error } = await supabase
          .from('play_evaluations')
          .insert(row)
          .select()
          .single();
        if (!error && data) setEvaluations((prev) => [data, ...prev]);
        return { data, error };
      }
      row.id = `local-${Date.now()}`;
      row.created_at = new Date().toISOString();
      const next = [row, ...lsAll()];
      lsSave(next);
      setEvaluations(next);
      return { data: row, error: null };
    },
    [user]
  );

  return { evaluations, weekCount, loading, save };
}
