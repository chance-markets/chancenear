import type { ContextItem, Finding, Proposal } from "@/lib/types";

/**
 * Prompt-injection screening, before any model sees the proposal.
 *
 * Two different things, kept apart on purpose:
 * - exposure: something the agent read tried to give it orders. Recorded as evidence, never a block on its own: an
 *   agent that read an injected email and still paid exactly what the user asked did its job.
 * - taint: the action itself took its recipient, amount or kind from that untrusted text instead of from the user.
 *   That is the attack landing, and it blocks.
 * The user's own words are trusted; tool results, web pages and emails are not.
 */

const UNTRUSTED = new Set<ContextItem["role"]>(["tool", "web", "email"]);

interface Pattern { re: RegExp; weight: number; title: string }

const PATTERNS: Pattern[] = [
  { re: /ignore (?:all |any )?(?:the )?(?:previous|prior|above|earlier) (?:instructions|messages|rules|prompts?)/i, weight: 0.6, title: "tells the agent to ignore its instructions" },
  { re: /(?:disregard|forget|override) (?:all |your |the )?(?:previous |prior |earlier )?(?:instructions|rules|guidelines|system prompt)/i, weight: 0.6, title: "tells the agent to drop its rules" },
  { re: /\b(?:system|admin|developer|security) (?:notice|message|override|prompt|instruction|alert)s?\b/i, weight: 0.4, title: "poses as a system message" },
  { re: /\bnote to (?:the )?(?:ai|llm|agents?|assistants?|bots?)\b|\b(?:ai|llm) (?:payment |trading )?(?:assistants?|agents?)\s*:/i, weight: 0.5, title: "addresses the AI directly" },
  { re: /\bfor (?:trading |payment |ai )?agents?\s*:/i, weight: 0.45, title: "addresses the AI directly" },
  { re: /\b(?:do not|don't|never) (?:tell|mention|inform|alert|notify|show)\b[^.]{0,40}\b(?:user|owner|human|anyone)\b/i, weight: 0.5, title: "asks the agent to hide something from the user" },
  { re: /\b(?:send|transfer|withdraw|move)\b[^.]{0,20}\b(?:all|your full|your entire|the full|the entire|everything)\b/i, weight: 0.35, title: "asks to move the whole balance" },
  { re: /\b(?:you are now|new instructions|act as|from now on)\b/i, weight: 0.4, title: "tries to give the agent a new role" },
  { re: /\b(?:has moved|have moved|has changed|changed (?:our|the) (?:wallet|account|address)|new (?:wallet|account|address))\b/i, weight: 0.3, title: "claims the payee has changed" },
  { re: /[​-‏‪-‮⁠-⁤﻿]/, weight: 0.5, title: "hides characters" },
];

const HTML_COMMENT = /<!--([\s\S]*?)-->/g;
const IMPERATIVE = /\b(?:send|transfer|pay|withdraw|swap|sell|buy|move|approve|sign)\b/i;

export interface InjectionResult {
  /** 0..1: how hard the untrusted content pushed. */
  exposure: number;
  /** True when the action carries values or a kind that came from injected text. */
  tainted: boolean;
  risk: number;
  findings: Finding[];
  /** Untrusted sentences that read as instructions, for the UI to highlight. */
  spans: { source: string; text: string }[];
}

const clip = (s: string, n = 240) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** The sentence around a match, so evidence reads as the attacker wrote it. */
function sentenceAround(text: string, index: number): string {
  if (index < 0) return clip(text);
  const before = text.slice(0, index);
  const start = Math.max(before.lastIndexOf("\n") + 1, before.lastIndexOf(". ") + 2, before.lastIndexOf("<!--") >= 0 && before.lastIndexOf("<!--") > before.lastIndexOf("-->") ? before.lastIndexOf("<!--") + 4 : 0);
  const rest = text.slice(index);
  const stops = [rest.indexOf(". "), rest.indexOf("\n"), rest.indexOf("-->")].filter((e) => e >= 0);
  const end = stops.length ? index + Math.min(...stops) + 1 : text.length;
  return text.slice(start, end).replace(/-->$/, "").trim();
}

const numbersIn = (s: string) => [...s.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, ""))).filter((n) => n > 0);

