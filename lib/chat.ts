import { cache } from "react";
import { requireCamp, type CampContext } from "@/lib/auth";
import { campISODate } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

type Channel = Database["public"]["Tables"]["channels"]["Row"];
type Group = Database["public"]["Tables"]["retreat_groups"]["Row"];
type Staff = Database["public"]["Tables"]["staff"]["Row"];

/**
 * The login a staff member messages as. In the demo every staff member has
 * one (see "view as"); with a real database only people who've signed up do.
 */
export function loginIdFor(member: Staff): string | null {
  if (member.profile_id) return member.profile_id;
  return isSupabaseConfigured() ? null : `demo-user-${member.id}`;
}

/** Direct messages are only for the two people in them. */
export function canSee(channel: Pick<Channel, "kind" | "members">, userId: string): boolean {
  return channel.kind !== "direct" || (channel.members ?? []).includes(userId);
}

/** Who the other person in a direct message is. */
export function otherMember(channel: Pick<Channel, "members">, userId: string, staff: Staff[]): Staff | undefined {
  const other = (channel.members ?? []).find((id) => id !== userId) ?? userId;
  return staff.find((m) => loginIdFor(m) === other);
}

/** The name people see: the other person for a DM, the channel name otherwise. */
export function channelLabel(channel: Pick<Channel, "kind" | "members" | "name">, userId: string, staff: Staff[]): string {
  if (channel.kind !== "direct") return channel.name;
  const other = otherMember(channel, userId, staff);
  return other ? `${other.first_name} ${other.last_name}` : "Direct message";
}

export function directChannelName(a: string, b: string): string {
  return `dm-${[a, b].sort().join("-")}`;
}
type Supabase = CampContext["supabase"];

/** "Grace Fellowship youth retreat" -> "grace-fellowship-youth-retreat" (at most 4 words). */
export function channelSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .filter(Boolean)
      .slice(0, 4)
      .join("-") || "channel"
  );
}

// A group's channel stays open until a week after they leave.
const ARCHIVE_AFTER_DAYS = 7;

function groupChannelOpen(group: Group, today: string): boolean {
  if (group.status !== "confirmed") return false;
  const lastDay = group.departure_date ?? group.arrival_date;
  return !lastDay || lastDay >= campISODate(-ARCHIVE_AFTER_DAYS) || today <= lastDay;
}

/**
 * Opens a channel for every confirmed retreat group and archives the ones
 * whose group has left (or cancelled). Runs once per request.
 */
export const ensureGroupChannels = cache(async () => {
  const { supabase, campId } = await requireCamp();
  const today = campISODate();
  const [{ data: groups }, { data: channels }] = await Promise.all([
    supabase.from("retreat_groups").select("*"),
    supabase.from("channels").select("*").eq("kind", "retreat_group"),
  ]);

  const byGroup = new Map((channels ?? []).map((c) => [c.retreat_group_id, c]));
  const taken = new Set((channels ?? []).map((c) => c.name));

  for (const group of groups ?? []) {
    const existing = byGroup.get(group.id);
    const open = groupChannelOpen(group, today);
    if (existing) {
      if (existing.archived === open) {
        await supabase.from("channels").update({ archived: !open }).eq("id", existing.id);
      }
      continue;
    }
    if (!open) continue;

    let name = channelSlug(group.name.replace(/\b(retreat|weekend)\b/gi, ""));
    if (taken.has(name)) name = `${name}-${(group.arrival_date ?? "").slice(5).replace("-", "")}`;
    taken.add(name);
    const { data: channel } = await supabase
      .from("channels")
      .insert({
        camp_id: campId,
        name,
        kind: "retreat_group",
        retreat_group_id: group.id,
        description: `Everything about ${group.name}.`,
      })
      .select()
      .single();
    if (channel) {
      await postSystemMessage(
        supabase,
        campId,
        channel.id,
        `${group.name} is confirmed${group.headcount ? ` for ${group.headcount} people` : ""}. This channel is for everything about their stay.`
      );
    }
  }
});

export async function postSystemMessage(supabase: Supabase, campId: string, channelId: string, body: string) {
  await supabase.from("messages").insert({
    camp_id: campId,
    channel_id: channelId,
    author_name: "Camp office",
    kind: "system",
    body,
  });
}

