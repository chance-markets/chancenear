import { agentApiConfigured } from "@/server/near-intents";
import { fail, isAdmin, json, limited } from "@/server/http";
import { depositAddress, isPending, ownerState, prepareCreate, prepareGrant, submit, type PasskeyOwner } from "@/server/owner";

/**
 * The owner flow behind the Connect page. Open only while setup is unfinished: creating the agent while none exists,
 * issuing the grant while none exists, submitting only the intent this server just prepared. After that, only the
 * operator's token can repeat it.
 */
export async function GET() {
  try {
    return json({ configured: agentApiConfigured(), ...(await ownerState()) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  const slow = limited(req, 12);
  if (slow) return slow;
  if (!agentApiConfigured()) return json({ error: "Set NEAR_INTENTS_AGENT_API_KEY on the server first." }, 409);
  try {
    const body = (await req.json()) as { step?: string; owner?: PasskeyOwner; type?: "agent_create" | "grant_issue"; correlation_id?: string; signed_data?: unknown };
    const state = await ownerState();
    const admin = isAdmin(req);
    switch (body.step) {
      case "create": {
        if (state.agent_id && !admin) return json({ error: "The demo agent already exists." }, 409);
        const o = body.owner;
        if (!o?.credential_id || !o.public_key || !o.rp_id || !o.origin) return json({ error: "owner: credential_id, public_key, rp_id and origin" }, 400);
        const reqOrigin = req.headers.get("origin");
        if (reqOrigin && reqOrigin !== o.origin) return json({ error: "The passkey must belong to this site's origin." }, 400);
        return json(await prepareCreate(o));
      }
      case "grant": {
        if (!state.agent_id) return json({ error: "Create the agent first." }, 409);
        if (state.granted && !admin) return json({ error: "The grant already exists." }, 409);
        return json(await prepareGrant());
      }
      case "submit": {
        if (!body.correlation_id || !body.type || !body.signed_data) return json({ error: "type, correlation_id and signed_data" }, 400);
        if (!admin && !(await isPending(body.correlation_id))) return json({ error: "That intent wasn't prepared here, or it was already submitted." }, 409);
        return json(await submit(body.type, body.correlation_id, body.signed_data));
      }
      case "deposit":
        return json(await depositAddress());
      default:
        return json({ error: "step: create, grant, submit or deposit" }, 400);
    }
  } catch (e) {
    return fail(e);
  }
}
