import type { Metadata } from "next";
import Link from "next/link";
import { Tent as TentIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createCamper } from "../actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { initials } from "@/lib/initials";
import { AddPanel } from "@/components/ui/AddPanel";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select, Textarea, Label } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { SearchBox } from "@/components/people/SearchBox";

export const metadata: Metadata = { title: "Campers" };

export const dynamic = "force-dynamic";

export default async function CampersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let campersQuery = supabase
    .from("campers")
    .select("*")
    .order("last_name", { ascending: true });
  if (q?.trim()) {
    const term = q.trim().replaceAll("%", "").replaceAll(",", "");
    campersQuery = campersQuery.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,cabin.ilike.%${term}%`
    );
  }

  const [{ data: campers }, { data: guardians }] = await Promise.all([
    campersQuery,
    supabase.from("guardians").select("id, first_name, last_name").order("last_name"),
  ]);

  const guardianById = new Map((guardians ?? []).map((g) => [g.id, g]));

  return (
    <div>
      <PageHeader icon={TentIcon} eyebrow="People"
        title="Campers"
        description="Basic records for the campers in your care."
      />

      <AddPanel label="Add camper">
        <form action={createCamper} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" name="first_name" required />
            </div>
            <div>
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" name="last_name" required />
            </div>
            <div>
              <Label htmlFor="cabin">Cabin</Label>
              <Input id="cabin" name="cabin" placeholder="Cabin 4" />
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input id="age" name="age" type="number" min={0} max={99} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="guardian_id">Guardian</Label>
              <Select id="guardian_id" name="guardian_id" defaultValue="">
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
              rows={2}
              placeholder="Allergies, medical notes, anything staff should know"
            />
          </div>
          <SubmitButton pendingText="Saving..." className="w-full sm:w-auto">
            Add camper
          </SubmitButton>
        </form>
      </AddPanel>

      <SearchBox placeholder="Search campers by name or cabin..." defaultValue={q} />

      <Card className="px-3">
        {campers && campers.length > 0 ? (
          <div className="divide-y divide-border">
            {campers.map((camper) => {
              const guardian = camper.guardian_id ? guardianById.get(camper.guardian_id) : null;
              return (
                <Link
                  key={camper.id}
                  href={`/people/campers/${camper.id}`}
                  className="group flex items-center gap-3 py-3 px-1"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold bg-forest-soft text-forest">
                    {initials(`${camper.first_name} ${camper.last_name}`)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate transition-colors group-hover:text-primary">
                      {camper.first_name} {camper.last_name}
                    </p>
                    <p className="text-sm text-muted truncate">
                      {[camper.cabin, camper.age ? `Age ${camper.age}` : null]
                        .filter(Boolean)
                        .join(" · ") || "No cabin or age on file"}
                    </p>
                  </div>
                  {guardian && (
                    <span className="text-xs text-muted shrink-0">
                      {guardian.first_name} {guardian.last_name}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-6">
            <EmptyState
              title={q ? "No campers match your search" : "No campers yet"}
              description={q ? "Try a different name or cabin." : "Add your first camper above."}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
