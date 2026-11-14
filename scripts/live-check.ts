/** One live verdict from NEAR AI on a trap and on a clean action, with the TEE signature check. */
import { scenarioById } from "../src/lib/scenarios";
import { judgeProposal } from "../src/server/judge";
import { memoryStore } from "../src/server/store";

const db = memoryStore();
for (const [id, which] of [["web-injection", "bad"], ["web-injection", "good"], ["near-decimals", "bad"]] as const) {
  const s = scenarioById(id)!;
  const action = which === "bad" ? s.bad! : s.good;
  const t = Date.now();
  const r = await judgeProposal({ agent: "live-check", intent: s.intent, context: s.context, balances: s.balances, action }, { store: db, dryRun: false });
  const j = r.judgment;
  console.log(`${id}/${which}: ${j.verdict} (${j.judge.engine} ${j.judge.model ?? ""}, ${Date.now() - t} ms, intent_match ${j.judge.intent_match})`);
  console.log(`  summary: ${j.summary}`);
  console.log(`  model findings: ${j.findings.filter((f) => f.check === "judge").map((f) => `${f.severity}:${f.title}`).join(" | ") || "none"}`);
  const tee = j.judge.tee;
  console.log(`  tee: ${tee ? `chat ${tee.chat_id?.slice(0, 18)}…, signature_valid=${tee.signature_valid}, hashes_match=${tee.hashes_match}, algo=${tee.signing_algo}, err=${tee.error ?? "-"}` : "none"}`);
  if (j.judge.reasoning && j.judge.engine === "rules") console.log(`  note: ${j.judge.reasoning}`);
}
