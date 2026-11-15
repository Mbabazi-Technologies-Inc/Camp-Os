import { ArrowUp, CalendarDays, ChevronDown, Flag, Plus, User, type LucideIcon } from "lucide-react";
import { campISODate, weekdayOffsets } from "@/lib/dates";
import { SubmitButton } from "@/components/ui/SubmitButton";

/** A native select dressed as a small pill, so it still works everywhere (and on phones opens the OS picker). */
function PillSelect({
  name,
  icon: Icon,
  label,
  defaultValue,
  options,
}: {
  name: string;
  icon: LucideIcon;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="relative inline-flex shrink-0 items-center">
      <span className="sr-only">{label}</span>
      <Icon size={13} className="pointer-events-none absolute left-2.5 text-muted" aria-hidden />
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-8 cursor-pointer appearance-none [field-sizing:content] rounded-full border border-transparent bg-surface-muted pl-7 pr-7 text-xs font-semibold text-foreground transition-colors hover:border-border focus:border-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 text-muted" aria-hidden />
    </label>
  );
}

/**
 * Adding a task, Slack/Todoist style: one line to type into, and small chips
 * underneath for when, who and how urgent. Enter adds it.
 */
export function QuickAddTask({
  action,
  people,
  meId,
  assignToMe = false,
  placeholder = "Add a task…",
}: {
  action: (formData: FormData) => Promise<void>;
  /** Who it can be for (director only). Omit to hide the "For" chip. */
  people?: { id: string; name: string }[];
  meId?: string | null;
  /** Staff: tasks they add are always theirs. */
  assignToMe?: boolean;
  placeholder?: string;
}) {
  const { saturday, monday } = weekdayOffsets();
  const dates = [
    { value: campISODate(0), label: "Today" },
    { value: campISODate(1), label: "Tomorrow" },
    { value: campISODate(saturday), label: "This weekend" },
    { value: campISODate(monday), label: "Next week" },
    { value: "", label: "No date" },
  ];

  return (
    <form
      action={action}
      className="mb-6 rounded-2xl border border-border bg-surface shadow-card transition-shadow focus-within:border-primary/50 focus-within:shadow-[0_0_0_4px_rgba(20,88,107,0.08)]"
    >
      {assignToMe && meId && <input type="hidden" name="assigned_to" value={meId} />}
      <div className="flex items-center gap-2 py-1.5 pl-3.5 pr-1.5">
        <Plus size={18} className="shrink-0 text-muted" aria-hidden />
        <input
          name="title"
          required
          placeholder={placeholder}
          aria-label="New task"
          enterKeyHint="done"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted focus:outline-none"
        />
        <SubmitButton pendingText="…" className="!h-9 !w-9 shrink-0 !rounded-xl !p-0" aria-label="Add task">
          <ArrowUp size={17} strokeWidth={2.5} />
        </SubmitButton>
      </div>
      <div className="flex gap-1.5 overflow-x-auto border-t border-border/70 px-2.5 py-2 [scrollbar-width:none]">
        <PillSelect name="due_date" icon={CalendarDays} label="When" defaultValue={dates[0].value} options={dates} />
        {people && (
          <PillSelect
            name="assigned_to"
            icon={User}
            label="For"
            defaultValue=""
            options={[
              { value: "", label: "Office" },
              ...(meId ? [{ value: meId, label: "Me" }] : []),
              ...people.filter((p) => p.id !== meId).map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        )}
        <PillSelect
          name="priority"
          icon={Flag}
          label="Priority"
          defaultValue="medium"
          options={[
            { value: "medium", label: "Normal" },
            { value: "high", label: "High" },
            { value: "low", label: "Low" },
          ]}
        />
      </div>
    </form>
  );
}
