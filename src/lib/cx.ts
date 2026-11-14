/** Class names, skipping the falsy ones. */
export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");
