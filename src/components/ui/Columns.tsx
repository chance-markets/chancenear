"use client";

import { useLayoutEffect, useState } from "react";

/**
 * A single-series column chart, drawn to the house chart specs: columns at most 24px wide, a 4px rounded data end and a
 * square foot on one baseline, hairline solid gridlines, text in text tokens, sparse labels (first and last), a tooltip
 * per column on hover and keyboard focus, and the same numbers as a table one press away. One series, so the title
 * names it and there is no legend box.
 */
export interface Column {
  key: string;
  label: string;
  value: number;
  /** Extra words for the tooltip and the table ("of 10", "6 lessons"). */
  note?: string;
}

function niceMax(v: number): number {
  if (v <= 4) return Math.max(1, Math.ceil(v));
  if (v <= 10) return Math.ceil(v / 2) * 2;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

function columnPath(x: number, y: number, w: number, base: number): string {
  const h = base - y;
  if (h <= 0) return "";
  const r = Math.min(4, h, w / 2);
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

export function Columns({ title, sub, data, max, unit, height = 200, emptyLine, xName = "Round" }: {
  title: string;
  /** What each column is, for the table view ("Round", "Day"). */
  xName?: string;
  sub?: string;
  data: Column[];
  /** The top of the scale, when it is known (a round of 10 scenarios tops out at 10). */
  max?: number;
  /** Singular and plural unit for the tooltip ("mistake"). */
  unit: [string, string];
  height?: number;
  emptyLine?: string;
}) {
  // A callback ref: the plot mounts late (after data lands, or back from the table), and is measured whenever it does.
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  const [at, setAt] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  useLayoutEffect(() => {
    if (!box) return;
    const measure = () => setW(box.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [box]);

  const top = niceMax(Math.max(max ?? 0, ...data.map((d) => d.value), 1));
  const ticks = top <= 4 ? Array.from({ length: top + 1 }, (_, i) => i) : [0, top / 2, top];
  const padL = 34, padR = 8, padT = 22, padB = 30;
  const plotW = Math.max(0, w - padL - padR);
  const plotH = height - padT - padB;
  const base = padT + plotH;
  const band = data.length ? plotW / data.length : 0;
  const colW = Math.min(24, Math.max(6, band * 0.46));
  const yOf = (v: number) => base - (v / top) * plotH;
  const fmt = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 1 });
  const word = (v: number) => (v === 1 ? unit[0] : unit[1]);
  const labelled = new Set([0, data.length - 1]);

  return (
    <figure className="chart">
      <div className="chart-head">
        <figcaption>
          <span className="t-label">{title}</span>
          {sub ? <span className="t-small">{sub}</span> : null}
        </figcaption>
        {data.length ? (
          <button type="button" className="text-action is-quiet" aria-pressed={table} onClick={() => setTable((t) => !t)}>
            {table ? "Chart" : "Table"}
          </button>
        ) : null}
      </div>
      {!data.length ? (
        <p className="chart-empty t-small">{emptyLine ?? "Nothing to draw yet."}</p>
      ) : table ? (
        <table className="chart-table">
          <thead><tr><th scope="col">{xName}</th><th scope="col">{unit[1][0].toUpperCase() + unit[1].slice(1)}</th><th scope="col">Notes</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key}><th scope="row">{d.label}</th><td>{fmt(d.value)} {word(d.value)}</td><td>{d.note ?? ""}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="chart-plot" ref={setBox} style={{ height }} onPointerLeave={() => setAt(null)}>
          {w > 0 ? (
            <svg width={w} height={height} role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${fmt(d.value)}`).join(", ")}`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={padL} x2={w - padR} y1={yOf(t)} y2={yOf(t)} className={t === 0 ? "chart-base" : "chart-grid"} />
                  <text x={padL - 10} y={yOf(t)} className="chart-tick" textAnchor="end" dominantBaseline="central">{fmt(t)}</text>
                </g>
              ))}
              {data.map((d, i) => {
                const cx = padL + band * i + band / 2;
                const x = cx - colW / 2;
                const y = yOf(d.value);
                const on = at === i;
                return (
                  <g key={d.key}>
                    <path d={columnPath(x, y, colW, base)} className={on ? "chart-col is-on" : "chart-col"} />
                    {labelled.has(i) || on || d.value === 0 ? (
                      <text x={cx} y={y - 8} className="chart-value" textAnchor="middle">{fmt(d.value)}</text>
                    ) : null}
                    <text x={cx} y={base + 19} className="chart-x" textAnchor="middle">{d.label}</text>
                    <rect
                      x={padL + band * i}
                      y={padT - 16}
                      width={band}
                      height={plotH + 16}
                      fill="transparent"
                      tabIndex={0}
                      aria-label={`${d.label}: ${fmt(d.value)} ${word(d.value)}${d.note ? `, ${d.note}` : ""}`}
                      onPointerEnter={() => setAt(i)}
                      onFocus={() => setAt(i)}
                      onBlur={() => setAt(null)}
                      className="chart-hit"
                    />
                  </g>
                );
              })}
            </svg>
          ) : null}
          {at != null && data[at] && w > 0 ? (
            <div
              className="chart-tip"
              role="status"
              style={{ left: Math.min(Math.max(padL + band * at + band / 2, 90), w - 90), top: Math.max(4, yOf(data[at].value) - 64) }}
            >
              <b>{data[at].label}</b>
              <span>{fmt(data[at].value)} {word(data[at].value)}{data[at].note ? `, ${data[at].note}` : ""}</span>
            </div>
          ) : null}
        </div>
      )}
    </figure>
  );
}
