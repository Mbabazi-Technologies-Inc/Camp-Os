import { Skeleton } from "@/components/ui/Skeleton";

// Shown while any staff page loads, so a tap always gets an immediate response.
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-56 mb-2" />
      <Skeleton className="h-4 w-80 max-w-full mb-6" />
      <Skeleton className="h-11 w-36 rounded-xl mb-6" />
      <div className="space-y-px overflow-hidden rounded-2xl border border-border bg-surface p-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
