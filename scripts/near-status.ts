/** What ChanceNear can see on NEAR right now: the Agent API's health, its token list, and (with keys) the agent. */
import { nearOverview } from "../src/server/near-intents";
import { tokens } from "../src/server/tokens";
import { JUDGE_MODEL, nearAiConfigured } from "../src/server/near-ai";

const [o, t] = await Promise.all([nearOverview(), tokens()]);
const net = o.network as { network?: string; status?: { overall?: string; components?: { id: string; status: string }[] } } | null;
console.log(`Agent API network: ${net?.network ?? "unreachable"}, ${net?.status?.overall ?? "unknown"}`);
for (const c of net?.status?.components ?? []) console.log(`  ${c.id.padEnd(10)} ${c.status}`);
console.log(`Tokens: ${t.list.length} from ${t.live ? "GET /v1/tokens (live)" : "the bundled snapshot"}`);
console.log(`Partner key: ${o.configured ? "set" : "not set"}; grant: ${o.grant ? "set" : "not set"}`);
if (o.agent) console.log(`Agent: ${o.agent.id} (${o.agent.status}), NEAR account ${o.agent.near_account_id}`);
for (const b of o.balances ?? []) console.log(`  ${b.symbol.padEnd(8)} ${b.amount}${b.usd != null ? `  ($${b.usd.toFixed(2)})` : ""}`);
if (o.error) console.log(`Agent API error: ${o.error}`);
console.log(`NEAR AI judge: ${nearAiConfigured() ? JUDGE_MODEL : "not configured (rules only)"}`);
