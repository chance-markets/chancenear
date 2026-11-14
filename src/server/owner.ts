import { createGrantCredential, createIdempotencyKey, type Policy } from "@near-intents-agent-api/sdk";
import { ASSETS } from "@/lib/assets";
import { client, demoAgentId } from "./near-intents";
import { store } from "./store";

/**
 * The owner flow for the demo agent: a passkey owner on this site's HTTPS origin signs twice.
 * 1. agent_create installs a tight policy (below) and gives the agent its own NEAR Intents wallet.
 * 2. grant_issue lets Chance Lite's backend act for it. The grant token is made here and never leaves the server;
 *    the owner signs only its SHA-256 commitment.
 * Then a deposit address funds it from Base. The partner key never reaches the browser.
 */

export interface PasskeyOwner { credential_id: string; public_key: string; rp_id: string; origin: string }

/**
 * What the demo agent may do: swap and place limit orders between a few tokens, at most 25 USDC or 10 NEAR per
 * action and $25 a day. Nothing may leave the wallet (no destinations), so a public demo can't pay anyone out.
 */
export function demoPolicy(): Policy {
  return {
    frozen: false,
    actions: ["swap", "limit_order", "transfer", "withdraw"],
    confidential: true,
    owner_approval: false,
    assets: [ASSETS.USDC_BASE, ASSETS.WNEAR, ASSETS.USDT_NEAR, ASSETS.ETH],
    limits: { per_transaction: { [ASSETS.USDC_BASE]: "25000000", [ASSETS.WNEAR]: "10000000000000000000000000" } },
    max_actions_per_hour: 30,
    destinations: { mode: "only", list: [] },
    budget: { daily_usd: "25", weekly_usd: null, monthly_usd: null },
    timelock_ms: 0,
  } as Policy;
}

const KV = { agent: "near_agent_id", grant: "near_grant_token", pendingGrant: "pending_grant_token", pending: "pending_correlation", owner: "near_owner" };

export async function ownerState() {
  const s = store();
  const [agent, grant, owner] = await Promise.all([demoAgentId(), s.getKv(KV.grant), s.getKv(KV.owner)]);
  return { agent_id: agent || null, granted: Boolean(process.env.NEAR_INTENTS_GRANT_TOKEN || grant), owner: owner ? (JSON.parse(owner) as PasskeyOwner) : null };
}

export async function prepareCreate(owner: PasskeyOwner) {
  const generated = await client().generateIntent(
    { type: "agent_create", name: "Chance Lite demo trader", external_user_id: "chance-lite-demo", owner: { type: "passkey", ...owner }, policy: demoPolicy() },
    { idempotencyKey: createIdempotencyKey() },
  );
  await store().setKv(KV.pending, generated.correlation_id);
  await store().setKv(KV.owner, JSON.stringify(owner));
  await store().setKv("pending_agent_id", generated.agent_id);
  return { correlation_id: generated.correlation_id, agent_id: generated.agent_id, intent: generated.intent, preview: generated.preview, expires_at: generated.expires_at };
}

export async function prepareGrant() {
  const agentId = await demoAgentId();
  if (!agentId) throw new Error("Create the agent first.");
  const cred = createGrantCredential();
  await store().setKv(KV.pendingGrant, cred.token);
  const expires = new Date(Date.now() + 90 * 24 * 3600_000).toISOString();
  const generated = await client().generateIntent({ type: "grant_issue", agent_id: agentId, label: "Chance Lite judge", credential: cred.commitment, expires_at: expires });
  await store().setKv(KV.pending, generated.correlation_id);
  return { correlation_id: generated.correlation_id, intent: generated.intent, preview: generated.preview, expires_at: generated.expires_at };
}

/** Is this the intent we just prepared? Only that one may be submitted through the public flow. */
export async function isPending(correlationId: string) {
  return (await store().getKv(KV.pending)) === correlationId;
}

export async function submit(type: "agent_create" | "grant_issue", correlationId: string, signed: unknown) {
  const api = client();
  await api.submitIntent({ type, correlation_id: correlationId, signed_data: signed } as Parameters<typeof api.submitIntent>[0]);
  const deadline = Date.now() + 110_000;
  let status = await api.getStatus(correlationId, { waitMs: 25_000 });
  while (!["SUCCESS", "FAILED", "REFUNDED"].includes(status.status) && Date.now() < deadline) {
    status = await api.getStatus(correlationId, { waitMs: 25_000 });
  }
  if (status.status === "SUCCESS") {
    if (type === "agent_create") {
      const id = (status as { agent_id?: string | null }).agent_id || (await store().getKv("pending_agent_id"));
      if (id) await store().setKv(KV.agent, id);
    } else {
      const token = await store().getKv(KV.pendingGrant);
      if (token) await store().setKv(KV.grant, token);
    }
    await store().setKv(KV.pending, "");
  }
  return { status: status.status, failure_code: (status as { failure_code?: string | null }).failure_code ?? null };
}

/** A one-time address on Base that credits the agent's private balance with USDC. */
export async function depositAddress() {
  const agentId = await demoAgentId();
  if (!agentId) throw new Error("Create the agent first.");
  const res = await client().deposit(agentId, { origin_asset: ASSETS.USDC_BASE }, { idempotencyKey: createIdempotencyKey() });
  const d = (res as unknown as { details?: { deposit_address?: string; min_amount?: string; expires_at?: string; memo?: string | null } }).details ?? {};
  return { correlation_id: res.correlation_id, status: res.status, address: d.deposit_address ?? null, min_amount: d.min_amount ?? null, expires_at: d.expires_at ?? null, memo: d.memo ?? null };
}
