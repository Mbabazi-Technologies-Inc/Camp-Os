import { Send } from "lucide-react";
import { sendTask } from "@/app/(app)/tasks/team/actions";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TASK_PRIORITY_LABELS } from "@/lib/labels";
import { WEEKDAYS } from "@/lib/routines";
import type { Database } from "@/lib/supabase/database.types";

type Staff = Database["public"]["Tables"]["staff"]["Row"];

const REPEATS = [
  { value: "once", label: "Once", marker: "rep-once" },
  { value: "daily", label: "Every day", marker: "rep-daily" },
  { value: "weekly", label: "Some days", marker: "rep-weekly" },
] as const;

/**
 * The director's "send a task" form. Sending to a team gives each person on
 * it their own copy; repeating turns it into a routine. Which fields show
 * depends on the "repeats" choice, done in CSS so it works without JavaScript.
 */
export function SendTaskForm({
  staff,
  teams,
  today,
  seasonEnd,
}: {
  staff: Staff[];
  teams: { name: string; size: number }[];
  today: string;
  /** Suggested end date for a repeating task, so summer routines stop with the season. */
  seasonEnd: string | null;
}) {
  return (
    <form action={sendTask} className="group/send space-y-4">
      <div>
        <Label htmlFor="send-title">Task</Label>
        <Input id="send-title" name="title" required placeholder="e.g. Morning cabin inspection" />
      </div>

      <div>
        <Label htmlFor="send-to">Send to</Label>
        <Select id="send-to" name="send_to" required defaultValue="">
          <option value="" disabled>
            Choose a team or a person
          </option>
          {teams.length > 0 && (
            <optgroup label="Teams (everyone gets their own copy)">
              {teams.map((team) => (
                <option key={team.name} value={`team:${team.name}`}>
                  {team.name} · {team.size} {team.size === 1 ? "person" : "people"}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="People">
            {staff.map((member) => (
              <option key={member.id} value={`person:${member.id}`}>
                {member.first_name} {member.last_name}
                {member.role ? ` · ${member.role}` : ""}
              </option>
            ))}
          </optgroup>
        </Select>
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-foreground">Repeats</legend>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1">
          {REPEATS.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="repeats"
                value={option.value}
                defaultChecked={option.value === "once"}
                className={`peer sr-only ${option.marker}`}
              />
              <span className="flex h-9 items-center justify-center rounded-lg text-sm font-medium text-muted transition-colors peer-checked:bg-surface peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="hidden group-has-[.rep-weekly:checked]/send:block">
        <legend className="mb-1.5 block text-sm font-medium text-foreground">On these days</legend>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <label key={day} className="cursor-pointer">
              <input
                type="checkbox"
                name="weekdays"
                value={day}
                defaultChecked={day >= 1 && day <= 5}
                className="peer sr-only"
              />
              <span className="flex h-9 w-12 items-center justify-center rounded-lg border border-border text-sm font-medium text-muted transition-colors peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40">
                {WEEKDAYS[day]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="hidden group-has-[.rep-once:checked]/send:block">
          <Label htmlFor="send-due">Due date</Label>
          <Input id="send-due" name="due_date" type="date" defaultValue={today} />
        </div>
        <div>
          <Label htmlFor="send-time">Due by</Label>
          <Input id="send-time" name="due_time" type="time" />
        </div>
        <div>
          <Label htmlFor="send-priority">Priority</Label>
          <Select id="send-priority" name="priority" defaultValue="medium">
            {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 group-has-[.rep-once:checked]/send:hidden">
        <div>
          <Label htmlFor="send-start">Starts</Label>
          <Input id="send-start" name="starts_on" type="date" defaultValue={today} />
        </div>
        <div>
          <Label htmlFor="send-end">Ends</Label>
          <Input id="send-end" name="ends_on" type="date" defaultValue={seasonEnd ?? ""} />
        </div>
        <p className="col-span-2 -mt-1 text-xs text-muted">
          Leave the end empty to keep it going. Each day it runs, it appears on everyone&apos;s task list on its own.
        </p>
      </div>

      <div>
        <Label htmlFor="send-checklist">Checklist (optional)</Label>
        <Textarea
          id="send-checklist"
          name="checklist"
          rows={3}
          className="min-h-0"
          placeholder={"One step per line, e.g.\nBeds made, floor clear\nMeds box locked"}
        />
        <p className="mt-1 text-xs text-muted">The task is done once every step is ticked, so done means the same for everyone.</p>
      </div>

      <div>
        <Label htmlFor="send-notes">Notes (optional)</Label>
        <Textarea id="send-notes" name="description" rows={2} className="min-h-0" placeholder="Anything they should know" />
      </div>

      <SubmitButton pendingText="Sending...">
        <Send size={16} /> Send task
      </SubmitButton>
    </form>
  );
}
