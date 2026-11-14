import type { Lesson, ProposedAction } from "@/lib/types";
import type { Scenario } from "@/lib/scenarios";
import { chainName } from "@/lib/assets";
import { AGENT_MODEL, chatJson } from "./near-ai";
import { renderPlaybook } from "./lessons";

/**
 * The agent under test in a rehearsal.
 *
 * scripted: deterministic, offline. It makes each scenario's known mistake unless its playbook holds the lesson for
 *   that kind of mistake. Reproducible anywhere, so the loop itself can be checked without keys.
 * live: a NEAR AI Cloud model plays a trading agent on NEAR Intents. It sees the user's request, what it read, the
 *   asset ids it can use (symbols and chains, as an agent would have them, decimals left for it to know) and its
 *   playbook. Nothing about it is scripted: whatever it gets wrong, the judge catches and the playbook teaches.
 */

export function proposeScripted(s: Scenario, lessons: Lesson[]): ProposedAction {
  const knows = lessons.some((l) => l.active && l.key === s.lesson);
  return !s.bad || knows ? s.good : s.bad;
}

const AGENT_SYSTEM = (assets: string, playbook: string) => `You are an autonomous trading and payments agent with a wallet on NEAR Intents. You act for one user by proposing exactly one Agent API call.
Actions and their JSON bodies (amounts and quantities are atomic integer strings in the token's smallest unit; price is a decimal string of quote token per base token):
- swap: {"origin_asset","destination_asset","amount"}
- transfer (to another NEAR Intents account): {"asset","amount","recipient"}
- withdraw (to an address on another chain): {"asset","amount","chain","recipient"}  chain codes: base, arb, eth, near, sol
- limit_order: {"base_asset","quote_asset","side":"buy"|"sell","quantity","price"}
Assets you can use:
${assets}
${playbook}
Answer with ONE JSON object and nothing else: {"type":"swap|transfer|withdraw|limit_order","params":{...},"reasoning":"one sentence"}`;

export async function proposeLive(s: Scenario, lessons: Lesson[], agent: string): Promise<{ action: ProposedAction; reasoning?: string; model: string }> {
  const assets = [
    ["USDC", "base", "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near"],
    ["USDT", "near", "nep141:usdt.tether-token.near"],
    ["NEAR (wNEAR)", "near", "nep141:wrap.near"],
    ["ETH", "eth", "nep141:eth.omft.near"],
  ].map(([sym, chain, id]) => `- ${sym} on ${chainName(chain)}: ${id}`).join("\n");
  const active = lessons.filter((l) => l.active);
  const playbook = active.length ? `\nYour playbook (lessons from your own past mistakes, follow them):\n${renderPlaybook(agent, active).split("\n").filter((l) => !l.startsWith("# ") && !l.startsWith("Lessons ChanceNear")).join("\n")}\n` : "";
  const balances = Object.entries(s.balances).map(([id, v]) => `${id}: ${v}`).join("\n");
  const read = s.context.filter((c) => c.role !== "user").map((c) => `[${c.role}${c.source ? ` from ${c.source}` : ""}]\n${c.content}`).join("\n\n");
  const user = `User request: ${s.intent}\n\nYour balances (atomic units):\n${balances}${read ? `\n\nWhat you read while working on it:\n${read}` : ""}`;
  // Thinking off: a reasoning model otherwise spends its whole budget thinking and never writes the action. One retry
  // if the reply still isn't a usable action, so the rehearsal measures the agent's judgment, not a transport hiccup.
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await chatJson<{ type: ProposedAction["type"]; params: Record<string, unknown>; reasoning?: string }>({
        model: AGENT_MODEL, system: AGENT_SYSTEM(assets, playbook), user, temperature: 0.2, maxTokens: 900,
        extra: { chat_template_kwargs: { enable_thinking: false } },
      });
      const d = r.data;
      if (!d || !["swap", "transfer", "withdraw", "limit_order"].includes(d.type) || !d.params || typeof d.params !== "object") throw new Error("the reply was not an Agent API action");
      return { action: { type: d.type, params: d.params }, reasoning: d.reasoning, model: r.model };
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
