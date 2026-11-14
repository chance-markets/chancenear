import { fail, json } from "@/server/http";
import { stats } from "@/server/stats";

export async function GET(req: Request) {
  try {
    return json(await stats(new URL(req.url).searchParams.get("agent") || undefined));
  } catch (e) {
    return fail(e);
  }
}
