import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import type { Database } from "@/lib/supabase/database.types";

type Staff = Database["public"]["Tables"]["staff"]["Row"];

/**
 * The fields of a staff record, shared by the add form and the edit page.
 * "Team" is what tasks are sent to; summer staff get an end date for their
 * access (shown only when Summer is picked, in CSS).
 */
export function StaffFields({ member, teams }: { member?: Staff; teams: string[] }) {
  const listId = member ? `teams-${member.id}` : "teams-new";
  return (
    <div className="group/staff space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" name="first_name" defaultValue={member?.first_name} required />
        </div>
        <div>
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" name="last_name" defaultValue={member?.last_name} required />
        </div>
        <div>
          <Label htmlFor="role">Job title</Label>
          <Input id="role" name="role" defaultValue={member?.role ?? ""} placeholder="e.g. Cabin 4 counsellor" />
        </div>
        <div>
          <Label htmlFor="team">Team</Label>
          <Input
            id="team"
            name="team"
            list={listId}
            defaultValue={member?.team ?? ""}
            placeholder="e.g. Cabin leaders"
          />
          <datalist id={listId}>
            {teams.map((team) => (
              <option key={team} value={team} />
            ))}
          </datalist>
        </div>
        <div>
          <Label htmlFor="season">On staff</Label>
          <Select id="season" name="season" defaultValue={member?.season ?? "year_round"}>
            <option value="year_round">Year-round</option>
            <option value="summer" className="season-summer">
              Summer only
            </option>
          </Select>
        </div>
        <div className="hidden group-has-[.season-summer:checked]/staff:block">
          <Label htmlFor="access_ends">Access ends</Label>
          <Input id="access_ends" name="access_ends" type="date" defaultValue={member?.access_ends ?? ""} />
        </div>
        <label className="col-span-2 flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            name="under_18"
            defaultChecked={member?.under_18 ?? false}
            className="h-4 w-4 rounded accent-primary"
          />
          <span>
            <span className="font-medium text-foreground">Under 18</span>
            <span className="text-muted"> · for CITs and junior staff, so safeguarding rules apply</span>
          </span>
        </label>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={member?.email ?? ""} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={member?.phone ?? ""} />
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={member?.notes ?? ""} />
      </div>
    </div>
  );
}

/** Small labels for a staff row: team, summer, under 18, access ended. */
export function staffTags(member: Staff, today: string): { label: string; tone: string }[] {
  const tags: { label: string; tone: string }[] = [];
  if (member.team) tags.push({ label: member.team, tone: "bg-primary-soft text-primary" });
  if (member.season === "summer") {
    const ended = member.access_ends && member.access_ends < today;
    tags.push({
      label: ended ? "Summer · access ended" : "Summer",
      tone: ended ? "bg-surface-muted text-muted" : "bg-accent-soft text-warning",
    });
  }
  if (member.under_18) tags.push({ label: "Under 18", tone: "bg-danger-soft text-danger" });
  return tags;
}
