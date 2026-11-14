import { fail, json, limited } from "@/server/http";
import { startRehearsal } from "@/server/rehearsal";
import { store } from "@/server/store";

export async function GET() {
  try {
    return json({ data: await store().listRehearsals(20) });
  } catch (e) {
    return fail(e);
  }
}

/** Start a rehearsal: {mode: "scripted" | "live", rounds?: 1-5}. Runs in the background; poll GET /api/v1/rehearsals/:id. */
export async function POST(req: Request) {
  const slow = limited(req, 4);
  if (slow) return slow;
  try {
    const body = (await req.json().catch(() => ({}))) as { mode?: string; rounds?: number };
    const running = (await store().listRehearsals(5)).find((r) => r.status === "running" && Date.now() - Date.parse(r.started_at) < 15 * 60_000);
    if (running) return json({ error: "A rehearsal is already running.", rehearsal: running }, 409);
    const rehearsal = await startRehearsal({ mode: body.mode === "live" ? "live" : "scripted", rounds: body.rounds });
    return json({ rehearsal }, 202);
  } catch (e) {
    return fail(e);
  }
}
