import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canSee, getChannelList } from "@/lib/chat";

export const dynamic = "force-dynamic";

/**
 * What's new for me in chat since `since`: total unread (for the tab title)
 * and any @mentions or direct messages to notify about.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ unread: 0, items: [] }, { status: 401 });

  const since = new URL(request.url).searchParams.get("since") ?? new Date().toISOString();
  const { data: profile } = await supabase.from("profiles").select("camp_id, full_name").eq("id", user.id).maybeSingle();
  if (!profile?.camp_id) return NextResponse.json({ unread: 0, items: [] });

  const channels = await getChannelList();
  const unread = channels.reduce((sum, c) => sum + c.unread, 0);

  const [{ data: fresh }, { data: channelRows }] = await Promise.all([
    supabase.from("messages").select("*").eq("kind", "user").gt("created_at", since).order("created_at", { ascending: true }).limit(50),
    supabase.from("channels").select("id, name, kind, members"),
  ]);
  const byId = new Map((channelRows ?? []).map((c) => [c.id, c]));
  const name = profile.full_name ?? "";
  const first = name.split(" ")[0];
  const mentions = (body: string) => Boolean(name) && (body.includes(`@${name}`) || (first.length > 2 && body.includes(`@${first}`)));

  const items = (fresh ?? [])
    .filter((m) => m.author_id !== user.id)
    .map((m) => ({ m, channel: byId.get(m.channel_id) }))
    .filter(({ channel }) => channel && canSee(channel, user.id))
    .filter(({ m, channel }) => channel!.kind === "direct" || mentions(m.body))
    .map(({ m, channel }) => ({
      id: m.id,
      title: channel!.kind === "direct" ? m.author_name ?? "New message" : `${m.author_name} in #${channel!.name}`,
      body: m.body.slice(0, 140),
      href: `/chat/${channel!.name}${m.parent_id ? `?thread=${m.parent_id}` : ""}`,
      at: m.created_at,
    }));

  return NextResponse.json({ unread, items });
}
