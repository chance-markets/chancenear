import { AgentApiError, createAgentApi, type AgentApi } from "@near-intents-agent-api/sdk";
import type { AssetRef, Execution, ProposedAction, QuoteFacts } from "@/lib/types";
import { fromAtomic } from "@/lib/units";
import { store } from "./store";
import { tokens } from "./tokens";

/**
 * The NEAR Intents Agent API (https://api.agentsonintents.com), through its official SDK.
 *
 * ChanceNear uses it three ways:
 * - ground every judgment in the API's own `dry: true` answer (USD value, fee, and every policy, budget or balance rule
 *   the live call would fail, listed as warnings);
 * - run the action only after an ALLOW, under the owner's grant, with `reference: sha256:<verdict hash>` on transfers
 *   and withdrawals so NEAR's attested audit log and receipts carry the verdict, and a `note` naming it;
 * - read the agent's balances, policy and budget for the dashboard.
 */

const BASE = process.env.NEAR_INTENTS_AGENT_API_URL || "https://api.agentsonintents.com";

export const agentApiConfigured = () => Boolean(process.env.NEAR_INTENTS_AGENT_API_KEY);
/** The live agent: from the environment, or saved by the owner flow on the Connect page. */
export const demoAgentId = async () => process.env.NEAR_INTENTS_AGENT_ID || (await store().getKv("near_agent_id")) || "";
const grantToken = async () => process.env.NEAR_INTENTS_GRANT_TOKEN || (await store().getKv("near_grant_token")) || "";
export const grantConfigured = async () => Boolean((await grantToken()) && (await demoAgentId()));

let api: AgentApi | null = null;
export function client(): AgentApi {
  if (!process.env.NEAR_INTENTS_AGENT_API_KEY) throw new Error("NEAR_INTENTS_AGENT_API_KEY is not set");
  api ??= createAgentApi({ apiKey: process.env.NEAR_INTENTS_AGENT_API_KEY, baseUrl: BASE });
  return api;
}
const granted = async () => client().forGrant(await grantToken());

const errText = (e: unknown) => (e instanceof AgentApiError ? `${e.code}${e.detail ? `: ${e.detail}` : ""}` : e instanceof Error ? e.message : String(e));

/** A price estimate from the public token list, for when no partner key is set (or the action has no dry form). */
export function estimate(spend: { asset: AssetRef; amount: number } | undefined, error?: string): QuoteFacts {
  const usd = spend && spend.asset.price != null ? spend.amount * spend.asset.price : null;
  return { source: "estimate", amount_usd: usd, fee_usd: null, fee_percent: null, warnings: [], ...(error ? { error } : {}) };
}

/**
 * A dry 1Click quote for a swap: the NEAR Intents solver market that Agent API swaps route through. Real liquidity,
 * real output and the real cost of the trade, with the partner key from partners.near-intents.org as its JWT. Used when
 * the Agent API itself can't answer (no agent yet, or the key isn't enabled there).
 */
