/**
 * A Star Puff, bare: no tile, ring or circle behind it, ever. Under 72px it's the avatar crop; from 72px up the full
 * figure in a pose; from 120px up it stands on its own small floor. Puffs don't animate: a new state swaps the image.
 *
 * Who speaks: the Privacy Agent for the private balance (it's Bunker's own), Trader for trading, Chief for the app,
 * the Guide only for Chance itself.
 */
export type Who = "privacy" | "trader" | "chief" | "guide" | "scout" | "blank";

/** Poses that exist as renders. Anything else falls back to the character's idle. */
const POSES: Record<Who, string[]> = {
  privacy: ["idle", "hello", "vault", "working", "cheer"],
  trader: ["idle", "hello", "asking", "asleep", "cheer", "connect", "oops", "stop", "working"],
  chief: ["idle", "hello", "asking", "asleep", "box", "browser", "cheer", "notebook", "oops", "phone", "point", "pouch", "pouch-empty", "sad-wave", "shrug"],
  guide: ["idle", "hello", "lens-empty", "look", "phone", "thinking"],
  scout: ["idle", "hello", "asking", "asleep", "cheer", "research"],
  blank: ["tada"],
};

/** Renders made for Bunker land here once generated; until then the character stands in its idle. */
const READY = new Set<string>(["privacy-idle", "privacy-hello", "privacy-vault", "privacy-working", "privacy-cheer"]);

export function puffSrc(who: Who, pose = "idle", size = 120): string {
  if (size < 72) return `/puffs/avatar-${who}.webp`;
  const known = POSES[who].includes(pose) ? pose : POSES[who][0];
  const file = `${who}-${known}`;
  if (who === "privacy" && !READY.has(file)) return "/puffs/privacy-idle.webp";
  return `/puffs/${file}.webp`;
}

export function Puff({ who, pose = "idle", size, className, label }: {
  who: Who;
  pose?: string;
  size: number;
  className?: string;
  /** Only when the puff carries meaning on its own; usually it's decoration beside words. */
  label?: string;
}) {
  const stand = size >= 120;
  return (
    <span className={`puff${stand ? " stand" : ""}${className ? ` ${className}` : ""}`} style={{ ["--s" as string]: `${size}px` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={puffSrc(who, pose, size)} alt={label ?? ""} width={size} height={size} draggable={false} />
    </span>
  );
}

/** A small overlapping row of agent avatars (the screenshot's Agents row), each bare. */
export function PuffStack({ who, size = 32 }: { who: Who[]; size?: number }) {
  return (
    <span className="puff-stack" aria-hidden>
      {who.map((w, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={w + i} src={`/puffs/avatar-${w}.webp`} alt="" width={size} height={size} style={{ zIndex: who.length - i }} />
      ))}
    </span>
  );
}
