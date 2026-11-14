import { fail, json } from "@/server/http";
import { refreshExecution } from "@/server/near-intents";
import { store } from "@/server/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const j = await store().getJudgment(id);
    if (!j) return json({ error: "No judgment with that id." }, 404);
    // An execution still moving gets its status read again from the Agent API.
    if (j.execution?.correlation_id && !["SUCCESS", "FAILED", "REFUNDED"].includes(j.execution.status)) {
      j.execution = await refreshExecution(j.execution);
      await store().updateJudgment(j);
    }
    return json(j);
  } catch (e) {
    return fail(e);
  }
}
