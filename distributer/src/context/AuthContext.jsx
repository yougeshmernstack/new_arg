import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, distributorApi } from '../api';
import { storage } from '../utils/storage';

const AuthContext = createContext(null);

function hasTokenInUrl() {
  return Boolean(new URLSearchParams(window.location.search).get('token'));
}

function userFromProfile(profile) {
  if (!profile) return null;
  return {
    uid: profile.uid,
    username: profile.username,
    role: 'distributor',
    distributorId: profile.distributorId,
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => storage.getToken());
  const [user, setUser] = useState(() => storage.getUser() || userFromProfile(storage.getProfile()));
  const [profile, setProfile] = useState(() => storage.getProfile());
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(hasTokenInUrl);

  const persistSession = useCallback((data) => {
    const nextProfile = data.distributor || null;
    const nextUser = data.user || userFromProfile(nextProfile);
    storage.setToken(data.token);
    storage.setUser(nextUser);
    storage.setProfile(nextProfile);
    setToken(data.token);
    setUser(nextUser);
    setProfile(nextProfile);
  }, []);

  const login = useCallback(
    async (username, password) => {
      setLoading(true);
      try {
        const { data } = await authApi.login({ username, password });
        persistSession(data);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [persistSession]
  );

  const register = useCallback(
    async (payload) => {
      setLoading(true);
      try {
        const { data } = await authApi.register(payload);
        if (data.token) persistSession(data);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [persistSession]
  );

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
        const { data } = await distributorApi.getProfile();
        if (!active) return;

        const nextUser = data.user || null;
        const nextProfile = data.distributor || null;
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
      register,
      logout,
      setProfile,
    }),
    [token, user, profile, loading, bootstrapping, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
