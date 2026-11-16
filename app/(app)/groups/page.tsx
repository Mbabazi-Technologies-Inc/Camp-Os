import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Trees as TreesIcon } from "lucide-react";
import { createRetreatGroup } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { AddPanel } from "@/components/ui/AddPanel";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { GroupFields } from "@/components/groups/GroupFields";
import { GroupRow } from "@/components/groups/GroupRow";
import { todayISODate } from "@/lib/dates";

export const metadata: Metadata = { title: "Retreat groups" };

export const dynamic = "force-dynamic";

export default async function RetreatGroupsPage() {
  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("retreat_groups")
    .select("*")
    .order("arrival_date", { ascending: true, nullsFirst: false });

  const today = todayISODate();
  const all = groups ?? [];
  const lastDay = (g: (typeof all)[number]) => g.departure_date ?? g.arrival_date;
  const upcoming = all.filter((g) => g.status !== "cancelled" && (!lastDay(g) || lastDay(g)! >= today));
  const past = all.filter((g) => g.status !== "cancelled" && lastDay(g) && lastDay(g)! < today).reverse();
  const cancelled = all.filter((g) => g.status === "cancelled");

  const confirmed = upcoming.filter((g) => g.status === "confirmed");
  const guests = confirmed.reduce((sum, g) => sum + (g.headcount ?? 0), 0);
  const pendingCount = upcoming.filter((g) => g.status === "inquiry" || g.status === "tentative").length;

  return (
    <div>
      <PageHeader icon={TreesIcon} eyebrow="Retreat centre"
        title="Retreat groups"
        description="Bookings for the retreat centre - groups of 20 to 110, September to June."
      />

      <AddPanel label="New group">
        <form action={createRetreatGroup} className="space-y-4">
          <GroupFields />
          <SubmitButton pendingText="Saving..." className="w-full sm:w-auto">
            Add group
          </SubmitButton>
        </form>
      </AddPanel>

      <dl className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-card">
        {[
          ["Confirmed groups", String(confirmed.length)],
          ["Guests coming", String(guests)],
          ["Awaiting a reply", String(pendingCount)],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse bg-surface px-3 py-4 text-center">
            <dt className="mt-0.5 text-xs text-muted">{label}</dt>
            <dd className="font-display text-3xl font-semibold text-primary">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-foreground">Upcoming</h2>
        <Card className="px-3">
          {upcoming.length > 0 ? (
            <div className="divide-y divide-border">
              {upcoming.map((g) => (
                <GroupRow key={g.id} group={g} />
              ))}
            </div>
          ) : (
            <div className="py-6">
              <EmptyState title="No upcoming groups" description="Add a booking when a group gets in touch." />
            </div>
          )}
        </Card>
      </section>

      {past.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 font-semibold text-foreground">Past stays</h2>
          <Card className="px-3">
            <div className="divide-y divide-border">
              {past.map((g) => (
                <GroupRow key={g.id} group={g} />
              ))}
            </div>
          </Card>
        </section>
      )}

      {cancelled.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-foreground">Cancelled</h2>
          <Card className="px-3">
            <div className="divide-y divide-border">
              {cancelled.map((g) => (
                <GroupRow key={g.id} group={g} />
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
