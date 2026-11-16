import { RowsSkeleton, Skeleton } from "@/components/ui/Skeleton";

// The shape of Home: the scene card with its stats, then the two lists.
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#11343d] to-[#1b5462] p-5 md:p-8">
        <div className="h-5 w-48 rounded-full bg-white/10" />
        <div className="mt-3 h-10 w-72 max-w-full rounded-xl bg-white/15" />
        <div className="mt-3 h-4 w-56 rounded bg-white/10" />
        <div className="mt-4 flex gap-2">
          <div className="h-8 w-28 rounded-full bg-white/10" />
          <div className="h-8 w-28 rounded-full bg-white/10" />
        </div>
        <div className="mt-8 grid grid-cols-3 gap-2 md:gap-3">
          <div className="h-16 rounded-2xl bg-white/[0.07]" />
          <div className="h-16 rounded-2xl bg-white/[0.07]" />
          <div className="h-16 rounded-2xl bg-white/[0.07]" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
        <div>
          <Skeleton className="mb-3 h-5 w-44" />
          <RowsSkeleton rows={4} />
        </div>
        <div>
          <Skeleton className="mb-3 h-5 w-40" />
          <RowsSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}
