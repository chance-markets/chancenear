"use client";

import type { ReactNode } from "react";
import { IconCheck } from "./house-icons";

/** A checkbox in the house style: a tonal square that fills with ink and a tick. The real input stays focusable. */
export function Check({ checked, onChange, children, className }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; className?: string }) {
  return (
    <label className={className ? `check ${className}` : "check"}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="check-box" aria-hidden><IconCheck /></span>
      <span className="check-text">{children}</span>
    </label>
  );
}
