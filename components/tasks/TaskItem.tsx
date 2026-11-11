import Link from "next/link";
import { Check, ListChecks, Repeat } from "lucide-react";
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

  const titleClass = `font-medium truncate ${
    isDone ? "line-through text-muted" : "text-foreground"
  }`;

  return (
    <div className="flex items-center gap-3 py-3 px-1">
      {viaChecklist ? (
        <Link
          href={`/tasks/${task.id}`}
          aria-label={`Open checklist (${stepsDone} of ${steps.length} steps done)`}
          className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border text-[9px] font-bold text-muted transition-colors hover:border-primary hover:text-primary"
        >
          {stepsDone}/{steps.length}
        </Link>
      ) : (
        <form action={toggleTaskStatus.bind(null, task.id, nextStatus)}>
          <button
            type="submit"
            aria-label={isDone ? "Mark as open" : "Mark as done"}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              isDone
                ? "bg-primary border-primary text-white"
                : "border-border text-transparent hover:border-primary"
            }`}
          >
            <Check size={14} strokeWidth={3} />
          </button>
        </form>
      )}

      <div className="flex-1 min-w-0">
        {linkToEdit ? (
          <Link href={`/tasks/${task.id}`} className="block">
            <p className={`${titleClass} hover:text-primary transition-colors`}>
              {task.title}
            </p>
          </Link>
        ) : (
          <p className={titleClass}>{task.title}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs ${due.overdue && !isDone ? "text-danger font-medium" : "text-muted"}`}>
            {due.label}
            {time && task.due_date ? ` · ${time}` : ""}
          </span>
          {steps.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <ListChecks size={12} /> {stepsDone}/{steps.length} steps
            </span>
          )}
          {task.routine_id && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              <Repeat size={11} strokeWidth={2.5} /> Routine
            </span>
          )}
          {task.priority !== "medium" && (
            <Badge className={TASK_PRIORITY_STYLES[task.priority]}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
          )}
        </div>
      </div>

      {assignee && (
        <span
          title={assignee}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary"
        >
          {initials(assignee)}
        </span>
      )}
    </div>
  );
}
