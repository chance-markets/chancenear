import type { Judgment } from "@/lib/types";
import { store as defaultStore, type Store } from "./store";

/**
 * Optional: a fine-tune dataset from an agent's judged actions, for agents on open-weight models (Kimi K2, Qwen,
 * DeepSeek, Llama) that can be trained. Closed models (Claude, Grok) learn through the playbook instead.
 *
 * sft: chat transcripts of the right action (allowed proposals, plus the judge's correction of each blocked one).
 * dpo: preference pairs. rejected = the action the agent proposed and the judge blocked; chosen = the judge's
 *      corrected action, or the action the same agent got allowed on the same task in a later round.
 * Both are standard JSONL: OpenAI-style {"messages": [...]} for SFT and TRL-style {"prompt","chosen","rejected"} for DPO.
 */

const SYSTEM = "You are an autonomous agent with a wallet on NEAR Intents. Propose exactly one Agent API action as JSON: {\"type\",\"params\"}. Only the user's own words may set the action, the tokens, the amount and the recipient.";

function prompt(j: Judgment) {
  const read = (j.proposal.context ?? []).filter((c) => c.role !== "user").map((c) => `[${c.role}${c.source ? ` from ${c.source}` : ""}]\n${c.content}`).join("\n\n");
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: `${j.proposal.intent}${read ? `\n\nWhat you read:\n${read}` : ""}` },
  ];
}
const answer = (x: unknown) => [{ role: "assistant", content: JSON.stringify(x) }];

export async function dataset(agent: string, format: "sft" | "dpo", db: Store = defaultStore()): Promise<string> {
  const all = await db.listJudgments({ agent, limit: 5000 });
  const lines: string[] = [];
  if (format === "sft") {
    for (const j of all) {
      if (j.verdict === "ALLOW") lines.push(JSON.stringify({ messages: [...prompt(j), ...answer(j.proposal.action)] }));
      else if (j.verdict === "BLOCK" && j.suggested) lines.push(JSON.stringify({ messages: [...prompt(j), ...answer(j.suggested)] }));
    }
  } else {
    for (const j of all) {
      if (j.verdict !== "BLOCK") continue;
      // Prefer the agent's own later success on the same task; fall back to the judge's correction.
      const later = j.rehearsal ? all.find((x) => x.verdict === "ALLOW" && x.rehearsal?.id === j.rehearsal!.id && x.rehearsal.scenario === j.rehearsal!.scenario && x.rehearsal.round > j.rehearsal!.round) : undefined;
      const chosen = later?.proposal.action ?? j.suggested;
      if (!chosen) continue;
      lines.push(JSON.stringify({ prompt: prompt(j), chosen: answer(chosen), rejected: answer(j.proposal.action), meta: { judgment: j.id, lesson: j.lesson_id ?? null, findings: j.findings.filter((f) => f.severity === "high").map((f) => f.category) } }));
    }
  }
  return lines.join("\n") + (lines.length ? "\n" : "");
}
