/** Chance house icons (ChanceBot's set, via Chance Harness): things are filled, directions are drawn. */
import {
  useId,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  title?: string;
  stroked?: boolean;
};
export type HouseIcon = ComponentType<IconProps>;
function Svg({
  children,
  size = 20,
  title,
  stroked,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={stroked ? "none" : undefined}
      stroke={stroked ? "currentColor" : undefined}
      strokeWidth={stroked ? 2.2 : undefined}
      strokeLinecap={stroked ? "round" : undefined}
      strokeLinejoin={stroked ? "round" : undefined}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {children}
    </svg>
  );
}

/** desk (nav) */
export function IconDesk(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 21.6C7.3 21.6 4.5 19 4.5 15.4 4.5 12.3 6.3 10.4 8.1 8.6 9.4 7.3 10.2 5.9 10.8 4.5 11.5 2.9 13.3 2.1 15 2.6 16.6 3.1 17.6 4.4 17.3 5.6 17.1 6.4 16.3 6.7 15.6 6.2 15.5 7.3 16.1 8.2 16.9 9.1 18.6 10.9 19.5 12.8 19.5 15.3 19.5 19 16.6 21.6 12 21.6ZM9.8 14.3a1 1.2 0 1 0 0 2.4a1 1.2 0 1 0 0-2.4zm4.4 0a1 1.2 0 1 0 0 2.4a1 1.2 0 1 0 0-2.4z"
      />
    </Svg>
  );
}

/** wallets (nav) */
export function IconWallets(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M8.6 3.2c.9-.5 2.1-.2 3.4.4 1.3-.6 2.5-.9 3.4-.4.8.5.8 1.6.1 2.6l-.9 1.3h-5.2l-.9-1.3c-.7-1-.7-2.1.1-2.6z"
      />
      <rect
        x="8.4"
        y="7.6"
        width="7.2"
        height="2.2"
        rx="1.1"
        fill="currentColor"
      />
      <path
        fill="currentColor"
        d="M9 10.6h6c3.1 1.7 5 4.4 5 7 0 2.6-2.3 3.9-8 3.9s-8-1.3-8-3.9c0-2.6 1.9-5.3 5-7z"
      />
    </Svg>
  );
}

/** apps (nav) */
export function IconApps(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="8" y="2.4" width="2.4" height="6" rx="1.2" fill="currentColor" />
      <rect
        x="13.6"
        y="2.4"
        width="2.4"
        height="6"
        rx="1.2"
        fill="currentColor"
      />
      <path
        fill="currentColor"
        d="M6 9.2c0-.7.5-1.2 1.2-1.2h9.6c.7 0 1.2.5 1.2 1.2v2.6c0 3-2.2 5.4-5 5.8v2.2c0 .9-.4 1.8-1 1.8s-1-.9-1-1.8v-2.2c-2.8-.4-5-2.8-5-5.8z"
      />
    </Svg>
  );
}

/** history (nav) */
export function IconHistory(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7.4 2.8h9.8c1.5 0 2.6 1.2 2.6 2.6v13.2c0 1.5-1.2 2.6-2.6 2.6H7.4c-1.5 0-2.6-1.2-2.6-2.6V5.4c0-1.5 1.2-2.6 2.6-2.6zm7.4 0v18.4h1.6V2.8zM7.6 8.2a.9.9 0 0 0 0 1.8h4.4a.9.9 0 0 0 0-1.8zm0 3.6a.9.9 0 0 0 0 1.8h3a.9.9 0 0 0 0-1.8z"
      />
    </Svg>
  );
}

/** settings (nav) */
export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8 6.5h8a5.5 5.5 0 0 1 0 11H8a5.5 5.5 0 0 1 0-11zm8 2.3a3.2 3.2 0 1 0 0 6.4a3.2 3.2 0 1 0 0-6.4z"
      />
    </Svg>
  );
}

