// Weekly slate report.
// Source precedence: Supabase (prod) → FastAPI pipeline output (local dev) → mock.
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isApiConfigured, fetchSlate } from '../lib/api';
import { MOCK_SLATE_REPORT } from '../lib/mockData';

const SEASON = 2025;
const WEEK = 1;

export function useSlateData() {
  const [slate, setSlate] = useState(null);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const done = (data, src) => {
      if (!active) return;
      setSlate(data);
      setSource(src);
      setLoading(false);
    };

    async function run() {
      // 1. Supabase (sharp_report JSONB holds the generated slate report)
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from('weekly_slates')
            .select('*')
            .eq('season', SEASON)
            .eq('week', WEEK)
            .eq('slate_type', 'main')
            .maybeSingle();
          if (data) return done(data.sharp_report || data, 'supabase');
        } catch {
          /* fall through */
        }
      }

      // 2. FastAPI pipeline output
      if (isApiConfigured) {
        try {
          const data = await fetchSlate();
          if (data) return done(data, 'api');
        } catch {
          /* fall through */
        }
      }

      // 3. Mock
      done(MOCK_SLATE_REPORT, 'mock');
    }

    run();
    return () => {
      active = false;
    };
  }, []);

  return { slate, loading, source };
}
