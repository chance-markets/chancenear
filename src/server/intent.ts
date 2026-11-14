import { ASSETS, chainName } from "@/lib/assets";
import { fmtAmount, fmtUsd, fromAtomic, toAtomic } from "@/lib/units";
import type { AssetRef, Finding, Proposal, ProposedAction } from "@/lib/types";

/**
 * Deterministic intent checks: read the user's own words (amounts, fractions, tokens, recipients, chain, side, price)
 * and hold the proposed action to them. No model involved, so these run offline and can't be argued with: a model can
 * add doubts on top, never lift one of these.
 */

const SYMBOLS: Record<string, string> = {
  usdc: "USDC", usdt: "USDT", near: "NEAR", wnear: "NEAR", eth: "ETH", ether: "ETH", weth: "ETH", btc: "BTC", bitcoin: "BTC", wbtc: "BTC", sol: "SOL",
};
export const canon = (sym: string) => SYMBOLS[sym.toLowerCase()] ?? sym.toUpperCase();
const SYM_RE = "usdc|usdt|wnear|near|eth|ether|weth|btc|bitcoin|wbtc|sol";

const CHAINS: Record<string, string> = {
  base: "base", arbitrum: "arb", ethereum: "eth", mainnet: "eth", solana: "sol", polygon: "pol", optimism: "op",
  bsc: "bsc", "bnb chain": "bsc", bnb: "bsc", avalanche: "avax", near: "near",
};

export interface ParsedIntent {
  kind: "swap" | "limit_order" | "pay" | "withdraw" | "unknown";
  amounts: { value: number; symbol: string; usd: boolean }[];
  fraction?: { value: number; word: string; symbol?: string };
  sells?: string;
  buys?: string;
  recipients: string[];
  chain?: string;
  price?: number;
}

const num = (s: string) => Number(s.replace(/,/g, ""));

export function parseIntent(text: string): ParsedIntent {
  const t = text.trim();
  const lower = t.toLowerCase();
  let kind: ParsedIntent["kind"] = "unknown";
  if (/limit order|if (?:the )?price (?:drops|falls|dips|rises|reaches|hits|goes)|when (?:the )?price/.test(lower)) kind = "limit_order";
  else if (/\b(?:withdraw|cash out|bridge)\b|\bto my \w+ (?:wallet|address)\b/.test(lower)) kind = "withdraw";
  else if (/\b(?:send|pay|transfer|tip|reimburse)\b/.test(lower)) kind = "pay";
  else if (/\b(?:swap|trade|convert|exchange|sell|buy|put|invest)\b/.test(lower)) kind = "swap";

  const recipients = new Set<string>();
  for (const m of t.matchAll(/\b0x[a-fA-F0-9]{40}\b/g)) recipients.add(m[0].toLowerCase());
  for (const m of lower.matchAll(/\b(?:[a-z0-9_-]+\.)+(?:near|tg)\b/g)) recipients.add(m[0]);
  for (const m of lower.matchAll(/\b[0-9a-f]{64}\b/g)) recipients.add(m[0]);

  const amounts: ParsedIntent["amounts"] = [];
  for (const m of lower.matchAll(new RegExp(`\\$\\s?([\\d,]+(?:\\.\\d+)?)\\s+(?:of|in|worth of)\\s+(?:my\\s+)?(${SYM_RE})\\b`, "g"))) {
    amounts.push({ value: num(m[1]), symbol: canon(m[2]), usd: true });
  }
  for (const m of lower.matchAll(new RegExp(`(?<![\\w$.])([\\d,]+(?:\\.\\d+)?)\\s*(${SYM_RE})\\b`, "g"))) {
    amounts.push({ value: num(m[1]), symbol: canon(m[2]), usd: false });
  }

  let fraction: ParsedIntent["fraction"];
  const fm = lower.match(new RegExp(`\\b(half|a third|one third|a quarter|one quarter|all|everything|(\\d+(?:\\.\\d+)?)\\s*%)\\s+(?:of\\s+)?(?:my\\s+)?(${SYM_RE})?`));
  if (fm) {
    const w = fm[1];
    const value = w === "half" ? 0.5 : w.includes("third") ? 1 / 3 : w.includes("quarter") ? 0.25 : w === "all" || w === "everything" ? 1 : Number(fm[2]) / 100;
    fraction = { value, word: w, symbol: fm[3] ? canon(fm[3]) : undefined };
  }

  let sells: string | undefined, buys: string | undefined;
  const pair = (re: RegExp, sellIdx: number, buyIdx: number) => {
    if (sells) return;
    const m = lower.match(re);
    if (m && m[sellIdx] && m[buyIdx]) { sells = canon(m[sellIdx]); buys = canon(m[buyIdx]); }
  };
  pair(new RegExp(`\\bbuy\\s+(?:[\\d.,]+\\s*)?(${SYM_RE})\\s+(?:with|using)\\s+(?:my\\s+)?(?:\\$?[\\d.,]+\\s*)?(${SYM_RE})`), 2, 1);
  pair(new RegExp(`\\b(?:swap|convert|exchange|trade|sell)\\s+(?:half|all|everything|a third|a quarter|[\\d.,]+%?)?\\s*(?:of\\s+)?(?:my\\s+)?(?:\\$?[\\d.,]+\\s*)?(${SYM_RE})\\s+(?:for|to|into)\\s+(${SYM_RE})`), 1, 2);
  pair(new RegExp(`\\b(?:put|invest)\\s+\\$?[\\d.,]+\\s+(?:of\\s+)?(?:my\\s+)?(${SYM_RE})\\s+(?:into|in)\\s+(${SYM_RE})`), 1, 2);

  let chain: string | undefined;
  const cm = lower.match(/\b(?:on|to|via)\s+(?:my\s+)?(base|arbitrum|ethereum|solana|polygon|optimism|bnb chain|bsc|avalanche)\b|\b(base|arbitrum|ethereum|solana|polygon|optimism|bsc|avalanche|near)\s+(?:wallet|address|account|chain|network)\b/);
  if (cm) chain = CHAINS[cm[1] ?? cm[2]];

  let price: number | undefined;
  const pm = lower.match(/(?:price|at|to|below|above|reaches|hits|drops to|falls to|rises to)\s*(?:of\s*)?\$\s?(\d+(?:\.\d+)?)/);
  if (pm) price = Number(pm[1]);

  return { kind, amounts, fraction, sells, buys, recipients: [...recipients], chain, price };
}

