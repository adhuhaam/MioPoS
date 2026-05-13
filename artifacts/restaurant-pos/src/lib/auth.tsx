import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthResult } from "@workspace/api-client-react";

type AuthContextType = {
  auth: AuthResult | null;
  setAuth: (auth: AuthResult | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [auth, setAuth] = useState<AuthResult | null>(() => {
    const saved = localStorage.getItem("pos_auth");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (auth) {
      localStorage.setItem("pos_auth", JSON.stringify(auth));
    } else {
      localStorage.removeItem("pos_auth");
    }
  }, [auth]);

  const logout = () => {
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
