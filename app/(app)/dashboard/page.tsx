import type { Metadata } from "next";
import Link from "next/link";
import { requireCamp } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { canSee, getChannelList } from "@/lib/chat";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HomeHero, type HeroChip, type HeroNext, type HeroStat } from "@/components/home/HomeHero";
import { acknowledge } from "@/app/(app)/chat/actions";
import { campTimeNow, ensureRoutineTasks, getMyStaff, myTasksFilter } from "@/lib/routines";
import { createTask } from "@/app/(app)/tasks/actions";
import { addStarterPack } from "@/app/(app)/knowledge-base/actions";
import { todayISODate, tomorrowISODate, formatRelativeTime, campISODate } from "@/lib/dates";
import { seasonFor, SEASON_LABELS } from "@/lib/season";
import { GroupRow } from "@/components/groups/GroupRow";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TaskItem } from "@/components/tasks/TaskItem";
import { EMAIL_URGENCY_LABELS, EMAIL_URGENCY_STYLES } from "@/lib/labels";
import {
  Mail,
  ListTodo,
  Plus,
  CheckCircle2,
  Circle,
  Trees,
  Megaphone,
  MessageSquare,
  AtSign,
} from "lucide-react";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Today" };

export const dynamic = "force-dynamic";

function isoDaysFromToday(days: number) {
  return campISODate(days);
}


