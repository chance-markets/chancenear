"use client";

import { IconCopy } from "@/components/kit/house-icons";
import { useCopy } from "@/lib/client";

/** Real code or a real payload, in mono, with Copy. Mono is for this and nothing else. */
export function Code({ children, label, copy = true, wrap }: { children: string; label?: string; copy?: boolean; wrap?: boolean }) {
  const [copied, doCopy] = useCopy();
  return (
    <div className={wrap ? "code is-wrap" : "code"}>
      {label || copy ? (
        <div className="code-head">
          {label ? <span>{label}</span> : <span />}
          {copy ? (
            <button type="button" className="text-action is-quiet" onClick={() => doCopy("c", children)}>
              <IconCopy />
              {copied ? "Copied" : "Copy"}
            </button>
          ) : null}
        </div>
      ) : null}
      <pre tabIndex={0}>{children}</pre>
    </div>
  );
}
