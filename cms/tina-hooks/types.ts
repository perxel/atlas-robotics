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
