import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { getMe, login as loginApi, logout as logoutApi } from "@workspace/api-client-react";
import type { SessionInfo } from "@workspace/api-client-react";

const STORAGE_KEY = "@pos/credentials";

interface StoredCredentials {
  outletId: number | null;
  pin: string;
}

interface AuthContextValue {
  staff: SessionInfo["staff"] | null;
  outlet: SessionInfo["outlet"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (outletId: number | null, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<SessionInfo["staff"] | null>(null);
  const [outlet, setOutlet] = useState<SessionInfo["outlet"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((session: SessionInfo) => {
    setStaff(session.staff);
    setOutlet(session.outlet ?? null);
  }, []);

  const tryAutoLogin = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      const { outletId, pin }: StoredCredentials = JSON.parse(stored);
      const result = await loginApi({ outletId: outletId ?? undefined as any, pin });
      applySession(result as unknown as SessionInfo);
      return true;
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return false;
    }
  }, [applySession]);

  useEffect(() => {
    (async () => {
      try {
        const session = await getMe();
        applySession(session);
      } catch {
        await tryAutoLogin();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [applySession, tryAutoLogin]);

  const login = useCallback(async (outletId: number | null, pin: string) => {
    const result = await loginApi({ outletId: outletId as any, pin });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ outletId, pin }));
    applySession(result as unknown as SessionInfo);
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {}
    await AsyncStorage.removeItem(STORAGE_KEY);
    setStaff(null);
    setOutlet(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        staff,
        outlet,
        isLoading,
        isAuthenticated: !!staff,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
