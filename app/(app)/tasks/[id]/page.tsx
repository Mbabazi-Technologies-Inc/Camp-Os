import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Check, Clock, ListTodo, Mail, Repeat, RotateCcw, User } from "lucide-react";
import { describeSchedule } from "@/lib/routines";
import { createClient } from "@/lib/supabase/server";
import { requireCamp } from "@/lib/auth";
import { updateTask, deleteTask, toggleTaskStatus, toggleChecklistItem } from "../actions";
import { Input, Textarea, Select, Label } from "@/components/ui/Field";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Badge } from "@/components/ui/Badge";
import { BackLink, DangerZone, DetailGrid, MetaItem, ProfileHeader, SectionCard } from "@/components/ui/Detail";
import { formatDueDate, formatRelativeTime } from "@/lib/dates";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_STYLES } from "@/lib/labels";

export const metadata: Metadata = { title: "Task" };

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();

  if (!task) notFound();

  const { role } = await requireCamp();
  const { data: staff } = await supabase.from("staff").select("*").order("first_name", { ascending: true });
  const assignee = (staff ?? []).find((m) => m.id === task.assigned_to);
  const { data: routine } = task.routine_id
    ? await supabase.from("routines").select("*").eq("id", task.routine_id).maybeSingle()
    : { data: null };

  const { data: sourceEmail } = task.source_email_id
    ? await supabase
        .from("email_drafts")
        .select("id, sender_name, sender_email, ai_summary, subject")
        .eq("id", task.source_email_id)
        .maybeSingle()
    : { data: null };

  const updateWithId = updateTask.bind(null, task.id);
  const deleteWithId = deleteTask.bind(null, task.id);
  const isDone = task.status === "done";
  const toggleWithId = toggleTaskStatus.bind(null, task.id, isDone ? "open" : "done");
  const due = formatDueDate(task.due_date);
  const steps = task.checklist ?? [];
  const stepsDone = steps.filter((step) => step.done).length;

  return (
    <div>
      <BackLink href="/tasks" label="All tasks" />
      <ProfileHeader
        title={task.title}
        badge={isDone ? <Check size={24} strokeWidth={2.6} /> : <ListTodo size={24} />}
        tone={isDone ? "forest" : due.overdue ? "accent" : "primary"}
        meta={
          <>
            <MetaItem icon={<CalendarDays size={14} />}>
              <span className={due.overdue && !isDone ? "font-medium text-danger" : ""}>
                {isDone && task.completed_at
                  ? `Done ${formatRelativeTime(task.completed_at)}`
                  : due.label}
              </span>
            </MetaItem>
            <Badge className={TASK_PRIORITY_STYLES[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]} priority</Badge>
            {assignee && (
              <MetaItem icon={<User size={14} />}>
                {assignee.first_name} {assignee.last_name}
              </MetaItem>
            )}
            {routine && (
              <MetaItem icon={<Repeat size={14} />}>
                {describeSchedule(routine)}
              </MetaItem>
            )}
            {isDone && <Badge className="bg-forest-soft text-forest">Done</Badge>}
          </>
        }
        actions={
          steps.length > 0 && !isDone ? (
            <span className="rounded-xl bg-surface-muted px-3 py-2 text-sm font-medium text-muted">
              {stepsDone} of {steps.length} steps done
            </span>
          ) : (
          <form action={toggleWithId}>
            <SubmitButton pendingText="Saving..." variant={isDone ? "secondary" : "primary"}>
              {isDone ? (
                <>
                  <RotateCcw size={16} /> Reopen
                </>
              ) : (
                <>
                  <Check size={16} /> Mark done
                </>
              )}
            </SubmitButton>
          </form>
          )
        }
      />

      {steps.length > 0 && (
        <SectionCard
          title="Checklist"
          description={isDone ? "Every step was ticked off." : "Tick each step. The task is done when they all are."}
        >
          <ul className="-my-1 divide-y divide-border">
            {steps.map((step, index) => (
              <li key={index}>
                <form action={toggleChecklistItem.bind(null, task.id, index)}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                    aria-pressed={step.done}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                        step.done ? "border-forest bg-forest text-white" : "border-border text-transparent"
                      }`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className={step.done ? "text-muted line-through" : "text-foreground"}>{step.label}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
      {steps.length > 0 && <div className="h-6" />}

      <DetailGrid
        aside={
          <>
            {sourceEmail && (
              <SectionCard title="From an email" description="This task was suggested while drafting a reply.">
                <Link
                  href={`/email-assistant/${sourceEmail.id}`}
                  className="group flex items-start gap-3 rounded-xl bg-surface-muted/70 p-3 transition-colors hover:bg-surface-muted"
                >
                  <Mail size={17} className="mt-0.5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground group-hover:text-primary">
                      {sourceEmail.sender_name || sourceEmail.sender_email || "Email"}
                    </span>
                    <span className="line-clamp-2 text-sm text-muted">
                      {sourceEmail.ai_summary || sourceEmail.subject}
                    </span>
                  </span>
                </Link>
              </SectionCard>
            )}
            <SectionCard title="History">
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-center gap-2">
                  <Clock size={15} /> Created {formatRelativeTime(task.created_at)}
                </li>
                <li className="flex items-center gap-2">
                  <Clock size={15} /> Last updated {formatRelativeTime(task.updated_at)}
                </li>
              </ul>
            </SectionCard>
          </>
        }
      >
        <SectionCard title="Details">
          <form action={updateWithId} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={task.title} required />
            </div>
            <div>
              <Label htmlFor="description">Notes</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={task.description ?? ""}
                placeholder="Any extra detail worth remembering"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {role === "director" ? (
              <div className="col-span-2">
                <Label htmlFor="assigned_to">For</Label>
                <Select id="assigned_to" name="assigned_to" defaultValue={task.assigned_to ?? ""}>
                  <option value="">Office (shared)</option>
                  {(staff ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                    </option>
                  ))}
                </Select>
              </div>
              ) : (
                // Staff can't hand their tasks to someone else; keep who it's for.
                <input type="hidden" name="assigned_to" value={task.assigned_to ?? ""} />
              )}
              <div>
                <Label htmlFor="due_date">Due date</Label>
                <Input id="due_date" name="due_date" type="date" defaultValue={task.due_date ?? ""} />
              </div>
              <div>
                <Label htmlFor="due_time">Due by</Label>
                <Input id="due_time" name="due_time" type="time" defaultValue={task.due_time ?? ""} />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select id="priority" name="priority" defaultValue={task.priority}>
                  {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
          </form>
        </SectionCard>
      </DetailGrid>

      <DangerZone description="Deleting removes this task for good.">
        <form action={deleteWithId}>
          <ConfirmButton confirmMessage="Delete this task? This can't be undone.">Delete task</ConfirmButton>
        </form>
      </DangerZone>
    </div>
  );
}
