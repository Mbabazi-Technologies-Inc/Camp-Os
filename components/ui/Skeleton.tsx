export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** The shape of a PageHeader card, so pages don't jump when they load. */
export function HeaderSkeleton() {
  return (
    <div className="mb-6 flex items-center gap-4 rounded-3xl border border-border bg-surface px-5 py-5 shadow-card md:px-6">
      <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
    </div>
  );
}

/** Rows like TaskItem / list rows: a circle, two lines of text. */
export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-3 shadow-card">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border py-3.5 last:border-0">
          <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className={["h-4 w-3/5", "h-4 w-1/2", "h-4 w-2/3", "h-4 w-2/5", "h-4 w-1/2"][i % 5]} />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <HeaderSkeleton />
      <Skeleton className="mb-6 h-11 w-40 rounded-xl" />
      <RowsSkeleton />
    </div>
  );
}
