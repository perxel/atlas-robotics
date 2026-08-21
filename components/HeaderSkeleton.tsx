// Suspense fallback for Header (see app/[locale]/layout.tsx) — mirrors Header's
// exact wrapper classNames/padding so the real header swaps in at the same
// height with no layout shift; content itself is just a pulse placeholder
// since it has no data of its own to show yet.
//
// The row's `min-h-*` is deliberately responsive, not a single fixed value:
// below `md`, NavMenu's mobile hamburger button (`h-9 w-9`, NavMenu.tsx) is
// what's actually visible and governs the real header's height — it's taller
// than the `h-8` logo. At `md` and up, the hamburger is hidden and the `h-8`
// logo governs instead. A single fixed height here would be right for one
// breakpoint and off by 4px on the other, shifting the page when the real
// header swaps in.
export default function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex my-container min-h-9 items-center justify-between gap-4 px-4 py-3 md:min-h-8">
        <div className="h-8 w-32 animate-pulse rounded bg-surface-muted" />
        <div className="hidden h-8 w-48 animate-pulse rounded bg-surface-muted md:block" />
      </div>
    </header>
  );
}