/** Lookalike check: same account once 1/l, 0/o, 5/s and friends are folded, or a couple of edits apart. */
const fold = (s: string) => s.toLowerCase().replace(/1/g, "l").replace(/0/g, "o").replace(/5/g, "s").replace(/rn/g, "m").replace(/vv/g, "w").replace(/[-_]/g, "");
function edits(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
export const isLookalike = (a: string, b: string) => a !== b && (fold(a) === fold(b) || edits(a.toLowerCase(), b.toLowerCase()) <= 2);

/** The action's moving parts, resolved against the token list. */
export interface ActionFacts {
  spend?: { asset: AssetRef; atomic: string; amount: number; usd: number | null };
  receive?: { asset: AssetRef };
  /** Limit orders: the base asset and quantity. */
  base?: { asset: AssetRef; atomic: string; amount: number };
  recipient?: string;
  chain?: string;
  side?: "buy" | "sell";
  price?: number;
  unknownAssets: string[];
}

export interface IntentResult {
  parsed: ParsedIntent;
  findings: Finding[];
  match: number;
  suggested?: ProposedAction | { type: "refuse"; message: string };
  /** The lesson key the worst finding teaches. */
  lessonKey?: string;
}

const DEFAULT_ASSET: Record<string, string> = { USDC: ASSETS.USDC_BASE, USDT: ASSETS.USDT_NEAR, NEAR: ASSETS.WNEAR, ETH: ASSETS.ETH, BTC: ASSETS.BTC };

export function checkIntent(p: Proposal, f: ActionFacts, tokens: AssetRef[]): IntentResult {
  const parsed = parseIntent(p.intent);
  const findings: Finding[] = [];
  const a = p.action;
  const params = { ...(a.params as Record<string, unknown>) };
  let fixed = false;
  let highKey: string | undefined;
  let mediumKey: string | undefined;
  const add = (x: Omit<Finding, "check">, key: string) => {
    findings.push({ check: "intent", ...x });
    if (x.severity === "high") highKey ??= key;
    else if (x.severity === "medium") mediumKey ??= key;
  };
  const sym = (r?: AssetRef) => (r ? canon(r.symbol) : undefined);

  for (const id of f.unknownAssets) {
    add({ category: "asset_error", severity: "high", title: "Not an asset NEAR Intents lists", detail: `${id} is not in GET /v1/tokens, so the Agent API would refuse it.` }, "asset");
  }

  // 1. The kind of action.
  const moves = a.type === "transfer" || a.type === "withdraw";
  const trades = a.type === "swap" || a.type === "limit_order";
  if (parsed.kind === "swap" && moves) {
    add({ category: "intent_mismatch", severity: "high", title: "A trade request became a payout", detail: `The user asked to trade; this ${a.type}s funds to ${f.recipient ?? "another account"}.` }, "action");
  } else if ((parsed.kind === "pay" || parsed.kind === "withdraw") && trades) {
    add({ category: "intent_mismatch", severity: "high", title: "A payment request became a trade", detail: `The user asked to ${parsed.kind === "pay" ? "pay someone" : "withdraw"}; this places a ${a.type.replace("_", " ")}.` }, "action");
  } else if (parsed.kind === "limit_order" && a.type === "swap") {
    add({ category: "intent_mismatch", severity: "medium", title: "Swaps now instead of waiting for the price", detail: "The user asked for a conditional order; this swaps at the market price right away." }, "action");
  }

  // 2. Tokens.
  if (trades && parsed.sells && parsed.buys) {
    const pairNow = new Set([sym(f.spend?.asset), sym(f.receive?.asset)]);
    if (!pairNow.has(parsed.sells) || !pairNow.has(parsed.buys)) {
      add({ category: "asset_error", severity: "high", title: "Trades other tokens than the user named", detail: `The user asked to trade ${parsed.sells} for ${parsed.buys}; this trades ${sym(f.spend?.asset) ?? "?"} for ${sym(f.receive?.asset) ?? "?"}.` }, "asset");
    }
  }
  if (moves && f.spend) {
    const named = parsed.amounts.map((x) => x.symbol);
    if (named.length && !named.includes(canon(f.spend.asset.symbol))) {
      add({ category: "asset_error", severity: "high", title: "Sends a different token", detail: `The user named ${named.join(" or ")}; this sends ${f.spend.asset.symbol}.` }, "asset");
    }
  }

  // 3. Side of a limit order.
  if (a.type === "limit_order" && f.base && f.side) {
    const baseSym = canon(f.base.asset.symbol);
    const want = parsed.buys === baseSym ? "buy" : parsed.sells === baseSym ? "sell" : /\bbuy\b/i.test(p.intent) ? "buy" : /\bsell\b/i.test(p.intent) ? "sell" : undefined;
    if (want && want !== f.side) {
      add({ category: "intent_mismatch", severity: "high", title: "Side inverted", detail: `The user asked to ${want} ${baseSym}; this order is a ${f.side}.` }, "side");
      params.side = want;
      fixed = true;
    }
  }

  // 4. Amount: stated, in dollars, or a share of the balance.
  const target = a.type === "limit_order" ? f.base : f.spend;
  if (target) {
    const tSym = canon(target.asset.symbol);
    const stated = parsed.amounts.find((x) => !x.usd && x.symbol === tSym);
    const statedUsd = parsed.amounts.find((x) => x.usd && x.symbol === tSym);
    const balance = p.balances?.[target.asset.asset_id];
    let expected: number | undefined;
    let said = "";
    if (stated) { expected = stated.value; said = `${fmtAmount(stated.value)} ${target.asset.symbol}`; }
    else if (statedUsd && target.asset.price) { expected = statedUsd.value / target.asset.price; said = `${fmtUsd(statedUsd.value)} of ${target.asset.symbol}`; }
    else if (parsed.fraction && (!parsed.fraction.symbol || parsed.fraction.symbol === tSym) && balance) {
      expected = fromAtomic(balance, target.asset.decimals) * parsed.fraction.value;
      said = `${parsed.fraction.word} of the ${fmtAmount(fromAtomic(balance, target.asset.decimals))} ${target.asset.symbol} held, ${fmtAmount(expected)} ${target.asset.symbol}`;
    }
    if (expected && expected > 0 && target.amount > 0) {
      const ratio = target.amount / expected;
      if (Math.abs(ratio - 1) > 0.02) {
        const pow = Math.log10(ratio);
        const decimalsSlip = Math.abs(pow) >= 3 && Math.abs(pow - Math.round(pow)) < 0.01;
        const right = toAtomic(expected.toFixed(Math.min(target.asset.decimals, 12)), target.asset.decimals);
        add({
          category: "amount_error",
          severity: "high",
          title: decimalsSlip ? `Wrong decimals for ${target.asset.symbol}` : parsed.fraction && !stated ? `Not ${parsed.fraction.word} of the balance` : "Amount differs from the request",
          detail: decimalsSlip
            ? `${target.asset.symbol} uses ${target.asset.decimals} decimals. The user said ${said}, which is ${right} atomic units; this sends ${target.atomic}, which is ${fmtAmount(target.amount)} ${target.asset.symbol}.`
            : `This spends ${fmtAmount(target.amount)} ${target.asset.symbol}; the user said ${said}.`,
          evidence: `${target.atomic} atomic units`,
        }, decimalsSlip ? "decimals" : parsed.fraction && !stated ? "fraction" : "amount");
        if (a.type === "limit_order") params.quantity = right; else params.amount = right;
        fixed = true;
      }
    }
    if (balance && /^[0-9]+$/.test(target.atomic) && BigInt(target.atomic) > BigInt(balance)) {
      add({ category: "amount_error", severity: "medium", title: "More than the agent holds", detail: `Spends ${fmtAmount(target.amount)} ${target.asset.symbol}; the agent holds ${fmtAmount(fromAtomic(balance, target.asset.decimals))}.` }, "amount");
    }
  }

  // 5. Recipient.
  if (f.recipient && parsed.recipients.length) {
    const r = f.recipient.toLowerCase();
    if (!parsed.recipients.includes(r)) {
      const near = parsed.recipients.find((x) => isLookalike(x, r));
      add({
        category: "recipient_error",
        severity: "high",
        title: near ? "Lookalike recipient" : "Pays someone the user didn't name",
        detail: near ? `${f.recipient} looks like ${near}, the account the user wrote, but it is a different account.` : `This pays ${f.recipient}; the user named ${parsed.recipients.join(", ")}.`,
        evidence: f.recipient,
      }, near ? "lookalike" : "recipient");
      if (parsed.recipients.length === 1) { params.recipient = parsed.recipients[0]; fixed = true; }
    }
  }

  // 6. Chain of a withdrawal.
  if (a.type === "withdraw" && parsed.chain && f.chain && f.chain !== parsed.chain) {
    add({ category: "asset_error", severity: "high", title: "Wrong chain", detail: `This withdraws on ${chainName(f.chain)}; the user asked for ${chainName(parsed.chain)}.` }, "chain");
    params.chain = parsed.chain;
    fixed = true;
  }

  // 7. Limit price.
  if (a.type === "limit_order" && parsed.price && f.price && Math.abs(f.price / parsed.price - 1) > 0.01) {
    add({ category: "amount_error", severity: "medium", title: "Different limit price", detail: `The order is priced at ${f.price}; the user said ${parsed.price}.` }, "price");
    params.price = String(parsed.price);
    fixed = true;
  }

  // 8. The owner's standing rules.
  const mandate = p.mandate ?? "";
  const cap = mandate.match(/(?:never|don't|do not) spend more than \$\s?([\d,]+(?:\.\d+)?)/i);
  if (cap && f.spend?.usd != null && f.spend.usd > num(cap[1])) {
    add({ category: "policy_violation", severity: "high", title: "Over the owner's per-action cap", detail: `Spends ${fmtUsd(f.spend.usd)}; the mandate caps one action at ${fmtUsd(num(cap[1]))}.` }, "policy");
  }
  const only = mandate.match(/trade only ([A-Za-z ,]+?)(?:\.|$)/i);
  if (only && trades) {
    const allowed = only[1].split(/,|\band\b/).map((s) => canon(s.trim())).filter(Boolean);
    for (const s of [sym(f.spend?.asset), sym(f.receive?.asset)]) {
      if (s && !allowed.includes(s)) add({ category: "policy_violation", severity: "medium", title: "Token outside the mandate", detail: `${s} is not among the tokens the owner allows (${allowed.join(", ")}).` }, "policy");
    }
  }

  // The corrected action, when the words pin it down.
  let suggested: IntentResult["suggested"];
  const worst = findings.find((x) => x.severity === "high");
  if (worst?.title === "A trade request became a payout" && parsed.sells && parsed.buys) {
    const amount = parsed.amounts.find((x) => x.symbol === parsed.sells && !x.usd);
    const origin = holdingFor(parsed.sells, p.balances, tokens) ?? DEFAULT_ASSET[parsed.sells];
    const dest = DEFAULT_ASSET[parsed.buys];
    const decimals = tokens.find((t) => t.asset_id === origin)?.decimals;
    if (amount && origin && dest && decimals != null) {
      suggested = { type: "swap", params: { origin_asset: origin, destination_asset: dest, amount: toAtomic(String(amount.value), decimals) } };
    }
  } else if (fixed && !findings.some((x) => x.severity === "high" && (x.category === "asset_error" && x.title !== "Wrong chain"))) {
    suggested = { type: a.type, params };
  }
  if (!suggested && worst) {
    suggested = { type: "refuse", message: `Don't send this. ${worst.detail} Ask the user to confirm before acting.` };
  }

  const sev = findings.some((x) => x.severity === "high") ? 0.08 : findings.some((x) => x.severity === "medium") ? 0.55 : 0.96;
  return { parsed, findings, match: sev, suggested, lessonKey: highKey ?? mediumKey };
}

/** The asset id the agent already holds under a symbol, so a corrected action spends what's really there. */
function holdingFor(symbol: string, balances: Record<string, string> | undefined, tokens: AssetRef[]): string | undefined {
  if (!balances) return undefined;
  return Object.keys(balances).find((id) => {
    const t = tokens.find((x) => x.asset_id === id);
    return t && canon(t.symbol) === symbol && balances[id] !== "0";
  });
}
