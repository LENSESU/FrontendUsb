"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const STORAGE_KEY = "usb-lens-theme";
const MODES: ThemeMode[] = ["light", "dark", "system"];

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function applyTheme(mode: ThemeMode) {
  const resolvedTheme = mode === "system" ? getSystemTheme() : mode;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.style.colorScheme = resolvedTheme;
  return resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const initialMode = getStoredMode();
    setModeState(initialMode);
    setResolvedTheme(applyTheme(initialMode));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      setResolvedTheme(applyTheme(getStoredMode()));
    };

    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    function setMode(nextMode: ThemeMode) {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
      setModeState(nextMode);
      setResolvedTheme(applyTheme(nextMode));
    }

    function toggleMode() {
      const currentIndex = MODES.indexOf(mode);
      const nextMode = MODES[(currentIndex + 1) % MODES.length];
      setMode(nextMode);
    }

    return { mode, resolvedTheme, setMode, toggleMode };
  }, [mode, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return context;
}
