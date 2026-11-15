"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWritableCamp } from "@/lib/auth";
import type { TaskPriority } from "@/lib/supabase/database.types";
import { field } from "@/lib/form";
import { withSaved } from "@/lib/saved";

function revalidateTaskViews() {
  // "layout" also refreshes each task's own page and the Team view.
  revalidatePath("/tasks", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/people/staff", "layout");
}

// "" means unassigned (a shared office task).
function assignee(formData: FormData): string | null {
  return field(formData, "assigned_to").trim() || null;
}

export async function createTask(formData: FormData) {
  const { supabase, campId, userId } = await requireWritableCamp();

  const title = field(formData, "title").trim();
  if (!title) return;

  const description = field(formData, "description").trim() || null;
  const dueDate = field(formData, "due_date").trim() || null;
  const priority = ((field(formData, "priority") || "medium") as TaskPriority) || "medium";
  const assignedTo = assignee(formData);

  await supabase.from("tasks").insert({
    camp_id: campId,
    created_by: userId,
    title,
    description,
    due_date: dueDate,
    due_time: field(formData, "due_time").trim() || null,
    priority,
    assigned_to: assignedTo,
  });

  revalidateTaskViews();
  // A task for someone else leaves your list, so say where it went.
  if (assignedTo) {
    const { data: member } = await supabase
      .from("staff")
      .select("first_name, profile_id")
      .eq("id", assignedTo)
      .maybeSingle();
    if (member && member.profile_id !== userId) {
      redirect(withSaved("/tasks", `Sent to ${member.first_name}`));
    }
  }
}

export async function updateTask(id: string, formData: FormData) {
  const { supabase, campId } = await requireWritableCamp();

  const title = field(formData, "title").trim();
  if (!title) return;
  const description = field(formData, "description").trim() || null;
  const dueDate = field(formData, "due_date").trim() || null;
  const priority = ((field(formData, "priority") || "medium") as TaskPriority) || "medium";

  await supabase
    .from("tasks")
    .update({
      title,
      description,
      due_date: dueDate,
      due_time: field(formData, "due_time").trim() || null,
      priority,
      assigned_to: assignee(formData),
    })
    .eq("id", id)
    .eq("camp_id", campId);

  revalidateTaskViews();
  redirect(withSaved(`/tasks/${id}`, "Task saved"));
}

export async function toggleTaskStatus(id: string, nextStatus: "open" | "done") {
  const { supabase, campId } = await requireWritableCamp();

  await supabase
    .from("tasks")
    .update({ status: nextStatus, completed_at: nextStatus === "done" ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("camp_id", campId);

  revalidateTaskViews();
}

export async function deleteTask(id: string) {
  const { supabase, campId } = await requireWritableCamp();

  await supabase.from("tasks").delete().eq("id", id).eq("camp_id", campId);

  revalidateTaskViews();
  redirect(withSaved("/tasks", "Task deleted"));
}

/**
 * Ticks or unticks one checklist step. Ticking the last step finishes the
 * task; unticking a step on a finished task reopens it.
 */
export async function toggleChecklistItem(id: string, index: number) {
  const { supabase, campId } = await requireWritableCamp();
  const { data: task } = await supabase
    .from("tasks")
    .select("checklist, status")
    .eq("id", id)
    .eq("camp_id", campId)
    .maybeSingle();
  if (!task?.checklist?.[index]) return;

  const checklist = task.checklist.map((item, i) => (i === index ? { ...item, done: !item.done } : item));
  const allDone = checklist.every((item) => item.done);
  const status = allDone ? "done" : "open";

  await supabase
    .from("tasks")
    .update({
      checklist,
      status,
      // Keep the original finish time if it was already done.
      ...(allDone && task.status === "done" ? {} : { completed_at: allDone ? new Date().toISOString() : null }),
    })
    .eq("id", id)
    .eq("camp_id", campId);

  revalidateTaskViews();
}
