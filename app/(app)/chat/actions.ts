"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCamp } from "@/lib/auth";
import { field } from "@/lib/form";
import { withSaved } from "@/lib/saved";
import { channelSlug, markChannelRead, postSystemMessage } from "@/lib/chat";
import type { TaskPriority } from "@/lib/supabase/database.types";

function refreshChat() {
  // The sidebar's unread counts live in the app layout, so refresh it too.
  revalidatePath("/", "layout");
}

export async function postMessage(channelId: string, formData: FormData) {
  const { supabase, campId, userId, fullName, userEmail } = await requireCamp();
  const body = field(formData, "body").trim();
  if (!body) return;

  await supabase.from("messages").insert({
    camp_id: campId,
    channel_id: channelId,
    author_id: userId,
    author_name: fullName ?? userEmail ?? "Staff",
    body: body.slice(0, 4000),
  });
  await markChannelRead(supabase, channelId, userId);
  refreshChat();
}

/**
 * Turns a message into a task for someone, links the two, and notes it in
 * the channel so everyone can see it's been picked up.
 */
export async function createTaskFromMessage(messageId: string, formData: FormData) {
  const { supabase, campId, userId, fullName } = await requireCamp();
  const title = field(formData, "title").trim();
  if (!title) return;

  const { data: message } = await supabase.from("messages").select("*").eq("id", messageId).maybeSingle();
  if (!message) return;
  const { data: channel } = await supabase.from("channels").select("name").eq("id", message.channel_id).maybeSingle();

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
  const { supabase, campId, userId, role } = await requireCamp();
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
