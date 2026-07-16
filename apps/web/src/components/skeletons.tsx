// Shared loading-skeleton primitives for list/detail pages — pulse blocks
// standing in for text while the initial fetch is in flight, matching each
// page's own layout so nothing visibly reflows once real data lands.

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border-default bg-panel">
      <div className="flex items-center gap-6 border-b border-border-default bg-surface px-3.5 py-2.5">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-2.5 w-16 animate-pulse rounded bg-raised2" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 border-t border-border-subtle px-3.5 py-3 first:border-t-0">
          {Array.from({ length: cols }).map((__, j) => (
            <div
              key={j}
              className="h-3 animate-pulse rounded bg-raised2"
              style={{ width: j === 0 ? 160 : 60, flex: j === 0 ? 1 : undefined, maxWidth: j === 0 ? 220 : 60 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 rounded-md border border-border-default bg-panel p-3.5">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-raised2" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-40 animate-pulse rounded bg-raised2" />
            <div className="h-2.5 w-64 animate-pulse rounded bg-raised2" />
          </div>
          <div className="h-5 w-16 shrink-0 animate-pulse rounded-full bg-raised2" />
        </div>
      ))}
    </div>
  );
}

export function PanelListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="p-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5 rounded-md px-2.5 py-2.5">
          <div className="h-3 w-32 animate-pulse rounded bg-raised2" />
          <div className="h-2.5 w-48 animate-pulse rounded bg-raised2" />
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-border-default bg-panel p-3.5">
          <div className="h-2.5 w-16 animate-pulse rounded bg-raised2" />
          <div className="mt-2.5 h-5 w-10 animate-pulse rounded bg-raised2" />
          <div className="mt-3 h-1 w-full animate-pulse rounded-full bg-raised2" />
        </div>
      ))}
    </div>
  );
}
