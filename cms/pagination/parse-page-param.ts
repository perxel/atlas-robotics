/**
 * Parses a `/page/[pageNum]` route param — a positive integer with no
 * leading zero (so "2" and "02" aren't two URLs for the same page) — or
 * null if it isn't one.
 */
export function parsePageParam(value: string): number | null {
  return /^[1-9]\d*$/.test(value) ? Number(value) : null;
}
