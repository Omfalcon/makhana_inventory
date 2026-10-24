// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const AuthContext = createContext(null);

// Instant cache helpers to eliminate white screen/loading delays on refresh
const getStored = (key) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch (e) {
    return null;
  }
};

let inFlightProfilePromise = null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStored('makhana_cached_user'));
  const [profile, setProfile] = useState(() => getStored('makhana_cached_profile'));
  // If we already have a cached profile, we render immediately without blocking with full-screen spinner
  const [loading, setLoading] = useState(() => !getStored('makhana_cached_profile'));
  const [authError, setAuthError] = useState(null);

  // Sync profile cache
  const updateProfile = (newProfile) => {
    setProfile(newProfile);
    if (newProfile) {
      try {
        localStorage.setItem('makhana_cached_profile', JSON.stringify(newProfile));
      } catch (e) {}
    } else {
      localStorage.removeItem('makhana_cached_profile');
    }
  };

  const updateUser = (newUser) => {
    setUser(newUser);
    if (newUser) {
      try {
        localStorage.setItem('makhana_cached_user', JSON.stringify({ id: newUser.id, email: newUser.email }));
      } catch (e) {}
    } else {
      localStorage.removeItem('makhana_cached_user');
    }
  };

  // Deduplicated profile loader
  const loadProfile = async (currentUser) => {
    if (!currentUser) {
      updateProfile(null);
      return;
    }

    if (inFlightProfilePromise) {
      return inFlightProfilePromise;
    }

    inFlightProfilePromise = (async () => {
      try {
        // Try fetching profile via backend API
        const res = await api.auth.getMe();
        if (res && res.profile) {
          updateProfile(res.profile);
          setAuthError(null);
          return res.profile;
        }
      } catch (err) {
        console.warn('Could not fetch profile via API, querying supabase table directly:', err.message);
        // Fallback direct supabase query
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (error || !data) {
          // If we have a cached profile, keep it active on temporary query/network failures
          const cached = getStored('makhana_cached_profile');
          if (cached && cached.id === currentUser.id) {
            console.warn('Network issue fetching profile, retaining active cached profile.');
            return cached;
          }
          setAuthError('Profile not found. Please contact administrator.');
          updateProfile(null);
        } else {
          if (!data.is_active) {
            setAuthError('Your account has been deactivated.');
            updateProfile(null);
            await supabase.auth.signOut();
          } else {
            updateProfile(data);
            setAuthError(null);
            return data;
          }
        }
      } finally {
        inFlightProfilePromise = null;
      }
    })();

    return inFlightProfilePromise;
  };

  useEffect(() => {
    let mounted = true;

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user || null;
      updateUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        const cachedUser = getStored('makhana_cached_user');
        if (!cachedUser) {
          updateProfile(null);
        }
        setLoading(false);
      }
    });

    // 2. Auth state change listener (only clear state on explicit SIGNED_OUT)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return; // Handled above

      const currentUser = session?.user || null;
      if (currentUser) {
        updateUser(currentUser);
        await loadProfile(currentUser);
      } else if (event === 'SIGNED_OUT') {
        updateUser(null);
        updateProfile(null);
      }
      setLoading(false);
    });

    // 3. Proactive session keep-alive: Heartbeat every 5 minutes and on window focus
    const keepSessionAlive = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const expiresAtMs = (session.expires_at || 0) * 1000;
          // If token expires within 10 minutes or already expired, refresh proactively
          if (Date.now() > expiresAtMs - (10 * 60 * 1000)) {
            await supabase.auth.refreshSession();
          }
        }
      } catch (err) {
        console.warn('Silent session keepalive refresh error:', err);
      }
    };

    const keepAliveTimer = setInterval(keepSessionAlive, 5 * 60 * 1000);

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        keepSessionAlive();
      }
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    return () => {
      mounted = false;
      clearInterval(keepAliveTimer);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (identifier, password, roleHint = null) => {
    setAuthError(null);
    const cleanId = String(identifier || '').trim();
    let emailToAuth = cleanId.toLowerCase();

    // If identifier is NOT an email (has no @), resolve mobile number to auth email
    if (!cleanId.includes('@')) {
      const res = await api.auth.resolveSalesmanPhone(cleanId);
      if (!res.success || !res.email) {
        throw new Error(res.message || 'No account registered with this mobile number.');
      }
      emailToAuth = res.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password: password ? password.trim() : ''
    });

    if (error) {
      if (error.message?.toLowerCase().includes('invalid login credentials')) {
        throw new Error(
          cleanId.includes('@')
            ? 'Incorrect email or password. Please verify and try again.'
            : 'Incorrect mobile number or password. Please verify and try again.'
        );
      }
      throw error;
    }

    if (data.user) {
      updateUser(data.user);
      await loadProfile(data.user);
    }
    return data;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      updateUser(null);
      updateProfile(null);
      setAuthError(null);
    }
  };

  const value = {
    user,
    profile,
    loading,
    authError,
    isAdmin: profile?.role === 'ADMIN',
    isSalesman: profile?.role === 'SALESMAN',
    login,
    logout,
    refreshProfile: () => user && loadProfile(user)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
