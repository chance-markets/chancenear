"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconNext } from "@/components/kit/house-icons";
import { Puff } from "@/components/kit/Puff";
import { Tabs, type TabOption } from "@/components/kit/Tabs";
import { VerdictWord } from "@/components/ui/Verdict";
import { api } from "@/lib/client";
import { MANDATE, SCENARIOS, type Scenario } from "@/lib/scenarios";
import type { CheckResponse, ContextItem, ProposedAction } from "@/lib/types";

type Who = "careful" | "naive";
const WHO: TabOption<Who>[] = [
  { value: "naive", label: "Naive agent" },
  { value: "careful", label: "Careful agent" },
];

const pretty = (x: unknown) => JSON.stringify(x, null, 2);

function fill(s: Scenario, who: Who) {
  const action = who === "naive" && s.bad ? s.bad : s.good;
  // The user's own line is the intent; the rest of the context is what the agent read.
  const ctx = s.context.filter((c, i) => !(i === 0 && c.role === "user"));
  return { intent: s.intent, mandate: s.mandate ?? MANDATE, context: pretty(ctx), action: pretty(action) };
}

const SEV: Record<string, string> = { high: "Blocks", medium: "Holds", low: "Noted" };

export default function TryPage() {
  const [sid, setSid] = useState(SCENARIOS[1].id);
  const [who, setWho] = useState<Who>("naive");
  const scenario = SCENARIOS.find((s) => s.id === sid) ?? SCENARIOS[0];
  const [form, setForm] = useState(() => fill(scenario, "naive"));
  const [errs, setErrs] = useState<{ context?: string; action?: string; send?: string }>({});
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<CheckResponse | null>(null);
  const out = useRef<HTMLElement>(null);
  // A verdict lands where the reader is looking, however far down the form they pressed Check.
  useEffect(() => {
    if (res) out.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [res]);

  const pick = (id: string, w: Who) => {
    const s = SCENARIOS.find((x) => x.id === id) ?? SCENARIOS[0];
    const w2 = s.bad ? w : "careful";
    setSid(s.id);
    setWho(w2);
    setForm(fill(s, w2));
    setErrs({});
    setRes(null);
  };

  const check = async () => {
    if (busy) return;
    const next: typeof errs = {};
    let context: ContextItem[] = [];
    let action: ProposedAction | null = null;
    try {
      const c = form.context.trim() ? JSON.parse(form.context) : [];
      if (!Array.isArray(c)) throw new Error();
      context = c;
    } catch {
      next.context = "Context must be a JSON list of { role, source, content }.";
    }
    try {
      const a = JSON.parse(form.action);
      if (!a || typeof a.type !== "string" || typeof a.params !== "object") throw new Error();
      action = a;
    } catch {
      next.action = "The action must be JSON: { \"type\": \"swap\", \"params\": { ... } }.";
    }
    setErrs(next);
    if (next.context || next.action || !action) return;
    setBusy(true);
    try {
      const r = await api<CheckResponse>("/api/v1/check", {
        body: {
          agent: "sandbox",
          intent: form.intent,
          mandate: form.mandate || undefined,
          action,
          context: [{ role: "user", content: form.intent }, ...context],
          balances: scenario.balances,
        },
      });
      setRes(r);
    } catch (e) {
      setErrs({ send: e instanceof Error ? e.message : "Couldn't check it." });
    } finally {
      setBusy(false);
    }
  };

  const j = res?.judgment;
  const top = j ? [...j.findings].sort((a, b) => ["high", "medium", "low"].indexOf(a.severity) - ["high", "medium", "low"].indexOf(b.severity)).slice(0, 4) : [];

  return (
    <div className="lite-page">
      <header className="lite-page-head">
        <div>
          <h1 className="t-title">Try it</h1>
          <p className="t-line">Pick a situation, choose how careful the agent is, and see what the judge says before anything moves. Every field is yours to edit.</p>
        </div>
      </header>

      <div className="try-grid">
        <form className="group try-form" onSubmit={(e) => { e.preventDefault(); void check(); }}>
          <label className="field">
            <span className="field-label">Situation</span>
            <select className="select" value={sid} onChange={(e) => pick(e.target.value, who)}>
              {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>
          {scenario.bad ? (
            <div className="field">
              <span className="field-label">The agent</span>
              <Tabs label="The agent" value={who} options={WHO} onChange={(w) => pick(sid, w)} fill />
            </div>
          ) : (
            <p className="field-note">A clean case: a careful agent and a naive one propose the same thing.</p>
          )}
          <label className="field">
            <span className="field-label">The user said</span>
            <textarea className="textarea is-prose" value={form.intent} onChange={(e) => setForm({ ...form, intent: e.target.value })} rows={2} />
          </label>
          <label className="field">
            <span className="field-label">Standing rules</span>
            <textarea className="textarea is-prose" value={form.mandate} onChange={(e) => setForm({ ...form, mandate: e.target.value })} rows={3} />
          </label>
          <label className="field">
            <span className="field-label">What the agent read</span>
            <textarea className="textarea" value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} rows={8} spellCheck={false} />
            {errs.context ? <span className="field-note is-oops">{errs.context}</span> : null}
          </label>
          <label className="field">
            <span className="field-label">The action it proposes</span>
            <textarea className="textarea" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} rows={9} spellCheck={false} />
            {errs.action ? <span className="field-note is-oops">{errs.action}</span> : null}
          </label>
          <button type="submit" className="pill pill-ink" aria-busy={busy}>
            {busy ? <span className="spin" aria-hidden /> : null}
            {busy ? "Judging" : "Check it"}
          </button>
          {errs.send ? <p className="field-note is-oops">{errs.send}</p> : null}
        </form>

        <section ref={out} className="try-result" aria-live="polite" aria-label="Verdict">
          {j ? (
            <div className="group try-card">
              <VerdictWord v={j.verdict} size="lg" />
              <p className="t-line">{j.summary}</p>
              {top.length ? (
                <div className="group" style={{ background: "var(--color-surface-1)" }}>
                  {top.map((f, i) => (
                    <div key={i} className="finding">
                      <div className="finding-head">
                        <span className="t-label">{f.title}</span>
                        <span className={`finding-sev is-${f.severity}`}>{SEV[f.severity]}</span>
                      </div>
                      <span className="t-small">{f.detail}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {res?.lessons.length ? (
                <div className="lesson-link" style={{ padding: "4px 2px" }}>
                  <span className="t-small">{j.lesson_id ? "Lesson written to the sandbox playbook" : "From the sandbox playbook"}</span>
                  <span className="lesson-rule">{res.lessons[0].rule}</span>
                </div>
              ) : null}
              <Link href={`/verdicts/${j.id}`} className="text-action" style={{ alignSelf: "flex-start", marginLeft: -12 }}>
                The full verdict<IconNext />
              </Link>
            </div>
          ) : (
            <div className="group lite-whole try-wait">
              <Puff who="guide" pose={busy ? "thinking" : "idle"} size={120} />
              <p className="t-line">{busy ? "Judging the proposal." : "The verdict shows here."}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
