"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { IconArrowDown } from "@/components/kit/house-icons";
import { Puff } from "@/components/kit/Puff";
import { Skeleton } from "@/components/kit/Skeleton";
import { Code } from "@/components/ui/Code";
import { useApi, useOrigin } from "@/lib/client";
import { agentName, plural } from "@/lib/format";
import { CATEGORY_NAMES, type Lesson } from "@/lib/types";

interface AgentRow { agent: string; judged: number; lessons: number; last_at: string | null }
interface Playbook { agent: string; revision: string | number; lessons: Lesson[]; markdown: string }

export default function PlaybookPage() {
  return (
    <Suspense fallback={<div className="lite-page" aria-busy><Skeleton w={200} h={32} /></div>}>
      <PlaybookView />
    </Suspense>
  );
}

function PlaybookView() {
  const params = useSearchParams();
  const origin = useOrigin();
  const agents = useApi<{ data: AgentRow[] }>("/api/v1/agents", 15_000);
  const [agent, setAgent] = useState<string>(params.get("agent") ?? "");
  const list = agents.data?.data ?? [];

  // With no agent named, open the one with the most lessons.
  useEffect(() => {
    if (agent || !list.length) return;
    const best = [...list].sort((a, b) => b.lessons - a.lessons)[0];
    setAgent(best?.agent ?? "demo-trader");
  }, [agent, list]);

  const shown = agent || (agents.loading ? "" : "demo-trader");
  const pb = useApi<Playbook>(shown ? `/api/v1/agents/${encodeURIComponent(shown)}/playbook` : null, 8_000);
  const lessons = pb.data?.lessons ?? [];
  const active = lessons.filter((l) => l.active);
  const prevented = lessons.reduce((t, l) => t + l.prevented, 0);
  const agentPath = `${origin}/api/v1/agents/${encodeURIComponent(shown || "demo-trader")}`;

  // Jump to a lesson named in the address once it's on screen.
  useEffect(() => {
    if (!lessons.length || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "center" });
  }, [lessons.length]);

  const hook = JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: "command", command: `curl -s ${agentPath}/playbook.md` }] }] } }, null, 2);
  const bot = [
    `const LITE = "${origin}";`,
    `const AGENT = "${shown || "demo-trader"}";`,
    ``,
    `// Once per session: the lessons go into the system prompt.`,
    `const playbook = await (await fetch(\`\${LITE}/api/v1/agents/\${AGENT}/playbook.md\`)).text();`,
    `const system = basePrompt + "\\n\\n" + playbook;`,
    ``,
    `// Before every Agent API call: ask first, act only on ALLOW.`,
    `const r = await fetch(\`\${LITE}/api/v1/check\`, {`,
    `  method: "POST",`,
    `  headers: { "content-type": "application/json" },`,
    `  body: JSON.stringify({ agent: AGENT, intent, action, context }),`,
    `});`,
    `const { judgment, lessons } = await r.json();`,
    `if (judgment.verdict !== "ALLOW") return { stop: judgment.summary, lessons };`,
  ].join("\n");

  return (
    <div className="lite-page">
      <header className="lite-page-head">
        <div>
          <h1 className="t-title">Playbook</h1>
          <p className="t-line">What each agent has learned. The judge writes a lesson from every mistake it stops, and the agent reads them before it acts.</p>
        </div>
        <select className="select" aria-label="Agent" value={shown} onChange={(e) => setAgent(e.target.value)}>
          {!list.some((a) => a.agent === shown) && shown ? <option value={shown}>{agentName(shown)}</option> : null}
          {list.map((a) => <option key={a.agent} value={a.agent}>{agentName(a.agent)} ({plural(a.lessons, "lesson")})</option>)}
        </select>
      </header>

      <div className="pb-grid">
        <section className="lite-section" aria-labelledby="lessons">
          <h2 id="lessons" className="t-name">
            {pb.data ? `${plural(active.length, "lesson")}${prevented ? `, ${plural(prevented, "mistake")} prevented` : ""}` : "Lessons"}
          </h2>
          {pb.loading && !pb.data ? (
            <div className="group" aria-busy>
              {[0, 1, 2].map((i) => <div key={i} className="lesson" aria-hidden><Skeleton w="80%" h={17} /><Skeleton w="60%" h={14} /></div>)}
            </div>
          ) : lessons.length ? (
            <div className="group">
              {lessons.map((l) => (
                <article key={l.id} id={l.id} className={l.active ? "lesson" : "lesson is-retired"}>
                  <span className="t-small">{l.title ?? CATEGORY_NAMES[l.category] ?? l.category}{l.active ? "" : ", retired"}</span>
                  <p className="lesson-rule">{l.rule}</p>
                  <p className="lesson-why">{l.why}</p>
                  {l.example ? (
                    <dl className="lesson-example">
                      <dt>Wrong</dt><dd>{l.example.bad}</dd>
                      <dt>Right</dt><dd>{l.example.good}</dd>
                    </dl>
                  ) : null}
                  <span className="lesson-meta">
                    <span>Caught <b>{l.hits}</b> {l.hits === 1 ? "time" : "times"}</span>
                    <span>Prevented <b>{l.prevented}</b></span>
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="group lite-whole" style={{ minHeight: 280 }}>
              <Puff who="scout" pose={pb.error ? "asking" : "idle"} size={120} />
              <p className="t-line">{pb.error ?? "No lessons yet. Every blocked action writes one."}</p>
            </div>
          )}
        </section>

        <aside className="lite-section how" aria-labelledby="how">
          <h2 id="how" className="t-name">How the agent reads it</h2>
          <div className="how-step">
            <p className="t-small">Every verdict already carries the lessons that bear on it. To load the whole playbook at the start of a session:</p>
            <Code label="Claude Code, .claude/settings.json" wrap>{hook}</Code>
          </div>
          <div className="how-step">
            <p className="t-small">Or connect Claude Code to ChanceNear over MCP: tools <b>check_action</b> and <b>get_playbook</b>.</p>
            <Code label="Terminal" wrap>{`claude mcp add --transport http chancenear ${origin}/api/mcp`}</Code>
          </div>
          <div className="how-step">
            <p className="t-small">Any other agent, a Grok bot for one: prepend the playbook, and check before every Agent API call.</p>
            <Code label="Your bot" wrap>{bot}</Code>
          </div>
        </aside>
      </div>

      <section className="lite-section" aria-labelledby="md">
        <h2 id="md" className="t-name">playbook.md, live</h2>
        {pb.data ? <Code label={`GET /api/v1/agents/${shown}/playbook.md`}>{pb.data.markdown || "(empty)"}</Code> : <Skeleton w="100%" h={140} r={18} />}
      </section>

      <section className="lite-section" aria-labelledby="export">
        <h2 id="export" className="t-name">Fine-tune export, optional</h2>
        <div className="group group-pad">
          <p className="t-body">
            For agents on open-weight models such as Kimi K3, Qwen or DeepSeek, the same records train the weights. SFT pairs each task with the right action; DPO pairs the
            blocked action (rejected) with the corrected one (chosen). Closed models like Claude or Grok can&apos;t be fine-tuned this way; they learn through the playbook.
          </p>
          <div className="export-row">
            <a className="pill pill-tone pill-sm" href={`/api/v1/agents/${encodeURIComponent(shown || "demo-trader")}/dataset.jsonl?format=sft`} download><IconArrowDown />SFT, JSONL</a>
            <a className="pill pill-tone pill-sm" href={`/api/v1/agents/${encodeURIComponent(shown || "demo-trader")}/dataset.jsonl?format=dpo`} download><IconArrowDown />DPO, JSONL</a>
          </div>
        </div>
      </section>
    </div>
  );
}
