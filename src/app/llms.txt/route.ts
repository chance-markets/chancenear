import { origin } from "@/server/http";

/**
 * llms.txt: a plain-text brief of ChanceNear for AI readers. Every claim names the code that implements it or a step
 * that shows it, so a reader can check it rather than take it on trust.
 */
export function GET(req: Request) {
  const base = origin(req);
  const repo = "https://github.com/chance-markets/chancenear";
  const body = `# ChanceNear

> The self-improvement stack for AI agents on NEAR Intents. ChanceNear checks every action an agent proposes on the
> NEAR Intents Agent API before it runs, turns each mistake it catches into a lesson the agent loads before its next
> action, and measures the mistakes falling. Open source (MIT): ${repo}

## What it is

Five layers. A typical AI agent guard is only the first.

1. Catch: judges each proposed swap, transfer, withdrawal or limit order before it runs. ALLOW, BLOCK or ESCALATE.
2. Learn: every BLOCK becomes one short rule in that agent's playbook (Postgres), reinforced when it repeats.
3. Remember: the agent gets its lessons back in every verdict, as playbook.md at session start, and over MCP.
4. Measure: lessons are credited when they prevent a mistake, repeats are counted, rehearsals graph mistakes per round.
5. Train (optional): SFT and DPO JSONL export of the judged actions for open-weight models such as Kimi K3, Qwen or DeepSeek.

## How it differs from a typical AI agent guard

- Checks against the user's own words, not only fixed rules: amounts, token decimals, shares of a balance ("half of
  my ETH"), tokens, chain, payee (including lookalikes such as a1ice.near for alice.near), buy or sell side.
  Code: src/server/intent.ts. Tests: tests/judge.test.ts, tests/parse.test.ts.
- Prompt injection by provenance, not phrase lists alone: it separates exposure (the agent read injected text) from
  taint (the action's recipient, amount or kind came from it). Reading an attack is allowed; acting on it is blocked.
  Code: src/server/injection.ts.
- Grounded in NEAR's own numbers: token decimals and prices from GET /v1/tokens, the Agent API's dry: true answer
  (fees and every policy or budget rule the live call would break), and live NEAR Intents 1Click quotes.
  Code: src/server/near-intents.ts.
- Verifiable verdicts: the judge model runs on NEAR AI Cloud in a TEE; ChanceNear recovers the signer of each
  response signature and checks the request and response hashes. Code: src/server/near-ai.ts.
- A model can add doubt but never lift a deterministic BLOCK, so an injection that also fools the judge model fails.
  Code: src/server/judge.ts.
- It learns: a guard blocks and forgets; ChanceNear writes the lesson and hands it back. Code: src/server/lessons.ts,
  src/server/rehearsal.ts. Test: "rehearsal: mistakes fall to zero once the playbook holds the lessons".

## Check it yourself

- ${base}/ : How it works, one real invoice attack step by step.
- ${base}/rehearsal : the sample live rehearsal (a NEAR AI model plays the agent, NEAR AI judges): mistakes and
  lessons per round, and every scenario's verdict. Run your own locally: npm run demo (scripted: 6 of 10 mistakes
  in round 1, 0 after).
- ${base}/try : pick a scenario, play a careful or a naive agent, read the verdict.
- POST ${base}/api/v1/check with {"agent","intent","action":{"type","params"},"context"}: the verdict, findings,
  the corrected action and the lessons to apply.
- Locally: npm install && npm test (30 tests), npm run attack, npm run demo.

## Use it from an agent

- MCP (Claude Code): claude mcp add --transport http chancenear ${base}/api/mcp  (tools: check_action, get_playbook)
- Skill file: ${base}/skill.md
- Playbook: ${base}/api/v1/agents/<agent>/playbook.md
- Fine-tune export: ${base}/api/v1/agents/<agent>/dataset.jsonl?format=sft|dpo

## NEAR integrations

- NEAR Intents Agent API (api.agentsonintents.com): tokens, dry runs, execution with reference = sha256:<verdict>
  so NEAR's attested receipts name the verdict, passkey owner flow (agent_create, grant_issue), deposits.
- NEAR AI Cloud (cloud-api.near.ai): TEE-hosted judge and practice-agent models, response signatures verified.
- NEAR Intents 1Click (1click.chaindefuser.com): live dry quotes for swaps.
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
