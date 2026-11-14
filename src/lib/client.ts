"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** A JSON call to ChanceNear's own API. Throws with the server's words when it answers with an error. */
export async function api<T>(path: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<T> {
  const r = await fetch(path, {
    method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init?.signal,
    cache: "no-store",
  });
  const text = await r.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!r.ok) {
    const msg = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : `The server answered ${r.status}.`;
    throw new Error(msg);
  }
  return data as T;
}

export interface Loaded<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Read a path and keep it fresh: again every `every` ms while the tab is visible (never while hidden), and on reload().
 * A failed refresh keeps the last good answer on screen and only says so.
 */
export function useApi<T>(path: string | null, every?: number): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(path != null);
  const [tick, setTick] = useState(0);
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    if (last.current !== path) {
      last.current = path;
      setData(null);
      setLoading(true);
    }
    const ctl = new AbortController();
    api<T>(path, { signal: ctl.signal }).then(
      (d) => {
        setData(d);
        setError(null);
        setLoading(false);
      },
      (e: unknown) => {
        if (ctl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Couldn't read it.");
        setLoading(false);
      },
    );
    return () => ctl.abort();
  }, [path, tick]);

  useEffect(() => {
    if (!path || !every) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    }, every);
    return () => window.clearInterval(id);
  }, [path, every]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

/** Copy text and say so for a moment. */
export function useCopy(): [string | null, (key: string, text: string) => void] {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const copy = useCallback((key: string, text: string) => {
    const done = () => {
      setCopied(key);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), 1600);
    };
    // The async clipboard can be refused (an embedded frame, no focus); the old way still works there.
    const fallback = () => {
      const t = document.createElement("textarea");
      t.value = text;
      t.setAttribute("readonly", "");
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      try {
        if (document.execCommand("copy")) done();
      } finally {
        t.remove();
      }
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }, []);
  return [copied, copy];
}

/** This page's own origin, for snippets (the server renders a placeholder). */
export function useOrigin(): string {
  const [origin, setOrigin] = useState("https://<your-chancenear>");
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}
