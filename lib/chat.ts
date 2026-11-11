import { cache } from "react";
import { requireCamp, type CampContext } from "@/lib/auth";
import { campISODate } from "@/lib/dates";
import type { Database } from "@/lib/supabase/database.types";

type Channel = Database["public"]["Tables"]["channels"]["Row"];
type Group = Database["public"]["Tables"]["retreat_groups"]["Row"];
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
  unread: number;
  /** For retreat groups: "Nov 14". */
  meta: string | null;
}

/** Channels for the sidebar and chat list, with how many messages I haven't seen. */
export const getChannelList = cache(async (): Promise<SidebarChannel[]> => {
  await ensureGroupChannels();
  const { supabase, userId } = await requireCamp();
  const since = campISODate(-30);

  const [{ data: channels }, { data: reads }, { data: recent }, { data: groups }] = await Promise.all([
    supabase.from("channels").select("*").eq("archived", false).order("name", { ascending: true }),
    supabase.from("channel_reads").select("*").eq("user_id", userId),
    supabase
      .from("messages")
      .select("channel_id, created_at, author_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("retreat_groups").select("id, arrival_date"),
  ]);

  const lastRead = new Map((reads ?? []).map((r) => [r.channel_id, r.last_read_at]));
  const arrival = new Map((groups ?? []).map((g) => [g.id, g.arrival_date]));

  const list = (channels ?? []).map((channel) => {
    const seen = lastRead.get(channel.id) ?? "";
    const unread = (recent ?? []).filter(
      (m) => m.channel_id === channel.id && m.author_id !== userId && m.created_at > seen
    ).length;
    const arrives = channel.retreat_group_id ? arrival.get(channel.retreat_group_id) : null;
    return {
      id: channel.id,
      name: channel.name,
      kind: channel.kind,
      unread,
      meta: arrives
        ? new Date(arrives + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : null,
      arrives: arrives ?? "",
    };
  });

  // Retreat groups in arrival order; the rest alphabetical.
  list.sort((a, b) => (a.kind === "retreat_group" && b.kind === "retreat_group" ? a.arrives.localeCompare(b.arrives) : 0));
  return list.map((c) => ({ id: c.id, name: c.name, kind: c.kind, unread: c.unread, meta: c.meta }));
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
