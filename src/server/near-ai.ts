import { createHash } from "node:crypto";
import { recoverMessageAddress } from "viem";
import type { TeeProof } from "@/lib/types";

/**
 * NEAR AI Cloud: OpenAI-compatible private inference in TEEs (https://cloud-api.near.ai/v1).
 *
 * Every judge call is a plain chat completion against a model NEAR AI hosts inside a TEE. Afterwards we fetch the
 * completion's signature (GET /v1/signature/{chat_id}): the TEE signs "model:sha256(request):sha256(response)" with a
 * key bound to its attestation. We recover the signer from the signature and compare the two hashes with the exact
 * bytes we sent and received, so a verdict is provably the output of that model in that enclave.
 */

const BASE = process.env.NEAR_AI_BASE_URL || "https://cloud-api.near.ai/v1";
export const JUDGE_MODEL = process.env.NEAR_AI_MODEL || "deepseek-ai/DeepSeek-V4.1-Flash-1017";
export const AGENT_MODEL = process.env.NEAR_AI_AGENT_MODEL || "Qwen/Qwen3.8-27B";

export const nearAiConfigured = () => Boolean(process.env.NEAR_AI_API_KEY);

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

export interface ChatResult<T> {
  data: T;
  content: string;
  chatId: string;
  model: string;
  latencyMs: number;
  requestBody: string;
  responseBody: string;
}

/** One completion that must answer with a JSON object. Retries once without response_format if the model refuses it. */
export async function chatJson<T>(opts: { model?: string; system: string; user: string; maxTokens?: number; temperature?: number }): Promise<ChatResult<T>> {
  const key = process.env.NEAR_AI_API_KEY;
  if (!key) throw new Error("NEAR_AI_API_KEY is not set");
  const model = opts.model || JUDGE_MODEL;
  const started = Date.now();
  const attempt = async (format: boolean) => {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      temperature: opts.temperature ?? 0,
      max_tokens: opts.maxTokens ?? 1400,
    };
    if (format) body.response_format = { type: "json_object" };
    const requestBody = JSON.stringify(body);
    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: requestBody,
      signal: AbortSignal.timeout(90_000),
    });
    const responseBody = await r.text();
    return { r, requestBody, responseBody };
  };
  let res = await attempt(true);
  if (res.r.status === 400 || res.r.status === 422) res = await attempt(false);
  if (!res.r.ok) throw new Error(`NEAR AI ${res.r.status}: ${res.responseBody.slice(0, 300)}`);
  const parsed = JSON.parse(res.responseBody) as { id: string; model?: string; choices: { message: { content: string | null; reasoning_content?: string } }[] };
  const content = parsed.choices?.[0]?.message?.content ?? "";
  return {
    data: extractJson<T>(content),
    content,
    chatId: parsed.id,
    model: parsed.model || model,
    latencyMs: Date.now() - started,
    requestBody: res.requestBody,
    responseBody: res.responseBody,
  };
}

/** The first JSON object in a reply, tolerating code fences and a thinking preamble. */
export function extractJson<T>(text: string): T {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "");
  const start = cleaned.indexOf("{");
  if (start < 0) throw new Error("no JSON object in the model's reply");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(cleaned.slice(start, i + 1)) as T;
  }
  throw new Error("unterminated JSON object in the model's reply");
}

/**
 * Fetch and check the TEE's signature over one completion. Signatures are kept per instance, so a lookup can miss
 * (404) when it lands on another instance: we try a few times and report what we could prove.
 */
export async function teeProof(result: Pick<ChatResult<unknown>, "chatId" | "model" | "requestBody" | "responseBody">): Promise<TeeProof> {
  const key = process.env.NEAR_AI_API_KEY;
  const proof: TeeProof = { chat_id: result.chatId, model: result.model, request_hash: sha256(result.requestBody), response_hash: sha256(result.responseBody) };
  if (!key) return { ...proof, error: "no NEAR AI key" };
  for (let i = 0; i < 3; i++) {
    try {
      const url = `${BASE}/signature/${encodeURIComponent(result.chatId)}?model=${encodeURIComponent(result.model)}&signing_algo=ecdsa`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) });
      if (r.status === 404) { await new Promise((ok) => setTimeout(ok, 800)); continue; }
      if (!r.ok) return { ...proof, error: `signature lookup ${r.status}` };
      const s = (await r.json()) as { text: string; signature: string; signing_address: string; signing_algo: string };
      let valid = false;
      try {
        const signer = await recoverMessageAddress({ message: s.text, signature: s.signature as `0x${string}` });
        valid = signer.toLowerCase() === s.signing_address.toLowerCase();
      } catch {
        valid = false;
      }
      const parts = s.text.split(":");
      const [reqHash, resHash] = parts.slice(-2);
      return {
        ...proof,
        signing_algo: s.signing_algo,
        signing_address: s.signing_address,
        text: s.text,
        signature: s.signature,
        signature_valid: valid,
        hashes_match: reqHash === proof.request_hash && resHash === proof.response_hash,
      };
    } catch (e) {
      return { ...proof, error: e instanceof Error ? e.message : "signature lookup failed" };
    }
  }
  return { ...proof, error: "signature not found on the instance that answered (NEAR AI keeps signatures per instance)" };
}
