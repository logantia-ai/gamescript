// ============================================================
// Supabase client — hybrid mode.
// Real client when env keys are present, otherwise null and the
// app falls back to mock data (see hooks + mockData.js).
// ============================================================
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null;

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.info(
    '[Game Script] Supabase not configured — running in MOCK MODE. ' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use real data.'
  );
}
