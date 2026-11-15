import type { Metadata } from "next";
import { requireCamp } from "@/lib/auth";
import { ListTodo as ListTodoIcon } from "lucide-react";
import { ensureRoutineTasks, getMyStaff, myTasksFilter, staffActiveOn } from "@/lib/routines";
import { TaskTabs } from "@/components/tasks/TaskTabs";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { createTask } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskItem } from "@/components/tasks/TaskItem";
import { todayISODate, campISODate } from "@/lib/dates";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Tasks" };

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
      <PageHeader icon={ListTodoIcon} eyebrow="Tasks"
        title="My tasks"
        description={
          open.length
            ? `${open.length} open task${open.length === 1 ? "" : "s"} - tick them off as you go.`
            : "Keep track of everything that needs your attention."
        }
      />

      {isDirector && <TaskTabs teamAlert={teamAlert} />}

      <QuickAddTask
        action={createTask}
        people={isDirector ? assignable.map((m) => ({ id: m.id, name: `${m.first_name} ${m.last_name}` })) : undefined}
        meId={me?.id ?? null}
        assignToMe={!isDirector}
        placeholder="Add a task… e.g. Call Cabin 4 parent back"
      />

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