/** edit (thing) */
export function IconEdit(props: IconProps) {
  return (
    <Svg {...props}>
      <g transform="rotate(45 12 12)">
        <path
          fill="currentColor"
          d="M11.00 1.90H13.00A1.60 1.60 0 0 1 14.60 3.50V3.70A1.60 1.60 0 0 1 13.00 5.30H11.00A1.60 1.60 0 0 1 9.40 3.70V3.50A1.60 1.60 0 0 1 11.00 1.90Z"
        />
        <path
          fill="currentColor"
          d="M10.30 6.50H13.70A0.90 0.90 0 0 1 14.60 7.40V16.20A0.90 0.90 0 0 1 13.70 17.10H10.30A0.90 0.90 0 0 1 9.40 16.20V7.40A0.90 0.90 0 0 1 10.30 6.50Z"
        />
        <path
          fill="currentColor"
          d="M9.4 18.3H14.6L12.75 21.55Q12 22.75 11.25 21.55Z"
        />
      </g>
    </Svg>
  );
}

/** delete (thing) */
export function IconDelete(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M10.40 2.30H13.60A1.10 1.10 0 0 1 14.70 3.40V3.40A1.10 1.10 0 0 1 13.60 4.50H10.40A1.10 1.10 0 0 1 9.30 3.40V3.40A1.10 1.10 0 0 1 10.40 2.30Z"
      />
      <path
        fill="currentColor"
        d="M5.15 5.30H18.85A1.35 1.35 0 0 1 20.20 6.65V6.65A1.35 1.35 0 0 1 18.85 8.00H5.15A1.35 1.35 0 0 1 3.80 6.65V6.65A1.35 1.35 0 0 1 5.15 5.30Z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M5.7 9.3H18.3L17.45 19.3Q17.25 21.5 15.05 21.5H8.95Q6.75 21.5 6.55 19.3ZM10.15 11.80H10.15A0.95 0.95 0 0 1 11.10 12.75V17.45A0.95 0.95 0 0 1 10.15 18.40H10.15A0.95 0.95 0 0 1 9.20 17.45V12.75A0.95 0.95 0 0 1 10.15 11.80ZM13.85 11.80H13.85A0.95 0.95 0 0 1 14.80 12.75V17.45A0.95 0.95 0 0 1 13.85 18.40H13.85A0.95 0.95 0 0 1 12.90 17.45V12.75A0.95 0.95 0 0 1 13.85 11.80Z"
      />
    </Svg>
  );
}

/** copy (thing) */
export function IconCopy(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M10 6A1.6 1.6 0 0 1 10 2.8H18.8A2.4 2.4 0 0 1 21.2 5.2V14.8A1.6 1.6 0 0 1 18 14.8V7.2A1.2 1.2 0 0 0 16.8 6Z"
      />
      <path
        fill="currentColor"
        d="M5.40 7.40H14.00A2.60 2.60 0 0 1 16.60 10.00V18.60A2.60 2.60 0 0 1 14.00 21.20H5.40A2.60 2.60 0 0 1 2.80 18.60V10.00A2.60 2.60 0 0 1 5.40 7.40Z"
      />
    </Svg>
  );
}

/** lock (thing) */
export function IconLock(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M6.6 10.2V7.9A5.4 5.4 0 0 1 17.4 7.9V10.2H14.8V7.9A2.8 2.8 0 0 0 9.2 7.9V10.2Z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7.10 11.40H16.90A3.20 3.20 0 0 1 20.10 14.60V18.50A3.20 3.20 0 0 1 16.90 21.70H7.10A3.20 3.20 0 0 1 3.90 18.50V14.60A3.20 3.20 0 0 1 7.10 11.40ZM12 13.6A1.8 1.8 0 0 1 13 16.9V18.4A1 1 0 0 1 11 18.4V16.9A1.8 1.8 0 0 1 12 13.6Z"
      />
    </Svg>
  );
}

/** eye (thing) */
export function IconEye(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M3 12.9C2.6 12.3 2.6 11.7 3 11.1C5.4 7.2 8.6 5.2 12 5.2C15.4 5.2 18.6 7.2 21 11.1C21.4 11.7 21.4 12.3 21 12.9C18.6 16.8 15.4 18.8 12 18.8C8.6 18.8 5.4 16.8 3 12.9ZM7.70 12.00A4.30 4.30 0 1 0 16.30 12.00A4.30 4.30 0 1 0 7.70 12.00ZM9.80 12.00A2.20 2.20 0 1 0 14.20 12.00A2.20 2.20 0 1 0 9.80 12.00Z"
      />
    </Svg>
  );
}

