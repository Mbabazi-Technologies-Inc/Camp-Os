import { Input, Select, Textarea, Label } from "@/components/ui/Field";
import { RETREAT_STATUS_LABELS } from "@/lib/labels";
import type { Database } from "@/lib/supabase/database.types";

type Group = Database["public"]["Tables"]["retreat_groups"]["Row"];

// The form fields for a retreat group, shared by the add and edit forms.
export function GroupFields({ group }: { group?: Group }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="name">Group name</Label>
          <Input id="name" name="name" defaultValue={group?.name} placeholder="e.g. Grace Fellowship youth retreat" required />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={group?.status ?? "inquiry"}>
            {Object.entries(RETREAT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="arrival_date">Arrives</Label>
          <Input id="arrival_date" name="arrival_date" type="date" defaultValue={group?.arrival_date ?? ""} />
        </div>
        <div>
          <Label htmlFor="departure_date">Leaves</Label>
          <Input id="departure_date" name="departure_date" type="date" defaultValue={group?.departure_date ?? ""} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="headcount">Headcount</Label>
          <Input id="headcount" name="headcount" type="number" min={0} defaultValue={group?.headcount ?? ""} placeholder="20-110" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="contact_name">Contact name</Label>
          <Input id="contact_name" name="contact_name" defaultValue={group?.contact_name ?? ""} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="contact_email">Contact email</Label>
          <Input id="contact_email" name="contact_email" type="email" defaultValue={group?.contact_email ?? ""} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="contact_phone">Contact phone</Label>
          <Input id="contact_phone" name="contact_phone" type="tel" defaultValue={group?.contact_phone ?? ""} />
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={group?.notes ?? ""}
          placeholder="Arrival time, meals, meeting space, anything the team should know"
        />
      </div>
    </div>
  );
}
