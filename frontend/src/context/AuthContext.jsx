// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Load user profile from API or directly from DB
  const loadProfile = async (currentUser) => {
    try {
      if (!currentUser) {
        setProfile(null);
        return;
      }

      // Try fetching profile via backend API
      const res = await api.auth.getMe();
      if (res && res.profile) {
        setProfile(res.profile);
        setAuthError(null);
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
        setAuthError('Profile not found. Please contact administrator.');
        setProfile(null);
      } else {
        if (!data.is_active) {
          setAuthError('Your account has been deactivated.');
          setProfile(null);
          await supabase.auth.signOut();
        } else {
          setProfile(data);
          setAuthError(null);
        }
      }
    }
  };

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      setUser(data.user);
      await loadProfile(data.user);
    }
    return data;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setProfile(null);
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