/** eye-closed (thing) */
export function IconEyeClosed(props: IconProps) {
  const cut = useId().replaceAll(":", "");
  return (
    <Svg {...props}>
      <mask
        id={cut}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="24"
        height="24"
      >
        <rect width="24" height="24" fill="#fff" />
        <rect
          x="-2"
          y="10.3"
          width="28"
          height="5.4"
          rx="2.7"
          fill="#000"
          transform="rotate(45 12 12)"
        />
      </mask>
      <g mask={`url(#${cut})`}>
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M3 12.9C2.6 12.3 2.6 11.7 3 11.1C5.4 7.2 8.6 5.2 12 5.2C15.4 5.2 18.6 7.2 21 11.1C21.4 11.7 21.4 12.3 21 12.9C18.6 16.8 15.4 18.8 12 18.8C8.6 18.8 5.4 16.8 3 12.9ZM7.70 12.00A4.30 4.30 0 1 0 16.30 12.00A4.30 4.30 0 1 0 7.70 12.00ZM9.80 12.00A2.20 2.20 0 1 0 14.20 12.00A2.20 2.20 0 1 0 9.80 12.00Z"
        />
      </g>
      <path
        fill="currentColor"
        transform="rotate(45 12 12)"
        d="M0.70 10.90H23.30A1.10 1.10 0 0 1 24.40 12.00V12.00A1.10 1.10 0 0 1 23.30 13.10H0.70A1.10 1.10 0 0 1 -0.40 12.00V12.00A1.10 1.10 0 0 1 0.70 10.90Z"
      />
    </Svg>
  );
}

/** clock (thing) */
export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <g transform="rotate(-40 5.6 5.1)">
        <path
          fill="currentColor"
          d="M4.30 3.80H6.90A1.30 1.30 0 0 1 8.20 5.10V5.10A1.30 1.30 0 0 1 6.90 6.40H4.30A1.30 1.30 0 0 1 3.00 5.10V5.10A1.30 1.30 0 0 1 4.30 3.80Z"
        />
      </g>
      <g transform="rotate(40 18.4 5.1)">
        <path
          fill="currentColor"
          d="M17.10 3.80H19.70A1.30 1.30 0 0 1 21.00 5.10V5.10A1.30 1.30 0 0 1 19.70 6.40H17.10A1.30 1.30 0 0 1 15.80 5.10V5.10A1.30 1.30 0 0 1 17.10 3.80Z"
        />
      </g>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M3.80 13.40A8.20 8.20 0 1 0 20.20 13.40A8.20 8.20 0 1 0 3.80 13.40ZM11 9.2A1 1 0 0 1 13 9.2V12.9L15.3 14.3A1 1 0 0 1 14.3 16L11.5 14.3Q11 14 11 13.4Z"
      />
    </Svg>
  );
}

/** browser (thing) */
export function IconBrowser(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M5.80 3.80H18.20A3.40 3.40 0 0 1 21.60 7.20V16.80A3.40 3.40 0 0 1 18.20 20.20H5.80A3.40 3.40 0 0 1 2.40 16.80V7.20A3.40 3.40 0 0 1 5.80 3.80ZM6.00 8.60H18.00A1.40 1.40 0 0 1 19.40 10.00V16.60A1.40 1.40 0 0 1 18.00 18.00H6.00A1.40 1.40 0 0 1 4.60 16.60V10.00A1.40 1.40 0 0 1 6.00 8.60Z"
      />
    </Svg>
  );
}

