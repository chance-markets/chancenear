import { fail, json } from "@/server/http";
import { store } from "@/server/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const r = await store().getRehearsal(id);
    return r ? json(r) : json({ error: "No rehearsal with that id." }, 404);
  } catch (e) {
    return fail(e);
  }
}
