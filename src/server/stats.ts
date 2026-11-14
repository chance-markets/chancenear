import type { Category, Stats } from "@/lib/types";
import { store as defaultStore, type Store } from "./store";

/** The numbers on the dashboard: what was judged, what it taught, and whether the agents stopped repeating it. */
export async function stats(agent?: string, db: Store = defaultStore()): Promise<Stats> {
  const judgments = await db.listJudgments({ agent, limit: 2000 });
  const lessons = await db.listLessons(agent);
  const totals = { judged: judgments.length, allowed: 0, blocked: 0, escalated: 0, injections: 0, executed: 0 };
  const by_category: Partial<Record<Category, number>> = {};
  const days = new Map<string, { judged: number; mistakes: number; repeats: number }>();
  for (const j of judgments) {
    if (j.verdict === "ALLOW") totals.allowed++;
    else if (j.verdict === "BLOCK") totals.blocked++;
    else totals.escalated++;
    if (j.findings.some((f) => f.category === "prompt_injection")) totals.injections++;
    if (j.execution?.correlation_id) totals.executed++;
    if (j.verdict !== "ALLOW") {
      const top = j.findings.find((f) => f.severity === "high") ?? j.findings.find((f) => f.severity === "medium");
      if (top) by_category[top.category] = (by_category[top.category] ?? 0) + 1;
    }
    const day = j.created_at.slice(0, 10);
    const d = days.get(day) ?? { judged: 0, mistakes: 0, repeats: 0 };
    d.judged++;
    if (j.verdict === "BLOCK") d.mistakes++;
    if (j.repeat) d.repeats++;
    days.set(day, d);
  }
  const rehearsals = (await db.listRehearsals(20)).filter((r) => r.status !== "failed" && (!agent || r.agent === agent));
  const latest = rehearsals.find((r) => r.status === "done") ?? rehearsals[0];
  return {
    agent,
    totals,
    lessons: { total: lessons.filter((l) => l.active).length, prevented: lessons.reduce((t, l) => t + l.prevented, 0) },
    by_category,
    timeline: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => ({ day, ...d })),
    curve: latest?.rounds,
  };
}
