"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { IconBack, IconNext } from "@/components/kit/house-icons";
import { Puff } from "@/components/kit/Puff";
import { Skeleton } from "@/components/kit/Skeleton";
import { Code } from "@/components/ui/Code";
import { VerdictWord } from "@/components/ui/Verdict";
import { useApi } from "@/lib/client";
import { agentName, short, when } from "@/lib/format";
import { fmtUsd } from "@/lib/units";
import { CATEGORY_NAMES, type ContextItem, type Finding, type Judgment, type Lesson } from "@/lib/types";

const SEV_WORDS: Record<Finding["severity"], string> = { high: "Blocks", medium: "Holds for a person", low: "Noted" };
const ROLE_WORDS: Record<ContextItem["role"], string> = { user: "The user", assistant: "The agent", tool: "A tool result", web: "A web page", email: "An email", system: "System" };

/** The untrusted sentences a finding quoted, marked where they sit in what the agent read. */
function marked(text: string, needles: string[]): ReactNode {
  const ranges: [number, number][] = [];
  for (const raw of needles) {
    const n = raw.replace(/…$/, "").trim();
    if (n.length < 12) continue;
    let i = text.indexOf(n);
    while (i >= 0) {
      ranges.push([i, i + n.length]);
      i = text.indexOf(n, i + n.length);
    }
  }
  if (!ranges.length) return text;
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const lastR = merged[merged.length - 1];
    if (lastR && r[0] <= lastR[1]) lastR[1] = Math.max(lastR[1], r[1]);
    else merged.push([...r]);
  }
  const out: ReactNode[] = [];
  let at = 0;
  merged.forEach(([a, b], k) => {
    if (a > at) out.push(text.slice(at, a));
    out.push(<mark key={k}>{text.slice(a, b)}</mark>);
    at = b;
  });
  if (at < text.length) out.push(text.slice(at));
  return out;
}

const pctOf = (n: number | undefined) => (n == null ? "?" : `${Math.round(n * 100)}%`);

