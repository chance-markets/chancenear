import { fail, isAdmin, json, limited } from "@/server/http";
import { startRehearsal } from "@/server/rehearsal";
import { store } from "@/server/store";

export async function GET() {
  try {
    return json({ data: await store().listRehearsals(20) });
  } catch (e) {
    return fail(e);
  }
}

/** Start a rehearsal (operator only): {mode: "scripted" | "live", rounds?: 1-5}. Runs in the background; poll GET /api/v1/rehearsals/:id. */
export async function POST(req: Request) {
  const slow = limited(req, 4);
  if (slow) return slow;
  try {
    const body = (await req.json().catch(() => ({}))) as { mode?: string; rounds?: number };
    // Rehearsals are the operator's: the site shows one sample run, and a live one spends NEAR AI credits.
    if (!isAdmin(req)) return json({ error: "New rehearsals are run by the operator only, so visitors can't drain the AI credits. The sample run is on /rehearsal; run your own locally with npm run demo." }, 403);
    const running = (await store().listRehearsals(5)).find((r) => r.status === "running" && Date.now() - Date.parse(r.started_at) < 15 * 60_000);
    if (running) return json({ error: "A rehearsal is already running.", rehearsal: running }, 409);
    const rehearsal = await startRehearsal({ mode: body.mode === "live" ? "live" : "scripted", rounds: body.rounds });
    return json({ rehearsal }, 202);
  } catch (e) {
    return fail(e);
  }
}
