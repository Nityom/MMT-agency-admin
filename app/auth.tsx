"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const SESSION_KEY = "mmt_admin_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const ADMIN_EMAIL = "admin@mmtagency.in";
const ADMIN_PASSWORD = "Admin@4658";

interface Session {
  email: string;
  expiresAt: number;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = getStoredSession();
    setIsAuthenticated(!!session);
    setChecked(true);
  }, []);

  const login = useCallback((email: string, password: string): boolean => {
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const session: Session = {
        email,
        expiresAt: Date.now() + SESSION_TTL_MS,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  }, []);

  if (!checked) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
