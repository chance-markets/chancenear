/**
 * The colour theme: light, dark, or whatever this device uses. Kept in a cookie so the server renders the page in it
 * from the first frame (no flash), and on <html data-theme>, where the stylesheet's color-scheme picks each token's
 * light or dark value. Nothing else in the app needs to know, except code that paints colours itself (the chart,
 * Privy's window), which follows useResolvedTheme() (components/providers/ThemeProvider).
 */
export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";

export const THEME_COOKIE = "chance_lite_theme";
/** Each theme's page grey (--color-surface-0), for a phone browser's bar. */
export const THEME_BAR: Record<Theme, string> = { light: "#f5f5f5", dark: "#0c0c0b" };
export const isThemePref = (v: unknown): v is ThemePref => v === "light" || v === "dark" || v === "system";

const CHANGED = "chance-lite-theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The choice on this page (light until someone picks another). */
export function themePref(): ThemePref {
  if (typeof document === "undefined") return "light";
  const v = document.documentElement.dataset.theme;
  return isThemePref(v) ? v : "light";
}

/** What the page is showing right now: the choice, with "system" answered by this device. */
export function resolvedTheme(): Theme {
  const pref = themePref();
  if (pref !== "system") return pref;
  return typeof matchMedia === "function" && matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** Switch now and remember it for this browser (a year). */
export function setThemePref(pref: ThemePref): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = pref;
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax${secure}`;
  window.dispatchEvent(new Event(CHANGED));
}

/** Calls back when the choice changes, or the device does while the choice is "system". */
export function onThemeChange(onChange: () => void): () => void {
  const media = typeof matchMedia === "function" ? matchMedia(DARK_QUERY) : null;
  window.addEventListener(CHANGED, onChange);
  media?.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    media?.removeEventListener("change", onChange);
  };
}
