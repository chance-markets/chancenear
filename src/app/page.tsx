"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconNext } from "@/components/kit/house-icons";
import { Puff } from "@/components/kit/Puff";
import { Skeleton } from "@/components/kit/Skeleton";
import { IconRounds } from "@/components/shell/lite-icons";
import { Columns } from "@/components/ui/Columns";
import { JudgmentRow } from "@/components/ui/Verdict";
import { api, useApi } from "@/lib/client";
import { plural } from "@/lib/format";
import { CATEGORY_NAMES, type Category, type Judgment, type Rehearsal, type Stats } from "@/lib/types";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** The four steps of the loop, each said by the puff who does it. */
const LOOP = [
  { who: "trader", pose: "asking", name: "The agent proposes", line: "One Agent API action, with the user's own words and everything it read." },
  { who: "guide", pose: "look", name: "Chance Lite judges", line: "Injection, intent, the Agent API's dry run and a NEAR AI model in a TEE." },
  { who: "scout", pose: "research", name: "Mistakes become lessons", line: "Every block is stored and written into that agent's playbook." },
  { who: "trader", pose: "cheer", name: "The agent stops repeating", line: "It reads the playbook before it acts, every session." },
] as const;

export default function Overview() {
  const router = useRouter();
  const stats = useApi<Stats>("/api/v1/stats", 10_000);
  const recent = useApi<{ data: Judgment[] }>("/api/v1/judgments?limit=6", 10_000);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState<string | null>(null);

  const s = stats.data;
  const curve = s?.curve ?? [];
  const first = curve[0];
  const last = curve[curve.length - 1];
  const learned = last?.lessons ?? s?.lessons.total ?? 0;

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setStartErr(null);
    try {
      const r = await api<{ rehearsal: Rehearsal }>("/api/v1/rehearsals", { body: { mode: "scripted", rounds: 3 } });
      router.push(`/rehearsal?id=${encodeURIComponent(r.rehearsal.id)}`);
    } catch (e) {
      setStartErr(e instanceof Error ? e.message : "Couldn't start it.");
      setStarting(false);
    }
  };

  const cats = Object.entries(s?.by_category ?? {}).filter(([, n]) => (n ?? 0) > 0).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)) as [Category, number][];
  const days = s?.timeline ?? [];

  return (
    <div className="lite">
      <section className="lite-hero" aria-labelledby="hero-label">
        <Puff who="scout" pose={curve.length > 1 && last.mistakes < first.mistakes ? "cheer" : "research"} size={132} className="lite-hero-host" />
        <div className="lite-hero-text">
          <span id="hero-label" className="lite-hero-label"><IconRounds />Practice agent&apos;s mistake rate</span>
          {stats.loading && !s ? (
            <span className="lite-figure"><Skeleton w={320} h={56} r={14} /><span className="sr-only">Reading the numbers</span></span>
          ) : first && last ? (
            <span className="lite-figure">{pct(first.mistakes, first.total)}% to {pct(last.mistakes, last.total)}%</span>
          ) : (
            <span className="lite-figure is-quiet">Learns from every block</span>
          )}
          <span className="lite-hero-sub">
            {first && last
              ? `Over ${plural(curve.length, "rehearsal round")}, with ${plural(learned, "lesson")} in its playbook and ${plural(s?.lessons.prevented ?? 0, "mistake")} prevented.`
              : "Run a rehearsal to watch an agent stop repeating its mistakes."}
          </span>
          {startErr ? <span className="field-note is-oops">{startErr}</span> : null}
        </div>
        <div className="lite-hero-actions">
          <button type="button" className="pill pill-ink" onClick={start} aria-busy={starting}>
            {starting ? <span className="spin" aria-hidden /> : null}
            {starting ? "Starting" : "Run a rehearsal"}
          </button>
          <Link href="/playbook" className="text-action">Open the playbook</Link>
        </div>
      </section>

      <ol className="lite-loop" aria-label="How Chance Lite learns">
        {LOOP.map((l) => (
          <li key={l.name}>
            <Puff who={l.who} pose={l.pose} size={96} />
            <span className="t-label">{l.name}</span>
            <span className="row-sub">{l.line}</span>
          </li>
        ))}
      </ol>

      <div className="lite-grid">
        <div className="group lite-chart">
          <Columns
            title="Mistakes per rehearsal round"
            sub={last ? `${plural(last.total, "scenario")} a round, the same traps each time` : undefined}
            data={curve.map((r) => ({ key: String(r.round), label: `Round ${r.round}`, value: r.mistakes, note: `of ${r.total}, ${plural(r.lessons, "lesson")} in the playbook` }))}
            max={last?.total}
            unit={["mistake", "mistakes"]}
            emptyLine="No rehearsal yet. Each round replays the same 10 scenarios; the playbook carries over."
          />
        </div>
        <div className="group lite-facts">
          <dl className="facts">
            <dt>Proposals judged</dt><dd>{s ? s.totals.judged.toLocaleString("en-US") : <Skeleton w={40} />}</dd>
            <dt>Blocked</dt><dd>{s ? s.totals.blocked.toLocaleString("en-US") : <Skeleton w={30} />}</dd>
            <dt>Escalated to a person</dt><dd>{s ? s.totals.escalated.toLocaleString("en-US") : <Skeleton w={30} />}</dd>
            <dt>Allowed</dt><dd>{s ? s.totals.allowed.toLocaleString("en-US") : <Skeleton w={30} />}</dd>
            <dt>Injections caught</dt><dd>{s ? s.totals.injections.toLocaleString("en-US") : <Skeleton w={30} />}</dd>
            <dt>Lessons learned</dt><dd>{s ? s.lessons.total.toLocaleString("en-US") : <Skeleton w={30} />}</dd>
            <dt>Mistakes prevented</dt><dd>{s ? s.lessons.prevented.toLocaleString("en-US") : <Skeleton w={30} />}</dd>
            <dt>Run on NEAR Intents</dt><dd>{s ? s.totals.executed.toLocaleString("en-US") : <Skeleton w={30} />}</dd>
          </dl>
          {stats.error && !s ? <p className="field-note is-oops">{stats.error}</p> : null}
        </div>
      </div>

      {days.length > 1 ? (
        <div className="group lite-chart">
          <Columns
            title="Repeat mistakes per day"
            sub="Mistakes a lesson already covered. They fall when agents load their playbook."
            data={days.map((d) => ({ key: d.day, label: new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: d.repeats, note: `${plural(d.mistakes, "mistake")} of ${d.judged} judged` }))}
            unit={["repeat", "repeats"]}
            xName="Day"
          />
        </div>
      ) : null}

      {cats.length ? (
        <section className="lite-section" aria-labelledby="cats">
          <h2 id="cats" className="t-name">What gets stopped</h2>
          <div className="group">
            {cats.map(([c, n]) => (
              <div key={c} className="row cat-row">
                <span className="row-text"><span className="row-name">{CATEGORY_NAMES[c] ?? c}</span></span>
                <span className="cat-bar" aria-hidden><span style={{ width: `${Math.max(3, (n / cats[0][1]) * 100)}%` }} /></span>
                <span className="row-value">{n}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="lite-section" aria-labelledby="recent">
        <div className="lite-section-head">
          <h2 id="recent" className="t-name">Latest verdicts</h2>
          <Link href="/verdicts" className="text-action">All verdicts<IconNext /></Link>
        </div>
        {recent.data?.data.length ? (
          <div className="group">
            {recent.data.data.map((j) => <JudgmentRow key={j.id} j={j} />)}
          </div>
        ) : recent.loading ? (
          <div className="group">
            {[0, 1, 2].map((i) => (
              <div key={i} className="row" aria-hidden><Skeleton w={32} h={32} r={16} /><span className="row-text"><Skeleton w={260} h={15} /><Skeleton w={180} h={13} /></span></div>
            ))}
          </div>
        ) : (
          <div className="group lite-empty-row">
            <p className="t-small">{recent.error ?? "Nothing judged yet. Try a proposal in the sandbox, or run a rehearsal."}</p>
            <Link href="/try" className="text-action">Try it<IconNext /></Link>
          </div>
        )}
      </section>
    </div>
  );
}
