"use client";

import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface TabOption<T extends string> {
  value: T;
  label: ReactNode;
  className?: string;
  /** For `tab` views: the id of the panel it shows. */
  controls?: string;
  id?: string;
}

/**
 * Pill tabs with a white thumb that slides under the chosen one. `radio` is a choice (side, order type, interval),
 * `tab` switches a view. Arrow keys move the choice and focus together. The thumb is measured before paint, so it's
 * never seen in the wrong place, and it follows the bar when the bar changes size (fonts landing, a resize).
 */
export function Tabs<T extends string>({ value, options, onChange, label, role = "radio", size, fill, className }: {
  value: T;
  options: TabOption<T>[];
  onChange: (v: T) => void;
  label: string;
  role?: "radio" | "tab";
  size?: "sm";
  fill?: boolean;
  className?: string;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  useLayoutEffect(() => {
    const b = bar.current, t = thumb.current;
    if (!b || !t) return;
    const place = () => {
      const on = b.querySelector<HTMLElement>('[data-on="true"]');
      if (!on) { t.style.width = "0px"; return; }
      const first = !placed.current;
      if (first) t.style.transition = "none";
      t.style.width = `${on.offsetWidth}px`;
      t.style.transform = `translateX(${on.offsetLeft}px)`;
      if (first) {
        void t.offsetWidth;
        t.style.transition = "";
        placed.current = true;
      }
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(b);
    return () => ro.disconnect();
  }, [value, options.length]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + step + options.length) % options.length];
    onChange(next.value);
    requestAnimationFrame(() => bar.current?.querySelector<HTMLElement>('[data-on="true"]')?.focus());
  };

  const radio = role === "radio";
  // With nothing chosen (a value typed elsewhere), the first option still takes Tab, so the group can be reached.
  const noneOn = !options.some((o) => o.value === value);
  return (
    <div
      ref={bar}
      className={cx("tabs", size === "sm" && "is-sm", fill && "is-fill", className)}
      role={radio ? "radiogroup" : "tablist"}
      aria-label={label}
      onKeyDown={onKey}
    >
      <span ref={thumb} className="tabs-thumb" aria-hidden />
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            id={o.id}
            type="button"
            role={radio ? "radio" : "tab"}
            aria-checked={radio ? on : undefined}
            aria-selected={radio ? undefined : on}
            aria-controls={o.controls}
            data-on={on}
            tabIndex={on || (noneOn && i === 0) ? 0 : -1}
            className={cx("tab", o.className)}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
