export type BeforeSubmitArgs = {
  values: Record<string, unknown>;
  cms: {
    api: {
      tina: {
        request: (
          query: string,
          opts: { variables: Record<string, unknown> }
        ) => Promise<{ data?: Record<string, unknown> }>;
      };
    };
  };
  form: { path: string };
};

// Always a Promise (not `Promise<... > | ...`) — Tina's own beforeSubmit
// type requires the function to always return a Promise; every hook here is
// written `async` anyway, so this costs nothing in practice.
//
// A hook that only validates/blocks (throws to stop the save, e.g.
// slugLifecycleGuard) never needs to return anything. A hook that *edits*
// a value (e.g. stampModifiedDate) must return the full replacement values
// object — confirmed against `tinacms/dist/index.js`'s own handleSubmit:
// `let submittedValues = values; ... const valOverride = await
// collection.ui.beforeSubmit(...); if (valOverride) submittedValues =
// valOverride;` — mutating `args.values` in place is silently discarded,
// only a truthy return value ever takes effect.
export type BeforeSubmitHook = (args: BeforeSubmitArgs) => Promise<Record<string, unknown> | void>;

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
