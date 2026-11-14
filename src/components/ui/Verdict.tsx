import Link from "next/link";
import { IconCheck, IconClose, IconNext, IconUpRight } from "@/components/kit/house-icons";
import { Puff, type Who } from "@/components/kit/Puff";
import { agentName, ago, VERDICT_WORDS, verdictTone } from "@/lib/format";
import { cx } from "@/lib/cx";
import type { Judgment, Verdict } from "@/lib/types";

/** A verdict in words, in its tone, with its mark: a tick, a cross, or up to a person. Never a chip. */
export function VerdictWord({ v, size = "md" }: { v: Verdict; size?: "md" | "lg" }) {
  const Icon = v === "ALLOW" ? IconCheck : v === "BLOCK" ? IconClose : IconUpRight;
  return (
    <span className={cx("verdict", verdictTone(v), size === "lg" && "is-lg")}>
      <Icon />
      {VERDICT_WORDS[v]}
    </span>
  );
}

/** Who acted, as a puff: the demo trader, a practice agent (Scout), or the sandbox (Chief). */
export function agentPuff(agent: string): Who {
  if (agent.startsWith("practice")) return "scout";
  if (agent === "sandbox") return "chief";
  return "trader";
}

export function JudgmentRow({ j, now }: { j: Judgment; now?: number }) {
  const name = j.resolved?.summary || `${j.proposal.action.type} proposal`;
  // When the judge only restates the action, the user's own words say more.
  const sub = j.summary && !j.summary.includes(name) ? j.summary : `The user said: ${j.proposal.intent}`;
  return (
    <Link href={`/verdicts/${j.id}`} className="row jrow">
      <span className="row-mark"><Puff who={agentPuff(j.agent)} size={32} /></span>
      <span className="row-text">
        <span className="row-name">{name}</span>
        <span className="row-sub">{sub}</span>
      </span>
      <span className="row-end">
        <span className="jrow-meta">
          <VerdictWord v={j.verdict} />
          <span className="jrow-when">{agentName(j.agent)} · {ago(j.created_at, now)}</span>
        </span>
        <IconNext className="row-chev" />
      </span>
    </Link>
  );
}
