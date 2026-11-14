"use client";

import { IconUpRight } from "@/components/kit/house-icons";
import { OwnerSetup } from "@/components/owner/OwnerSetup";
import { Skeleton } from "@/components/kit/Skeleton";
import { Code } from "@/components/ui/Code";
import { useApi, useOrigin } from "@/lib/client";
import { short } from "@/lib/format";
import { fmtAmount, fmtUsd } from "@/lib/units";

interface Window_ { limit_usd?: string | number | null; spent_usd?: string | number | null; remaining_usd?: string | number | null; resets_at?: string | null }
interface Status {
  near_ai: { configured: boolean; model?: string; agent_model?: string };
  execution?: boolean;
  agent_api: {
    configured: boolean;
    grant?: boolean;
    error?: string;
    network: { network?: string; status?: { overall?: string } } | null;
    agent: { id: string; name?: string; status?: string; near_account_id?: string | null } | null;
    balances: { asset_id: string; symbol: string; amount: number | string; usd: number | null }[] | null;
    budget: { daily?: Window_ | null; weekly?: Window_ | null; monthly?: Window_ | null } | null;
  };
  store: "postgres" | "file";
  tokens: { live: boolean; count: number };
}

const num = (v: unknown) => (v == null || v === "" ? null : Number(v));

function Health({ ok, word, off }: { ok: boolean | null; word: string; off?: boolean }) {
  return <span className={`health ${off ? "is-off" : ok ? "is-ok" : "is-bad"}`}>{word}</span>;
}

