/** Atomic-unit math without floating point surprises: amounts in the Agent API are integer strings. */

export function toAtomic(amount: number | string, decimals: number): string {
  const s = typeof amount === "number" ? amount.toFixed(Math.min(decimals, 18)) : amount.trim();
  const [whole, frac = ""] = s.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const out = (BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0")).toString();
  return out;
}

export function fromAtomic(atomic: string, decimals: number): number {
  if (!/^[0-9]+$/.test(atomic)) return NaN;
  const n = BigInt(atomic);
  const base = 10n ** BigInt(decimals);
  const whole = n / base;
  const frac = n % base;
  return Number(whole) + Number(frac) / Number(base);
}

/** A human amount for display: up to 6 significant decimals, never scientific notation for normal sizes. */
export function fmtAmount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "?";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e15) return n.toExponential(2);
  if (abs >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (abs >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { maximumSignificantDigits: 4 });
}

export function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "unknown";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${n.toExponential(2)}`;
  if (abs >= 1) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${n.toLocaleString("en-US", { maximumSignificantDigits: 3 })}`;
}
