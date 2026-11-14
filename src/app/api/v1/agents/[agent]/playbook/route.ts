import { fail, json, origin } from "@/server/http";
import { playbookRevision, renderPlaybook } from "@/server/lessons";
import { store } from "@/server/store";

export async function GET(req: Request, ctx: { params: Promise<{ agent: string }> }) {
  try {
    const { agent } = await ctx.params;
    const lessons = await store().listLessons(agent);
    return json({ agent, revision: playbookRevision(lessons), lessons, markdown: renderPlaybook(agent, lessons, origin(req)) });
  } catch (e) {
    return fail(e);
  }
}
