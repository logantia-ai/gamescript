// The Record — user's lineup history & P&L, from Supabase lineups, mock fallback.
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';
import { MOCK_RECORD } from '../lib/mockData';

export function useRecord() {
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!isSupabaseConfigured || !user) {
        setRecord(MOCK_RECORD);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('lineups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!active) return;
      // Shape raw lineups into the record view; fall back to mock if empty.
      setRecord(data && data.length ? { ...MOCK_RECORD, lineups: data } : MOCK_RECORD);
      setLoading(false);
    }
    run();
    return () => {
      active = false;
    };
  }, [user]);

  return { record, loading };
}
