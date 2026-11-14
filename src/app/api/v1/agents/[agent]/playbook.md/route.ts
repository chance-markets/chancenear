import { fail, origin, text } from "@/server/http";
import { playbookRevision, renderPlaybook } from "@/server/lessons";
import { store } from "@/server/store";

/** What an agent loads at the start of a session (Claude Code: a SessionStart hook; any bot: its system prompt). */
export async function GET(req: Request, ctx: { params: Promise<{ agent: string }> }) {
  try {
    const { agent } = await ctx.params;
    const lessons = await store().listLessons(agent);
    return text(renderPlaybook(agent, lessons, origin(req)), "text/markdown", { "X-Playbook-Revision": playbookRevision(lessons) });
  } catch (e) {
    return fail(e);
  }
}
