"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ComponentType, type SVGProps } from "react";
import { IconApps, IconDesk, IconEdit, IconHistory } from "@/components/kit/house-icons";
import { Tabs, type TabOption } from "@/components/kit/Tabs";
import { setThemePref, type ThemePref } from "@/lib/theme";
import { IconPlay, IconRounds, IconStamp } from "./lite-icons";
import { useThemePref } from "./ThemeProvider";

type Glyph = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
interface Place { label: string; Icon: Glyph; href: string }

const PLACES: Place[] = [
  { label: "How it works", Icon: IconPlay, href: "/" },
  { label: "Dashboard", Icon: IconDesk, href: "/dashboard" },
  { label: "Verdicts", Icon: IconStamp, href: "/verdicts" },
  { label: "Playbook", Icon: IconHistory, href: "/playbook" },
  { label: "Rehearsal", Icon: IconRounds, href: "/rehearsal" },
  { label: "Try it", Icon: IconEdit, href: "/try" },
];
const LOWER: Place[] = [{ label: "Connect", Icon: IconApps, href: "/connect" }];

const THEMES: TabOption<ThemePref>[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

/** The Chance wordmark, cut from its artwork (2048 × 440) and filled with ink, so it reads in either theme. */
export function Wordmark({ height = 20 }: { height?: number }) {
  return <i role="img" aria-label="Chance" className="wordmark" style={{ width: Math.round((height * 2048) / 440), height }} />;
}

const isOn = (href: string, path: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

function PlaceRow({ p, path }: { p: Place; path: string }) {
  return (
    <Link href={p.href} className="place" aria-current={isOn(p.href, path) ? "page" : undefined}>
      <p.Icon size={20} />
      <span>{p.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const path = usePathname() ?? "/";
  const theme = useThemePref();
  return (
    <aside className="side">
      <Link href="/" className="side-brand" aria-label="ChanceNear, how it works">
        <Wordmark height={20} />
        <span>Near</span>
      </Link>
      <PhoneMenu />
      <nav className="places" aria-label="ChanceNear">
        {PLACES.map((p) => <PlaceRow key={p.href} p={p} path={path} />)}
      </nav>
      <div className="side-foot">
        <nav className="places" aria-label="More">
          {LOWER.map((p) => <PlaceRow key={p.href} p={p} path={path} />)}
        </nav>
        <div className="side-theme">
          <span>Appearance</span>
          <Tabs label="Appearance" value={theme} options={THEMES} onChange={setThemePref} size="sm" fill />
        </div>
      </div>
    </aside>
  );
}

/** Two bars, the second shorter, that cross into a close mark when the menu is open. */
function MenuGlyph({ open }: { open: boolean }) {
  return (
    <svg className="side-menu-glyph" data-open={open || undefined} width={22} height={22} viewBox="0 0 24 24" aria-hidden>
      <line x1="4.5" y1="8.5" x2="19.5" y2="8.5" />
      <line x1="4.5" y1="15.5" x2="19.5" y2="15.5" />
    </svg>
  );
}

/** On a phone the places run across the top; Connect and the appearance choice sit behind this, top right. */
function PhoneMenu() {
  const path = usePathname() ?? "/";
  const theme = useThemePref();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="side-menu" ref={wrap}>
      <button ref={btn} type="button" className="side-menu-btn" aria-expanded={open} aria-controls={id} aria-label="Menu" onClick={() => setOpen((o) => !o)}>
        <MenuGlyph open={open} />
      </button>
      {open ? (
        <div className="menu side-menu-panel" id={id}>
          <Link href="/connect" className="menu-item" aria-current={isOn("/connect", path) ? "page" : undefined}><IconApps size={20} />Connect</Link>
          <a href="/skill.md" className="menu-item"><IconHistory size={20} />skill.md for agents</a>
          <div className="side-menu-theme">
            <span>Appearance</span>
            <Tabs label="Appearance" value={theme} options={THEMES} onChange={setThemePref} size="sm" fill />
          </div>
        </div>
      ) : null}
    </div>
  );
}
