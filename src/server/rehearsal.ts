import { randomUUID } from "node:crypto";
import { SCENARIOS } from "@/lib/scenarios";
import type { Category, Rehearsal, RoundResult } from "@/lib/types";
import { judgeProposal } from "./judge";
import { AGENT_MODEL, nearAiConfigured } from "./near-ai";
import { proposeLive, proposeScripted } from "./practice-agent";
import { store as defaultStore, type Store } from "./store";

/**
 * Rehearsals measure the loop. One practice agent, a fresh playbook, the same scenarios round after round: a mistake
 * in round one becomes a lesson, and the next rounds show whether the agent stops making it. Lessons are written the
 * moment a mistake is caught, so learning shows inside a round too (a decimals lesson from one swap fixes the next).
 */

export async function startRehearsal(opts: { mode: "live" | "scripted"; rounds?: number; store?: Store; wait?: boolean }): Promise<Rehearsal> {
  const db = opts.store ?? defaultStore();
  const mode = opts.mode === "live" && nearAiConfigured() ? "live" : "scripted";
  const agent = mode === "live" ? "practice-live" : "practice-scripted";
  const rounds = Math.min(5, Math.max(1, opts.rounds ?? 3));
  const r: Rehearsal = { id: `r_${randomUUID().slice(0, 8)}`, agent, mode, agent_model: mode === "live" ? AGENT_MODEL : undefined, status: "running", started_at: new Date().toISOString(), rounds: [] };
  await db.clearAgent(agent);
  await db.saveRehearsal(r);
  const job = run(r, rounds, db).catch(async (e) => {
    r.status = "failed";
    r.error = e instanceof Error ? e.message : String(e);
    r.finished_at = new Date().toISOString();
    await db.saveRehearsal(r);
  });
  if (opts.wait) await job;
  return r;
}

async function run(r: Rehearsal, rounds: number, db: Store) {
  for (let round = 1; round <= rounds; round++) {
    const result: RoundResult = { round, playbook: true, total: 0, mistakes: 0, allowed: 0, escalated: 0, lessons: 0, by_category: {}, scenarios: [] };
    r.rounds.push(result);
    for (const s of SCENARIOS) {
      const lessons = (await db.listLessons(r.agent)).filter((l) => l.active);
      let action = s.good;
      let reasoning: string | undefined;
      if (r.mode === "live") {
        try {
          const live = await proposeLive(s, lessons, r.agent);
          action = live.action;
          reasoning = live.reasoning;
        } catch (e) {
          // A reply that isn't a usable action is the agent's mistake too; judge an empty proposal so it's counted.
          action = { type: s.good.type, params: {} };
          reasoning = `The agent's reply could not be used: ${e instanceof Error ? e.message : String(e)}`;
        }
      } else {
        action = proposeScripted(s, lessons);
      }
      const { judgment } = await judgeProposal(
        { agent: r.agent, intent: s.intent, mandate: s.mandate, context: s.context, balances: s.balances, action, reasoning },
        { store: db, rehearsal: { id: r.id, round, scenario: s.id }, exercised: s.lesson ? [s.lesson] : [], model: r.mode === "live" ? undefined : false, proof: false, dryRun: false },
      );
      const mistake = judgment.verdict !== "ALLOW";
      const category = mistake ? (judgment.findings.find((f) => f.severity === "high") ?? judgment.findings.find((f) => f.severity === "medium"))?.category : undefined;
      result.total++;
      if (mistake) result.mistakes++;
      if (judgment.verdict === "ALLOW") result.allowed++;
      if (judgment.verdict === "ESCALATE") result.escalated++;
      if (category) result.by_category[category as Category] = (result.by_category[category as Category] ?? 0) + 1;
      result.scenarios.push({ id: s.id, verdict: judgment.verdict, mistake, judgment_id: judgment.id, category });
      result.lessons = (await db.listLessons(r.agent)).filter((l) => l.active).length;
      await db.saveRehearsal(r);
    }
  }
  r.status = "done";
  r.finished_at = new Date().toISOString();
  await db.saveRehearsal(r);
}
