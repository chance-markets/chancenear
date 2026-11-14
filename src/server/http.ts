import { InvalidProposal } from "./judge";

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });

export const text = (body: string, type: string, headers: Record<string, string> = {}) =>
  new Response(body, { headers: { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "no-store", ...headers } });

export function fail(e: unknown) {
  if (e instanceof InvalidProposal) return json({ error: e.message }, 400);
  if (e instanceof SyntaxError) return json({ error: "The body is not valid JSON." }, 400);
  console.error(e);
  return json({ error: e instanceof Error ? e.message : "Something went wrong." }, 500);
}

/** The public origin, for links an agent can follow (playbook URLs, MCP). */
export function origin(req: Request): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

/** A small per-IP budget for the endpoints that spend NEAR AI credits on the public demo. */
const hits = new Map<string, number[]>();
export function limited(req: Request, perMinute = 30): Response | null {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) return json({ error: "Too many requests. Try again in a minute." }, 429, { "Retry-After": "60" });
  recent.push(now);
  hits.set(ip, recent);
  return null;
}

/** Live execution and owner actions are for the operator only. */
export function isAdmin(req: Request): boolean {
  const token = process.env.CHANCENEAR_ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${token}`;
}
