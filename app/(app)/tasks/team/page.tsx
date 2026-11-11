import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CalendarClock, CheckCircle2, Pause, Play, Repeat, Trash2 } from "lucide-react";
import { requireCamp } from "@/lib/auth";
import { todayISODate } from "@/lib/dates";
import { seasonEndFor } from "@/lib/season";
import {
  campTimeNow,
  describeSchedule,
  describeTarget,
  ensureRoutineTasks,
  getMyStaff,
  routineRunsOn,
  routineTargets,
  staffActiveOn,
  teamsOf,
} from "@/lib/routines";
import { initials } from "@/lib/initials";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { AddPanel } from "@/components/ui/AddPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { TaskTabs } from "@/components/tasks/TaskTabs";
import { TaskItem } from "@/components/tasks/TaskItem";
import { SendTaskForm } from "@/components/tasks/SendTaskForm";
import { deleteRoutine, setRoutineActive } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Routine = Database["public"]["Tables"]["routines"]["Row"];

const fmtDay = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

function runWindow(routine: Routine): string {
  if (!routine.ends_on) return `From ${fmtDay(routine.starts_on)}`;
  return `${fmtDay(routine.starts_on)} – ${fmtDay(routine.ends_on)}`;
}

export default async function TeamTasksPage() {
  const { supabase, role } = await requireCamp();
  if (role !== "director") redirect("/tasks");

  const today = todayISODate();
  await ensureRoutineTasks(today);
  const me = await getMyStaff();

  const [{ data: staffRows }, { data: routineRows }, { data: todayRows }, { data: overdueRows }] = await Promise.all([
    supabase.from("staff").select("*").order("first_name", { ascending: true }),
    supabase.from("routines").select("*").order("created_at", { ascending: true }),
    supabase.from("tasks").select("*").eq("due_date", today).order("due_time", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .eq("status", "open")
      .lt("due_date", today)
      .order("due_date", { ascending: true }),
  ]);

  const staff = staffRows ?? [];
  const routines = routineRows ?? [];
  const byId = new Map(staff.map((m) => [m.id, m]));
  const nameOf = (id: string | null) => {
    const member = id ? byId.get(id) : undefined;
    return member ? `${member.first_name} ${member.last_name}` : null;
  };

  // The team's work: tasks that belong to someone (shared office tasks live on My tasks).
  const todayTasks = (todayRows ?? []).filter((t) => t.assigned_to);
  const overdue = (overdueRows ?? []).filter((t) => t.assigned_to);
  const now = campTimeNow();
  const isLate = (t: Task) => t.status === "open" && Boolean(t.due_time) && (t.due_time as string) < now;

  const done = todayTasks.filter((t) => t.status === "done").length;
  const lateToday = todayTasks.filter(isLate);
  const stillToDo = todayTasks.filter((t) => t.status === "open" && !isLate(t)).length;
  const pct = todayTasks.length ? Math.round((done / todayTasks.length) * 100) : 0;
  const needsAttention = [...overdue, ...lateToday];

  const running = routines.filter((r) => routineRunsOn(r, today));
  const active = staff.filter((m) => staffActiveOn(m, today));
  const teams = teamsOf(active).map((name) => ({
    name,
    size: routineTargets({ target_type: "team", target_team: name, target_staff_id: null }, active, today).length,
  }));

  // Everyone with something on their plate today, least finished first.
  const people = active
    .map((member) => {
      const mine = todayTasks.filter((t) => t.assigned_to === member.id);
      const late = needsAttention.filter((t) => t.assigned_to === member.id).length;
      const finished = mine.filter((t) => t.status === "done").length;
      return { member, total: mine.length, finished, late };
    })
    .filter((p) => p.total > 0 || p.late > 0)
    .sort((a, b) => b.late - a.late || a.finished / (a.total || 1) - b.finished / (b.total || 1));

  const longDate = new Date(today + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <PageHeader title="Team tasks" description={`${longDate} · everyone's tasks, as they're ticked off`} />
      <TaskTabs teamAlert={overdue.filter((t) => t.assigned_to !== me?.id).length} />

      <AddPanel label="Send a task">
        <SendTaskForm staff={active} teams={teams} today={today} seasonEnd={seasonEndFor()} />
      </AddPanel>

      {/* Today at a glance */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="font-display text-3xl font-semibold leading-none text-foreground">
            {done}
            <span className="text-lg text-muted">/{todayTasks.length}</span>
          </p>
          <p className="mt-1 text-sm text-muted">done today</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
          </div>
        </Card>
        <Card className="p-4">
          <p className={`font-display text-3xl font-semibold leading-none ${needsAttention.length ? "text-danger" : "text-foreground"}`}>
            {needsAttention.length}
          </p>
          <p className="mt-1 text-sm text-muted">late or overdue</p>
        </Card>
        <Card className="p-4">
          <p className="font-display text-3xl font-semibold leading-none text-foreground">{stillToDo}</p>
          <p className="mt-1 text-sm text-muted">still to do today</p>
        </Card>
        <Card className="p-4">
          <p className="font-display text-3xl font-semibold leading-none text-foreground">{running.length}</p>
          <p className="mt-1 text-sm text-muted">routines running today</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {needsAttention.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 font-semibold text-danger">
                <AlertTriangle size={17} /> Needs a nudge
              </h2>
              <Card className="px-3">
                <div className="divide-y divide-border">
                  {needsAttention.map((task) => (
                    <TaskItem key={task.id} task={task} assignee={nameOf(task.assigned_to)} />
                  ))}
                </div>
              </Card>
            </section>
          )}

          <section>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
              <Repeat size={17} className="text-primary" /> Routines today
            </h2>
            <Card>
              {running.length === 0 ? (
                <div className="py-6">
                  <EmptyState title="No routines today" description="Send a task that repeats and it shows up here each day it runs." />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {running.map((routine) => {
                    const copies = todayTasks.filter((t) => t.routine_id === routine.id);
                    const finished = copies.filter((t) => t.status === "done").length;
                    return (
                      <li key={routine.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{routine.title}</p>
                          <p className="text-xs text-muted">
                            {describeSchedule(routine)} · {describeTarget(routine, staff)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {copies.map((task) => {
                            const who = nameOf(task.assigned_to) ?? "?";
                            const tone =
                              task.status === "done"
                                ? "bg-forest-soft text-forest"
                                : isLate(task)
                                  ? "bg-danger-soft text-danger"
                                  : "bg-surface-muted text-muted";
                            return (
                              <Link
                                key={task.id}
                                href={`/tasks/${task.id}`}
                                title={`${who}: ${task.status === "done" ? "done" : isLate(task) ? "late" : "to do"}`}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold ${tone}`}
                              >
                                {initials(who)}
                              </Link>
                            );
                          })}
                          <span
                            className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              copies.length && finished === copies.length
                                ? "bg-forest-soft text-forest"
                                : "bg-accent-soft text-warning"
                            }`}
                          >
                            {finished}/{copies.length}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
              <CheckCircle2 size={17} className="text-forest" /> By person
            </h2>
            <Card>
              {people.length === 0 ? (
                <div className="py-6">
                  <EmptyState title="Nothing assigned today" description="Tasks you send show up here with each person's progress." />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {people.map(({ member, total, finished, late }) => {
                    const name = `${member.first_name} ${member.last_name}`;
                    return (
                      <li key={member.id}>
                        <Link
                          href={`/people/staff/${member.id}`}
                          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted/50"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                            {initials(name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">{name}</span>
                            <span className="block truncate text-xs text-muted">{member.team ?? member.role ?? "Staff"}</span>
                          </span>
                          <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted sm:block">
                            <span
                              className="block h-full rounded-full bg-forest"
                              style={{ width: `${total ? Math.round((finished / total) * 100) : 0}%` }}
                            />
                          </span>
                          <span
                            className={`w-20 text-right text-xs font-semibold ${
                              late ? "text-danger" : finished === total ? "text-forest" : "text-muted"
                            }`}
                          >
                            {late ? `${late} late` : finished === total ? "All done" : `${total - finished} left`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </section>

          <section>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
              <CalendarClock size={17} className="text-accent" /> All routines
            </h2>
            <Card>
              {routines.length === 0 ? (
                <div className="py-6">
                  <EmptyState title="No routines yet" description="Use Send a task and choose how often it repeats." />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {routines.map((routine) => {
                    const runsToday = routineRunsOn(routine, today);
                    const outOfSeason =
                      routine.active && (today < routine.starts_on || Boolean(routine.ends_on && today > routine.ends_on));
                    const status = !routine.active
                      ? { label: "Paused", tone: "bg-surface-muted text-muted" }
                      : outOfSeason
                        ? { label: today < routine.starts_on ? "Starts later" : "Season over", tone: "bg-accent-soft text-warning" }
                        : runsToday
                          ? { label: "Running today", tone: "bg-forest-soft text-forest" }
                          : { label: "Not today", tone: "bg-primary-soft text-primary" };
                    return (
                      <li key={routine.id} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${routine.active ? "text-foreground" : "text-muted"}`}>
                              {routine.title}
                            </p>
                            <p className="text-xs text-muted">
                              {describeSchedule(routine)} · {describeTarget(routine, staff)}
                            </p>
                            <p className="text-xs text-muted">{runWindow(routine)}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.tone}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <form action={setRoutineActive.bind(null, routine.id, !routine.active)}>
                            <button
                              type="submit"
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                            >
                              {routine.active ? <Pause size={13} /> : <Play size={13} />}
                              {routine.active ? "Pause" : "Resume"}
                            </button>
                          </form>
                          <form action={deleteRoutine.bind(null, routine.id)}>
                            <ConfirmButton
                              variant="ghost"
                              className="h-8 text-xs"
                              confirmMessage={`Delete "${routine.title}"? Finished tasks stay as a record; unfinished ones from today on are removed.`}
                            >
                              <Trash2 size={13} /> Delete
                            </ConfirmButton>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
