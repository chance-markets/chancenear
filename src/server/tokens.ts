import snapshot from "./tokens-snapshot.json";
import type { AssetRef } from "@/lib/types";

/**
 * The assets an agent can hold, from the Agent API's public `GET /v1/tokens` (no key needed). Read live and cached for
 * five minutes; the snapshot bundled with the repo stands in when the network is unreachable, so the judge and the
 * tests resolve real asset ids, symbols and decimals offline too.
 */

const BASE = process.env.NEAR_INTENTS_AGENT_API_URL || "https://api.agentsonintents.com";
const TTL = 5 * 60_000;

interface Raw { asset_id: string; symbol: string; blockchain: string; decimals: number; price: number | null }

let cache: { at: number; list: AssetRef[]; live: boolean } | null = null;

const toRef = (t: Raw): AssetRef => ({ asset_id: t.asset_id, symbol: t.symbol, chain: t.blockchain, decimals: t.decimals, price: t.price ?? null });

export function snapshotTokens(): AssetRef[] {
  return (snapshot as { data: Raw[] }).data.map(toRef);
}

export async function tokens(): Promise<{ list: AssetRef[]; live: boolean }> {
  if (cache && Date.now() - cache.at < TTL) return cache;
  if (process.env.CHANCENEAR_OFFLINE === "1") {
    cache = { at: Date.now(), list: snapshotTokens(), live: false };
    return cache;
  }
  try {
    const r = await fetch(`${BASE}/v1/tokens`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(String(r.status));
    const body = (await r.json()) as { data?: Raw[] } | Raw[];
    const raw = Array.isArray(body) ? body : body.data ?? [];
    if (!raw.length) throw new Error("empty");
    cache = { at: Date.now(), list: raw.map(toRef), live: true };
  } catch {
    cache = { at: Date.now(), list: snapshotTokens(), live: false };
  }
  return cache;
}

export async function assetById(id: string): Promise<AssetRef | null> {
  const { list } = await tokens();
  return list.find((t) => t.asset_id === id) ?? null;
}

export { ASSETS, CHAIN_NAMES, chainName } from "@/lib/assets";
