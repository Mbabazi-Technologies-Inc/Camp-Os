import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDateRange, nightsBetween } from "@/lib/dates";
import { RETREAT_STATUS_LABELS, RETREAT_STATUS_STYLES } from "@/lib/labels";
import type { Database } from "@/lib/supabase/database.types";

type Group = Database["public"]["Tables"]["retreat_groups"]["Row"];

// One retreat booking in a list: a calendar tile with the arrival date, the
// group, its stay and headcount, and its booking status.
export function GroupRow({ group }: { group: Group }) {
  const arrival = group.arrival_date ? new Date(group.arrival_date + "T00:00:00") : null;
  const nights = nightsBetween(group.arrival_date, group.departure_date);
  const muted = group.status === "cancelled";

  return (
    <Link href={`/groups/${group.id}`} className="group flex items-center gap-3 px-1 py-3">
      <span
        className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border ${
          muted ? "border-border bg-surface-muted text-muted" : "border-forest/20 bg-forest-soft text-forest"
        }`}
      >
        <span className="text-[10px] font-semibold uppercase leading-none tracking-wide">
          {arrival ? arrival.toLocaleDateString("en-US", { month: "short" }) : "TBC"}
        </span>
        <span className="font-display text-lg font-semibold leading-tight">{arrival ? arrival.getDate() : "-"}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate font-medium transition-colors group-hover:text-primary ${muted ? "text-muted line-through" : "text-foreground"}`}
        >
          {group.name}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
          <span>
            {formatDateRange(group.arrival_date, group.departure_date)}
            {nights ? ` · ${nights} night${nights === 1 ? "" : "s"}` : ""}
          </span>
          {group.headcount != null && (
            <span className="inline-flex items-center gap-1">
              <Users size={13} /> {group.headcount}
            </span>
          )}
          <Badge className={`!px-2 !py-0.5 sm:hidden ${RETREAT_STATUS_STYLES[group.status]}`}>
            {RETREAT_STATUS_LABELS[group.status]}
          </Badge>
        </span>
      </span>
      <span className="hidden shrink-0 sm:block">
        <Badge className={RETREAT_STATUS_STYLES[group.status]}>{RETREAT_STATUS_LABELS[group.status]}</Badge>
      </span>
    </Link>
  );
}
