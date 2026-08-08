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

// Always a Promise (not `Promise<void> | void`) — Tina's own beforeSubmit
// type requires the function to always return a Promise; every hook here is
// written `async` anyway, so this costs nothing in practice.
export type BeforeSubmitHook = (args: BeforeSubmitArgs) => Promise<void>;
