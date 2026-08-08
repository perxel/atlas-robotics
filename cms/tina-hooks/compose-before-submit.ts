import type { BeforeSubmitArgs, BeforeSubmitHook } from "./types";

/**
 * Combines several independent `ui.beforeSubmit` hooks into the one slot
 * Tina gives each collection. Sequential, fail-fast: each hook is awaited
 * before the next runs, and the first thrown Error stops the save right
 * there — same single-message UX a lone hook already has, just no longer
 * assuming it's the only thing wired into beforeSubmit.
 *
 * Threads value overrides through the chain: each hook sees the previous
 * hook's returned values (not the original, stale `args.values`), so e.g.
 * a validation hook running after stampModifiedDate still sees the
 * stamped value. The final accumulated values are always returned, so
 * Tina's own beforeSubmit contract (see BeforeSubmitHook's comment) is
 * satisfied even when every hook in the list only validates.
 */
export function composeBeforeSubmit(hooks: BeforeSubmitHook[]): BeforeSubmitHook {
  return async (args: BeforeSubmitArgs) => {
    let values = args.values;
    for (const hook of hooks) {
      const override = await hook({ ...args, values });
      if (override) values = override;
    }
    return values;
  };
}