/** Posts in a retreat group's channel, if it has one. */
export async function postToGroupChannel(supabase: Supabase, campId: string, groupId: string, body: string) {
  const { data: channel } = await supabase
    .from("channels")
    .select("id")
    .eq("retreat_group_id", groupId)
    .maybeSingle();
  if (channel) await postSystemMessage(supabase, campId, channel.id, body);
}

export interface SidebarChannel {
  id: string;
  name: string;
  kind: Channel["kind"];
  /** What to show: the other person's name for a direct message. */
  label: string;
  unread: number;
  /** For retreat groups: "Nov 14". */
  meta: string | null;
  /** For a direct message: the other person's status today. */
  status: { emoji: string; text: string } | null;
}

const statusFor = (member: Staff | undefined) => (member ? statusOf(member, campISODate()) : null);

/** Channels for the sidebar and chat list, with how many messages I haven't seen. */
export const getChannelList = cache(async (): Promise<SidebarChannel[]> => {
  await ensureGroupChannels();
  const { supabase, userId } = await requireCamp();
  const since = campISODate(-30);

  const [{ data: channels }, { data: reads }, { data: recent }, { data: groups }, { data: staff }] = await Promise.all([
    supabase.from("channels").select("*").eq("archived", false).order("name", { ascending: true }),
    supabase.from("channel_reads").select("*").eq("user_id", userId),
    supabase
      .from("messages")
      .select("channel_id, created_at, author_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("retreat_groups").select("id, arrival_date"),
    supabase.from("staff").select("*"),
  ]);

  const lastRead = new Map((reads ?? []).map((r) => [r.channel_id, r.last_read_at]));
  const arrival = new Map((groups ?? []).map((g) => [g.id, g.arrival_date]));

  const list = (channels ?? []).filter((c) => canSee(c, userId)).map((channel) => {
    const seen = lastRead.get(channel.id) ?? "";
    const unread = (recent ?? []).filter(
      (m) => m.channel_id === channel.id && m.author_id !== userId && m.created_at > seen
    ).length;
    const arrives = channel.retreat_group_id ? arrival.get(channel.retreat_group_id) : null;
    return {
      id: channel.id,
      name: channel.name,
      kind: channel.kind,
      label: channelLabel(channel, userId, staff ?? []),
      status: channel.kind === "direct" ? statusFor(otherMember(channel, userId, staff ?? [])) : null,
      unread,
      meta: arrives
        ? new Date(arrives + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : null,
      arrives: arrives ?? "",
    };
  });

  // Retreat groups in arrival order; the rest alphabetical.
  list.sort((a, b) => (a.kind === "retreat_group" && b.kind === "retreat_group" ? a.arrives.localeCompare(b.arrives) : 0));
  return list.map((c) => ({ id: c.id, name: c.name, kind: c.kind, label: c.label, unread: c.unread, meta: c.meta, status: c.status }));
});

/** Remember that I've seen everything in a channel up to now. */
export async function markChannelRead(supabase: Supabase, channelId: string, userId: string) {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("channel_reads")
    .select("channel_id")
    .eq("channel_id", channelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    await supabase.from("channel_reads").update({ last_read_at: now }).eq("channel_id", channelId).eq("user_id", userId);
  } else {
    await supabase.from("channel_reads").insert({ channel_id: channelId, user_id: userId, last_read_at: now });
  }
}

/** Everyone an announcement is for: staff who can sign in, other than whoever posted it. */
export function announcementAudience(staff: Staff[], authorId: string | null, today: string): Staff[] {
  return staff.filter((m) => {
    const login = loginIdFor(m);
    return login && login !== authorId && (!m.access_ends || today <= m.access_ends);
  });
}

/** Today's status for someone, or null once the day has passed. */
export function statusOf(member: Pick<Staff, "status_emoji" | "status_text" | "status_date">, today: string) {
  if (!member.status_date || member.status_date !== today || !(member.status_emoji || member.status_text)) return null;
  return { emoji: member.status_emoji ?? "", text: member.status_text ?? "" };
}
