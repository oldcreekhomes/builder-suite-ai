/** Round to whole cents. */
export const toCents = (n: number) => Math.round(n * 100) / 100;

/** A bill is listed on A/P Aging when at least half a cent is still open (same rule on screen and in emailed PDFs). */
export const isOpenForAging = (open: number) => Math.abs(open) >= 0.005;