export async function oneClickQuote(action: ProposedAction, spend: { asset: AssetRef; amount: number } | undefined): Promise<QuoteFacts | null> {
  if (action.type !== "swap") return null;
  const p = action.params as Record<string, string>;
  if (!p.origin_asset || !p.destination_asset || !/^[0-9]+$/.test(p.amount ?? "")) return null;
  const key = process.env.NEAR_INTENTS_AGENT_API_KEY;
  const placeholder = "chancenear-quote.near"; // dry quotes never deliver; 1Click only needs a well-formed account
  const body = {
    dry: true, swapType: "EXACT_INPUT", slippageTolerance: 100,
    originAsset: p.origin_asset, depositType: "INTENTS", destinationAsset: p.destination_asset, amount: p.amount,
    refundTo: placeholder, refundType: "INTENTS", recipient: placeholder, recipientType: "INTENTS",
    deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
  };
  try {
    const r = await fetch("https://1click.chaindefuser.com/v0/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "chancenear/0.1", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    const d = (await r.json()) as { quote?: { amountOut?: string; amountInUsd?: string; amountOutUsd?: string }; message?: string };
    if (!r.ok || !d.quote) return { ...estimate(spend), source: "one_click", error: d.message ?? `1Click ${r.status}`, warnings: [{ code: "quote_unavailable", detail: d.message ?? `1Click answered ${r.status}` }] };
    const inUsd = d.quote.amountInUsd != null ? Number(d.quote.amountInUsd) : null;
    const outUsd = d.quote.amountOutUsd != null ? Number(d.quote.amountOutUsd) : null;
    const fee = inUsd != null && outUsd != null ? Math.max(0, inUsd - outUsd) : null;
    const percent = fee != null && inUsd ? (fee / inUsd) * 100 : null;
    return {
      source: "one_click",
      amount_usd: inUsd,
      fee_usd: fee,
      fee_percent: percent,
      warnings: percent != null && percent > 5 ? [{ code: "high_fee", detail: `The trade loses ${percent.toFixed(1)}% between what goes in and what comes out.` }] : [],
      amount_out: d.quote.amountOut ?? null,
    };
  } catch (e) {
    return null;
  }
}

/**
 * The Agent API's dry run for this action. Swaps and limit orders need only the partner key; a withdrawal preview
 * needs the grant and an Idempotency-Key; transfers have no dry form, so they get the price estimate.
 */
export async function dryQuote(action: ProposedAction, spend: { asset: AssetRef; amount: number } | undefined, agent?: string): Promise<QuoteFacts> {
  const agentId = agent || (await demoAgentId());
  if (!agentApiConfigured() || !agentId) return (await oneClickQuote(action, spend)) ?? estimate(spend);
  const p = action.params as Record<string, string>;
  try {
    type Dry = { spend?: { amount_usd?: string | null }; fee?: { amount_usd?: string | null; percent?: string | null } | null; warnings?: { code: string; detail?: string }[]; quote?: Record<string, unknown> };
    let q: Dry | null = null;
    if (action.type === "swap") {
      q = (await client().swap(agentId, { origin_asset: p.origin_asset, destination_asset: p.destination_asset, amount: p.amount, dry: true })) as unknown as Dry;
    } else if (action.type === "limit_order") {
      q = (await client().placeLimitOrder(agentId, { base_asset: p.base_asset, quote_asset: p.quote_asset, side: p.side as "buy" | "sell", quantity: p.quantity, price: p.price, dry: true })) as unknown as Dry;
    } else if (action.type === "withdraw" && (await grantConfigured())) {
      q = (await (await granted()).withdraw(agentId, { asset: p.asset, amount: p.amount, chain: p.chain, recipient: p.recipient, ...(p.memo ? { memo: p.memo } : {}), dry: true })) as unknown as Dry;
    } else {
      return (await oneClickQuote(action, spend)) ?? estimate(spend);
    }
    const amountOut = q?.quote && typeof q.quote.amount_out === "string" ? (q.quote.amount_out as string) : null;
    return {
      source: "agent_api",
      amount_usd: q?.spend?.amount_usd != null ? Number(q.spend.amount_usd) : spend?.asset.price != null ? spend.amount * spend.asset.price : null,
      fee_usd: q?.fee?.amount_usd != null ? Number(q.fee.amount_usd) : null,
      fee_percent: q?.fee?.percent != null ? Number(q.fee.percent) : null,
      warnings: (q?.warnings ?? []).map((w: { code: string; detail?: string }) => ({ code: w.code, detail: w.detail })),
      amount_out: amountOut,
    };
  } catch (e) {
    // A refusal before any provider call (unsupported token, invalid address, frozen, not ready) is itself a finding.
    const code = e instanceof AgentApiError ? e.code : undefined;
    // The key or agent isn't usable on the Agent API: a 1Click quote still grounds a swap in real liquidity.
    if (code === "invalid_api_key" || code === "api_key_retired" || code === "agent_not_found") {
      const oc = await oneClickQuote(action, spend);
      if (oc) return oc;
    }
    const est = estimate(spend, errText(e));
    if (code) est.warnings.push({ code, detail: e instanceof AgentApiError ? e.detail : undefined });
    return est;
  }
}

/** Run an allowed action under the owner's grant. Swaps and limit orders carry a note; payouts also carry the reference. */
export async function execute(action: ProposedAction, opts: { judgmentId: string; verdictHash: string; agentId?: string }): Promise<Execution> {
  const agentId = opts.agentId || (await demoAgentId());
  const now = () => new Date().toISOString();
  if (!(await grantConfigured())) return { correlation_id: "", status: "NOT_SENT", error: "No grant configured (NEAR_INTENTS_GRANT_TOKEN, NEAR_INTENTS_AGENT_ID)", updated_at: now() };
  const p = action.params as Record<string, string>;
  const note = `ChanceNear verdict ${opts.judgmentId}: ALLOW`;
  const reference = `sha256:${opts.verdictHash}`;
  const idempotencyKey = `chancenear:${opts.judgmentId}`;
  try {
    const g = await granted();
    let res: { correlation_id: string; status: string; failure_code?: string | null };
    if (action.type === "swap") {
      res = await g.swap(agentId, { origin_asset: p.origin_asset, destination_asset: p.destination_asset, amount: p.amount, ...(p.min_amount_out ? { min_amount_out: p.min_amount_out } : {}), note }, { idempotencyKey });
    } else if (action.type === "limit_order") {
      res = await g.placeLimitOrder(agentId, { base_asset: p.base_asset, quote_asset: p.quote_asset, side: p.side as "buy" | "sell", quantity: p.quantity, price: p.price, note }, { idempotencyKey });
    } else if (action.type === "transfer") {
      res = await g.transfer(agentId, { asset: p.asset, amount: p.amount, recipient: p.recipient, reference, note }, { idempotencyKey });
    } else {
      res = await g.withdraw(agentId, { asset: p.asset, amount: p.amount, chain: p.chain, recipient: p.recipient, ...(p.memo ? { memo: p.memo } : {}), reference, note }, { idempotencyKey });
    }
    return { correlation_id: res.correlation_id, status: res.status, failure_code: res.failure_code ?? null, reference: action.type === "transfer" || action.type === "withdraw" ? reference : undefined, updated_at: now() };
  } catch (e) {
    return { correlation_id: "", status: "REFUSED", error: errText(e), updated_at: now() };
  }
}

export async function refreshExecution(x: Execution): Promise<Execution> {
  if (!x.correlation_id || !agentApiConfigured()) return x;
  try {
    const s = await client().getStatus(x.correlation_id, { waitMs: 0 });
    return { ...x, status: s.status, failure_code: s.failure_code ?? null, updated_at: new Date().toISOString() };
  } catch (e) {
    return { ...x, error: errText(e) };
  }
}

/** What the dashboard shows about the NEAR side: network health, the agent, its balances and budget. */
export async function nearOverview() {
  const out: {
    configured: boolean;
    grant: boolean;
    network: unknown;
    agent: { id: string; name?: string; status?: string; near_account_id?: string | null } | null;
    balances: { asset_id: string; symbol: string; amount: number; usd: number | null }[] | null;
    budget: unknown;
    error?: string;
  } = { configured: agentApiConfigured(), grant: await grantConfigured(), network: null, agent: null, balances: null, budget: null };
  try {
    const r = await fetch(`${BASE}/v1/network`, { signal: AbortSignal.timeout(4000) });
    if (r.ok) out.network = await r.json();
  } catch {
    /* advisory only */
  }
  const id = await demoAgentId();
  if (!out.configured || !id) return out;
  try {
    const [agent, balances, policy, list] = await Promise.all([client().getAgent(id), client().getBalances(id), client().getPolicy(id), tokens()]);
    const a = agent as unknown as { id: string; name?: string; status?: string; wallet?: { near_account_id?: string | null } };
    out.agent = { id: a.id, name: a.name, status: a.status, near_account_id: a.wallet?.near_account_id ?? null };
    const entries = (balances as unknown as { balances: { asset_id: string; balance_raw: string }[] }).balances ?? [];
    out.balances = entries.map((b) => {
      const t = list.list.find((x) => x.asset_id === b.asset_id);
      const amount = t ? fromAtomic(b.balance_raw, t.decimals) : 0;
      return { asset_id: b.asset_id, symbol: t?.symbol ?? b.asset_id, amount, usd: t?.price != null ? amount * t.price : null };
    });
    out.budget = (policy as unknown as { usage?: { budget?: unknown } }).usage?.budget ?? null;
  } catch (e) {
    out.error = errText(e);
  }
  return out;
}
