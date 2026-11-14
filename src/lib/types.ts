/**
 * The contract between an agent, ChanceNear and the NEAR Intents Agent API.
 *
 * An agent proposes one Agent API action (the exact body it would send), together with the user's own words and what
 * it read on the way. ChanceNear judges it before any funds move and answers ALLOW, BLOCK or ESCALATE. Every judgment
 * is stored; every mistake becomes a lesson the agent reads back before its next action.
 */

export type ActionType = "swap" | "transfer" | "withdraw" | "limit_order";
export type Verdict = "ALLOW" | "BLOCK" | "ESCALATE";

/** What went wrong, in the words an agent can learn from. */
export type Category =
  | "prompt_injection" // instructions from untrusted content steered the action
  | "intent_mismatch" // the action does something other than what the user asked
  | "amount_error" // wrong size, wrong decimals, wrong share of a balance
  | "asset_error" // wrong token, or the right token on the wrong chain
  | "recipient_error" // a payee the user never named (including lookalikes)
  | "policy_violation" // the Agent API's own dry run says the policy or budget would refuse
  | "excessive_cost"; // fee or slippage far above what the user would accept

export const CATEGORY_NAMES: Record<Category, string> = {
  prompt_injection: "Prompt injection",
  intent_mismatch: "Intent mismatch",
  amount_error: "Wrong amount",
  asset_error: "Wrong asset or chain",
  recipient_error: "Unknown recipient",
  policy_violation: "Policy refusal",
  excessive_cost: "Excessive cost",
};

/** Something the agent read before proposing: the user, its own notes, a tool result, a web page, an email. */
export interface ContextItem {
  role: "user" | "assistant" | "tool" | "web" | "email" | "system";
  source?: string;
  content: string;
}

/** One proposed Agent API action. `params` is exactly the JSON body the agent would POST. */
export interface ProposedAction {
  type: ActionType;
  params: Record<string, unknown>;
}

export interface Proposal {
  /** ChanceNear agent id (a slug). Lessons and stats are kept per agent. */
  agent: string;
  /** The user's own instruction, verbatim. The judge holds the action to this. */
  intent: string;
  /** Standing rules the owner gave the agent, if any. */
  mandate?: string;
  action: ProposedAction;
  /** What the agent read on the way: the judge looks here for injected instructions and for where values came from. */
  context?: ContextItem[];
  /** The agent's own words for why. */
  reasoning?: string;
  /** Balances the agent believes it holds, by asset id, in atomic units (optional; read live when keys are set). */
  balances?: Record<string, string>;
}

export interface Finding {
  check: "injection" | "intent" | "quote" | "judge";
  category: Category;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  /** The exact text that triggered it, when there is one. */
  evidence?: string;
  /** Where the evidence came from (a context item's source). */
  source?: string;
}

/** An asset as the Agent API's public token list knows it. */
export interface AssetRef {
  asset_id: string;
  symbol: string;
  chain: string;
  decimals: number;
  price: number | null;
}

/** The action translated into human terms, so a person and the judge read the same thing. */
export interface Resolved {
  summary: string;
  spend?: { asset: AssetRef; atomic: string; amount: number; usd: number | null };
  receive?: { asset: AssetRef; amount: number | null };
  recipient?: string;
  chain?: string;
  side?: "buy" | "sell";
  price?: number;
}

/** The Agent API's own `dry: true` answer (or a local estimate when no partner key is set). */
export interface QuoteFacts {
  /** agent_api: the Agent API's own dry run; one_click: a dry 1Click quote (the engine Agent API swaps route through). */
  source: "agent_api" | "one_click" | "estimate";
  amount_usd: number | null;
  fee_usd: number | null;
  fee_percent: number | null;
  warnings: { code: string; detail?: string }[];
  amount_out?: string | null;
  error?: string;
}

