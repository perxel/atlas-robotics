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

export type BeforeSubmitHook = (args: BeforeSubmitArgs) => Promise<void> | void;
