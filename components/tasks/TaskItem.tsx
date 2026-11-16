import Link from "next/link";
import { CalendarClock, Check, ChevronRight, ListChecks, Repeat } from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";
import { toggleTaskStatus } from "@/app/(app)/tasks/actions";
import { formatDueDate } from "@/lib/dates";
import { Badge } from "@/components/ui/Badge";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_STYLES } from "@/lib/labels";
import { formatTime } from "@/lib/routines";
import { initials } from "@/lib/initials";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

const isDoneStatus = (status: Task["status"]) => status === "done";

export function TaskItem({
  task,
  linkToEdit = true,
  assignee,
}: {
  task: Task;
  linkToEdit?: boolean;
  /** Who it's for, shown on lists that mix people (Team view, office tasks). */
  assignee?: string | null;
}) {
  const due = formatDueDate(task.due_date);
  const time = formatTime(task.due_time);
  const steps = task.checklist ?? [];
  const stepsDone = steps.filter((step) => step.done).length;
  // With a checklist, "done" comes from ticking the steps, so the circle opens the task.
  const viaChecklist = steps.length > 0 && !isDoneStatus(task.status);
  const nextStatus = task.status === "done" ? "open" : "done";
  const isDone = task.status === "done";

  const ring = steps.length ? stepsDone / steps.length : 0;

  return (
    <div className="group relative -mx-1 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-muted/50">
      {/* High priority gets a red edge, so it stands out in any list */}
      {task.priority === "high" && !isDone && (
        <span aria-hidden className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-danger" />
      )}

      {viaChecklist ? (
        <Link
          href={`/tasks/${task.id}`}
          aria-label={`Open checklist (${stepsDone} of ${steps.length} steps done)`}
          className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center text-[9px] font-bold text-muted transition-colors hover:text-primary"
        >
          {/* A ring that fills as steps are ticked */}
          <svg viewBox="0 0 28 28" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="14" cy="14" r="11.5" fill="none" stroke="var(--color-border)" strokeWidth="2.5" />
            <circle
              cx="14"
              cy="14"
              r="11.5"
              fill="none"
              stroke="var(--color-forest)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${(ring * 72.3).toFixed(1)} 72.3`}
            />
          </svg>
          {stepsDone}/{steps.length}
        </Link>
      ) : (
        <form action={toggleTaskStatus.bind(null, task.id, nextStatus)} className="relative z-10">
          <button
            type="submit"
            aria-label={isDone ? "Mark as open" : "Mark as done"}
            className={`group/check flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
              isDone
                ? "border-forest bg-forest text-white"
                : "border-[#c5d3cf] text-transparent hover:border-forest hover:bg-forest-soft hover:text-forest"
            }`}
          >
            <Check size={15} strokeWidth={3} />
          </button>
        </form>
      )}

      <div className="min-w-0 flex-1">
        {linkToEdit ? (
          <Link href={`/tasks/${task.id}`} className="block after:absolute after:inset-0 after:content-['']">
            <p className={`truncate font-medium transition-colors ${isDone ? "text-muted line-through" : "text-foreground group-hover:text-primary"}`}>
              {task.title}
            </p>
          </Link>
        ) : (
          <p className={`truncate font-medium ${isDone ? "text-muted line-through" : "text-foreground"}`}>{task.title}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
          <span
            className={`inline-flex items-center gap-1 ${
              due.overdue && !isDone ? "rounded-full bg-danger-soft px-2 py-px font-semibold text-danger" : "text-muted"
            }`}
          >
            <CalendarClock size={12} />
            {due.label}
            {time && task.due_date ? ` · ${time}` : ""}
          </span>
          {steps.length > 0 && (
            <span className="inline-flex items-center gap-1 text-muted">
              <ListChecks size={12} /> {stepsDone}/{steps.length} steps
            </span>
          )}
          {task.routine_id && (
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <Repeat size={11} strokeWidth={2.5} /> Routine
            </span>
          )}
          {task.priority !== "medium" && !isDone && (
            <Badge className={TASK_PRIORITY_STYLES[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]}</Badge>
          )}
        </div>
      </div>

      {assignee && (
        <span
          title={assignee}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#0f3a46] text-[11px] font-semibold text-white"
        >
          {initials(assignee)}
        </span>
      )}
      {linkToEdit && (
        <ChevronRight size={16} className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
  );
}
