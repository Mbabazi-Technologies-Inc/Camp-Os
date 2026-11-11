import Link from "next/link";
import { requireCamp } from "@/lib/auth";
import { campTimeNow, ensureRoutineTasks, getMyStaff, myTasksFilter } from "@/lib/routines";
import { createTask } from "@/app/(app)/tasks/actions";
import { addStarterPack } from "@/app/(app)/knowledge-base/actions";
import { todayISODate, tomorrowISODate, formatRelativeTime, formatDueDate, campISODate } from "@/lib/dates";
import { seasonFor, SEASON_LABELS } from "@/lib/season";
import { GroupRow } from "@/components/groups/GroupRow";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TaskItem } from "@/components/tasks/TaskItem";
import { Contours } from "@/components/site/Contours";
import { Treeline } from "@/components/site/Treeline";
import { EMAIL_URGENCY_LABELS, EMAIL_URGENCY_STYLES } from "@/lib/labels";
import {
  Mail,
  ListTodo,
  Plus,
  ArrowRight,
  Sun,
  Sparkles,
  CheckCircle2,
  Circle,
  Trees,
  UsersRound,
} from "lucide-react";

export const dynamic = "force-dynamic";

function isoDaysFromToday(days: number) {
  return campISODate(days);
}

// "today", "tomorrow", "Friday" or "Nov 6" for an arrival date.
function arrivalWord(date: string | null) {
  const label = formatDueDate(date).label.replace(/^Due /, "");
  return label === "today" || label === "tomorrow" ? label : label.charAt(0).toUpperCase() + label.slice(1);
}

