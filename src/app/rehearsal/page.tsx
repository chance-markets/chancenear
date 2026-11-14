"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { IconCheck, IconClose, IconUpRight } from "@/components/kit/house-icons";
import { Puff } from "@/components/kit/Puff";
import { Skeleton } from "@/components/kit/Skeleton";
import { Tabs, type TabOption } from "@/components/kit/Tabs";
import { Columns } from "@/components/ui/Columns";
import { api, useApi } from "@/lib/client";
import { ago, plural } from "@/lib/format";
import { SCENARIOS } from "@/lib/scenarios";
import type { Rehearsal, RoundResult } from "@/lib/types";

type Mode = "scripted" | "live";
type Rounds = "2" | "3" | "4" | "5";
const ROUNDS: TabOption<Rounds>[] = (["2", "3", "4", "5"] as const).map((r) => ({ value: r, label: r }));

interface Status { near_ai: { configured: boolean; model?: string; agent_model?: string } }

export default function RehearsalPage() {
  return (
    <Suspense fallback={<div className="lite-page" aria-busy><Skeleton w={200} h={32} /></div>}>
      <RehearsalView />
    </Suspense>
  );
}

const scenarioTitle = (id: string) => SCENARIOS.find((s) => s.id === id)?.title ?? id;

function RehearsalView() {
  const router = useRouter();
  const params = useSearchParams();
  const status = useApi<Status>("/api/v1/status");
  const past = useApi<{ data: Rehearsal[] }>("/api/v1/rehearsals", 10_000);
  const [mode, setMode] = useState<Mode>("scripted");
  const [rounds, setRounds] = useState<Rounds>("3");
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const id = params.get("id") ?? past.data?.data[0]?.id ?? null;
  const [running, setRunning] = useState(true);
  const one = useApi<Rehearsal>(id ? `/api/v1/rehearsals/${encodeURIComponent(id)}` : null, running ? 1_500 : undefined);
  const r = one.data;
  useEffect(() => {
    if (r) setRunning(r.status === "running");
  }, [r]);
  useEffect(() => {
    if (r && r.status !== "running") past.reload();
    // Reload the list once when a run ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.status]);

  const live = status.data?.near_ai.configured ?? false;
  const modes: TabOption<Mode>[] = [
    { value: "scripted", label: "Scripted" },
    { value: "live", label: "Live" },
  ];

  const start = async () => {
    if (starting) return;
    if (mode === "live" && !live) return;
    setStarting(true);
    setErr(null);
    try {
      const res = await api<{ rehearsal: Rehearsal }>("/api/v1/rehearsals", { body: { mode, rounds: Number(rounds) } });
      setRunning(true);
      router.push(`/rehearsal?id=${encodeURIComponent(res.rehearsal.id)}`);
      past.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't start it.");
    } finally {
      setStarting(false);
    }
  };

  const done: RoundResult[] = r?.rounds ?? [];
  const scenarioIds = useMemo(() => {
    const ids: string[] = [];
    for (const rr of done) for (const s of rr.scenarios) if (!ids.includes(s.id)) ids.push(s.id);
    return ids;
  }, [done]);
  const first = done[0];
  const last = done[done.length - 1];

  return (
    <div className="lite-page">
      <header className="lite-page-head">
        <div>
          <h1 className="t-title">Rehearsal</h1>
          <p className="t-line">A practice agent works through the same {SCENARIOS.length} scenarios, round after round. Its playbook starts empty and carries over, so the rounds show whether it learns.</p>
        </div>
      </header>

      <section className="group rh-controls" aria-label="Run a rehearsal">
        <div className="rh-fields">
          <div className="field">
            <span className="field-label">Who plays the agent</span>
            <Tabs label="Who plays the agent" value={mode} options={modes} onChange={setMode} />
          </div>
          <div className="field">
            <span className="field-label">Rounds</span>
            <Tabs label="Rounds" value={rounds} options={ROUNDS} onChange={setRounds} />
          </div>
        </div>
        <button type="button" className="pill pill-ink" onClick={start} aria-busy={starting} disabled={(mode === "live" && !live) || running && r?.status === "running"}>
          {starting ? <span className="spin" aria-hidden /> : null}
          {r?.status === "running" ? "Running" : starting ? "Starting" : "Run a rehearsal"}
        </button>
        <p className={err ? "field-note is-oops" : "field-note"}>
          {err ??
            (mode === "scripted"
              ? "Scripted: a deterministic agent with eight known flaws. Offline and reproducible; the verdicts are real."
              : live
                ? `Live: ${status.data?.near_ai.agent_model ?? "a NEAR AI model"} plays the agent; the judge runs on NEAR AI too. Takes a minute or two.`
                : "Live needs a NEAR AI key on the server. Scripted runs without one.")}
        </p>
      </section>

      {!id && !past.loading ? (
        <div className="lite-whole">
          <Puff who="scout" pose="idle" size={120} />
          <p className="t-line">No rehearsal yet. Run one to see the mistakes fall round by round.</p>
        </div>
      ) : one.loading && !r ? (
        <Skeleton w="100%" h={260} r={26} />
      ) : r ? (
        <>
          <div className="group rh-progress" role="status">
            <Puff who="scout" pose={r.status === "running" ? "research" : r.status === "failed" ? "asking" : "cheer"} size={64} />
            <div className="row-text">
              <span className="row-name">
                {r.status === "running"
                  ? `Round ${done.length + 1} is running`
                  : r.status === "failed"
                    ? "This rehearsal stopped"
                    : first && last
                      ? `${first.mistakes} mistakes in round 1, ${last.mistakes} in round ${last.round}`
                      : "Done"}
              </span>
              <span className="t-small">
                {r.status === "failed"
                  ? r.error ?? "Something went wrong."
                  : `${r.mode === "live" ? `Live, ${r.agent_model ?? "NEAR AI"} as the agent` : "Scripted agent"} · started ${ago(r.started_at)} · ${plural(done.length, "round")} done${last ? ` · ${plural(last.lessons, "lesson")} learned` : ""}`}
              </span>
            </div>
          </div>

          <div className="rh-charts">
            <div className="group lite-chart">
              <Columns
                title="Mistakes per round"
                sub="Blocked or escalated proposals"
                data={done.map((x) => ({ key: String(x.round), label: `Round ${x.round}`, value: x.mistakes, note: `of ${x.total}` }))}
                max={last?.total}
                unit={["mistake", "mistakes"]}
                emptyLine="The first round is running."
              />
            </div>
            <div className="group lite-chart">
              <Columns
                title="Lessons in the playbook"
                sub="At the end of each round"
                data={done.map((x) => ({ key: String(x.round), label: `Round ${x.round}`, value: x.lessons }))}
                unit={["lesson", "lessons"]}
                emptyLine="Lessons appear as soon as a mistake is caught."
              />
            </div>
          </div>

          {scenarioIds.length ? (
            <section className="lite-section" aria-labelledby="matrix">
              <h2 id="matrix" className="t-name">Every scenario, every round</h2>
              <div className="matrix-wrap">
                <table className="matrix">
                  <thead>
                    <tr>
                      <th scope="col">Scenario</th>
                      {done.map((x) => <th key={x.round} scope="col">Round {x.round}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioIds.map((sid) => (
                      <tr key={sid}>
                        <th scope="row">{scenarioTitle(sid)}<small>{sid}</small></th>
                        {done.map((x) => {
                          const c = x.scenarios.find((s) => s.id === sid);
                          if (!c) return <td key={x.round} />;
                          const held = c.mistake && c.verdict === "ESCALATE";
                          const Icon = !c.mistake ? IconCheck : held ? IconUpRight : IconClose;
                          return (
                            <td key={x.round}>
                              <Link href={`/verdicts/${c.judgment_id}`} className={`cell-link ${!c.mistake ? "is-right" : held ? "is-held" : "is-wrong"}`}>
                                <Icon />
                                {!c.mistake ? "Right" : held ? "Held" : "Mistake"}
                              </Link>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {past.data?.data.length ? (
        <section className="lite-section" aria-labelledby="past">
          <h2 id="past" className="t-name">Earlier rehearsals</h2>
          <div className="group">
            {past.data.data.slice(0, 8).map((p) => {
              const f = p.rounds[0];
              const l = p.rounds[p.rounds.length - 1];
              return (
                <Link key={p.id} href={`/rehearsal?id=${encodeURIComponent(p.id)}`} className="row" aria-current={p.id === id ? "true" : undefined} onClick={() => setRunning(true)}>
                  <span className="row-mark"><Puff who="scout" size={32} /></span>
                  <span className="row-text">
                    <span className="row-name">{p.mode === "live" ? `Live, ${p.agent_model ?? "NEAR AI"}` : "Scripted agent"}</span>
                    <span className="row-sub">{ago(p.started_at)} · {p.status === "running" ? "running" : p.status === "failed" ? "stopped" : plural(p.rounds.length, "round")}</span>
                  </span>
                  <span className="row-end">
                    <span className="row-value">{f && l ? `${f.mistakes} to ${l.mistakes}` : ""}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