/** phone (thing) */
export function IconPhone(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M9.20 2.30H14.80A3.40 3.40 0 0 1 18.20 5.70V18.30A3.40 3.40 0 0 1 14.80 21.70H9.20A3.40 3.40 0 0 1 5.80 18.30V5.70A3.40 3.40 0 0 1 9.20 2.30ZM9.20 5.00H14.80A1.30 1.30 0 0 1 16.10 6.30V15.30A1.30 1.30 0 0 1 14.80 16.60H9.20A1.30 1.30 0 0 1 7.90 15.30V6.30A1.30 1.30 0 0 1 9.20 5.00ZM11.05 18.30H12.95A0.75 0.75 0 0 1 13.70 19.05V19.05A0.75 0.75 0 0 1 12.95 19.80H11.05A0.75 0.75 0 0 1 10.30 19.05V19.05A0.75 0.75 0 0 1 11.05 18.30Z"
      />
    </Svg>
  );
}

/** find (thing) */
export function IconFind(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M3.20 10.40A7.20 7.20 0 1 0 17.60 10.40A7.20 7.20 0 1 0 3.20 10.40ZM5.90 10.40A4.50 4.50 0 1 0 14.90 10.40A4.50 4.50 0 1 0 5.90 10.40Z"
      />
      <g transform="rotate(-45 18.7 18.7)">
        <path
          fill="currentColor"
          d="M18.70 14.90H18.70A1.50 1.50 0 0 1 20.20 16.40V21.00A1.50 1.50 0 0 1 18.70 22.50H18.70A1.50 1.50 0 0 1 17.20 21.00V16.40A1.50 1.50 0 0 1 18.70 14.90Z"
        />
      </g>
    </Svg>
  );
}

/** sound (thing) */
export function IconSound(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M3.4 8.6H6.8L11.6 4.9C12.5 4.2 13.8 4.8 13.8 6V18C13.8 19.2 12.5 19.8 11.6 19.1L6.8 15.4H3.4C2.5 15.4 1.8 14.7 1.8 13.8V10.2C1.8 9.3 2.5 8.6 3.4 8.6Z"
      />
      <path
        d="M16.7 9.2Q18.7 12 16.7 14.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M19.6 6.4Q23.2 12 19.6 17.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** add-money (thing) */
export function IconAddMoney(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M8.6 3.2c.9-.5 2.1-.2 3.4.4 1.3-.6 2.5-.9 3.4-.4.8.5.8 1.6.1 2.6l-.9 1.3h-5.2l-.9-1.3c-.7-1-.7-2.1.1-2.6z"
      />
      <rect
        x="8.4"
        y="7.6"
        width="7.2"
        height="2.2"
        rx="1.1"
        fill="currentColor"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M9 10.6h6c3.1 1.7 5 4.4 5 7 0 2.6-2.3 3.9-8 3.9s-8-1.3-8-3.9c0-2.6 1.9-5.3 5-7zM11.05 13.70A0.95 0.95 0 0 1 12.95 13.70V15.55H14.80A0.95 0.95 0 0 1 14.80 17.45H12.95V19.30A0.95 0.95 0 0 1 11.05 19.30V17.45H9.20A0.95 0.95 0 0 1 9.20 15.55H11.05Z"
      />
    </Svg>
  );
}

/** key (thing) */
export function IconKey(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2.40 12.00A5.00 5.00 0 1 0 12.40 12.00A5.00 5.00 0 1 0 2.40 12.00ZM5.60 12.00A1.80 1.80 0 1 0 9.20 12.00A1.80 1.80 0 1 0 5.60 12.00Z"
      />
      <path
        fill="currentColor"
        d="M14.80 10.90H20.90A1.10 1.10 0 0 1 22.00 12.00V12.00A1.10 1.10 0 0 1 20.90 13.10H14.80A1.10 1.10 0 0 1 13.70 12.00V12.00A1.10 1.10 0 0 1 14.80 10.90Z"
      />
      <path
        fill="currentColor"
        d="M17.35 12.20H17.35A1.05 1.05 0 0 1 18.40 13.25V15.55A1.05 1.05 0 0 1 17.35 16.60H17.35A1.05 1.05 0 0 1 16.30 15.55V13.25A1.05 1.05 0 0 1 17.35 12.20Z"
      />
      <path
        fill="currentColor"
        d="M20.65 12.20H20.65A1.05 1.05 0 0 1 21.70 13.25V14.35A1.05 1.05 0 0 1 20.65 15.40H20.65A1.05 1.05 0 0 1 19.60 14.35V13.25A1.05 1.05 0 0 1 20.65 12.20Z"
      />
    </Svg>
  );
}

