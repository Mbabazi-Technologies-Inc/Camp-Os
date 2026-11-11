import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createStaff } from "../actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { initials } from "@/lib/initials";
import { AddPanel } from "@/components/ui/AddPanel";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StaffFields, staffTags } from "@/components/people/StaffFields";
import { teamsOf } from "@/lib/routines";
import { todayISODate } from "@/lib/dates";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { SearchBox } from "@/components/people/SearchBox";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("staff").select("*").order("last_name", { ascending: true });
  if (q?.trim()) {
    const term = q.trim().replaceAll("%", "").replaceAll(",", "");
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,role.ilike.%${term}%,team.ilike.%${term}%`
    );
  }
  const [{ data: staff }, { data: everyone }] = await Promise.all([
    query,
    supabase.from("staff").select("*"),
  ]);
  const teams = teamsOf(everyone ?? []);
  const today = todayISODate();

  return (
    <div>
      <PageHeader title="Staff" description="Basic records for your camp staff." />

      <AddPanel label="Add staff member">
        <form action={createStaff} className="space-y-3">
          <StaffFields teams={teams} />
          <SubmitButton pendingText="Saving..." className="w-full sm:w-auto">
            Add staff member
          </SubmitButton>
        </form>
      </AddPanel>

      <SearchBox placeholder="Search staff by name, role or team..." defaultValue={q} />

      <Card className="px-3">
        {staff && staff.length > 0 ? (
          <div className="divide-y divide-border">
            {staff.map((member) => (
              <Link
                key={member.id}
                href={`/people/staff/${member.id}`}
                className="group flex items-center gap-3 py-3 px-1"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold bg-accent-soft text-[#9a5a12]">
                  {initials(`${member.first_name} ${member.last_name}`)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate transition-colors group-hover:text-primary">
                    {member.first_name} {member.last_name}
                  </p>
                  <p className="text-sm text-muted truncate">
                    {[member.role, member.phone, member.email].filter(Boolean).join(" · ") ||
                      "No details on file"}
                  </p>
                  {staffTags(member, today).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {staffTags(member, today).map((tag) => (
                        <span key={tag.label} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tag.tone}`}>
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-6">
            <EmptyState
              title={q ? "No staff match your search" : "No staff yet"}
              description={q ? "Try a different name or role." : "Add your first staff member above."}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
