// Filled buttons pair secondary-strong with its on- colour: 5.2:1 light, about 7:1 dark (Design decision 10).
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

export const PRIMARY_BUTTON = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-pill border-0 bg-secondary-strong px-5 text-sm font-semibold text-on-secondary-strong no-underline transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] motion-reduce:transition-none ${FOCUS}`;

export const SECONDARY_BUTTON = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-pill border border-border/25 bg-transparent px-5 text-sm font-semibold text-text-primary no-underline transition-colors duration-150 hover:bg-secondary/[0.08] ${FOCUS}`;