export default function VerdictPage() {
  const { id } = useParams<{ id: string }>();
  const j = useApi<Judgment>(id ? `/api/v1/judgments/${encodeURIComponent(id)}` : null, 8_000);
  const v = j.data;
  const pb = useApi<{ lessons: Lesson[] }>(v ? `/api/v1/agents/${encodeURIComponent(v.agent)}/playbook` : null);

  if (j.loading && !v) {
    return (
      <div className="lite-page" aria-busy>
        <Skeleton w={110} h={20} />
        <div className="v-head"><Skeleton w={120} h={120} r={60} /><span className="v-head-text"><Skeleton w={200} h={32} /><Skeleton w={420} h={18} /></span></div>
        <div className="v-pair"><Skeleton w="100%" h={160} r={26} /><Skeleton w="100%" h={160} r={26} /></div>
      </div>
    );
  }
  if (!v) {
    return (
      <div className="lite-page">
        <div className="lite-whole">
          <Puff who="chief" pose="shrug" size={120} />
          <p className="t-line">{j.error ?? "There's no verdict with that id."}</p>
          <Link href="/verdicts" className="text-action">All verdicts<IconNext /></Link>
        </div>
      </div>
    );
  }

  const lessons = pb.data?.lessons ?? [];
  const lessonOf = (lid: string) => lessons.find((l) => l.id === lid);
  const taught = v.lesson_id ? lessonOf(v.lesson_id) : undefined;
  const applied = v.lessons_applied.map((lid) => ({ id: lid, l: lessonOf(lid) }));
  const needles = v.findings.filter((f) => f.check === "injection" && f.evidence).map((f) => f.evidence as string);
  const tee = v.judge.tee;
  const pose = v.verdict === "ALLOW" ? "hello" : v.verdict === "ESCALATE" ? "phone" : "look";
  const ordered = [...v.findings].sort((a, b) => ["high", "medium", "low"].indexOf(a.severity) - ["high", "medium", "low"].indexOf(b.severity));

  return (
    <div className="lite-page">
      <Link href="/verdicts" className="text-action is-back is-quiet" style={{ alignSelf: "flex-start", marginLeft: -12 }}><IconBack />Verdicts</Link>

      <section className="v-head" aria-labelledby="verdict-word">
        <Puff who="guide" pose={pose} size={120} className="v-head-host" />
        <div className="v-head-text">
          <h1 id="verdict-word"><VerdictWord v={v.verdict} size="lg" /></h1>
          <p className="t-line">{v.summary}</p>
          <span className="v-meta">
            {agentName(v.agent)} · {when(v.created_at)} · {v.judge.engine === "near_ai" ? `NEAR AI Cloud, ${v.judge.model ?? "model"}` : "Rules only, no model key set"}
            {v.repeat ? " · repeated a mistake its playbook already covered" : ""}
          </span>
        </div>
      </section>

      <div className="v-pair">
        <section className="group" aria-labelledby="said">
          <h2 id="said" className="t-small">The user said</h2>
          <p className="v-said">{v.proposal.intent}</p>
          {v.proposal.mandate ? <p className="v-said-small">Standing rules: {v.proposal.mandate}</p> : null}
        </section>
        <section className="group" aria-labelledby="proposed">
          <h2 id="proposed" className="t-small">The agent proposed</h2>
          <p className="v-said">{v.resolved?.summary || v.proposal.action.type}</p>
          {v.proposal.reasoning ? <p className="v-said-small">Its reasoning: {v.proposal.reasoning}</p> : null}
          <Code label={`POST /v1/agents/{id}/${v.proposal.action.type === "limit_order" ? "limit-orders" : v.proposal.action.type}`}>{JSON.stringify(v.proposal.action.params, null, 2)}</Code>
        </section>
      </div>

      {ordered.length ? (
        <section className="lite-section" aria-labelledby="findings">
          <h2 id="findings" className="t-name">What the judge found</h2>
          <div className="group">
            {ordered.map((f, i) => (
              <div key={i} className="finding">
                <div className="finding-head">
                  <span className="t-label">{f.title}</span>
                  <span className={`finding-sev is-${f.severity}`}>{SEV_WORDS[f.severity]}</span>
                </div>
                <span className="t-small">{CATEGORY_NAMES[f.category] ?? f.category} · {f.detail}</span>
                {f.evidence ? (
                  <p className="evidence">
                    {f.evidence}
                    {f.source ? <small>From {f.source}</small> : null}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {v.proposal.context?.length ? (
        <section className="lite-section" aria-labelledby="context">
          <h2 id="context" className="t-name">What the agent read</h2>
          <div className="group">
            {v.proposal.context.map((c, i) => (
              <div key={i} className="ctx">
                <span className="ctx-who"><b>{ROLE_WORDS[c.role] ?? c.role}</b>{c.source ? `, ${c.source}` : ""}</span>
                <span className="ctx-body">{c.role === "user" ? c.content : marked(c.content, needles)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="v-two">
        <section className="lite-section" aria-labelledby="quote">
          <h2 id="quote" className="t-name">{v.quote?.source === "agent_api" ? "The Agent API's dry run" : v.quote?.source === "one_click" ? "A live NEAR Intents quote" : "What it's worth"}</h2>
          <div className="group">
            {v.quote ? (
              <dl className="facts">
                <dt>Source</dt><dd>{v.quote.source === "agent_api" ? "Agent API, dry: true" : v.quote.source === "one_click" ? "1Click, dry: true" : "Estimate from token prices"}</dd>
                <dt>Value</dt><dd>{fmtUsd(v.quote.amount_usd)}</dd>
                <dt>Fee</dt><dd>{v.quote.fee_usd != null ? `${fmtUsd(v.quote.fee_usd)}${v.quote.fee_percent != null ? `, ${v.quote.fee_percent.toFixed(2)}%` : ""}` : "None stated"}</dd>
                <dt>Warnings</dt><dd className="is-wrap">{v.quote.warnings.length ? v.quote.warnings.map((w) => w.code).join(", ") : "None"}</dd>
                {v.quote.error ? <><dt>Note</dt><dd className="is-wrap">{v.quote.error}</dd></> : null}
              </dl>
            ) : (
              <p className="t-small" style={{ padding: "12px 16px" }}>No quote for this kind of action.</p>
            )}
          </div>
        </section>
        <section className="lite-section" aria-labelledby="judge">
          <h2 id="judge" className="t-name">The judge</h2>
          <div className="group">
            <dl className="facts">
              <dt>Engine</dt><dd>{v.judge.engine === "near_ai" ? "NEAR AI Cloud" : "Rules"}</dd>
              {v.judge.model ? <><dt>Model</dt><dd className="is-wrap">{v.judge.model}</dd></> : null}
              <dt>Intent match</dt><dd>{pctOf(v.judge.intent_match)}</dd>
              <dt>Injection risk</dt><dd>{pctOf(v.judge.injection_risk)}</dd>
              <dt>Took</dt><dd>{(v.judge.latency_ms / 1000).toFixed(1)} s</dd>
              {tee ? (
                <>
                  <dt>TEE signature</dt>
                  <dd>{tee.signature_valid ? "Verified" : tee.error ? "Not available" : "Not verified"}</dd>
                  {tee.hashes_match != null ? <><dt>Request and reply hashes</dt><dd>{tee.hashes_match ? "Match" : "Differ"}</dd></> : null}
                  {tee.signing_address ? <><dt>Signed by</dt><dd><span className="mono" title={tee.signing_address}>{short(tee.signing_address, 8, 6)}</span></dd></> : null}
                </>
              ) : null}
            </dl>
          </div>
        </section>
      </div>

      {v.suggested ? (
        <section className="lite-section" aria-labelledby="fix">
          <h2 id="fix" className="t-name">{v.suggested.type === "refuse" ? "What the agent should do" : "The corrected action"}</h2>
          {v.suggested.type === "refuse" ? (
            <div className="group group-pad"><p className="t-body">{v.suggested.message}</p></div>
          ) : (
            <Code label={`${v.suggested.type.replace("_", " ")}, as the user asked`}>{JSON.stringify(v.suggested.params, null, 2)}</Code>
          )}
        </section>
      ) : null}

      {taught || applied.length ? (
        <section className="lite-section" aria-labelledby="lessons">
          <h2 id="lessons" className="t-name">Lessons</h2>
          <div className="group">
            {taught ? (
              <Link href={`/playbook?agent=${encodeURIComponent(v.agent)}#${taught.id}`} className="lesson-link">
                <span className="t-small">{v.repeat ? "Reinforced in the playbook" : "Taught to the playbook"}</span>
                <span className="lesson-rule">{taught.rule}</span>
              </Link>
            ) : null}
            {applied.map(({ id: lid, l }) => (
              <Link key={lid} href={`/playbook?agent=${encodeURIComponent(v.agent)}#${lid}`} className="lesson-link">
                <span className="t-small">Already in the playbook when the agent acted</span>
                <span className="lesson-rule">{l?.rule ?? lid}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="lite-section" aria-labelledby="record">
        <h2 id="record" className="t-name">The record</h2>
        <div className="group">
          <dl className="facts">
            <dt>Verdict id</dt><dd><span className="mono">{v.id}</span></dd>
            <dt>Verdict hash</dt><dd className="is-wrap"><span className="mono">sha256:{v.verdict_hash}</span></dd>
            {v.execution ? (
              <>
                <dt>NEAR Intents operation</dt><dd className="is-wrap"><span className="mono">{v.execution.correlation_id || "none"}</span></dd>
                <dt>Status</dt><dd>{v.execution.status}{v.execution.failure_code ? `, ${v.execution.failure_code}` : ""}</dd>
                {v.execution.reference ? <><dt>Reference on the receipt</dt><dd className="is-wrap"><span className="mono">{v.execution.reference}</span></dd></> : null}
                {v.execution.error ? <><dt>Note</dt><dd className="is-wrap">{v.execution.error}</dd></> : null}
              </>
            ) : (
              <><dt>Executed</dt><dd>{v.verdict === "ALLOW" ? "Checked only" : "No, nothing moved"}</dd></>
            )}
            {v.rehearsal ? <><dt>Rehearsal</dt><dd><Link className="link" href={`/rehearsal?id=${encodeURIComponent(v.rehearsal.id)}`}>Round {v.rehearsal.round}, {v.rehearsal.scenario}</Link></dd></> : null}
          </dl>
        </div>
      </section>
    </div>
  );
}
