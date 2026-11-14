"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useCallback, useEffect, useState } from "react";
import { Puff } from "@/components/kit/Puff";
import { IconCopy } from "@/components/kit/house-icons";

/**
 * Create the live NEAR agent from this page: a passkey on this site is its owner. Two signatures (agent_create, then
 * grant_issue), each after the Agent API's own preview and risk notice, then a Base address to fund it.
 */

interface Owner { credential_id: string; public_key: string; rp_id: string; origin: string }
interface Prepared { correlation_id: string; intent: { standard: string; payload: unknown }; preview?: { summary?: string } }
interface State { configured: boolean; agent_id: string | null; granted: boolean; owner: Owner | null }
interface Deposit { address: string | null; min_amount: string | null; expires_at: string | null; memo: string | null }

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const random = (n: number) => b64url(crypto.getRandomValues(new Uint8Array(n)));

async function post<T>(body: unknown): Promise<T> {
  const r = await fetch("/api/v1/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`);
  return j as T;
}

export function OwnerSetup() {
  const [state, setState] = useState<State | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [prepared, setPrepared] = useState<{ type: "agent_create" | "grant_issue"; p: Prepared } | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/v1/owner");
    const s = (await r.json()) as State;
    setState(s);
    if (s.owner && s.owner.origin === location.origin) setOwner(s.owner);
    else {
      try {
        const saved = localStorage.getItem("chance-lite-owner");
        const o = saved ? (JSON.parse(saved) as Owner) : null;
        if (o && o.origin === location.origin) setOwner(o);
      } catch {
        /* storage unavailable: register again */
      }
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };

  const register = () => run("Waiting for your passkey", async () => {
    if (location.protocol !== "https:") throw new Error("Passkey owners need this site on HTTPS. Open the deployed site to create the agent.");
    const r = await startRegistration({
      optionsJSON: {
        rp: { id: location.hostname, name: "Chance Lite" },
        user: { id: random(16), name: `chance-lite-owner-${new Date().toISOString().slice(0, 10)}`, displayName: "Chance Lite owner" },
        challenge: random(32),
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
        attestation: "none",
        timeout: 120000,
      },
    });
    if (!r.response.publicKey) throw new Error("This passkey didn't share its public key. Try another device or browser.");
    const o = { credential_id: r.id, public_key: r.response.publicKey, rp_id: location.hostname, origin: location.origin };
    try { localStorage.setItem("chance-lite-owner", JSON.stringify(o)); } catch { /* fine */ }
    setOwner(o);
  });

  const prepare = (type: "agent_create" | "grant_issue") => run("Preparing", async () => {
    const p = await post<Prepared>(type === "agent_create" ? { step: "create", owner } : { step: "grant" });
    setAgreed(false);
    setPrepared({ type, p });
  });

  const sign = () => run("Sign with your passkey, then wait for NEAR", async () => {
    if (!prepared) return;
    const credential = await startAuthentication({ optionsJSON: prepared.p.intent.payload as Parameters<typeof startAuthentication>[0]["optionsJSON"] });
    const res = await post<{ status: string; failure_code: string | null }>({ step: "submit", type: prepared.type, correlation_id: prepared.p.correlation_id, signed_data: { ...prepared.p.intent, credential } });
    if (res.status !== "SUCCESS") throw new Error(`The Agent API answered ${res.status}${res.failure_code ? ` (${res.failure_code})` : ""}.`);
    setPrepared(null);
    await load();
  });

  const fund = () => run("Asking for an address", async () => setDeposit(await post<Deposit>({ step: "deposit" })));

  if (!state) return <p className="t-small">Reading the agent&apos;s state</p>;
  if (!state.configured) return <p className="t-line">The server has no Agent API partner key yet, so there is nothing to create the agent with.</p>;

  const step = !state.agent_id ? (owner ? "create" : "passkey") : !state.granted ? "grant" : "done";

  return (
    <div className="owner">
      <ol className="owner-steps">
        <li data-done={owner ? true : undefined}>A passkey on this site becomes the owner</li>
        <li data-done={state.agent_id ? true : undefined}>The owner signs the agent&apos;s rules</li>
        <li data-done={state.granted ? true : undefined}>The owner lets Chance Lite act inside them</li>
        <li>Fund it with USDC on Base</li>
      </ol>

      {prepared ? (
        <div className="card-sunk owner-preview">
          <p className="t-label">{prepared.type === "agent_create" ? "You're about to create the agent" : "You're about to let Chance Lite act for it"}</p>
          <p className="owner-summary">{prepared.p.preview?.summary ?? "The Agent API sent no preview."}</p>
          <label className="owner-agree">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>I read this, including the risk notice and terms.</span>
          </label>
          <div className="actions">
            <button type="button" className="text-action is-quiet" onClick={() => setPrepared(null)} disabled={!!busy}>Cancel</button>
            <button type="button" className="pill pill-ink" onClick={sign} disabled={!agreed || !!busy} aria-busy={busy ? true : undefined}>
              {busy ? <span className="spin" aria-hidden /> : null}Sign with passkey
            </button>
          </div>
        </div>
      ) : step === "done" ? (
        <div className="owner-done">
          <Puff who="trader" pose="cheer" size={64} />
          <div>
            <p className="t-label">The agent is live</p>
            <p className="t-small owner-id">{state.agent_id}</p>
          </div>
        </div>
      ) : (
        <div className="actions owner-go">
          <button
            type="button"
            className="pill pill-ink"
            disabled={!!busy}
            aria-busy={busy ? true : undefined}
            onClick={step === "passkey" ? register : step === "create" ? () => prepare("agent_create") : () => prepare("grant_issue")}
          >
            {busy ? <span className="spin" aria-hidden /> : null}
            {step === "passkey" ? "Create owner passkey" : step === "create" ? "Create the agent" : "Issue the grant"}
          </button>
        </div>
      )}

      {state.agent_id ? (
        <div className="owner-fund">
          {deposit?.address ? (
            <div className="card-sunk">
              <p className="t-small">Send USDC on Base to</p>
              <p className="owner-address">{deposit.address}</p>
              <p className="t-small">
                {deposit.min_amount ? `At least ${Number(deposit.min_amount) / 1e6} USDC. ` : ""}
                {deposit.expires_at ? `Valid until ${new Date(deposit.expires_at).toLocaleString()}.` : ""}
              </p>
              <button type="button" className="text-action" onClick={() => { void navigator.clipboard.writeText(deposit.address!); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
                <IconCopy />{copied ? "Copied" : "Copy address"}
              </button>
            </div>
          ) : (
            <button type="button" className="pill pill-tone" onClick={fund} disabled={!!busy}>Get a Base deposit address</button>
          )}
        </div>
      ) : null}

      {busy ? <p className="say is-small" role="status">{busy}</p> : null}
      {error ? <p className="say is-small is-stop" role="alert">{error}</p> : null}
    </div>
  );
}
