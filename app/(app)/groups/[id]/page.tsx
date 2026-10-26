import { notFound } from "next/navigation";
import { CalendarDays, Mail, Moon, Phone, Trees, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateRetreatGroup, deleteRetreatGroup } from "../actions";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Badge } from "@/components/ui/Badge";
import {
  BackLink,
  ContactAction,
  DangerZone,
  DetailGrid,
  MetaItem,
  ProfileHeader,
  SectionCard,
} from "@/components/ui/Detail";
import { GroupFields } from "@/components/groups/GroupFields";
import { formatDateRange, nightsBetween } from "@/lib/dates";
import { RETREAT_STATUS_LABELS, RETREAT_STATUS_STYLES } from "@/lib/labels";

export const dynamic = "force-dynamic";

function longDate(iso: string | null) {
  if (!iso) return "To be confirmed";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default async function RetreatGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: group } = await supabase.from("retreat_groups").select("*").eq("id", id).maybeSingle();

  if (!group) notFound();

  const updateWithId = updateRetreatGroup.bind(null, group.id);
  const deleteWithId = deleteRetreatGroup.bind(null, group.id);
  const nights = nightsBetween(group.arrival_date, group.departure_date);

  return (
    <div>
      <BackLink href="/groups" label="All retreat groups" />
      <ProfileHeader
        title={group.name}
        badge={<Trees size={24} />}
        tone={group.status === "cancelled" ? "primary" : "forest"}
        meta={
          <>
            <MetaItem icon={<CalendarDays size={14} />}>{formatDateRange(group.arrival_date, group.departure_date)}</MetaItem>
            {group.headcount != null && <MetaItem icon={<Users size={14} />}>{group.headcount} guests</MetaItem>}
            <Badge className={RETREAT_STATUS_STYLES[group.status]}>{RETREAT_STATUS_LABELS[group.status]}</Badge>
          </>
        }
        actions={
          <>
            {group.contact_phone && (
              <ContactAction href={`tel:${group.contact_phone}`} label="Call" icon={<Phone size={15} />} />
            )}
            {group.contact_email && (
              <ContactAction href={`mailto:${group.contact_email}`} label="Email" icon={<Mail size={15} />} />
            )}
          </>
        }
      />

      <DetailGrid
        aside={
          <>
            <SectionCard title="The stay">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <CalendarDays size={16} className="mt-0.5 shrink-0 text-forest" />
                  <span>
                    <span className="block text-xs text-muted">Arrives</span>
                    <span className="font-medium text-foreground">{longDate(group.arrival_date)}</span>
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CalendarDays size={16} className="mt-0.5 shrink-0 text-forest" />
                  <span>
                    <span className="block text-xs text-muted">Leaves</span>
                    <span className="font-medium text-foreground">{longDate(group.departure_date)}</span>
                  </span>
                </li>
                {nights != null && (
                  <li className="flex items-center gap-2.5">
                    <Moon size={16} className="shrink-0 text-forest" />
                    <span className="font-medium text-foreground">
                      {nights} night{nights === 1 ? "" : "s"}
                    </span>
                  </li>
                )}
              </ul>
            </SectionCard>
            {(group.contact_name || group.contact_email || group.contact_phone) && (
              <SectionCard title="Group contact">
                <p className="font-semibold text-foreground">{group.contact_name ?? "Contact"}</p>
                <div className="mt-2 space-y-2 text-sm">
                  {group.contact_phone && (
                    <a href={`tel:${group.contact_phone}`} className="flex items-center gap-2.5 text-foreground hover:text-primary">
                      <Phone size={15} className="text-muted" /> {group.contact_phone}
                    </a>
                  )}
                  {group.contact_email && (
                    <a href={`mailto:${group.contact_email}`} className="flex items-center gap-2.5 break-all text-foreground hover:text-primary">
                      <Mail size={15} className="shrink-0 text-muted" /> {group.contact_email}
                    </a>
                  )}
                </div>
              </SectionCard>
            )}
          </>
        }
      >
        <SectionCard title="Booking details">
          <form action={updateWithId} className="space-y-4">
            <GroupFields group={group} />
            <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
          </form>
        </SectionCard>
      </DetailGrid>

      <DangerZone description="To keep a record of the booking, set its status to Cancelled instead of deleting it.">
        <form action={deleteWithId}>
          <ConfirmButton confirmMessage="Delete this retreat group? This can't be undone.">Delete group</ConfirmButton>
        </form>
      </DangerZone>
    </div>
  );
}
