"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { THEME_BAR, onThemeChange, resolvedTheme, themePref, type Theme, type ThemePref } from "@/lib/theme";

/** The choice the server rendered with (from the cookie), so the first render matches the page. */
const Initial = createContext<ThemePref>("light");

export function ThemeProvider({ initial, children }: { initial: ThemePref; children: ReactNode }) {
  return (
    <Initial.Provider value={initial}>
      <BrowserBar />
      {children}
    </Initial.Provider>
  );
}

/** The choice: light, dark or system. */
export function useThemePref(): ThemePref {
  const initial = useContext(Initial);
  return useSyncExternalStore(onThemeChange, themePref, () => initial);
}

/** What's on screen: light or dark ("system" answered by this device; the server can't know, so it says light). */
export function useResolvedTheme(): Theme {
  const initial = useContext(Initial);
  return useSyncExternalStore(onThemeChange, resolvedTheme, () => (initial === "dark" ? "dark" : "light"));
}

/**
 * A phone browser's bar takes the page grey. The server renders it right for the saved choice; after a switch (or the
 * device changing under "system") it's repainted here.
 */
function BrowserBar() {
  const theme = useResolvedTheme();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      m.content = THEME_BAR[theme];
      m.removeAttribute("media");
    }
  }, [theme]);
  return null;
}
