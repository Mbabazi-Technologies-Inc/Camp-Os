import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, CheckCheck, ChevronLeft, Megaphone, Hash, ListChecks, MessageSquareReply, Pin, PinOff, Trees, X } from "lucide-react";
import { requireCamp } from "@/lib/auth";
import { announcementAudience, canSee, channelLabel, ensureGroupChannels, markChannelRead, otherMember } from "@/lib/chat";
import { campISODate, formatDateRange, nightsBetween, todayISODate } from "@/lib/dates";
import { formatTime, staffActiveOn } from "@/lib/routines";
import { loginIdFor, statusOf } from "@/lib/chat";
import { initials } from "@/lib/initials";
import { RETREAT_STATUS_LABELS, RETREAT_STATUS_STYLES, TASK_PRIORITY_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Composer } from "@/components/chat/Composer";
import { LiveRefresh } from "@/components/chat/LiveRefresh";
import { NewMarker } from "@/components/chat/NewMarker";
import { acknowledge, createTaskFromMessage, postMessage, postReply, togglePin, toggleReaction } from "../actions";
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
  searchParams: Promise<{ task?: string; thread?: string }>;
}) {
  const { name } = await params;
  const { task: taskFromId, thread: threadId } = await searchParams;
  await ensureGroupChannels();
  const { supabase, userId, role } = await requireCamp();

  const { data: channel } = await supabase.from("channels").select("*").eq("name", name).maybeSingle();
  if (!channel || !canSee(channel, userId)) notFound();

  const [{ data: messageRows }, { data: staffRows }, { data: group }, { data: myRead }] = await Promise.all([
    supabase.from("messages").select("*").eq("channel_id", channel.id).order("created_at", { ascending: true }).limit(300),
    supabase.from("staff").select("*").order("first_name", { ascending: true }),
    channel.retreat_group_id
      ? supabase.from("retreat_groups").select("*").eq("id", channel.retreat_group_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("channel_reads").select("last_read_at").eq("channel_id", channel.id).eq("user_id", userId).maybeSingle(),
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

  // Reactions, grouped per message and emoji.
  const { data: reactionRows } = messages.length
    ? await supabase.from("message_reactions").select("*").in("message_id", messages.map((m) => m.id))
    : { data: [] as Database["public"]["Tables"]["message_reactions"]["Row"][] };
  const reactionsFor = (messageId: string) => {
    const byEmoji = new Map<string, { names: string[]; mine: boolean }>();
    for (const r of reactionRows ?? []) {
      if (r.message_id !== messageId || r.emoji === "ack") continue;
      const entry = byEmoji.get(r.emoji) ?? { names: [], mine: false };
      entry.names.push(r.user_id === userId ? "You" : (r.user_name ?? "Someone"));
      entry.mine ||= r.user_id === userId;
      byEmoji.set(r.emoji, entry);
    }
    return [...byEmoji.entries()];
  };
  // Who has confirmed each announcement.
  const confirmedBy = (messageId: string) =>
    new Set((reactionRows ?? []).filter((r) => r.message_id === messageId && r.emoji === "ack").map((r) => r.user_id));

  // Where "New" starts (drawn by NewMarker, which keeps it in place between refreshes).
  const lastSeen = myRead?.last_read_at ?? "";

  const label = channelLabel(channel, userId, staff);
  const isDirect = channel.kind === "direct";
  const dmWith = isDirect ? otherMember(channel, userId, staff) : undefined;
  const staffName = (id: string | null) => {
    const m = staff.find((s) => s.id === id);
    return m ? `${m.first_name} ${m.last_name}` : null;
  };
  const mentionable = staff.map((m) => `${m.first_name} ${m.last_name}`);

  // Who's been talking here, for the header.
  const voices = [...new Map(messages.filter((m) => m.kind === "user").map((m) => [m.author_name, m])).values()].slice(-4);

  const makingTaskFrom = taskFromId ? messages.find((m) => m.id === taskFromId && !m.task_id) : undefined;

  // Threads: replies hang off the message they answer and stay out of the main feed.
  const repliesTo = new Map<string, Message[]>();
  for (const m of messages) {
    if (!m.parent_id) continue;
    repliesTo.set(m.parent_id, [...(repliesTo.get(m.parent_id) ?? []), m]);
  }
  const openThread = threadId ? messages.find((m) => m.id === threadId && !m.parent_id) : undefined;
  const pinned = channel.pinned_message_id ? messages.find((m) => m.id === channel.pinned_message_id) : undefined;
  const people = staff
    .filter((m) => staffActiveOn(m, today))
    .map((m) => {
      const status = statusOf(m, today);
      return { name: `${m.first_name} ${m.last_name}`, detail: status ? `${status.emoji} ${status.text}` : (m.role ?? m.team ?? "") };
    });
  const isGroup = channel.kind === "retreat_group";
  const Icon = isGroup ? Trees : Hash;
  const QUICK_REACTIONS = ["👍", "✅", "👀", "🙏"];

  // Messages grouped under day dividers.
  const days: { label: string; items: Message[] }[] = [];
  for (const message of messages.filter((m) => !m.parent_id)) {
    const label = dayLabel(message.created_at);
    const last = days[days.length - 1];
    if (last?.label === label) last.items.push(message);
    else days.push({ label, items: [message] });
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] md:min-h-screen">
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Channel header */}
        <div className="sticky top-14 z-10 md:top-0">
        <header className="flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:px-6">
          <Link href="/chat" aria-label="All channels" className="-ml-1 rounded-lg p-1 text-muted hover:bg-surface-muted md:hidden">
            <ChevronLeft size={20} />
          </Link>
          {isDirect ? (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: colourFor(label) }}
            >
              {initials(label)}
            </span>
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon size={18} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-foreground">{label}</h1>
            <p className="truncate text-xs text-muted">
              {isDirect
                ? [
                    dmWith && statusOf(dmWith, today) && `${statusOf(dmWith, today)!.emoji} ${statusOf(dmWith, today)!.text}`,
                    dmWith?.role,
                    dmWith?.team,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Direct message"
                : channel.description}
            </p>
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

        {/* The pinned message stays in view while you scroll */}
        {pinned && (
          <div className="flex items-center gap-2.5 border-b border-accent/20 bg-accent-soft/90 px-4 py-1.5 backdrop-blur md:px-6">
            <Pin size={13} className="shrink-0 text-accent" />
            <details className="group/pin min-w-0 flex-1 text-sm">
              <summary className="cursor-pointer list-none truncate text-foreground group-open/pin:whitespace-normal [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">Pinned:</span> {pinned.body}
              </summary>
              <p className="pb-1 text-xs text-muted">Pinned message from {pinned.author_name}</p>
            </details>
            <form action={togglePin.bind(null, channel.id, pinned.id)}>
              <button type="submit" aria-label="Unpin" title="Unpin" className="rounded-lg p-1 text-muted hover:bg-surface hover:text-foreground">
                <PinOff size={13} />
              </button>
            </form>
          </div>
        )}
        </div>

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
              <p className="font-display text-xl font-semibold text-foreground">
                {isDirect ? `This is the start of your conversation with ${label}` : `This is the start of #${channel.name}`}
              </p>
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
              {day.items.map((message, index) => {
                const previous = day.items[index - 1];
                // Follow-on messages from the same person within 5 minutes sit under one name, like Slack.
                const compact =
                  message.kind === "user" &&
                  previous?.kind === "user" &&
                  previous.author_name === message.author_name &&
                  new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() < 5 * 60_000;
                const reactions = reactionsFor(message.id);
                return (
                  <div
                    key={message.id}
                    data-created={message.created_at}
                    data-author={message.author_id ?? ""}
                    className="group/new"
                  >
                    <div className="my-2 hidden items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-danger group-data-[new=true]/new:flex" role="separator">
                      <span className="h-px flex-1 bg-danger/50" />
                      New
                    </div>
                    {message.kind === "announcement" ? (() => {
                      const audience = announcementAudience(staff, message.author_id, today);
                      const confirmed = confirmedBy(message.id);
                      const done = audience.filter((m) => confirmed.has(String(loginIdFor(m))));
                      const waiting = audience.filter((m) => !confirmed.has(String(loginIdFor(m))));
                      const mine = message.author_id === userId;
                      return (
                        <div className="my-3 overflow-hidden rounded-2xl border border-accent/40 bg-surface shadow-card">
                          <div className="flex items-center gap-2 bg-accent px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                            <Megaphone size={14} /> Announcement
                            <span className="ml-auto font-medium normal-case tracking-normal opacity-90">
                              {message.author_name} · {clock(message.created_at)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-relaxed text-foreground">
                            {withMentions(message.body, mentionable)}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 border-t border-border bg-surface-muted/40 px-4 py-2.5 text-sm">
                            {mine || role === "director" ? (
                              <details className="min-w-0 flex-1">
                                <summary className="cursor-pointer list-none font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                                  <CheckCheck size={15} className="mr-1.5 inline text-forest" />
                                  {done.length} of {audience.length} confirmed
                                  {waiting.length > 0 && <span className="font-normal text-muted"> · see who hasn&apos;t</span>}
                                </summary>
                                <p className="mt-1.5 text-xs text-muted">
                                  {waiting.length
                                    ? `Waiting on: ${waiting.map((m) => `${m.first_name} ${m.last_name}`).join(", ")}`
                                    : "Everyone has confirmed."}
                                </p>
                              </details>
                            ) : (
                              <span className="flex-1 text-muted">
                                {done.length} of {audience.length} have confirmed
                              </span>
                            )}
                            {!mine &&
                              (confirmed.has(userId) ? (
                                <span className="inline-flex items-center gap-1.5 font-semibold text-forest">
                                  <Check size={15} /> You confirmed
                                </span>
                              ) : (
                                <form action={acknowledge.bind(null, message.id)}>
                                  <button
                                    type="submit"
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
                                  >
                                    <Check size={15} /> Got it
                                  </button>
                                </form>
                              ))}
                          </div>
                        </div>
                      );
                    })() : message.kind === "system" ? (
                      <div className="my-2 flex items-start gap-3 rounded-xl border border-dashed border-[#b9d3bf] bg-forest-soft/60 px-3 py-2 text-sm">
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
                        className={`group relative -mx-2 flex gap-3 rounded-xl px-2 transition-colors hover:bg-surface ${
                          compact ? "py-0.5" : "mt-1 py-1.5"
                        } ${makingTaskFrom?.id === message.id ? "bg-surface ring-1 ring-primary/30" : ""}`}
                      >
                        {compact ? (
                          <span className="w-9 shrink-0 pt-1 text-right text-[10px] text-muted opacity-0 group-hover:opacity-100">
                            {clock(message.created_at).replace(/\s?[AP]M$/, "")}
                          </span>
                        ) : (
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ background: colourFor(message.author_name ?? "") }}
                          >
                            {initials(message.author_name ?? "?")}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          {!compact && (
                            <p className="text-sm">
                              <span className="font-bold text-foreground">{message.author_name}</span>
                              <span className="ml-2 text-xs text-muted">{clock(message.created_at)}</span>
                            </p>
                          )}
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
                                <span className="shrink-0 rounded-full bg-primary-soft px-2 text-[11px] font-semibold text-primary">
                                  {done ? "Done" : "Task"}
                                </span>
                              </Link>
                            );
                          })()}
                          {reactions.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {reactions.map(([emoji, { names, mine }]) => (
                                <form key={emoji} action={toggleReaction.bind(null, message.id, emoji)}>
                                  <button
                                    type="submit"
                                    title={names.join(", ")}
                                    aria-pressed={mine}
                                    className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs transition-colors ${
                                      mine
                                        ? "border-primary/40 bg-primary-soft font-semibold text-primary"
                                        : "border-border bg-surface text-muted hover:border-primary/40"
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    {names.length}
                                  </button>
                                </form>
                              ))}
                            </div>
                          )}
                          {(repliesTo.get(message.id)?.length ?? 0) > 0 && (() => {
                            const replies = repliesTo.get(message.id)!;
                            const voices = [...new Set(replies.map((r) => r.author_name ?? "?"))].slice(0, 3);
                            return (
                              <Link
                                href={`/chat/${channel.name}?thread=${message.id}`}
                                scroll={false}
                                className="mt-1 inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-xs font-semibold text-primary hover:bg-primary-soft"
                              >
                                <span className="flex -space-x-1">
                                  {voices.map((v) => (
                                    <span
                                      key={v}
                                      className="flex h-5 w-5 items-center justify-center rounded border border-surface text-[8px] font-bold text-white"
                                      style={{ background: colourFor(v) }}
                                    >
                                      {initials(v)}
                                    </span>
                                  ))}
                                </span>
                                {replies.length} {replies.length === 1 ? "reply" : "replies"}
                                <span className="font-normal text-muted">· last {clock(replies[replies.length - 1].created_at)}</span>
                              </Link>
                            );
                          })()}
                        </div>

                        {/* Quick actions: react without typing, or turn it into a task */}
                        <div className="absolute -top-3.5 right-2 hidden items-center overflow-hidden rounded-lg border border-border bg-surface shadow-card group-hover:flex group-focus-within:flex [@media(hover:none)]:static [@media(hover:none)]:flex [@media(hover:none)]:self-start [@media(hover:none)]:border-0 [@media(hover:none)]:bg-transparent [@media(hover:none)]:shadow-none">
                          {QUICK_REACTIONS.map((emoji) => (
                            <form key={emoji} action={toggleReaction.bind(null, message.id, emoji)} className="[@media(hover:none)]:hidden">
                              <button
                                type="submit"
                                aria-label={`React ${emoji}`}
                                className="flex h-7 w-8 items-center justify-center text-sm hover:bg-surface-muted"
                              >
                                {emoji}
                              </button>
                            </form>
                          ))}
                          <Link
                            href={`/chat/${channel.name}?thread=${message.id}`}
                            scroll={false}
                            aria-label="Reply in thread"
                            title="Reply in thread"
                            className="flex h-7 w-8 items-center justify-center border-l border-border text-muted hover:bg-surface-muted hover:text-foreground [@media(hover:none)]:border-0"
                          >
                            <MessageSquareReply size={14} />
                          </Link>
                          <form action={togglePin.bind(null, channel.id, message.id)} className="[@media(hover:none)]:hidden">
                            <button
                              type="submit"
                              aria-label={pinned?.id === message.id ? "Unpin" : "Pin to channel"}
                              title={pinned?.id === message.id ? "Unpin" : "Pin to channel"}
                              className="flex h-7 w-8 items-center justify-center text-muted hover:bg-surface-muted hover:text-foreground"
                            >
                              {pinned?.id === message.id ? <PinOff size={14} /> : <Pin size={14} />}
                            </button>
                          </form>
                          {!message.task_id && (
                            <Link
                              href={`/chat/${channel.name}?task=${message.id}`}
                              scroll={false}
                              aria-label="Make a task from this message"
                              className="flex h-7 items-center gap-1.5 border-l border-border px-2.5 text-xs font-semibold text-primary hover:bg-primary-soft [@media(hover:none)]:border-0 [@media(hover:none)]:px-1.5 [@media(hover:none)]:text-muted"
                            >
                              <ListChecks size={13} />
                              <span className="[@media(hover:none)]:sr-only">Make task</span>
                            </Link>
                          )}
                        </div>
                      </article>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <div id="chat-end" />
        </div>

        <div className="sticky bottom-24 z-10 px-4 pb-3 pt-1 md:bottom-0 md:px-6 md:pb-5">
          <Composer
            action={postMessage.bind(null, channel.id)}
            placeholder={isDirect ? `Message ${label}` : `Message #${channel.name}`}
            canAnnounce={role === "director" && channel.kind !== "direct"}
            people={people}
          />
        </div>
      </section>

      {openThread && !makingTaskFrom && (
        <aside className="fixed inset-x-0 bottom-0 z-30 flex max-h-[85dvh] flex-col rounded-t-3xl border-t border-border bg-surface shadow-dock lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:max-h-none lg:w-96 lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Thread</h2>
              <p className="text-xs text-muted">{isDirect ? label : `#${channel.name}`}</p>
            </div>
            <Link href={`/chat/${channel.name}`} scroll={false} aria-label="Close thread" className="rounded-lg p-1 text-muted hover:bg-surface-muted">
              <X size={18} />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {[openThread, ...(repliesTo.get(openThread.id) ?? [])].map((m, i) => (
              <div key={m.id} className={`flex gap-3 py-2 ${i === 0 ? "border-b border-border pb-3" : ""}`}>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: colourFor(m.author_name ?? "") }}
                >
                  {initials(m.author_name ?? "?")}
                </span>
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-bold text-foreground">{m.author_name}</span>
                    <span className="ml-2 text-xs text-muted">{clock(m.created_at)}</span>
                  </p>
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
                    {withMentions(m.body, mentionable)}
                  </p>
                </div>
              </div>
            ))}
            {(repliesTo.get(openThread.id)?.length ?? 0) === 0 && (
              <p className="py-3 text-sm text-muted">No replies yet. Answer here to keep the channel tidy.</p>
            )}
          </div>
          <div className="border-t border-border p-3">
            <Composer action={postReply.bind(null, channel.id, openThread.id)} placeholder="Reply in thread…" people={people} inputId="thread-body" />
          </div>
        </aside>
      )}

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

      <LiveRefresh key={`refresh-${channel.id}`} anchorId="chat-end" count={messages.length} />
      <NewMarker key={`new-${channel.id}`} lastSeen={lastSeen} userId={userId} />
    </div>
  );
}