function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ hour?: string }> }) {
  const { supabase, campId, fullName, role, userId } = await requireCamp();
  const { hour: previewHour } = await searchParams;

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

  // Mentions of me and anything unread in chat, newest first (the mockup's
  // "Mentions & replies").
  const myName = fullName ?? "";
  const myFirst = myName.split(" ")[0];
  const [{ data: recentMessages }, { data: myReads }, { data: channelRows }] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .eq("kind", "user")
      .gte("created_at", campISODate(-7))
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("channel_reads").select("*").eq("user_id", userId),
    supabase.from("channels").select("id, name, kind, members, retreat_group_id"),
  ]);
  const readAt = new Map((myReads ?? []).map((r) => [r.channel_id, r.last_read_at]));
  const channelById = new Map((channelRows ?? []).map((c) => [c.id, c]));
  const mentionsMe = (body: string) =>
    Boolean(myName) && (body.includes(`@${myName}`) || (myFirst.length > 2 && body.includes(`@${myFirst}`)));
  const forMe = (recentMessages ?? [])
    .filter((m) => m.author_id !== userId)
    .filter((m) => {
      const channel = channelById.get(m.channel_id);
      return Boolean(channel && canSee(channel, userId));
    })
    .filter((m) => mentionsMe(m.body) || m.created_at > (readAt.get(m.channel_id) ?? ""))
    .slice(0, 5)
    .map((m) => ({ ...m, mention: mentionsMe(m.body), channel: channelById.get(m.channel_id) }));

  // Announcements I still need to confirm.
  const [{ data: announcements }, { data: myAcks }] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .eq("kind", "announcement")
      .gte("created_at", campISODate(-30))
      .order("created_at", { ascending: false }),
    supabase.from("message_reactions").select("message_id").eq("user_id", userId).eq("emoji", "ack"),
  ]);
  const acked = new Set((myAcks ?? []).map((a) => a.message_id));
  const toConfirm = (announcements ?? []).filter((a) => {
    const channel = channelById.get(a.channel_id);
    return a.author_id !== userId && !acked.has(a.id) && channel && canSee(channel, userId);
  });

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

  const firstName = fullName?.split(" ")?.[0];
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
  const retreatSection = (
    <>
      {upcomingGroups.length > 0 && (
        <section className="mt-8">
          <SectionHeading title="Upcoming retreat groups" icon={Trees} count={upcomingGroups.length} href="/groups" linkLabel="All groups" tone="forest" />
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

  // The hour at camp (not the server's clock) decides the greeting and the sky.
  const campHour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Toronto" }).format(new Date())
  );
  // Demo only: ?hour=19 previews the evening sky without waiting for it.
  const hour =
    !isSupabaseConfigured() && previewHour && /^\d{1,2}$/.test(previewHour) ? Number(previewHour) % 24 : campHour;
  const unreadChat = (await getChannelList()).reduce((sum, c) => sum + c.unread, 0);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const heroChips: HeroChip[] = [
    ...((urgentEmailCount ?? 0) > 0
      ? [{ label: `${plural(urgentEmailCount ?? 0, "urgent email")}`, href: "/email-assistant", icon: Mail, tone: "urgent" as const }]
      : (pendingEmailCount ?? 0) > 0
        ? [{ label: `${plural(pendingEmailCount ?? 0, "draft")} to review`, href: "/email-assistant", icon: Mail }]
        : []),
    ...((overdueCount ?? 0) > 0
      ? [{ label: `${plural(overdueCount ?? 0, "task")} overdue`, href: "/tasks", icon: ListTodo, tone: "urgent" as const }]
      : []),
    ...(toConfirm.length > 0
      ? [{ label: `${plural(toConfirm.length, "announcement")} to confirm`, href: "#confirm", icon: Megaphone, tone: "urgent" as const }]
      : []),
    ...(unreadChat > 0 ? [{ label: `${plural(unreadChat, "unread message")}`, href: "/chat", icon: MessageSquare }] : []),
  ];

  // Up next: the next confirmed group within two weeks.
  const soonest = upcomingGroups.find(
    (g) => g.status === "confirmed" && g.arrival_date && g.arrival_date >= today && g.arrival_date <= isoDaysFromToday(14)
  );
  const daysAway = soonest?.arrival_date
    ? Math.round((new Date(soonest.arrival_date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86_400_000)
    : null;
  const groupChannel = soonest ? (channelRows ?? []).find((c) => c.retreat_group_id === soonest.id) : undefined;
  const heroNext: HeroNext | null = soonest
    ? {
        kicker: "Up next",
        title: soonest.name,
        when:
          daysAway === 0
            ? "Arriving today"
            : `Arrives ${new Date(soonest.arrival_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
        countdown: daysAway && daysAway > 0 ? `${daysAway} ${daysAway === 1 ? "day to go" : "days to go"}` : null,
        detail: [soonest.headcount ? `${soonest.headcount} people` : null, groupChannel ? "Open the group chat" : "Open booking"]
          .filter(Boolean)
          .join(" · "),
        href: groupChannel ? `/chat/${groupChannel.name}` : `/groups/${soonest.id}`,
      }
    : null;

  const heroStats: HeroStat[] = [
    { label: "Open tasks", value: String(openTaskCount ?? 0), sub: overdueCount ? `${overdueCount} late` : undefined, href: "/tasks", alert: Boolean(overdueCount) },
    { label: "Drafts", value: String(pendingEmailCount ?? 0), href: "/email-assistant" },
    isDirector
      ? {
          label: teamLate ? `Team · ${teamLate} late` : "Team today",
          value: `${teamDone}`,
          sub: `of ${teamTasks.length}`,
          href: "/tasks/team",
          progress: teamTasks.length ? Math.round((teamDone / teamTasks.length) * 100) : 0,
          alert: teamLate > 0,
        }
      : { label: "Unread", value: String(unreadChat), href: "/chat" },
  ];

  return (
    <div>
      <HomeHero
        hour={hour}
        greeting={`${greetingForHour(hour)}${firstName ? `, ${firstName}` : ""}`}
        dateLabel={new Date(today + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        seasonLabel={SEASON_LABELS[season]}
        summer={season === "summer"}
        summary={
          caughtUp
            ? season === "summer"
              ? "All clear. Go be with the campers."
              : "All clear. Enjoy the quiet between groups."
            : heroChips.length
              ? "Here's what needs you today."
              : "Nothing urgent. Here's the day at a glance."
        }
        chips={heroChips}
        urgent={
          topUrgentEmail
            ? {
                label:
                  topUrgentEmail.ai_summary ||
                  `Urgent email from ${topUrgentEmail.sender_name || topUrgentEmail.sender_email || "a parent"}`,
                href: `/email-assistant/${topUrgentEmail.id}`,
              }
            : topOverdueTask
              ? { label: topOverdueTask.title, href: `/tasks/${topOverdueTask.id}` }
              : null
        }
        next={heroNext}
        stats={heroStats}
        showReviewInbox={Boolean(gmailAccount)}
      />

      {/* Onboarding checklist */}
      {onboarding && (
        <Card className="p-4 mb-5">
          <p className="font-semibold text-foreground mb-1">Set up {brand.name}</p>
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

      {/* Announcements waiting for my OK come before everything else */}
      {toConfirm.length > 0 && (
        <div id="confirm" className="mb-5 scroll-mt-20 space-y-3">
          {toConfirm.map((a) => (
            <Card key={a.id} className="overflow-hidden border-accent/40">
              <div className="flex items-center gap-2 bg-accent px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                <Megaphone size={14} /> Please confirm
                <span className="ml-auto font-medium normal-case tracking-normal opacity-90">
                  {a.author_name} · {formatRelativeTime(a.created_at)}
                </span>
              </div>
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <p className="flex-1 text-[15px] text-foreground">{a.body}</p>
                <form action={acknowledge.bind(null, a.id)}>
                  <SubmitButton pendingText="Saving...">
                    <CheckCircle2 size={16} /> Got it
                  </SubmitButton>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
      <section>
        <SectionHeading title="Mentions & unread" icon={AtSign} count={forMe.length} href="/chat" linkLabel="Open chat" />
        <Card>
          {forMe.length > 0 ? (
            <ul className="divide-y divide-border">
              {forMe.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/chat/${m.channel?.name ?? ""}`}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-muted/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#0f3a46] text-[11px] font-bold text-white">
                      {(m.author_name ?? "?").split(" ").map((p) => p[0]).join("").slice(0, 2)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">
                        <span className="font-semibold text-foreground">{m.author_name}</span>
                        <span className="text-muted">
                          {m.channel?.kind === "direct"
                            ? " · direct message"
                            : ` in ${m.channel?.kind === "retreat_group" ? "" : "#"}${m.channel?.name}`}
                          {" · "}
                          {formatRelativeTime(m.created_at)}
                        </span>
                      </span>
                      <span className="line-clamp-2 text-sm text-foreground">{m.body}</span>
                    </span>
                    {m.mention && (
                      <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-warning">@you</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6">
              <EmptyState title="You're all caught up" description="New messages and @mentions of you show up here." />
            </div>
          )}
        </Card>
      </section>

      <section>
        <SectionHeading title="Your tasks today" icon={ListTodo} count={dueNow.length} href="/tasks" tone="forest" />
        <Card className="px-3">
          {/* Quick add, right where the list is */}
          <form action={createTask} className="-mx-3 flex gap-2 border-b border-border bg-surface-muted/40 px-3 py-2.5">
            <Input
              name="title"
              placeholder="Add a task… (try the mic on your keyboard)"
              aria-label="New task"
              required
              className="h-10 min-w-0 !w-auto flex-1 text-[15px]"
              enterKeyHint="done"
            />
            <Select name="due_date" defaultValue={today} className="h-10 !w-28 shrink-0 text-sm" aria-label="Due date">
              <option value={today}>Today</option>
              <option value={tomorrow}>Tomorrow</option>
              <option value="">No date</option>
            </Select>
            <SubmitButton pendingText="…" className="h-10 shrink-0 !px-3">
              <Plus size={18} />
            </SubmitButton>
          </form>
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

      <section className="lg:col-span-2">
        <SectionHeading
          title="Drafts awaiting your approval"
          icon={Mail}
          count={pendingEmails?.length ?? 0}
          href="/email-assistant"
          linkLabel="Open assistant"
          tone="accent"
        />
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

      {retreatSection}
    </div>
  );
}