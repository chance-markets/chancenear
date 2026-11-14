import { judgeProposal, validateProposal } from "@/server/judge";
import { fail, isAdmin, json, origin } from "@/server/http";

/** Judge one proposed action and, on ALLOW, run it on NEAR Intents under the owner's grant. Operator only. */
export async function POST(req: Request) {
  if (!isAdmin(req)) return json({ error: "Live execution needs the operator's token (Authorization: Bearer CHANCENEAR_ADMIN_TOKEN). Use /api/v1/check to judge without moving funds." }, 401);
  try {
    const proposal = validateProposal(await req.json());
    return json(await judgeProposal(proposal, { origin: origin(req), execute: true }));
  } catch (e) {
    return fail(e);
  }
}
