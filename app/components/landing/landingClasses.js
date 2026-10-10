// Filled buttons pair secondary-strong with its on- colour: 5.2:1 light, about 7:1 dark (Design decision 10).
// The ring is secondary-strong: 5.2:1 on white and 4.6:1 on the page background in light, 6.8:1 on the dark surface.
export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-strong";
// For rows that fill their container (the FAQ summaries), where an outside ring would be clipped or collide with a neighbour.
export const FOCUS_INSET = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-secondary-strong";

export const PRIMARY_BUTTON = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-pill border-0 bg-secondary-strong px-5 text-sm font-semibold text-on-secondary-strong no-underline transition-[filter,scale] duration-150 hover:brightness-95 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${FOCUS}`;

export const SECONDARY_BUTTON = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-pill border border-border/25 bg-transparent px-5 text-sm font-semibold text-text-primary no-underline transition-colors duration-150 hover:bg-secondary/[0.08] ${FOCUS}`;
