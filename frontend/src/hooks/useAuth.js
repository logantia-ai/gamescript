// ============================================================
// Auth — Supabase session + profile, with mock fallback.
// Exposes an AuthProvider context and useAuth() hook.
// ============================================================
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_USER, MOCK_PROFILE } from '../lib/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!isSupabaseConfigured) {
      setProfile(MOCK_PROFILE);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured) {
      // Mock mode: signed in as the demo user.
      setUser(MOCK_USER);
      setProfile(MOCK_PROFILE);
      setLoading(false);
      return () => {};
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) loadProfile(sessionUser.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) loadProfile(sessionUser.id);
      else setProfile(null);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const value = {
    user,
    profile,
    loading,
    isMockMode: !isSupabaseConfigured,
    async signIn(email, password) {
      if (!isSupabaseConfigured) return { error: null };
      return supabase.auth.signInWithPassword({ email, password });
    },
    async signUp(email, password) {
      if (!isSupabaseConfigured) return { error: null };
      return supabase.auth.signUp({ email, password });
    },
    async signOut() {
      if (!isSupabaseConfigured) return;
      await supabase.auth.signOut();
    },
    refreshProfile: () => user && loadProfile(user.id),
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
