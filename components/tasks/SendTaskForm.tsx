import { CalendarDays, ChevronDown, Clock, ListChecks, Send, Users } from "lucide-react";
import { sendTask } from "@/app/(app)/tasks/team/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { WEEKDAYS } from "@/lib/routines";
import type { Database } from "@/lib/supabase/database.types";

type Staff = Database["public"]["Tables"]["staff"]["Row"];

const REPEATS = [
  { value: "once", label: "Once", marker: "rep-once" },
  { value: "daily", label: "Every day", marker: "rep-daily" },
  { value: "weekly", label: "Some days", marker: "rep-weekly" },
] as const;

const PRIORITIES = [
  { value: "medium", label: "Normal" },
  { value: "high", label: "High" },
  { value: "low", label: "Low" },
] as const;

const pill =
  "h-9 rounded-full border border-transparent bg-surface-muted px-3.5 text-sm font-medium text-foreground transition-colors hover:border-border focus:border-primary focus:outline-none";
const rowLabel = "w-14 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted";

/**
 * The director's "send a task" form, kept short: what, who, how often and
 * when, each on one line of small pills. Checklist and notes are tucked
 * under "More options". Which lines show depends on "how often", done in
 * CSS so it works without JavaScript.
 */
export function SendTaskForm({
  staff,
  teams,
  today,
  seasonEnd,
  defaultTo = "",
}: {
  staff: Staff[];
  teams: { name: string; size: number }[];
  today: string;
  /** Suggested end date for a repeating task, so summer routines stop with the season. */
  seasonEnd: string | null;
  /** Pre-picked recipient, e.g. "person:<id>" when coming from someone's profile. */
  defaultTo?: string;
}) {
  return (
    <form action={sendTask} className="group/send space-y-3.5">
      <input
        name="title"
        required
        aria-label="Task"
        placeholder="What needs doing? e.g. Morning cabin inspection"
        className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
      />

      {/* Who */}
      <div className="flex items-center gap-2">
        <span className={rowLabel}>To</span>
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Send to</span>
          <Users size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <select name="send_to" required defaultValue={defaultTo} className={`${pill} w-full appearance-none pl-9 pr-8`}>
            <option value="" disabled>
              A team or a person
            </option>
            {teams.length > 0 && (
              <optgroup label="Teams (each person gets their own copy)">
                {teams.map((team) => (
                  <option key={team.name} value={`team:${team.name}`}>
                    {team.name} team · {team.size}
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
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        </label>
      </div>

      {/* How often */}
      <div className="flex items-center gap-2">
        <span className={rowLabel}>Repeat</span>
        <div className="flex flex-1 gap-1 rounded-full bg-surface-muted p-1" role="radiogroup" aria-label="Repeats">
          {REPEATS.map((option) => (
            <label key={option.value} className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="repeats"
                value={option.value}
                defaultChecked={option.value === "once"}
                className={`peer sr-only ${option.marker}`}
              />
              <span className="flex h-7 items-center justify-center rounded-full text-xs font-semibold text-muted transition-colors peer-checked:bg-surface peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="hidden items-center gap-2 group-has-[.rep-weekly:checked]/send:flex">
        <span className={rowLabel}>Days</span>
        <div className="flex flex-1 flex-wrap gap-1">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <label key={day} className="cursor-pointer">
              <input type="checkbox" name="weekdays" value={day} defaultChecked={day >= 1 && day <= 5} className="peer sr-only" />
              <span className="flex h-8 w-10 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40">
                {WEEKDAYS[day].slice(0, 2)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* When */}
      <div className="flex items-center gap-2">
        <span className={rowLabel}>When</span>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
          <label className="relative hidden min-w-0 group-has-[.rep-once:checked]/send:block">
            <span className="sr-only">Due date</span>
            <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input type="date" name="due_date" defaultValue={today} className={`${pill} w-full min-w-0 pl-8`} />
          </label>
          <label className="relative block min-w-0">
            <span className="sr-only">Due by</span>
            <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input type="time" name="due_time" className={`${pill} w-full min-w-0 pl-8`} />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2 group-has-[.rep-once:checked]/send:hidden">
        <span className={rowLabel}>Runs</span>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
          <input type="date" name="starts_on" defaultValue={today} aria-label="Starts" className={`${pill} w-full min-w-0`} />
          <input type="date" name="ends_on" defaultValue={seasonEnd ?? ""} aria-label="Ends (optional)" className={`${pill} w-full min-w-0`} />
        </div>
      </div>

      {/* How urgent */}
      <div className="flex items-center gap-2">
        <span className={rowLabel}>Priority</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Priority">
          {PRIORITIES.map((p) => (
            <label key={p.value} className="cursor-pointer">
              <input type="radio" name="priority" value={p.value} defaultChecked={p.value === "medium"} className="peer sr-only" />
              <span
                className={`flex h-8 items-center rounded-full border border-border px-3 text-xs font-semibold text-muted transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${
                  p.value === "high"
                    ? "peer-checked:border-danger peer-checked:bg-danger peer-checked:text-white"
                    : "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white"
                }`}
              >
                {p.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <details className="group/more rounded-xl border border-dashed border-border px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
          <ListChecks size={15} /> More options: checklist and notes
          <ChevronDown size={14} className="ml-auto transition-transform group-open/more:rotate-180" />
        </summary>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Checklist, one step per line</span>
            <textarea
              name="checklist"
              rows={3}
              placeholder={"Beds made, floor clear\nMeds box locked"}
              className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Notes</span>
            <textarea
              name="description"
              rows={2}
              placeholder="Anything they should know"
              className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
        </div>
      </details>

      <SubmitButton pendingText="Sending..." className="w-full sm:w-auto">
        <Send size={16} /> Send task
      </SubmitButton>
    </form>
  );
}
