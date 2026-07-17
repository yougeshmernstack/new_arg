import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, franchiseApi } from '../api';
import { storage } from '../utils/storage';

const AuthContext = createContext(null);

function hasTokenInUrl() {
  return Boolean(new URLSearchParams(window.location.search).get('token'));
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => storage.getToken());
  const [user, setUser] = useState(() => storage.getUser());
  const [profile, setProfile] = useState(() => storage.getProfile());
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(hasTokenInUrl);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const { data } = await authApi.login({ username, password });
      const nextUser = data.user || null;
      const nextProfile = data.franchise || null;
      storage.setToken(data.token);
      storage.setUser(nextUser);
      storage.setProfile(nextProfile);
      setToken(data.token);
      setUser(nextUser);
      setProfile(nextProfile);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    storage.clear();
    setToken(null);
    setUser(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (!tokenFromUrl) {
      setBootstrapping(false);
      return;
    }

    let active = true;

    const bootstrapFromToken = async () => {
      storage.setToken(tokenFromUrl);
      setToken(tokenFromUrl);

      try {
        const { data } = await franchiseApi.getProfile();
        if (!active) return;

        const nextUser = data.user || null;
        const nextProfile = data.franchise || null;
        storage.setUser(nextUser);
        storage.setProfile(nextProfile);
        setUser(nextUser);
        setProfile(nextProfile);
      } catch {
        if (!active) return;
        storage.clear();
        setToken(null);
        setUser(null);
        setProfile(null);
      } finally {
        if (active) {
          window.history.replaceState({}, '', window.location.pathname);
          setBootstrapping(false);
        }
      }
    };

    bootstrapFromToken();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      profile,
      loading,
      bootstrapping,
      isAuthenticated: Boolean(token),
      login,
      logout,
      setProfile,
    }),
    [token, user, profile, loading, bootstrapping, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
