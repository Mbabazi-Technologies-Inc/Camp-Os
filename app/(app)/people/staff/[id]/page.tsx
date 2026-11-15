import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, ListPlus, Lock, Mail, MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateStaff, deleteStaff } from "../../actions";
import { StaffFields } from "@/components/people/StaffFields";
import { teamsOf } from "@/lib/routines";
import { requireCamp } from "@/lib/auth";
import { loginIdFor, statusOf } from "@/lib/chat";
import { startDirectMessage } from "@/app/(app)/chat/actions";
import { todayISODate } from "@/lib/dates";
import { TaskItem } from "@/components/tasks/TaskItem";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { BackLink, ContactAction, DangerZone, DetailGrid, MetaItem, ProfileHeader, SectionCard } from "@/components/ui/Detail";
import { initials } from "@/lib/initials";

export const dynamic = "force-dynamic";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: member } = await supabase.from("staff").select("*").eq("id", id).maybeSingle();

  if (!member) notFound();
  const { data: everyone } = await supabase.from("staff").select("*");
  const teams = teamsOf(everyone ?? []);
  const { userId, role } = await requireCamp();
  const login = loginIdFor(member);
  const isMe = login === userId;
  const today = todayISODate();
  const { data: theirTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", member.id)
    .or(`status.eq.open,due_date.eq.${today}`)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(12);

  const updateWithId = updateStaff.bind(null, member.id);
  const deleteWithId = deleteStaff.bind(null, member.id);
  const name = `${member.first_name} ${member.last_name}`;

  return (
    <div>
      <BackLink href="/people/staff" label="All staff" />
      <ProfileHeader
        title={name}
        badge={initials(name)}
        tone="accent"
        meta={
          <>
            {member.role && <MetaItem icon={<BadgeCheck size={14} />}>{member.role}</MetaItem>}
            {statusOf(member, todayISODate()) && (
              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                {statusOf(member, todayISODate())!.emoji} {statusOf(member, todayISODate())!.text}
              </span>
            )}
          </>
        }
        actions={
          <>
            {!isMe && login && !member.under_18 && (
              <form action={startDirectMessage.bind(null, member.id)}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
                >
                  <MessageCircle size={16} /> Message
                </button>
              </form>
            )}
            {member.under_18 && (
              <span
                title="Under-18 staff are messaged in channels, not one-on-one"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm text-muted"
              >
                <Lock size={14} /> Channels only
              </span>
            )}
            {role === "director" && (
              <Link
                href={`/tasks/team?to=person:${member.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-foreground hover:bg-surface-muted"
              >
                <ListPlus size={16} /> Send a task
              </Link>
            )}
            {member.phone && <ContactAction href={`tel:${member.phone}`} label="Call" icon={<Phone size={15} />} />}
            {member.email && <ContactAction href={`mailto:${member.email}`} label="Email" icon={<Mail size={15} />} />}
          </>
        }
      />

      <DetailGrid
        aside={
          <SectionCard title="Tasks" description="Today's tasks and anything still open.">
            {theirTasks && theirTasks.length > 0 ? (
              <div className="-my-2 divide-y divide-border">
                {theirTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Nothing assigned right now.</p>
            )}
          </SectionCard>
        }
      >
        <SectionCard title="Details">
          <form action={updateWithId} className="space-y-4">
            <StaffFields member={member} teams={teams} />
            <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
          </form>
        </SectionCard>
      </DetailGrid>

      <DangerZone description="Deleting removes this staff record for good.">
        <form action={deleteWithId}>
          <ConfirmButton confirmMessage="Delete this staff record? This can't be undone.">Delete staff member</ConfirmButton>
        </form>
      </DangerZone>
    </div>
  );
}
