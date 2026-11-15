"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWritableCamp } from "@/lib/auth";
import { field } from "@/lib/form";
import { withSaved } from "@/lib/saved";
import { channelSlug, directChannelName, loginIdFor, markChannelRead, postSystemMessage } from "@/lib/chat";
import { getMyStaff } from "@/lib/routines";
import { todayISODate } from "@/lib/dates";
import type { TaskPriority } from "@/lib/supabase/database.types";

function refreshChat() {
  // The sidebar's unread counts live in the app layout, so refresh it too.
  revalidatePath("/", "layout");
}

export async function postMessage(channelId: string, formData: FormData) {
  await post(channelId, null, formData);
}

/** A reply in a thread, so side conversations don't fill the channel. */
export async function postReply(channelId: string, parentId: string, formData: FormData) {
  await post(channelId, parentId, formData);
}

async function post(channelId: string, parentId: string | null, formData: FormData) {
  const { supabase, campId, userId, fullName, userEmail, role } = await requireWritableCamp();
  const body = field(formData, "body").trim();
  if (!body) return;
  // Only the director posts announcements, and never as a thread reply.
  const announce = role === "director" && !parentId && field(formData, "announce") === "on";

  await supabase.from("messages").insert({
    camp_id: campId,
    channel_id: channelId,
    author_id: userId,
    author_name: fullName ?? userEmail ?? "Staff",
    body: body.slice(0, 4000),
    parent_id: parentId,
    kind: announce ? "announcement" : "user",
  });
  await markChannelRead(supabase, channelId, userId);
  refreshChat();
}

/**
 * Turns a message into a task for someone, links the two, and notes it in
 * the channel so everyone can see it's been picked up.
 */
export async function createTaskFromMessage(messageId: string, formData: FormData) {
  const { supabase, campId, userId, fullName } = await requireWritableCamp();
  const title = field(formData, "title").trim();
  if (!title) return;

  const { data: message } = await supabase.from("messages").select("*").eq("id", messageId).maybeSingle();
  if (!message) return;
  const { data: channel } = await supabase
    .from("channels")
    .select("name, retreat_group_id")
    .eq("id", message.channel_id)
    .maybeSingle();

  const assignedTo = field(formData, "assigned_to").trim() || null;
  const { data: task } = await supabase
    .from("tasks")
    .insert({
      camp_id: campId,
      created_by: userId,
      title,
      description: `From #${channel?.name ?? "chat"}: "${message.body.slice(0, 280)}" (${message.author_name ?? "someone"})`,
      due_date: field(formData, "due_date").trim() || null,
      due_time: field(formData, "due_time").trim() || null,
      priority: (field(formData, "priority") || "medium") as TaskPriority,
      assigned_to: assignedTo,
      // Made in a group's chat: it's part of that group's prep.
      retreat_group_id: channel?.retreat_group_id ?? null,
    })
    .select()
    .single();
  if (!task) return;

  await supabase.from("messages").update({ task_id: task.id }).eq("id", messageId);

  let forWhom = "the office";
  if (assignedTo) {
    const { data: member } = await supabase.from("staff").select("first_name, last_name").eq("id", assignedTo).maybeSingle();
    if (member) forWhom = `${member.first_name} ${member.last_name}`;
  }
  await postSystemMessage(supabase, campId, message.channel_id, `${fullName ?? "Someone"} made a task for ${forWhom}: ${title}`);

  refreshChat();
  revalidatePath("/tasks", "layout");
  redirect(withSaved(`/chat/${channel?.name ?? ""}`, "Task created"));
}

export async function createChannel(formData: FormData) {
  const { supabase, campId, userId, role } = await requireWritableCamp();
  if (role !== "director") return;
  const name = channelSlug(field(formData, "name"));
  const kind = field(formData, "kind") === "summer" ? "summer" : "standing";

  const { data: existing } = await supabase.from("channels").select("id").eq("name", name).maybeSingle();
  if (!existing) {
    await supabase.from("channels").insert({
      camp_id: campId,
      name,
      kind,
      description: field(formData, "description").trim() || null,
      created_by: userId,
    });
  }
  refreshChat();
  redirect(`/chat/${name}`);
}

