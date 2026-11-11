import { notFound } from "next/navigation";
import { BadgeCheck, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateStaff, deleteStaff } from "../../actions";
import { StaffFields } from "@/components/people/StaffFields";
import { teamsOf } from "@/lib/routines";
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
        meta={member.role ? <MetaItem icon={<BadgeCheck size={14} />}>{member.role}</MetaItem> : undefined}
        actions={
          <>
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
