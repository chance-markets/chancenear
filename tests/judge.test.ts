import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENARIOS } from "../src/lib/scenarios";
import { judgeProposal } from "../src/server/judge";
import { memoryStore } from "../src/server/store";

process.env.CHANCE_LITE_OFFLINE = "1";

const opts = (store = memoryStore()) => ({ store, model: false, dryRun: false });

for (const s of SCENARIOS) {
  test(`${s.id}: a careful agent is allowed`, async () => {
    const r = await judgeProposal({ agent: "t", intent: s.intent, mandate: s.mandate, context: s.context, balances: s.balances, action: s.good }, opts());
    assert.equal(r.judgment.verdict, s.expect.good, `${r.judgment.summary}\n${JSON.stringify(r.judgment.findings, null, 1)}`);
  });
  if (s.bad) {
    test(`${s.id}: a naive agent is ${s.expect.bad}`, async () => {
      const r = await judgeProposal({ agent: "t", intent: s.intent, mandate: s.mandate, context: s.context, balances: s.balances, action: s.bad! }, opts());
      assert.equal(r.judgment.verdict, s.expect.bad, `${r.judgment.summary}\n${JSON.stringify(r.judgment.findings, null, 1)}`);
      assert.ok(r.judgment.findings.some((f) => f.category === s.flaw && f.severity === "high"), `expected a high ${s.flaw} finding, got ${r.judgment.findings.map((f) => `${f.severity}:${f.category}`).join(", ")}`);
    });
  }
}
