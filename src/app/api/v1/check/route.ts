import { judgeProposal, validateProposal } from "@/server/judge";
import { fail, json, limited, origin } from "@/server/http";

/** Judge one proposed action. Never moves funds. */
export async function POST(req: Request) {
  const slow = limited(req);
  if (slow) return slow;
  try {
    const proposal = validateProposal(await req.json());
    return json(await judgeProposal(proposal, { origin: origin(req) }));
  } catch (e) {
    return fail(e);
  }
}
