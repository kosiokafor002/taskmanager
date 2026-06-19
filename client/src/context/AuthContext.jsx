import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  TOKEN_KEY,
  fetchCurrentUser,
  getStoredToken,
  loginUser,
  registerUser,
  updateProfile as updateProfileRequest
} from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const data = await fetchCurrentUser();
        if (active) {
          setUser(data.user);
        }
      } catch {
        if (active) {
          localStorage.removeItem(TOKEN_KEY);
          setToken('');
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    hydrate();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    function handleForcedLogout() {
      setToken('');
      setUser(null);
    }

    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await loginUser(credentials);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setToken(data.token);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await registerUser(payload);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setToken(data.token);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const data = await updateProfileRequest(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const value = {
    token,
    user,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}