export function scanInjection(p: Proposal, spendAmount?: number): InjectionResult {
  const findings: Finding[] = [];
  const spans: InjectionResult["spans"] = [];
  let exposure = 0;
  const untrusted = (p.context ?? []).filter((c) => UNTRUSTED.has(c.role));

  for (const item of untrusted) {
    const source = item.source || item.role;
    const hits: string[] = [];
    let weight = 0;
    let first: string | undefined;
    for (const pat of PATTERNS) {
      const m = pat.re.exec(item.content);
      if (!m) continue;
      weight += pat.weight;
      if (!hits.includes(pat.title)) hits.push(pat.title);
      const text = sentenceAround(item.content, m.index);
      first ??= text;
      if (!spans.some((s) => s.text === text)) spans.push({ source, text });
    }
    for (const c of item.content.matchAll(HTML_COMMENT)) {
      if (!IMPERATIVE.test(c[1])) continue;
      weight += 0.4;
      hits.push("hides orders in an HTML comment no person sees");
      const text = c[1].trim();
      first = text;
      if (!spans.some((s) => s.text === text)) spans.unshift({ source, text });
    }
    if (!hits.length) continue;
    exposure = Math.max(exposure, Math.min(1, weight));
    findings.push({
      check: "injection",
      category: "prompt_injection",
      severity: "low",
      title: `Injected instructions in ${source}`,
      detail: `This content ${hits.join(", ")}. Reading it is fine; acting on it is not.`,
      evidence: first ? clip(first) : undefined,
      source,
    });
  }

  let tainted = false;
  const flagged = spans.map((s) => s.text.toLowerCase());
  const params = p.action.params as Record<string, unknown>;
  const intent = p.intent.toLowerCase();
  const userText = (p.context ?? []).filter((c) => c.role === "user").map((c) => c.content.toLowerCase()).join("\n") + "\n" + intent;

  // Recipient: from the user, or from someone else's text?
  const recipient = typeof params.recipient === "string" ? params.recipient : undefined;
  if (recipient && !userText.includes(recipient.toLowerCase())) {
    const r = recipient.toLowerCase();
    const carrier = untrusted.find((c) => c.content.toLowerCase().includes(r));
    if (carrier) {
      const source = carrier.source || carrier.role;
      const fromFlagged = flagged.some((t) => t.includes(r));
      if (fromFlagged) tainted = true;
      findings.push({
        check: "injection",
        category: fromFlagged ? "prompt_injection" : "recipient_error",
        severity: fromFlagged ? "high" : "medium",
        title: fromFlagged ? "Pays the account the injected text named" : "Recipient taken from untrusted content",
        detail: `${recipient} appears in ${source}, not in anything the user said.`,
        evidence: clip(sentenceAround(carrier.content, carrier.content.toLowerCase().indexOf(r))),
        source,
      });
    }
  }

  // Amount: a number the injected text named and the user never did.
  if (spendAmount && spans.length) {
    const said = numbersIn(userText);
    const inFlagged = spans.find((s) => numbersIn(s.text).some((n) => Math.abs(n - spendAmount) / n < 0.005));
    if (inFlagged && !said.some((n) => Math.abs(n - spendAmount) / n < 0.005)) {
      tainted = true;
      findings.push({
        check: "injection",
        category: "prompt_injection",
        severity: "high",
        title: "Uses the amount the injected text asked for",
        detail: `The amount matches the one in ${inFlagged.source}; the user never said it.`,
        evidence: clip(inFlagged.text),
        source: inFlagged.source,
      });
    }
  }

  // A trade request that became a payout right after an instruction to pay out.
  const asksTrade = /\b(?:swap|trade|convert|exchange|sell|buy)\b/i.test(p.intent) && !/\b(?:send|pay|transfer|withdraw)\b/i.test(p.intent);
  if (asksTrade && (p.action.type === "transfer" || p.action.type === "withdraw") && spans.length) {
    tainted = true;
    findings.push({
      check: "injection",
      category: "prompt_injection",
      severity: "high",
      title: "Followed an order from untrusted content",
      detail: `The user asked for a trade; the agent proposes a ${p.action.type} right after ${spans[0].source} told it to.`,
      evidence: clip(spans[0].text),
      source: spans[0].source,
    });
  }

  return { exposure, tainted, risk: tainted ? Math.max(0.9, exposure) : exposure * 0.5, findings, spans };
}
