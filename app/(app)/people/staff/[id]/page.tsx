import { notFound } from "next/navigation";
import { BadgeCheck, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateStaff, deleteStaff } from "../../actions";
import { Input, Textarea, Label } from "@/components/ui/Field";
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

      <DetailGrid>
        <SectionCard title="Details">
          <form action={updateWithId} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" name="first_name" defaultValue={member.first_name} required />
              </div>
              <div>
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" name="last_name" defaultValue={member.last_name} required />
              </div>
              <div className="col-span-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" name="role" defaultValue={member.role ?? ""} placeholder="e.g. Cabin counsellor" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={member.email ?? ""} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={member.phone ?? ""} />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} defaultValue={member.notes ?? ""} />
            </div>
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
