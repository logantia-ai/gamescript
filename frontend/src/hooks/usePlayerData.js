// Player projections.
// Source precedence: Supabase (prod) → FastAPI pipeline outputs (local dev) → mock.
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isApiConfigured, fetchProjections } from '../lib/api';
import { MOCK_PROJECTIONS } from '../lib/mockData';

const SEASON = 2025;
const WEEK = 1;

export function usePlayerData({ position } = {}) {
  const [players, setPlayers] = useState([]);
  const [source, setSource] = useState(null); // 'supabase' | 'api' | 'mock'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const done = (rows, src) => {
      if (!active) return;
      setPlayers(rows);
      setSource(src);
      setLoading(false);
    };

    async function run() {
      // 1. Supabase
      if (isSupabaseConfigured) {
        try {
          let q = supabase
            .from('player_projections')
            .select('*')
            .eq('season', SEASON)
            .eq('week', WEEK)
            .order('projection', { ascending: false });
          if (position) q = q.eq('position', position);
          const { data } = await q;
          if (data && data.length) return done(data, 'supabase');
        } catch {
          /* fall through */
        }
      }

      // 2. FastAPI pipeline outputs
      if (isApiConfigured) {
        try {
          const rows = await fetchProjections({ position });
          if (rows.length) return done(rows, 'api');
        } catch {
          /* fall through */
        }
      }

      // 3. Mock
      const mock = position
        ? MOCK_PROJECTIONS.filter((p) => p.position === position)
        : MOCK_PROJECTIONS;
      done(mock, 'mock');
    }

    run();
    return () => {
      active = false;
    };
  }, [position]);

  return { players, loading, source };
}
