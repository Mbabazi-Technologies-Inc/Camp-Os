import { requireCamp } from "@/lib/auth";
import { ensureRoutineTasks, getMyStaff, myTasksFilter, staffActiveOn } from "@/lib/routines";
import { TaskTabs } from "@/components/tasks/TaskTabs";
import { createTask } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TASK_PRIORITY_LABELS } from "@/lib/labels";
import { todayISODate, campISODate } from "@/lib/dates";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

function isoDaysFromToday(days: number) {
  return campISODate(days);
}

export default async function TasksPage() {
  const { supabase, role } = await requireCamp();
  const today = todayISODate();
  await ensureRoutineTasks(today);
  const me = await getMyStaff();
  const isDirector = role === "director";

  // Everyone sees what's assigned to them. The director also keeps the shared
  // office list (tasks for nobody in particular); staff see only their own.
  const mineFilter = myTasksFilter(isDirector, me);

  const [{ data: openTasks }, { data: doneTasks }, { data: staff }, { data: teamOverdue }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("status", "open")
      .or(mineFilter)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("status", "done")
      .or(mineFilter)
      .order("updated_at", { ascending: false })
      .limit(15),
    isDirector
      ? supabase.from("staff").select("*").order("first_name", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    isDirector
      ? supabase.from("tasks").select("id, assigned_to").eq("status", "open").lt("due_date", today)
      : Promise.resolve({ data: [] as { id: string; assigned_to: string | null }[] }),
  ]);
  const teamAlert = (teamOverdue ?? []).filter((t) => t.assigned_to && t.assigned_to !== me?.id).length;
  const assignable = (staff ?? []).filter((m) => staffActiveOn(m, today));

  // Open tasks grouped by when they're due, most pressing first.
  const weekEnd = isoDaysFromToday(6);
  const open = openTasks ?? [];
  const groups = [
    { title: "Overdue", tone: "text-danger", tasks: open.filter((t) => t.due_date && t.due_date < today) },
    { title: "Today", tone: "text-foreground", tasks: open.filter((t) => t.due_date === today) },
    {
      title: "This week",
      tone: "text-foreground",
      tasks: open.filter((t) => t.due_date && t.due_date > today && t.due_date <= weekEnd),
    },
    { title: "Later", tone: "text-foreground", tasks: open.filter((t) => t.due_date && t.due_date > weekEnd) },
    { title: "No due date", tone: "text-muted", tasks: open.filter((t) => !t.due_date) },
  ].filter((g) => g.tasks.length > 0);

  return (
    <div>
      <PageHeader
        title="My tasks"
        description={
          open.length
            ? `${open.length} open task${open.length === 1 ? "" : "s"} - tick them off as you go.`
            : "Keep track of everything that needs your attention."
        }
      />

      {isDirector && <TaskTabs teamAlert={teamAlert} />}

      <Card className="mb-8 p-3">
        <form
          action={createTask}
          className={`grid grid-cols-2 gap-2 ${
            isDirector
              ? "sm:grid-cols-[minmax(0,1fr)_9.5rem_9rem_7.5rem_auto]"
              : "sm:grid-cols-[minmax(0,1fr)_10rem_8rem_auto]"
          }`}
        >
          {!isDirector && me && <input type="hidden" name="assigned_to" value={me.id} />}
          <Input
            name="title"
            placeholder="Add a task... e.g. Call Cabin 4 parent back"
            aria-label="Task"
            required
            className="col-span-2 sm:col-span-1"
            enterKeyHint="done"
          />
          {isDirector && (
            <Select name="assigned_to" defaultValue="" aria-label="For" className="col-span-2 sm:col-span-1">
              <option value="">For: office</option>
              {me && <option value={me.id}>For: me</option>}
              {assignable
                .filter((m) => m.id !== me?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    For: {m.first_name} {m.last_name}
                  </option>
                ))}
            </Select>
          )}
          <Input name="due_date" type="date" defaultValue={today} aria-label="Due date" />
          <Select name="priority" defaultValue="medium" aria-label="Priority">
            {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <SubmitButton pendingText="Adding..." className="col-span-2 sm:col-span-1">
            <Plus size={17} /> Add
          </SubmitButton>
        </form>
      </Card>

      {groups.length === 0 ? (
        <Card className="mb-8">
          <div className="py-6">
            <EmptyState title="Nothing on your list" description="Add a task above and it will show up here." />
          </div>
        </Card>
      ) : (
        <div className="mb-8 space-y-6">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className={`mb-2 flex items-center gap-2 font-semibold ${group.tone}`}>
                {group.title}
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-muted">
                  {group.tasks.length}
                </span>
              </h2>
              <Card className="px-3">
                <div className="divide-y divide-border">
                  {group.tasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </Card>
            </section>
          ))}
        </div>
      )}

      {doneTasks && doneTasks.length > 0 && (
        <details className="group">
          <summary className="mb-2 flex cursor-pointer list-none items-center gap-2 font-semibold text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
            <Plus size={16} className="transition-transform group-open:rotate-45" />
            Recently completed ({doneTasks.length})
          </summary>
          <Card className="px-3">
            <div className="divide-y divide-border">
              {doneTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </Card>
        </details>
      )}
    </div>
  );
}
