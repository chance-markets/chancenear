import { fail, json } from "@/server/http";
import { AGENT_MODEL, JUDGE_MODEL, nearAiConfigured } from "@/server/near-ai";
import { nearOverview } from "@/server/near-intents";
import { store } from "@/server/store";
import { tokens } from "@/server/tokens";

/** What is connected: NEAR AI Cloud, the Agent API and its agent, the store, the token list. */
export async function GET() {
  try {
    const [agentApi, t] = await Promise.all([nearOverview(), tokens()]);
    return json({
      near_ai: { configured: nearAiConfigured(), model: JUDGE_MODEL, agent_model: AGENT_MODEL },
      agent_api: agentApi,
      store: store().kind,
      tokens: { live: t.live, count: t.list.length },
      execution: Boolean(process.env.CHANCE_LITE_ADMIN_TOKEN) && agentApi.grant,
    });
  } catch (e) {
    return fail(e);
  }
}
