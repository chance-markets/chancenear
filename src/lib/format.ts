import type { Judgment, Verdict } from "./types";

/** "just now", "4 min ago", "3 h ago", then a short date. */
export function ago(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function when(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** A verdict in words, as the judge would say it. */
export const VERDICT_WORDS: Record<Verdict, string> = { ALLOW: "Allowed", BLOCK: "Blocked", ESCALATE: "Escalated" };
export const verdictTone = (v: Verdict) => (v === "ALLOW" ? "is-allow" : v === "BLOCK" ? "is-block" : "is-escalate");

/** A mistake: anything the judge didn't let through. */
export const isMistake = (j: Pick<Judgment, "verdict">) => j.verdict !== "ALLOW";

/** Agent names as people say them. */
export function agentName(agent: string): string {
  if (agent === "demo-trader") return "Demo trader";
  if (agent === "sandbox") return "Sandbox";
  if (agent === "practice-scripted") return "Practice agent, scripted";
  if (agent === "practice-live") return "Practice agent, NEAR AI";
  return agent;
}

export const short = (s: string, head = 8, tail = 6) => (s.length > head + tail + 1 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s);

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
