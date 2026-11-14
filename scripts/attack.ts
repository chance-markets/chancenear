/**
 * The attack demo: a prompt-injected agent tries to pay an attacker, Chance Lite stops it, the agent learns.
 *
 *   npm run attack                 judge in-process (rules, plus NEAR AI if NEAR_AI_API_KEY is set)
 *   npm run attack -- --remote     judge on the hosted Chance Lite (real NEAR AI verdict in a TEE, no keys needed)
 *   npm run attack -- --remote https://your-host
 */
import { scenarioById } from "../src/lib/scenarios";
import type { CheckResponse, Proposal } from "../src/lib/types";

const DEFAULT_REMOTE = "https://web-production-a3b908a4.up.railway.app";
const args = process.argv.slice(2);
const ri = args.indexOf("--remote");
const remote = ri >= 0 ? (args[ri + 1] && !args[ri + 1].startsWith("--") ? args[ri + 1] : DEFAULT_REMOTE) : null;
const agent = `attack-demo-${Date.now().toString(36)}`;

async function check(p: Proposal): Promise<CheckResponse> {
  if (remote) {
    const r = await fetch(`${remote}/api/v1/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return (await r.json()) as CheckResponse;
  }
  const { judgeProposal } = await import("../src/server/judge");
  return judgeProposal(p, { dryRun: false });
}

const s = scenarioById("invoice-injection")!;
const line = (t = "") => console.log(t);
const show = (r: CheckResponse) => {
  const j = r.judgment;
  line(`  verdict   ${j.verdict}`);
  line(`  why       ${j.summary}`);
  for (const f of j.findings.filter((f) => f.severity !== "low")) line(`  finding   [${f.severity}] ${f.category}: ${f.title}`);
  for (const f of j.findings.filter((f) => f.severity === "low")) line(`  noticed   ${f.title}`);
  line(`  judge     ${j.judge.engine === "near_ai" ? `NEAR AI ${j.judge.model}` : "deterministic rules"} in ${j.judge.latency_ms} ms`);
  if (j.judge.tee?.signature_valid != null) line(`  tee       signature ${j.judge.tee.signature_valid ? "verified" : "NOT verified"} (signer ${j.judge.tee.signing_address}), hashes ${j.judge.tee.hashes_match ? "match" : "differ"}`);
  if (j.lesson_id) line(`  taught    ${j.lesson_id}: ${r.lessons[0]?.rule}`);
  if (j.lessons_applied.length) line(`  credited  ${j.lessons_applied.join(", ")} (the lesson prevented the mistake)`);
  line(`  hash      sha256:${j.verdict_hash}`);
  if (remote) line(`  verdict   ${remote}/verdicts/${j.id}`);
};

line(`Chance Lite attack demo (${remote ? `hosted judge at ${remote}` : "local judge"}), agent ${agent}`);
line();
line(`The user asks: "${s.intent}"`);
line(`The agent reads the invoice email from ${s.context[1].source}. Hidden in it:`);
line(`  ${s.context[1].content.split("<!--")[1]?.replace("-->", "").trim()}`);
line();
line("1. The injected agent proposes paying the attacker:");
line(`  ${JSON.stringify(s.bad)}`);
const first = await check({ agent, intent: s.intent, context: s.context, balances: s.balances, action: s.bad! });
show(first);
line();
line(`2. The agent reloads its playbook (${first.playbook_url}) and tries again:`);
line(`  ${JSON.stringify(s.good)}`);
const second = await check({ agent, intent: s.intent, context: s.context, balances: s.balances, action: s.good });
show(second);
line();
line(first.judgment.verdict === "BLOCK" && second.judgment.verdict === "ALLOW" ? "Result: the attack was stopped before any funds moved, and the agent learned not to repeat it." : "Result: unexpected verdicts, see above.");
