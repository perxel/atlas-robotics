// Suspense fallback for Header (see app/[locale]/layout.tsx) — mirrors Header's
// exact wrapper classNames/padding so the real header swaps in at the same
// height with no layout shift; content itself is just a pulse placeholder
// since it has no data of its own to show yet.
export default function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex my-container items-center justify-between gap-4 px-4 py-3">
        <div className="h-8 w-32 animate-pulse rounded bg-surface-muted" />
        <div className="hidden h-8 w-48 animate-pulse rounded bg-surface-muted md:block" />
      </div>
    </header>
  );
}