/**
 * Opens (or creates) a one-to-one conversation with a staff member.
 * Safeguarding: nobody messages an under-18 staff member one-on-one, and
 * under-18 staff can't start one either. Those conversations stay in channels.
 */
export async function startDirectMessage(staffId: string) {
  const { supabase, campId, userId } = await requireWritableCamp();
  const [{ data: member }, me] = await Promise.all([
    supabase.from("staff").select("*").eq("id", staffId).maybeSingle(),
    getMyStaff(),
  ]);
  if (!member) return;

  if (member.under_18 || me?.under_18) {
    redirect(withSaved("/chat", "Under-18 staff are messaged in channels, not one-on-one"));
  }
  const otherId = loginIdFor(member);
  if (!otherId) {
    redirect(withSaved("/chat", `${member.first_name} hasn't signed in to the app yet`));
  }
  if (otherId === userId) redirect("/chat");

  const name = directChannelName(userId, otherId);
  const { data: existing } = await supabase.from("channels").select("id").eq("name", name).maybeSingle();
  if (!existing) {
    await supabase.from("channels").insert({
      camp_id: campId,
      name,
      kind: "direct",
      members: [userId, otherId],
      created_by: userId,
    });
    refreshChat();
  }
  redirect(`/chat/${name}`);
}

/** Adds my reaction, or takes it back if I'd already reacted with that emoji. */
export async function toggleReaction(messageId: string, emoji: string) {
  const { supabase, userId, fullName } = await requireWritableCamp();
  const { data: mine } = await supabase
    .from("message_reactions")
    .select("message_id")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (mine) {
    await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId)
      .eq("emoji", emoji);
  } else {
    await supabase.from("message_reactions").insert({ message_id: messageId, user_id: userId, user_name: fullName, emoji });
  }
  revalidatePath("/chat", "layout");
}

/** Pins a message to the top of its channel, or unpins it if it's already pinned. */
export async function togglePin(channelId: string, messageId: string) {
  const { supabase, campId, fullName } = await requireWritableCamp();
  const { data: channel } = await supabase.from("channels").select("pinned_message_id").eq("id", channelId).maybeSingle();
  if (!channel) return;
  const unpinning = channel.pinned_message_id === messageId;
  await supabase
    .from("channels")
    .update({ pinned_message_id: unpinning ? null : messageId })
    .eq("id", channelId)
    .eq("camp_id", campId);
  if (!unpinning) await postSystemMessage(supabase, campId, channelId, `${fullName ?? "Someone"} pinned a message to the top of this channel.`);
  refreshChat();
}

/** "Got it" on an announcement. Can't be taken back: the director relies on it. */
export async function acknowledge(messageId: string) {
  const { supabase, userId, fullName } = await requireWritableCamp();
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("message_id")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", "ack")
    .maybeSingle();
  if (!existing) {
    await supabase.from("message_reactions").insert({ message_id: messageId, user_id: userId, user_name: fullName, emoji: "ack" });
  }
  refreshChat();
}

/** Sets (or clears) my status for today, like "🛶 At the waterfront". */
export async function setStatus(formData: FormData) {
  const { supabase, campId } = await requireWritableCamp();
  const me = await getMyStaff();
  if (!me) return;
  const preset = field(formData, "preset");
  const [emoji, ...words] = preset ? preset.split(" ") : ["", ""];
  const text = (field(formData, "text").trim() || words.join(" ")).slice(0, 60);
  const clear = field(formData, "clear") === "1" || (!emoji && !text);
  await supabase
    .from("staff")
    .update(
      clear
        ? { status_emoji: null, status_text: null, status_date: null }
        : { status_emoji: emoji || "💬", status_text: text, status_date: todayISODate() }
    )
    .eq("id", me.id)
    .eq("camp_id", campId);
  refreshChat();
}
