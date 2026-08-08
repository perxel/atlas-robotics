import type { BeforeSubmitArgs, BeforeSubmitHook } from "./types";

/**
 * Auto-stamps `modifiedDate` to the current time on every save — pairs
 * with `modifiedDateField()` (cms/collection), which hides the field from
 * the admin form entirely so this hook is the only thing that ever writes
 * it. A manually-maintained "last modified" field is realistically always
 * stale (editors forget); this can't be, since it runs unconditionally on
 * every save regardless of what else changed.
 */
export const stampModifiedDate: BeforeSubmitHook = async (args: BeforeSubmitArgs) => {
  return { ...args.values, modifiedDate: new Date().toISOString() };
};
