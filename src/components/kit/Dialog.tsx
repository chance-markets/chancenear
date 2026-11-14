"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "./house-icons";
import { Puff, type Who } from "./Puff";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A kit dialog over the neutral scrim. It's on screen from its first frame; only its position settles in. Only its
 * X closes it (or a button of its own): a stray press on the scrim or a key can't drop a deposit halfway. Focus stays
 * inside, and returns to whatever opened it. A host puff can stand on the top edge, or a mark beside the title (an
 * app's icon). `className` sizes a dialog of its own kind (the token picker).
 */
export function Dialog({ open, onClose, title, line, host, mark, className, children }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  line?: ReactNode;
  host?: { who: Who; pose?: string };
  mark?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    if (open) {
      opener.current = document.activeElement;
      setMounted(true);
      return;
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 200);
    (opener.current as HTMLElement | null)?.focus?.();
    return () => clearTimeout(t);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !mounted || shown) return;
    void panel.current?.offsetWidth;
    setShown(true);
  }, [open, mounted, shown]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      // Another window on top (Privy's wallet picker) has the keyboard: leave its keys alone.
      const at = document.activeElement;
      if (at && at !== document.body && !panel.current?.parentElement?.contains(at)) return;
      if (e.key !== "Tab" || !panel.current) return;
      const els = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (!els.includes(document.activeElement as HTMLElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open]);

  useEffect(() => {
    if (!shown || !panel.current) return;
    let target = panel.current.querySelector<HTMLElement>("[data-autofocus]:not([disabled])") ?? panel.current;
    if (target instanceof HTMLInputElement && window.matchMedia("(pointer: coarse)").matches) target = panel.current;
    target.focus({ preventScroll: true });
  }, [shown]);

  if (!mounted) return null;
  return createPortal(
    <div className="scrim" data-open={shown} data-closing={!open || undefined}>
      <div ref={panel} className={`dialog${host ? " has-host" : ""}${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        {host ? <div className="dialog-host" aria-hidden><Puff who={host.who} pose={host.pose} size={120} /></div> : null}
        <button type="button" className="icon-btn dialog-close" onClick={() => closeRef.current()} aria-label="Close">
          <IconClose />
        </button>
        <div className={`dialog-head${mark ? " has-mark" : ""}`}>
          {mark ? <span className="dialog-mark" aria-hidden>{mark}</span> : null}
          <h2 className="t-title" id={titleId}>{title}</h2>
          {line ? <p className="t-line">{line}</p> : null}
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
