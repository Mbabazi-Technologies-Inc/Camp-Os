import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Check, Clock, ListTodo, Mail, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateTask, deleteTask, toggleTaskStatus } from "../actions";
import { Input, Textarea, Select, Label } from "@/components/ui/Field";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Badge } from "@/components/ui/Badge";
import { BackLink, DangerZone, DetailGrid, MetaItem, ProfileHeader, SectionCard } from "@/components/ui/Detail";
import { formatDueDate, formatRelativeTime } from "@/lib/dates";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_STYLES } from "@/lib/labels";

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
              <span className={due.overdue && !isDone ? "font-medium text-danger" : ""}>{due.label}</span>
            </MetaItem>
            <Badge className={TASK_PRIORITY_STYLES[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]} priority</Badge>
            {isDone && <Badge className="bg-forest-soft text-forest">Done</Badge>}
          </>
        }
        actions={
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
        }
      />

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
              <div>
                <Label htmlFor="due_date">Due date</Label>
                <Input id="due_date" name="due_date" type="date" defaultValue={task.due_date ?? ""} />
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
