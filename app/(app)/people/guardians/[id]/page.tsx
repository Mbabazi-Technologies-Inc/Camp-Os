import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeartHandshake, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateGuardian, deleteGuardian } from "../../actions";
import { Input, Textarea, Label } from "@/components/ui/Field";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  BackLink,
  ContactAction,
  DangerZone,
  DetailGrid,
  MetaItem,
  ProfileHeader,
  SectionCard,
} from "@/components/ui/Detail";
import { initials } from "@/lib/initials";

export const metadata: Metadata = { title: "Guardian" };

export const dynamic = "force-dynamic";

export default async function GuardianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: guardian }, { data: campers }] = await Promise.all([
    supabase.from("guardians").select("*").eq("id", id).maybeSingle(),
    supabase.from("campers").select("*").eq("guardian_id", id).order("first_name"),
  ]);

  if (!guardian) notFound();

  const updateWithId = updateGuardian.bind(null, guardian.id);
  const deleteWithId = deleteGuardian.bind(null, guardian.id);
  const name = `${guardian.first_name} ${guardian.last_name}`;

  return (
    <div>
      <BackLink href="/people/guardians" label="All guardians" />
      <ProfileHeader
        title={name}
        badge={initials(name)}
        meta={
          guardian.relationship ? (
            <MetaItem icon={<HeartHandshake size={14} />}>{guardian.relationship}</MetaItem>
          ) : undefined
        }
        actions={
          <>
            {guardian.phone && <ContactAction href={`tel:${guardian.phone}`} label="Call" icon={<Phone size={15} />} />}
            {guardian.email && <ContactAction href={`mailto:${guardian.email}`} label="Email" icon={<Mail size={15} />} />}
          </>
        }
      />

      <DetailGrid
        aside={
          <SectionCard
            title="Campers"
            description={campers?.length ? `${campers.length} linked to ${guardian.first_name}.` : undefined}
          >
            {campers && campers.length > 0 ? (
              <ul className="-my-1 divide-y divide-border">
                {campers.map((c) => (
                  <li key={c.id}>
                    <Link href={`/people/campers/${c.id}`} className="group flex items-center gap-3 py-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-soft text-xs font-semibold text-forest">
                        {initials(`${c.first_name} ${c.last_name}`)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground group-hover:text-primary">
                          {c.first_name} {c.last_name}
                        </span>
                        <span className="block text-xs text-muted">
                          {[c.cabin, c.age != null ? `Age ${c.age}` : null].filter(Boolean).join(" · ") || "No cabin yet"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No campers linked yet. Link one from the camper&apos;s page.</p>
            )}
          </SectionCard>
        }
      >
        <SectionCard title="Details">
          <form action={updateWithId} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" name="first_name" defaultValue={guardian.first_name} required />
              </div>
              <div>
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" name="last_name" defaultValue={guardian.last_name} required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={guardian.email ?? ""} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={guardian.phone ?? ""} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Input id="relationship" name="relationship" defaultValue={guardian.relationship ?? ""} />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} defaultValue={guardian.notes ?? ""} />
            </div>
            <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
          </form>
        </SectionCard>
      </DetailGrid>

      <DangerZone description="Linked campers keep their records but lose the link to this guardian.">
        <form action={deleteWithId}>
          <ConfirmButton confirmMessage="Delete this guardian record? Campers linked to them will keep their record but lose the link.">
            Delete guardian
          </ConfirmButton>
        </form>
      </DangerZone>
    </div>
  );
}
