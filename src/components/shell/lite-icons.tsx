/**
 * Chance Lite's own place icons, drawn on the house grid (24, filled, round joins): things are filled, directions are
 * drawn. Used beside the kit's set.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...props }: P & { children: React.ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} aria-hidden {...props}>
      {children}
    </svg>
  );
}

/** Verdicts: a rubber stamp, knob, neck and a broad foot. */
export function IconStamp(props: P) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="5.6" r="3.4" fill="currentColor" />
      <path fill="currentColor" d="M10.3 8.4h3.4l.7 4.4h-4.8z" />
      <path fill="currentColor" d="M5.6 13.6h12.8c1.3 0 2.4 1.1 2.4 2.4v1.2c0 .7-.5 1.2-1.2 1.2H4.4c-.7 0-1.2-.5-1.2-1.2V16c0-1.3 1.1-2.4 2.4-2.4z" />
      <rect x="4.6" y="19.6" width="14.8" height="2" rx="1" fill="currentColor" />
    </Svg>
  );
}

/** Rehearsal: three columns stepping down, the learning curve itself. */
export function IconRounds(props: P) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M3.6 6.4c0-1 .8-1.8 1.8-1.8h1.4c1 0 1.8.8 1.8 1.8v14.2H3.6z" />
      <path fill="currentColor" d="M9.8 11c0-1 .8-1.8 1.8-1.8H13c1 0 1.8.8 1.8 1.8v9.6h-5z" />
      <path fill="currentColor" d="M16 15.6c0-1 .8-1.8 1.8-1.8h1.4c1 0 1.8.8 1.8 1.8v5H16z" />
    </Svg>
  );
}