export default function ConnectPage() {
  const origin = useOrigin();
  const st = useApi<Status>("/api/v1/status", 20_000);
  const s = st.data;
  const overall = s?.agent_api.network?.status?.overall;
  const daily = s?.agent_api.budget?.daily;

  const curl = [
    `curl -s ${origin}/api/v1/check \\`,
    `  -H 'content-type: application/json' \\`,
    `  -d '{`,
    `    "agent": "my-bot",`,
    `    "intent": "Swap 25 USDC for NEAR.",`,
    `    "action": {`,
    `      "type": "swap",`,
    `      "params": {`,
    `        "origin_asset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",`,
    `        "destination_asset": "nep141:wrap.near",`,
    `        "amount": "25000000000000000000"`,
    `      }`,
    `    }`,
    `  }'`,
  ].join("\n");

  return (
    <div className="lite-page">
      <header className="lite-page-head">
        <div>
          <h1 className="t-title">Connect</h1>
          <p className="t-line">Point an agent at ChanceNear before it calls the NEAR Intents Agent API. It answers ALLOW, BLOCK or ESCALATE, with the lessons to carry forward.</p>
        </div>
      </header>

      <section className="lite-section" aria-labelledby="status">
        <h2 id="status" className="t-name">This deployment</h2>
        <div className="group">
          {!s ? (
            [0, 1, 2].map((i) => <div key={i} className="row" aria-hidden><span className="row-text"><Skeleton w={200} h={15} /><Skeleton w={280} h={13} /></span></div>)
          ) : (
            <>
              <div className="row status-row">
                <span className="row-text">
                  <span className="row-name">NEAR AI Cloud, the judge</span>
                  <span className="row-sub is-wrap">{s.near_ai.configured ? `Judges with ${s.near_ai.model ?? "a TEE model"}; practice agent ${s.near_ai.agent_model ?? "not set"}` : "No key set: the rules judge alone"}</span>
                </span>
                <span className="row-end"><Health ok={s.near_ai.configured} off={!s.near_ai.configured} word={s.near_ai.configured ? "Ready" : "Not set"} /></span>
              </div>
              <div className="row status-row">
                <span className="row-text">
                  <span className="row-name">NEAR Intents Agent API</span>
                  <span className="row-sub is-wrap">{s.agent_api.configured ? `Dry-run quotes and executions${s.agent_api.network?.network ? ` on ${s.agent_api.network.network}` : ""}` : "No partner key set: quotes are estimated from public token prices"}</span>
                </span>
                <span className="row-end">
                  {overall ? <Health ok={overall === "operational"} word={overall === "operational" ? "Operational" : overall} /> : <Health ok={s.agent_api.configured} off={!s.agent_api.configured} word={s.agent_api.configured ? "Ready" : "Not set"} />}
                </span>
              </div>
              <div className="row status-row">
                <span className="row-text">
                  <span className="row-name">Executions</span>
                  <span className="row-sub is-wrap">
                    {s.execution
                      ? "An ALLOW runs through the Agent API under the owner's grant, with the verdict hash as its reference"
                      : s.agent_api.configured && !s.agent_api.grant
                        ? "No grant yet: verdicts are checks only until the owner issues one"
                        : "Checks only: nothing moves from this deployment"}
                    {s.agent_api.error ? ` · ${s.agent_api.error}` : ""}
                  </span>
                </span>
                <span className="row-end"><Health ok={!!s.execution} off={!s.execution} word={s.execution ? "On" : "Off"} /></span>
              </div>
              {s.agent_api.agent ? (
                <div className="row status-row">
                  <span className="row-text">
                    <span className="row-name">{s.agent_api.agent.name ?? "The demo agent"}</span>
                    <span className="row-sub is-wrap">
                      <span className="mono" title={s.agent_api.agent.id}>{short(s.agent_api.agent.id, 10, 6)}</span>
                      {s.agent_api.agent.near_account_id ? <> · <span className="mono">{short(s.agent_api.agent.near_account_id, 12, 8)}</span></> : null}
                    </span>
                  </span>
                  <span className="row-end"><Health ok={s.agent_api.agent.status === "ACTIVE"} word={s.agent_api.agent.status ?? "Unknown"} /></span>
                </div>
              ) : null}
              {s.agent_api.balances?.length ? (
                <div className="row status-row">
                  <span className="row-text">
                    <span className="row-name">Agent balance</span>
                    <span className="row-sub is-wrap">{s.agent_api.balances.map((b) => `${fmtAmount(Number(b.amount))} ${b.symbol}`).join(" · ")}</span>
                  </span>
                  <span className="row-end"><span className="row-value">{fmtUsd(s.agent_api.balances.reduce((t, b) => t + (b.usd ?? 0), 0))}</span></span>
                </div>
              ) : null}
              {daily && num(daily.limit_usd) != null ? (
                <div className="row status-row">
                  <span className="row-text">
                    <span className="row-name">Daily budget, set by the owner</span>
                    <span className="row-sub">{fmtUsd(num(daily.spent_usd) ?? 0)} spent of {fmtUsd(num(daily.limit_usd))}</span>
                  </span>
                  <span className="row-end"><span className="row-value">{fmtUsd(num(daily.remaining_usd))} left</span></span>
                </div>
              ) : null}
              <div className="row status-row">
                <span className="row-text">
                  <span className="row-name">Records</span>
                  <span className="row-sub is-wrap">{s.store === "postgres" ? "Postgres: every judgment and lesson" : "A local file: set DATABASE_URL for Postgres"} · token list {s.tokens.live ? "live" : "from the bundled snapshot"}, {s.tokens.count} assets</span>
                </span>
              </div>
            </>
          )}
          {st.error && !s ? <p className="field-note is-oops" style={{ padding: "8px 12px" }}>{st.error}</p> : null}
        </div>
      </section>

      <section className="lite-section" aria-labelledby="ask">
        <h2 id="ask" className="t-name">Ask before every action</h2>
        <p className="t-small is-lead">Send the exact Agent API body the agent is about to POST, with the user&apos;s own words. This one has the wrong decimals for USDC, so it comes back BLOCK.</p>
        <Code label="Check a proposal">{curl}</Code>
      </section>

      <section className="lite-section" aria-labelledby="tools">
        <h2 id="tools" className="t-name">For Claude Code and other MCP clients</h2>
        <Code label="Terminal">{`claude mcp add --transport http chancenear ${origin}/api/mcp`}</Code>
        <div className="export-row">
          <a className="text-action is-out" href="/skill.md">skill.md for agents<IconUpRight /></a>
          <a className="text-action is-out" href="/api/v1/agents/demo-trader/playbook.md">The demo agent&apos;s playbook.md<IconUpRight /></a>
        </div>
      </section>

      <section id="owner-setup" className="lite-section owner-setup" aria-labelledby="owner-setup-title">
        <h2 id="owner-setup-title" className="t-name">Create the NEAR agent</h2>
        <p className="t-small is-lead">The owner signs the agent&apos;s rules and one grant with a passkey; after that ChanceNear acts only inside those rules.</p>
        <OwnerSetup />
      </section>
    </div>
  );
}
