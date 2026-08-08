import type { BeforeSubmitArgs, BeforeSubmitHook } from "./types";

/**
 * Combines several independent `ui.beforeSubmit` hooks into the one slot
 * Tina gives each collection. Sequential, fail-fast: each hook is awaited
 * before the next runs, and the first thrown Error stops the save right
 * there — same single-message UX a lone hook already has, just no longer
 * assuming it's the only thing wired into beforeSubmit.
 */
export function composeBeforeSubmit(hooks: BeforeSubmitHook[]): BeforeSubmitHook {
  return async (args: BeforeSubmitArgs) => {
    for (const hook of hooks) {
      await hook(args);
    }
  };
}
