/**
 * The self-improvement loop in one command: a practice agent runs the scenario suite for a few rounds, Chance Lite
 * judges every action, every mistake becomes a lesson, and the mistakes per round fall.
 *
 *   npm run demo                   scripted agent, offline, reproducible
 *   npm run demo -- --live         a NEAR AI model plays the agent and NEAR AI judges (needs NEAR_AI_API_KEY)
 *   npm run demo -- --rounds 4
 */
import { CATEGORY_NAMES } from "../src/lib/types";
import { renderPlaybook } from "../src/server/lessons";
import { startRehearsal } from "../src/server/rehearsal";
import { memoryStore } from "../src/server/store";

const args = process.argv.slice(2);
const live = args.includes("--live");
const ri = args.indexOf("--rounds");
const rounds = ri >= 0 ? Number(args[ri + 1]) || 3 : 3;
if (!live) process.env.CHANCE_LITE_OFFLINE = "1";
if (live && !process.env.NEAR_AI_API_KEY) {
  console.log("--live needs NEAR_AI_API_KEY (in the environment or .env.local). Running the scripted agent instead.");
}

const db = memoryStore();
const started = Date.now();
const r = await startRehearsal({ mode: live ? "live" : "scripted", rounds, store: db, wait: true });

console.log(`Chance Lite rehearsal: ${r.mode === "live" ? `${r.agent_model} plays the agent, NEAR AI judges` : "scripted agent, deterministic judge, offline"}`);
for (const round of r.rounds) {
  console.log(`\nRound ${round.round}`);
  for (const s of round.scenarios) {
    const j = await db.getJudgment(s.judgment_id);
    const note = s.mistake ? `${s.verdict}  ${j?.summary ?? ""}` : j?.lessons_applied.length ? `ALLOW  prevented by ${j.lessons_applied.join(", ")}` : "ALLOW";
    console.log(`  ${s.mistake ? "mistake" : "correct"}  ${s.id.padEnd(18)} ${note.slice(0, 150)}`);
  }
  console.log(`  ${round.mistakes} of ${round.total} were mistakes, ${round.lessons} lessons in the playbook`);
}

console.log("\nMistakes per round");
for (const round of r.rounds) console.log(`  round ${round.round}  ${"#".repeat(round.mistakes * 3).padEnd(31)} ${round.mistakes}`);

const lessons = await db.listLessons(r.agent);
console.log(`\nLessons learned: ${lessons.length}, mistakes they prevented: ${lessons.reduce((t, l) => t + l.prevented, 0)}`);
for (const l of lessons) console.log(`  ${l.id}  ${CATEGORY_NAMES[l.category].padEnd(20)} caught ${l.hits}, prevented ${l.prevented}`);
console.log(`\nThe playbook the agent now loads before every action:\n`);
console.log(renderPlaybook(r.agent, lessons).split("\n").filter((l) => !l.startsWith("Blocked:") && !l.startsWith("Instead:")).join("\n"));
console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s.`);
