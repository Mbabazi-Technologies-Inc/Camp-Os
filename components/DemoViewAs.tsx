"use client";

import { Eye } from "lucide-react";
import { setDemoViewAs } from "@/app/login/actions";

// Demo only: switch between the director and a staff member to show what
// each of them sees. Submits as soon as a name is picked.
export function DemoViewAs({
  people,
  current,
}: {
  people: { id: string; name: string; detail: string }[];
  current: string;
}) {
  return (
    <form action={setDemoViewAs} className="inline-flex items-center gap-1.5">
      <Eye size={13} className="text-accent" aria-hidden />
      <label htmlFor="demo-view-as" className="text-xs font-semibold text-foreground">
        Viewing as
      </label>
      <select
        id="demo-view-as"
        name="staff_id"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-7 rounded-lg border border-accent/30 bg-surface px-2 text-xs font-medium text-foreground"
      >
        <option value="">Alex Rivera · Director</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name} · {person.detail}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-xs font-medium text-primary">
          Switch
        </button>
      </noscript>
    </form>
  );
}
