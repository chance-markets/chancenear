"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { IconCheck, IconClose, IconUpRight } from "@/components/kit/house-icons";
import { Puff } from "@/components/kit/Puff";
import { Skeleton } from "@/components/kit/Skeleton";
import { Columns } from "@/components/ui/Columns";
import { useApi } from "@/lib/client";
import { ago, plural } from "@/lib/format";
import { SCENARIOS } from "@/lib/scenarios";
import type { Rehearsal, RoundResult } from "@/lib/types";


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
  const params = useSearchParams();
  const status = useApi<Status>("/api/v1/status");
  const past = useApi<{ data: Rehearsal[] }>("/api/v1/rehearsals", 10_000);

  // The showcased live run first (a NEAR AI model as the agent), else the latest run of any kind.
  const showcase = past.data?.data.find((x) => x.mode === "live" && x.status === "done");
  const id = params.get("id") ?? showcase?.id ?? past.data?.data[0]?.id ?? null;
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

      <p className="t-small rh-note">
        This is the sample run{r?.mode === "live" ? `: ${r.agent_model ?? "a NEAR AI model"} played the agent and NEAR AI judged, on a fresh playbook` : ""}. New rehearsals are run by the operator only, so
        visitors can&apos;t drain the AI credits. To run your own, clone the repo and run <code>npm run demo</code> (free, offline) or{" "}
        <code>npm run demo -- --live</code> with your own NEAR AI key.
      </p>

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
                      ? `${plural(first.mistakes, "mistake")} in round 1, ${last.mistakes} in round ${last.round}`
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

    </div>
  );
}