// "a, b and c"
function joinList(parts: string[]) {
  return parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { supabase, campId, fullName, role } = await requireCamp();

  const today = todayISODate();
  const tomorrow = tomorrowISODate();
  await ensureRoutineTasks(today);
  const me = await getMyStaff();
  const isDirector = role === "director";
  const mineFilter = myTasksFilter(isDirector, me);

  const [
    { data: camp },
    { data: priorityTasks },
    { count: openTaskCount },
    { count: overdueCount },
    { data: pendingEmails },
    { count: pendingEmailCount },
    { count: urgentEmailCount },
    { count: kbCount },
    { count: emailEverCount },
    { data: gmailAccount },
    { data: retreatGroups },
    { data: teamToday },
    { data: teamOverdue },
  ] = await Promise.all([
    supabase.from("camps").select("name").eq("id", campId).maybeSingle(),
    supabase
      .from("tasks")
      .select("*")
      .eq("camp_id", campId)
      .eq("status", "open")
      .or(mineFilter)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: false })
      .limit(40),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("camp_id", campId)
      .eq("status", "open")
      .or(mineFilter),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("camp_id", campId)
      .eq("status", "open")
      .or(mineFilter)
      .lt("due_date", today),
    supabase
      .from("email_drafts")
      .select("*")
      .eq("camp_id", campId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("email_drafts")
      .select("id", { count: "exact", head: true })
      .eq("camp_id", campId)
      .eq("status", "pending"),
    supabase
      .from("email_drafts")
      .select("id", { count: "exact", head: true })
      .eq("camp_id", campId)
      .eq("status", "pending")
      .in("urgency", ["high", "urgent"]),
    supabase
      .from("knowledge_base")
      .select("id", { count: "exact", head: true })
      .eq("camp_id", campId),
    supabase
      .from("email_drafts")
      .select("id", { count: "exact", head: true })
      .eq("camp_id", campId),
    supabase.from("gmail_accounts").select("email").eq("camp_id", campId).maybeSingle(),
    supabase
      .from("retreat_groups")
      .select("*")
      .eq("camp_id", campId)
      .neq("status", "cancelled")
      .order("arrival_date", { ascending: true, nullsFirst: false }),
    // The director's view of everyone else's day (see Team tasks).
    isDirector
      ? supabase.from("tasks").select("status, due_time, assigned_to").eq("due_date", today)
      : Promise.resolve({ data: [] as { status: string; due_time: string | null; assigned_to: string | null }[] }),
    isDirector
      ? supabase.from("tasks").select("id, assigned_to").eq("status", "open").lt("due_date", today)
      : Promise.resolve({ data: [] as { id: string; assigned_to: string | null }[] }),
  ]);

  // Due today, overdue, or undated: what needs you now.
  const dueNow = (priorityTasks ?? []).filter((t) => !t.due_date || t.due_date <= today).slice(0, 8);
  const teamTasks = (teamToday ?? []).filter((t) => t.assigned_to);
  const teamDone = teamTasks.filter((t) => t.status === "done").length;
  const nowTime = campTimeNow();
  const teamLate =
    teamTasks.filter((t) => t.status === "open" && t.due_time && t.due_time < nowTime).length +
    (teamOverdue ?? []).filter((t) => t.assigned_to).length;

  const season = seasonFor(new Date());
  const upcomingGroups = (retreatGroups ?? [])
    .filter((g) => {
      const lastDay = g.departure_date ?? g.arrival_date;
      return lastDay && lastDay >= today;
    })
    .slice(0, 4);
  // A group arriving within the next week is worth a line in the briefing.
  const nextGroup = upcomingGroups.find(
    (g) => g.status === "confirmed" && g.arrival_date && g.arrival_date <= isoDaysFromToday(7)
  );

  const firstName = fullName?.split(" ")?.[0];
  const now = new Date();
  const caughtUp =
    dueNow.length === 0 && (pendingEmails?.length ?? 0) === 0;

  // Onboarding: shown until the camp has a real name, some knowledge, and
  // has processed at least one email.
  const campNamed = Boolean(camp?.name && camp.name !== "My Camp");
  const hasKnowledge = (kbCount ?? 0) > 0;
  const processedEmail = (emailEverCount ?? 0) > 0;
  const onboarding = !(campNamed && hasKnowledge && processedEmail);

  // Rule-based morning briefing: the one thing that can't wait.
  const topUrgentEmail = pendingEmails?.find(
    (d) => d.urgency === "urgent" || d.urgency === "high"
  );
  const topOverdueTask = dueNow.find(
    (t) => t.due_date && t.due_date < today
  );
  const briefingParts: string[] = [];
  if ((urgentEmailCount ?? 0) > 0) {
    briefingParts.push(
      `${urgentEmailCount} urgent email${urgentEmailCount === 1 ? "" : "s"} waiting`
    );
  } else if ((pendingEmailCount ?? 0) > 0) {
    briefingParts.push(
      `${pendingEmailCount} draft${pendingEmailCount === 1 ? "" : "s"} to review`
    );
  }
  if ((overdueCount ?? 0) > 0) {
    briefingParts.push(`${overdueCount} task${overdueCount === 1 ? "" : "s"} overdue`);
  }
  if (nextGroup) {
    briefingParts.push(
      `${nextGroup.name}${nextGroup.headcount ? ` (${nextGroup.headcount})` : ""} arriving ${arrivalWord(nextGroup.arrival_date)}`
    );
  }

  const retreatSection = (
    <>
      {upcomingGroups.length > 0 && (
        <section className={season === "summer" ? "mt-8" : "mb-8"}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-foreground">Upcoming retreat groups</h2>
            <Link href="/groups" className="text-sm font-medium text-primary hover:underline">
              All groups
            </Link>
          </div>
          <Card className="px-3">
            <div className="divide-y divide-border">
              {upcomingGroups.map((g) => (
                <GroupRow key={g.id} group={g} />
              ))}
            </div>
          </Card>
        </section>
      )}
    </>
  );

  return (
    <div>
      {/* Hero */}
      <div className="relative isolate overflow-hidden rounded-3xl bg-stream text-white p-5 pb-12 md:p-7 md:pb-14 mb-5 shadow-card">
        <Contours className="absolute inset-0 h-full w-full text-white/[0.08]" />
        <Treeline className="absolute -bottom-px inset-x-0 h-10 text-white/10 md:h-12" />
        <div className="relative">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-white/80">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
              {season === "summer" ? <Sun size={13} /> : <Trees size={13} />}
              {SEASON_LABELS[season]}
            </span>
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-1">
            {greetingForHour(now.getHours())}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-white/80 mt-1">
            {caughtUp
              ? season === "summer"
                ? "All clear - go be with the campers."
                : "All clear - enjoy the quiet between groups."
              : briefingParts.length > 0
                ? `Today: ${joinList(briefingParts)}.`
                : "Here's what needs you before you head out."}
          </p>
          {(topUrgentEmail || topOverdueTask) && (
            <Link
              href={
                topUrgentEmail ? `/email-assistant/${topUrgentEmail.id}` : "/tasks"
              }
              className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 hover:bg-white/15 transition-colors"
            >
              <Sparkles size={15} className="mt-0.5 shrink-0 text-white/90" />
              <span className="text-sm text-white/95 min-w-0">
                <span className="font-medium">Can&apos;t wait: </span>
                {topUrgentEmail
                  ? topUrgentEmail.ai_summary ||
                    `Urgent email from ${topUrgentEmail.sender_name || topUrgentEmail.sender_email || "a parent"}`
                  : topOverdueTask!.title}
              </span>
            </Link>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <LinkButton
              href="/email-assistant/new"
              size="sm"
              className="!bg-white !text-primary hover:!bg-white/90"
            >
              <Mail size={15} /> Paste an email
            </LinkButton>
            {gmailAccount && (
              <LinkButton
                href="/email-assistant"
                size="sm"
                className="!bg-white/15 !text-white border border-white/25 hover:!bg-white/25"
              >
                <ArrowRight size={15} /> Review inbox
              </LinkButton>
            )}
          </div>
        </div>
      </div>

      {/* Onboarding checklist */}
      {onboarding && (
        <Card className="p-4 mb-5">
          <p className="font-semibold text-foreground mb-1">Set up CampFlow</p>
          <p className="text-sm text-muted mb-3">
            Three quick steps and the AI starts writing replies that sound like your camp.
          </p>
          <div className="space-y-2.5">
            <Link href="/settings" className="flex items-center gap-2.5 group">
              {campNamed ? (
                <CheckCircle2 size={19} className="text-primary shrink-0" />
              ) : (
                <Circle size={19} className="text-border shrink-0" />
              )}
              <span
                className={`text-sm ${campNamed ? "text-muted line-through" : "text-foreground group-hover:text-primary"}`}
              >
                Name your camp in Settings
              </span>
            </Link>
            <div className="flex items-center justify-between gap-2">
              <Link href="/knowledge-base" className="flex items-center gap-2.5 group min-w-0">
                {hasKnowledge ? (
                  <CheckCircle2 size={19} className="text-primary shrink-0" />
                ) : (
                  <Circle size={19} className="text-border shrink-0" />
                )}
                <span
                  className={`text-sm ${hasKnowledge ? "text-muted line-through" : "text-foreground group-hover:text-primary"}`}
                >
                  Add camp knowledge (rules, pickup times, policies)
                </span>
              </Link>
              {!hasKnowledge && (
                <form action={addStarterPack} className="shrink-0">
                  <SubmitButton pendingText="Adding..." variant="secondary">
                    Add starter pack
                  </SubmitButton>
                </form>
              )}
            </div>
            <Link href="/email-assistant/new" className="flex items-center gap-2.5 group">
              {processedEmail ? (
                <CheckCircle2 size={19} className="text-primary shrink-0" />
              ) : (
                <Circle size={19} className="text-border shrink-0" />
              )}
              <span
                className={`text-sm ${processedEmail ? "text-muted line-through" : "text-foreground group-hover:text-primary"}`}
              >
                Run your first email through the assistant
              </span>
            </Link>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className={`grid gap-3 mb-5 ${isDirector ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
        {isDirector && (
          <Link href="/tasks/team" className="group col-span-2 sm:col-span-1 sm:order-last">
            <Card className="p-4 transition-shadow group-hover:shadow-card-hover">
              <div className="flex items-center justify-between">
                <p className="font-display text-4xl font-semibold text-foreground">
                  {teamDone}
                  <span className="text-xl text-muted">/{teamTasks.length}</span>
                </p>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <UsersRound size={18} />
                </span>
              </div>
              <p className="text-sm text-muted mt-1 flex items-center gap-1">
                Team done today
                {teamLate > 0 && <span className="font-semibold text-danger">· {teamLate} late</span>}
                <ArrowRight
                  size={13}
                  className="opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0"
                />
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-forest"
                  style={{ width: `${teamTasks.length ? Math.round((teamDone / teamTasks.length) * 100) : 0}%` }}
                />
              </div>
            </Card>
          </Link>
        )}
        <Link href="/tasks" className="group">
          <Card className="p-4 transition-shadow group-hover:shadow-card-hover">
            <div className="flex items-center justify-between">
              <p className="font-display text-4xl font-semibold text-foreground">
                {openTaskCount ?? 0}
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <ListTodo size={18} />
              </span>
            </div>
            <p className="text-sm text-muted mt-1 flex items-center gap-1">
              Open tasks
              <ArrowRight
                size={13}
                className="opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0"
              />
            </p>
          </Card>
        </Link>
        <Link href="/email-assistant" className="group">
          <Card className="p-4 transition-shadow group-hover:shadow-card-hover">
            <div className="flex items-center justify-between">
              <p className="font-display text-4xl font-semibold text-foreground">
                {pendingEmailCount ?? 0}
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-forest">
                <Mail size={18} />
              </span>
            </div>
            <p className="text-sm text-muted mt-1 flex items-center gap-1">
              Drafts to review
              <ArrowRight
                size={13}
                className="opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0"
              />
            </p>
          </Card>
        </Link>
      </div>

      {/* Quick add task */}
      <Card className="p-3 mb-6">
        <form action={createTask} className="flex gap-2">
          <Input
            name="title"
            placeholder="Quick task... (try the mic on your keyboard)"
            required
            className="flex-1 min-w-0"
            enterKeyHint="done"
          />
          <Select
            name="due_date"
            defaultValue={today}
            className="basis-28 grow-0 shrink-0"
            aria-label="Due date"
          >
            <option value={today}>Today</option>
            <option value={tomorrow}>Tomorrow</option>
            <option value="">No date</option>
          </Select>
          <SubmitButton pendingText="..." className="shrink-0 !px-3">
            <Plus size={18} />
          </SubmitButton>
        </form>
      </Card>

      {season === "retreat" && retreatSection}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-foreground">Due today &amp; overdue</h2>
          <Link
            href="/tasks"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <Card className="px-3">
          {dueNow.length > 0 ? (
            <div className="divide-y divide-border">
              {dueNow.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="py-6">
              <EmptyState
                title="Nothing urgent"
                description="You're all caught up on tasks for today."
              />
            </div>
          )}
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-foreground">
            Drafts awaiting your approval
          </h2>
          <Link
            href="/email-assistant"
            className="text-sm font-medium text-primary hover:underline"
          >
            Open assistant
          </Link>
        </div>
        <Card className="px-3">
          {pendingEmails && pendingEmails.length > 0 ? (
            <div className="divide-y divide-border">
              {pendingEmails.map((draft) => (
                <Link
                  key={draft.id}
                  href={`/email-assistant/${draft.id}`}
                  className="flex items-center gap-3 py-3 px-1 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {draft.sender_name || draft.sender_email || "Unknown sender"}
                    </p>
                    <p className="text-sm text-muted truncate">
                      {draft.ai_summary || draft.subject || draft.original_email.slice(0, 80)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {draft.urgency && (
                      <Badge className={EMAIL_URGENCY_STYLES[draft.urgency]}>
                        {EMAIL_URGENCY_LABELS[draft.urgency]}
                      </Badge>
                    )}
                    <span className="text-xs text-muted">
                      {formatRelativeTime(draft.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-6">
              <EmptyState
                title="No drafts waiting"
                description="Paste in an email to get an AI-drafted reply for your approval."
                action={
                  <LinkButton
                    href="/email-assistant/new"
                    variant="secondary"
                    size="sm"
                  >
                    <Plus size={16} /> New email
                  </LinkButton>
                }
              />
            </div>
          )}
        </Card>
      </section>
      </div>

      {season === "summer" && retreatSection}
    </div>
  );
}