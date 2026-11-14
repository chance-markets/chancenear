import type { Verdict } from "@/lib/types";
import { fail, json } from "@/server/http";
import { store } from "@/server/store";

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const verdict = q.get("verdict") as Verdict | null;
    const limit = Math.min(200, Math.max(1, Number(q.get("limit")) || 50));
    const data = await store().listJudgments({
      agent: q.get("agent") || undefined,
      verdict: verdict && ["ALLOW", "BLOCK", "ESCALATE"].includes(verdict) ? verdict : undefined,
      before: q.get("cursor") || undefined,
      rehearsal: q.get("rehearsal") || undefined,
      limit,
    });
    return json({ data, next_cursor: data.length === limit ? data[data.length - 1].created_at : null });
  } catch (e) {
    return fail(e);
  }
}
