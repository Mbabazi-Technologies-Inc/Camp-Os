import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ChevronLeft, Hash, ListChecks, Trees, X } from "lucide-react";
import { requireCamp } from "@/lib/auth";
import { markChannelRead, ensureGroupChannels } from "@/lib/chat";
import { campISODate, formatDateRange, nightsBetween, todayISODate } from "@/lib/dates";
import { formatTime, staffActiveOn } from "@/lib/routines";
import { initials } from "@/lib/initials";
import { RETREAT_STATUS_LABELS, RETREAT_STATUS_STYLES, TASK_PRIORITY_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Composer } from "@/components/chat/Composer";
import { LiveRefresh } from "@/components/chat/LiveRefresh";
import { createTaskFromMessage, postMessage } from "../actions";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type Message = Database["public"]["Tables"]["messages"]["Row"];

// A steady colour per person, so faces are easy to tell apart in a busy channel.
const AVATAR_COLOURS = ["#d98d2b", "#14586b", "#3c7146", "#7a5c9a", "#b4532a", "#2d7d8a", "#5a6fa8", "#8a6a2d"];
function colourFor(key: string): string {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}

function dayLabel(iso: string): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date(iso));
  if (day === campISODate()) return "Today";
  if (day === campISODate(-1)) return "Yesterday";
  return new Date(day + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" });

/** Highlights @Name mentions of people on staff. */
function withMentions(body: string, names: string[]) {
  if (names.length === 0) return body;
  const pattern = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
  return body.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="rounded bg-accent-soft px-0.5 font-semibold text-warning">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const { name } = await params;
  const { task: taskFromId } = await searchParams;
  await ensureGroupChannels();
  const { supabase, userId } = await requireCamp();

  const { data: channel } = await supabase.from("channels").select("*").eq("name", name).maybeSingle();
  if (!channel) notFound();

  const [{ data: messageRows }, { data: staffRows }, { data: group }] = await Promise.all([
    supabase.from("messages").select("*").eq("channel_id", channel.id).order("created_at", { ascending: true }).limit(300),
    supabase.from("staff").select("*").order("first_name", { ascending: true }),
    channel.retreat_group_id
      ? supabase.from("retreat_groups").select("*").eq("id", channel.retreat_group_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  await markChannelRead(supabase, channel.id, userId);

  const messages = messageRows ?? [];
  const staff = staffRows ?? [];
  const today = todayISODate();
  const taskIds = messages.map((m) => m.task_id).filter((id): id is string => Boolean(id));
  const { data: taskRows } = taskIds.length
    ? await supabase.from("tasks").select("*").in("id", taskIds)
    : { data: [] as Database["public"]["Tables"]["tasks"]["Row"][] };
  const tasks = new Map((taskRows ?? []).map((t) => [t.id, t]));
  const staffName = (id: string | null) => {
    const m = staff.find((s) => s.id === id);
    return m ? `${m.first_name} ${m.last_name}` : null;
  };
  const mentionable = staff.map((m) => `${m.first_name} ${m.last_name}`);

  // Who's been talking here, for the header.
  const voices = [...new Map(messages.filter((m) => m.kind === "user").map((m) => [m.author_name, m])).values()].slice(-4);

  const makingTaskFrom = taskFromId ? messages.find((m) => m.id === taskFromId && !m.task_id) : undefined;
  const isGroup = channel.kind === "retreat_group";
  const Icon = isGroup ? Trees : Hash;

  // Messages grouped under day dividers.
  const days: { label: string; items: Message[] }[] = [];
  for (const message of messages) {
    const label = dayLabel(message.created_at);
    const last = days[days.length - 1];
    if (last?.label === label) last.items.push(message);
    else days.push({ label, items: [message] });
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] md:min-h-screen">
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Channel header */}
        <header className="sticky top-14 z-10 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:top-0 md:px-6">
          <Link href="/chat" aria-label="All channels" className="-ml-1 rounded-lg p-1 text-muted hover:bg-surface-muted md:hidden">
            <ChevronLeft size={20} />
          </Link>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-foreground">{channel.name}</h1>
            <p className="truncate text-xs text-muted">{channel.description}</p>
          </div>
          <div className="hidden -space-x-1.5 sm:flex">
            {voices.map((m) => (
              <span
                key={m.id}
                title={m.author_name ?? ""}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-[10px] font-bold text-white"
                style={{ background: colourFor(m.author_name ?? "") }}
              >
                {initials(m.author_name ?? "?")}
              </span>
            ))}
          </div>
          {group && (
            <Link
              href={`/groups/${group.id}`}
              className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-surface-muted sm:inline-flex"
            >
              Open booking <ArrowRight size={14} />
            </Link>
          )}
        </header>

        {/* The booking this channel is about */}
        {group && (
          <Link
            href={`/groups/${group.id}`}
            className="mx-4 mt-3 flex items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3 transition-colors hover:border-primary/40 md:mx-6"
          >
            {group.arrival_date && (
              <span className="w-12 shrink-0 rounded-xl bg-forest-soft py-1 text-center text-forest">
                <span className="block text-[10px] font-bold uppercase tracking-wide">
                  {new Date(group.arrival_date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                </span>
                <span className="block text-lg font-bold leading-tight">
                  {new Date(group.arrival_date + "T00:00:00").getDate()}
                </span>
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-foreground">{group.name}</span>
              <span className="block truncate text-sm text-muted">
                {formatDateRange(group.arrival_date, group.departure_date)}
                {nightsBetween(group.arrival_date, group.departure_date) !== null &&
                  ` · ${nightsBetween(group.arrival_date, group.departure_date)} nights`}
                {group.contact_name && ` · ${group.contact_name}`}
              </span>
            </span>
            <Badge className={RETREAT_STATUS_STYLES[group.status]}>{RETREAT_STATUS_LABELS[group.status]}</Badge>
            {group.headcount !== null && (
              <span className="hidden text-center sm:block">
                <span className="block text-lg font-bold leading-tight text-foreground">{group.headcount}</span>
                <span className="block text-xs text-muted">people</span>
              </span>
            )}
          </Link>
        )}

        {/* Conversation */}
        <div className="flex-1 px-4 pb-2 pt-2 md:px-6">
          {messages.length === 0 && (
            <div className="py-16 text-center">
              <p className="font-display text-xl font-semibold text-foreground">This is the start of #{channel.name}</p>
              <p className="mt-1 text-sm text-muted">Say hello, share an update, or turn a message into a task.</p>
            </div>
          )}
          {days.map((day) => (
            <div key={day.label}>
              <div className="my-3 flex items-center gap-3 text-xs font-semibold text-muted">
                <span className="h-px flex-1 bg-border" />
                {day.label}
                <span className="h-px flex-1 bg-border" />
              </div>
              {day.items.map((message) =>
                message.kind === "system" ? (
                  <div
                    key={message.id}
                    className="my-2 flex items-start gap-3 rounded-xl border border-dashed border-[#b9d3bf] bg-forest-soft/60 px-3 py-2 text-sm"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-forest text-white">
                      <Trees size={14} />
                    </span>
                    <p className="min-w-0 text-foreground">
                      <span className="font-bold">Camp office</span>
                      <span className="ml-1.5 rounded bg-forest/15 px-1 text-[10px] font-bold tracking-wide text-forest">APP</span>
                      <span className="ml-1.5 text-xs text-muted">{clock(message.created_at)}</span>
                      <span className="block">{message.body}</span>
                    </p>
                  </div>
                ) : (
                  <article
                    key={message.id}
                    className={`group relative -mx-2 flex gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface ${
                      makingTaskFrom?.id === message.id ? "bg-surface ring-1 ring-primary/30" : ""
                    }`}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: colourFor(message.author_name ?? "") }}
                    >
                      {initials(message.author_name ?? "?")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-bold text-foreground">{message.author_name}</span>
                        <span className="ml-2 text-xs text-muted">{clock(message.created_at)}</span>
                      </p>
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
                        {withMentions(message.body, mentionable)}
                      </p>
                      {message.task_id && tasks.get(message.task_id) && (() => {
                        const task = tasks.get(message.task_id)!;
                        const done = task.status === "done";
                        return (
                          <Link
                            href={`/tasks/${task.id}`}
                            className="mt-1.5 inline-flex max-w-full items-center gap-2.5 rounded-lg border border-border border-l-[3px] border-l-primary bg-surface px-3 py-1.5 text-sm hover:border-primary/40"
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${
                                done ? "border-forest bg-forest text-white" : "border-muted/50"
                              }`}
                            >
                              {done && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className={`truncate font-semibold ${done ? "text-muted line-through" : "text-foreground"}`}>
                              {task.title}
                            </span>
                            <span className="hidden shrink-0 text-xs text-muted sm:inline">
                              {[staffName(task.assigned_to), task.due_date && `due ${task.due_date === today ? "today" : new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, formatTime(task.due_time)]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                            <span className="shrink-0 rounded-full bg-primary-soft px-2 text-[11px] font-semibold text-primary">Task</span>
                          </Link>
                        );
                      })()}
                    </div>
                    {!message.task_id && (
                      <Link
                        href={`/chat/${channel.name}?task=${message.id}`}
                        scroll={false}
                        className="absolute -top-3 right-2 hidden items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-primary shadow-card group-hover:inline-flex focus-visible:inline-flex [@media(hover:none)]:static [@media(hover:none)]:mt-1 [@media(hover:none)]:inline-flex [@media(hover:none)]:self-start [@media(hover:none)]:shadow-none [@media(hover:none)]:border-transparent [@media(hover:none)]:px-1.5 [@media(hover:none)]:text-muted"
                        aria-label="Make a task from this message"
                      >
                        <ListChecks size={13} />
                        <span className="[@media(hover:none)]:sr-only">Make task</span>
                      </Link>
                    )}
                  </article>
                )
              )}
            </div>
          ))}
          <div id="chat-end" />
        </div>

        <div className="sticky bottom-24 z-10 px-4 pb-3 pt-1 md:bottom-0 md:px-6 md:pb-5">
          <Composer action={postMessage.bind(null, channel.id)} channelName={channel.name} />
        </div>
      </section>

      {makingTaskFrom && (
        <aside className="fixed inset-x-0 bottom-0 z-30 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-5 shadow-dock lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:max-h-none lg:w-80 lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">Make a task</h2>
            <Link href={`/chat/${channel.name}`} scroll={false} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-surface-muted">
              <X size={18} />
            </Link>
          </div>
          <blockquote className="mb-4 border-l-[3px] border-border pl-3 text-sm text-muted">
            &ldquo;{makingTaskFrom.body}&rdquo; ({makingTaskFrom.author_name})
          </blockquote>
          <form action={createTaskFromMessage.bind(null, makingTaskFrom.id)} className="space-y-3">
            <div>
              <Label htmlFor="task-title">Task</Label>
              <Input
                id="task-title"
                name="title"
                required
                defaultValue={makingTaskFrom.body.split(/[.!?\n]/)[0].replace(/@\S+\s?\S*/g, "").trim().slice(0, 80)}
              />
            </div>
            <div>
              <Label htmlFor="task-for">Assign to</Label>
              <Select
                id="task-for"
                name="assigned_to"
                defaultValue={staff.find((m) => `${m.first_name} ${m.last_name}` === makingTaskFrom.author_name)?.id ?? ""}
              >
                <option value="">The office (shared)</option>
                {staff
                  .filter((m) => staffActiveOn(m, today))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="task-due">Due</Label>
                <Input id="task-due" name="due_date" type="date" defaultValue={today} />
              </div>
              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select id="task-priority" name="priority" defaultValue="medium">
                  {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted">The task links back to this message, and the channel gets a note saying who has it.</p>
            <SubmitButton pendingText="Creating..." className="w-full">
              Create task
            </SubmitButton>
          </form>
        </aside>
      )}

      <LiveRefresh anchorId="chat-end" count={messages.length} />
    </div>
  );
}