/** hold (thing) */
export function IconHold(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M8.30 4.20H8.30A2.10 2.10 0 0 1 10.40 6.30V17.70A2.10 2.10 0 0 1 8.30 19.80H8.30A2.10 2.10 0 0 1 6.20 17.70V6.30A2.10 2.10 0 0 1 8.30 4.20Z"
      />
      <path
        fill="currentColor"
        d="M15.70 4.20H15.70A2.10 2.10 0 0 1 17.80 6.30V17.70A2.10 2.10 0 0 1 15.70 19.80H15.70A2.10 2.10 0 0 1 13.60 17.70V6.30A2.10 2.10 0 0 1 15.70 4.20Z"
      />
    </Svg>
  );
}

/** rest (thing) */
export function IconRest(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M10.57 4.04A8.6 8.6 0 1 0 19.92 13.76A7.0 7.0 0 0 1 10.57 4.04Z"
      />
    </Svg>
  );
}

/** more (thing) */
export function IconMore(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M3.40 12.00A2.00 2.00 0 1 0 7.40 12.00A2.00 2.00 0 1 0 3.40 12.00ZM10.00 12.00A2.00 2.00 0 1 0 14.00 12.00A2.00 2.00 0 1 0 10.00 12.00ZM16.60 12.00A2.00 2.00 0 1 0 20.60 12.00A2.00 2.00 0 1 0 16.60 12.00Z"
      />
    </Svg>
  );
}

/** back (direction) */
export function IconBack(props: IconProps) {
  return (
    <Svg {...props} stroked>
      <path d="M14.6 5.4L8 12L14.6 18.6" />
    </Svg>
  );
}

/** next (direction) */
export function IconNext(props: IconProps) {
  return (
    <Svg {...props} stroked>
      <path d="M9.4 5.4L16 12L9.4 18.6" />
    </Svg>
  );
}

/** down (direction) */
export function IconDown(props: IconProps) {
  return (
    <Svg {...props} stroked>
      <path d="M5.4 9.2L12 15.8L18.6 9.2" />
    </Svg>
  );
}

/** up-right (direction) */
export function IconUpRight(props: IconProps) {
  return (
    <Svg {...props} stroked>
      <path d="M6.4 17.6L17.4 6.6M8.8 6.6H17.4V15.2" />
    </Svg>
  );
}

/** arrow-down (direction) */
export function IconArrowDown(props: IconProps) {
  return (
    <Svg {...props} stroked>
      <path d="M12 4.4V19.2M6 13.4L12 19.4L18 13.4" />
    </Svg>
  );
}

/** swap (direction) */
export function IconSwap(props: IconProps) {
  return (
    <Svg {...props} stroked>
      <path d="M8 4V19M4.2 15.2L8 19L11.8 15.2M16 20V5M12.2 8.8L16 5L19.8 8.8" />
    </Svg>
  );
}

/** plus (direction) */
export function IconPlus(props: IconProps) {
  return (
    <Svg {...props} stroked>
      <path d="M12 4.8V19.2M4.8 12H19.2" />
    </Svg>
  );
}

/** close (direction) */
export function IconClose(props: IconProps) {
  return (
    <Svg {...props} stroked>
      <path d="M6.4 6.4L17.6 17.6M17.6 6.4L6.4 17.6" />
    </Svg>
  );
}

/** check (direction) */
export function IconCheck(props: IconProps) {
  return (
    <Svg {...props} stroked>
      <path d="M4.8 12.6L9.8 17.6L19.2 7.2" />
    </Svg>
  );
}

/** refresh (direction) */
export function IconRefresh(props: IconProps) {
  return (
    <Svg {...props} stroked>
      <path d="M19.33 13.43A7.4 7.4 0 1 1 14.77 5.54" />
      <path d="M13.44 1.87L14.77 5.54L11.27 7.25" />
    </Svg>
  );
}
