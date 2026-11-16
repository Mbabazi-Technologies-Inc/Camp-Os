import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cake, Home, Mail, Phone, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateCamper, deleteCamper } from "../../actions";
import { Input, Select, Textarea, Label } from "@/components/ui/Field";
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

export const metadata: Metadata = { title: "Camper" };

export const dynamic = "force-dynamic";

export default async function CamperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: camper }, { data: guardians }] = await Promise.all([
    supabase.from("campers").select("*").eq("id", id).maybeSingle(),
    supabase.from("guardians").select("*").order("last_name"),
  ]);

  if (!camper) notFound();

  const updateWithId = updateCamper.bind(null, camper.id);
  const deleteWithId = deleteCamper.bind(null, camper.id);
  const name = `${camper.first_name} ${camper.last_name}`;
  const guardian = (guardians ?? []).find((g) => g.id === camper.guardian_id);

  return (
    <div>
      <BackLink href="/people/campers" label="All campers" />
      <ProfileHeader
        title={name}
        badge={initials(name)}
        tone="forest"
        meta={
          <>
            <MetaItem icon={<Home size={14} />}>{camper.cabin || "No cabin yet"}</MetaItem>
            {camper.age != null && <MetaItem icon={<Cake size={14} />}>Age {camper.age}</MetaItem>}
          </>
        }
        actions={
          guardian?.phone ? (
            <ContactAction href={`tel:${guardian.phone}`} label={`Call ${guardian.first_name}`} icon={<Phone size={15} />} />
          ) : undefined
        }
      />

      <DetailGrid
        aside={
          <SectionCard title="Guardian" description="Who to contact about this camper.">
            {guardian ? (
              <div>
                <Link href={`/people/guardians/${guardian.id}`} className="group flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                    {initials(`${guardian.first_name} ${guardian.last_name}`)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground group-hover:text-primary">
                      {guardian.first_name} {guardian.last_name}
                    </span>
                    {guardian.relationship && <span className="block text-sm text-muted">{guardian.relationship}</span>}
                  </span>
                </Link>
                <div className="mt-4 space-y-2 text-sm">
                  {guardian.phone && (
                    <a href={`tel:${guardian.phone}`} className="flex items-center gap-2.5 text-foreground hover:text-primary">
                      <Phone size={15} className="text-muted" /> {guardian.phone}
                    </a>
                  )}
                  {guardian.email && (
                    <a href={`mailto:${guardian.email}`} className="flex items-center gap-2.5 break-all text-foreground hover:text-primary">
                      <Mail size={15} className="shrink-0 text-muted" /> {guardian.email}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted">
                <UserRound size={16} /> No guardian linked yet. Choose one in the details.
              </p>
            )}
          </SectionCard>
        }
      >
        <SectionCard title="Details">
          <form action={updateWithId} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" name="first_name" defaultValue={camper.first_name} required />
              </div>
              <div>
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" name="last_name" defaultValue={camper.last_name} required />
              </div>
              <div>
                <Label htmlFor="cabin">Cabin</Label>
                <Input id="cabin" name="cabin" defaultValue={camper.cabin ?? ""} />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input id="age" name="age" type="number" min={0} max={99} defaultValue={camper.age ?? ""} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="guardian_id">Guardian</Label>
                <Select id="guardian_id" name="guardian_id" defaultValue={camper.guardian_id ?? ""}>
                  <option value="">None linked</option>
                  {(guardians ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.first_name} {g.last_name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                defaultValue={camper.notes ?? ""}
                placeholder="Allergies, medical notes, anything staff should know"
              />
            </div>
            <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
          </form>
        </SectionCard>
      </DetailGrid>

      <DangerZone description="Deleting removes this camper's record for good.">
        <form action={deleteWithId}>
          <ConfirmButton confirmMessage="Delete this camper record? This can't be undone.">Delete camper</ConfirmButton>
        </form>
      </DangerZone>
    </div>
  );
}
