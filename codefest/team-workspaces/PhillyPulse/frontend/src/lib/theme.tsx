"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ThemeMode = "auto" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "auto",
  resolved: "dark",
  setMode: () => {},
});

function resolveAuto(): ResolvedTheme {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

const STORAGE_KEY = "phlpulse-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (saved && ["auto", "light", "dark"].includes(saved)) {
      setModeState(saved);
    }
  }, []);

  useEffect(() => {
    const r = mode === "auto" ? resolveAuto() : mode;
    setResolved(r);

    const html = document.documentElement;
    if (r === "dark") {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }
  }, [mode]);

  // Re-check auto mode every minute (in case it crosses the 6 AM/PM boundary)
  useEffect(() => {
    if (mode !== "auto") return;
    const interval = setInterval(() => {
      setResolved(resolveAuto());
    }, 60_000);
    return () => clearInterval(interval);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
