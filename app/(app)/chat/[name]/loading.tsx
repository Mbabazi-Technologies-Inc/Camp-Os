import { Skeleton } from "@/components/ui/Skeleton";

// A channel loading: the header, a few messages, and the message box.
export default function ChannelLoading() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col md:min-h-screen" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 md:px-6">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="flex-1 space-y-5 px-4 py-6 md:px-6">
        {[0.7, 0.45, 0.6, 0.35].map((w, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className={`h-4 ${w > 0.6 ? "w-3/4" : w > 0.5 ? "w-3/5" : w > 0.4 ? "w-1/2" : "w-1/3"}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-5 md:px-6">
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}
