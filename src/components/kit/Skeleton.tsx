import { cx } from "@/lib/cx";

/** A placeholder the shape of what's coming, pulsing softly until it arrives. Never stands in for anything known. */
export function Skeleton({ w, h = 16, r, className }: { w: number | string; h?: number; r?: number; className?: string }) {
  return <span className={cx("skel", className)} style={{ width: w, height: h, borderRadius: r }} aria-hidden />;
}
