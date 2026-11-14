"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconNext } from "@/components/kit/house-icons";
import { Puff } from "@/components/kit/Puff";
import { Skeleton } from "@/components/kit/Skeleton";
import { Tabs, type TabOption } from "@/components/kit/Tabs";
import { JudgmentRow } from "@/components/ui/Verdict";
import { useApi } from "@/lib/client";
import { agentName } from "@/lib/format";
import type { Judgment, Verdict } from "@/lib/types";

type Filter = "all" | Verdict;
const FILTERS: TabOption<Filter>[] = [
  { value: "all", label: "All" },
  { value: "BLOCK", label: "Blocked" },
  { value: "ESCALATE", label: "Escalated" },
  { value: "ALLOW", label: "Allowed" },
];

interface AgentRow { agent: string; judged: number; lessons: number; last_at: string | null }

/** Every proposal ChanceNear judged, newest first, fresh every few seconds. */
export default function Verdicts() {
  const [filter, setFilter] = useState<Filter>("all");
  const [agent, setAgent] = useState("");
  const [limit, setLimit] = useState(30);
  const [now, setNow] = useState(() => Date.now());
  const agents = useApi<{ data: AgentRow[] }>("/api/v1/agents", 15_000);
  const q = new URLSearchParams({ limit: String(limit) });
  if (filter !== "all") q.set("verdict", filter);
  if (agent) q.set("agent", agent);
  const list = useApi<{ data: Judgment[]; next_cursor: string | null }>(`/api/v1/judgments?${q}`, 5_000);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const rows = list.data?.data ?? [];

  return (
    <div className="lite-page">
      <header className="lite-page-head">
        <div>
          <h1 className="t-title">Verdicts</h1>
          <p className="t-line">Every action an agent proposed, and what the judge said before any funds moved.</p>
        </div>
      </header>

      <div className="filters">
        <Tabs label="Show" value={filter} options={FILTERS} onChange={(v) => { setFilter(v); setLimit(30); }} />
        <select className="select" aria-label="Agent" value={agent} onChange={(e) => { setAgent(e.target.value); setLimit(30); }}>
          <option value="">Every agent</option>
          {(agents.data?.data ?? []).map((a) => (
            <option key={a.agent} value={a.agent}>{agentName(a.agent)} ({a.judged})</option>
          ))}
        </select>
      </div>

      {list.loading && !list.data ? (
        <div className="group" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="row jrow" aria-hidden><Skeleton w={32} h={32} r={16} /><span className="row-text"><Skeleton w={280} h={15} /><Skeleton w={200} h={13} /></span></div>
          ))}
        </div>
      ) : rows.length ? (
        <>
          <div className="group">
            {rows.map((j) => <JudgmentRow key={j.id} j={j} now={now} />)}
          </div>
          {list.data?.next_cursor ? (
            <div className="list-more">
              <button type="button" className="pill pill-tone" onClick={() => setLimit((l) => l + 30)}>Show more</button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="lite-whole">
          <Puff who="chief" pose={list.error ? "oops" : "notebook"} size={120} />
          <p className="t-line">
            {list.error
              ? list.error
              : filter === "all" && !agent
                ? "Nothing judged yet."
                : "No verdicts match that."}
          </p>
          {!list.error && filter === "all" && !agent ? (
            <Link href="/try" className="text-action">Check a proposal<IconNext /></Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
