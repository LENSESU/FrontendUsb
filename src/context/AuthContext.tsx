"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  isLoggedIn: boolean;
  login: (accessToken?: string, refreshToken?: string) => void;
  logout: () => void;
  saveTokens: (accessToken: string, refreshToken?: string) => void;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  redirectTo: (path: string, delay?: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  // read status from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("isLoggedIn");
    const accessToken = localStorage.getItem("access_token");
    setIsLoggedIn(stored === "true" && !!accessToken);
  }, []);

  const saveTokens = (accessToken: string, refreshToken?: string) => {
    localStorage.setItem("access_token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
  };

  const getAccessToken = () => {
    return localStorage.getItem("access_token");
  };

  const getRefreshToken = () => {
    return localStorage.getItem("refresh_token");
  };

  const login = (accessToken?: string, refreshToken?: string) => {
    localStorage.setItem("isLoggedIn", "true");
    if (accessToken) {
      saveTokens(accessToken, refreshToken);
    }
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setIsLoggedIn(false);
  };

  const redirectTo = (path: string, delay: number = 0) => {
    if (delay > 0) {
      setTimeout(() => {
        router.push(path);
      }, delay);
    } else {
      router.push(path);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        login,
        logout,
        saveTokens,
        getAccessToken,
        getRefreshToken,
        redirectTo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