/** Proof that the verdict came out of a TEE on NEAR AI Cloud. */
export interface TeeProof {
  chat_id: string;
  model: string;
  signing_algo?: string;
  signing_address?: string;
  text?: string;
  signature?: string;
  /** EIP-191 signer recovered from `text` and `signature` equals `signing_address`. */
  signature_valid?: boolean;
  /** sha256 of the exact request and response bodies, matched against `text`. */
  request_hash?: string;
  response_hash?: string;
  hashes_match?: boolean;
  error?: string;
}

export interface JudgeTrace {
  engine: "near_ai" | "rules";
  model?: string;
  latency_ms: number;
  intent_match: number; // 0..1, how well the action matches the user's words
  injection_risk: number; // 0..1
  reasoning?: string;
  tee?: TeeProof;
}

export interface Execution {
  correlation_id: string;
  status: string;
  failure_code?: string | null;
  error?: string;
  reference?: string;
  updated_at: string;
}

export interface Judgment {
  id: string;
  created_at: string;
  agent: string;
  proposal: Proposal;
  resolved: Resolved;
  verdict: Verdict;
  summary: string;
  findings: Finding[];
  quote?: QuoteFacts;
  judge: JudgeTrace;
  /** The corrected action, when the judge can name it; the "chosen" side of a fine-tune pair. */
  suggested?: ProposedAction | { type: "refuse"; message: string };
  /** Lessons that were in the agent's playbook and bear on this action. */
  lessons_applied: string[];
  /** The lesson this judgment taught (new or reinforced). */
  lesson_id?: string;
  /** A mistake the agent had already been taught: its playbook covered it and it did it anyway. */
  repeat?: boolean;
  /** sha256 over the canonical verdict record; sent to the Agent API as `reference` so its receipts carry it. */
  verdict_hash: string;
  execution?: Execution;
  /** Set when the judgment came from a rehearsal round. */
  rehearsal?: { id: string; round: number; scenario: string };
}

export interface Lesson {
  id: string;
  agent: string;
  category: Category;
  /** Dedupe key: one lesson per kind of mistake per agent. */
  key: string;
  /** A short name for the kind of mistake, e.g. "Token decimals". */
  title?: string;
  /** One imperative sentence the agent reads before acting. */
  rule: string;
  /** Why, in one or two sentences. */
  why: string;
  example?: { bad: string; good: string };
  created_at: string;
  updated_at: string;
  source_judgment: string;
  /** Times this mistake was caught. */
  hits: number;
  /** Times an agent carrying this lesson got the same kind of action right. */
  prevented: number;
  active: boolean;
}

export interface RoundResult {
  round: number;
  playbook: boolean;
  total: number;
  mistakes: number;
  allowed: number;
  escalated: number;
  lessons: number;
  by_category: Partial<Record<Category, number>>;
  scenarios: { id: string; verdict: Verdict; mistake: boolean; judgment_id: string; category?: Category }[];
}

export interface Rehearsal {
  id: string;
  agent: string;
  /** live: a NEAR AI model plays the agent; scripted: a deterministic agent with known flaws (offline, reproducible). */
  mode: "live" | "scripted";
  agent_model?: string;
  status: "running" | "done" | "failed";
  started_at: string;
  finished_at?: string;
  rounds: RoundResult[];
  error?: string;
}

export interface Stats {
  agent?: string;
  totals: { judged: number; allowed: number; blocked: number; escalated: number; injections: number; executed: number };
  lessons: { total: number; prevented: number };
  by_category: Partial<Record<Category, number>>;
  /** Judgments per day with how many were mistakes and how many repeated a mistake a lesson already covered. */
  timeline: { day: string; judged: number; mistakes: number; repeats: number }[];
  /** The latest rehearsal per agent, for the learning curve. */
  curve?: RoundResult[];
}

/** What the API answers to a proposal: the judgment plus the lessons the agent should carry into its next try. */
export interface CheckResponse {
  judgment: Judgment;
  lessons: Pick<Lesson, "id" | "category" | "rule" | "why">[];
  playbook_url: string;
}
