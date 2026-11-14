import { dataset } from "@/server/dataset";
import { fail } from "@/server/http";

/** Optional fine-tune export for open-weight agents: ?format=sft (default) or ?format=dpo. */
export async function GET(req: Request, ctx: { params: Promise<{ agent: string }> }) {
  try {
    const { agent } = await ctx.params;
    const format = new URL(req.url).searchParams.get("format") === "dpo" ? "dpo" : "sft";
    return new Response(await dataset(agent, format), {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Content-Disposition": `attachment; filename="${agent}-${format}.jsonl"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
