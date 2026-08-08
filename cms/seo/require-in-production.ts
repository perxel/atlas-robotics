/**
 * Resolves a value that must be present in production, falling back to a
 * dev default otherwise. Takes the already-read value — never an env var's
 * *name* — because Next.js only inlines `NEXT_PUBLIC_*` vars into the
 * client bundle when they're read as a static literal
 * (`process.env.NEXT_PUBLIC_X`); a dynamic lookup like `process.env[name]`
 * is never inlined and would silently resolve to `undefined` in the
 * browser. Confirmed against this repo's own Next.js docs
 * (node_modules/next/dist/docs/01-app/02-guides/environment-variables.md:
 * "dynamic lookups will not be inlined"). So the call site must read
 * `process.env.WHATEVER` itself, literally, and pass the result in here —
 * this helper only owns the "fail loud in prod, fall back in dev" policy,
 * not the env lookup itself.
 */
export function requireInProduction(
  value: string | undefined,
  options: { fallback: string; errorMessage: string }
): string {
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(options.errorMessage);
  }
  return options.fallback;
}
