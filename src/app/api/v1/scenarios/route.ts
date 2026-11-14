import { SCENARIOS } from "@/lib/scenarios";
import { json } from "@/server/http";

export function GET() {
  return json({ data: SCENARIOS });
}
