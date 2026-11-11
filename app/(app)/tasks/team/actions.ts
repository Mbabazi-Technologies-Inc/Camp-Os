"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCamp } from "@/lib/auth";
import { field, fields } from "@/lib/form";
import { withSaved } from "@/lib/saved";
import { todayISODate } from "@/lib/dates";
import { checklistFrom, generateRoutineTasks, routineTargets, weekdayOf } from "@/lib/routines";
import type { RoutineTargetType, TaskPriority } from "@/lib/supabase/database.types";

const TEAM_PATH = "/tasks/team";

function revalidateTeam() {
  revalidatePath("/tasks", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/people/staff", "layout");
}

async function requireDirector() {
  const ctx = await requireCamp();
  if (ctx.role !== "director") redirect("/tasks");
  return ctx;
}

const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;

/**
 * Sends a task to one person or a whole team. "Once" creates a copy for each
 * of them now; "daily" or "weekly" saves a routine that keeps creating copies
 * on the days it runs, starting with today's.
 */
export async function sendTask(formData: FormData) {
  const { supabase, campId, userId } = await requireDirector();

  const title = field(formData, "title").trim();
  const sendTo = field(formData, "send_to");
  if (!title || !sendTo.includes(":")) return;

  const [kind, ...rest] = sendTo.split(":");
  const targetValue = rest.join(":");
  const target = {
    target_type: (kind === "team" ? "team" : "person") as RoutineTargetType,
    target_staff_id: kind === "team" ? null : targetValue,
    target_team: kind === "team" ? targetValue : null,
  };

  const description = field(formData, "description").trim() || null;
  const dueTime = field(formData, "due_time").trim() || null;
  const priority = (field(formData, "priority") || "medium") as TaskPriority;
  const repeats = field(formData, "repeats") || "once";
  // One step per line; empty means no checklist.
  const steps = field(formData, "checklist")
    .split("\n")
    .map((line) => line.replace(/^[-*•\s]+/, "").trim())
    .filter(Boolean);
  const today = todayISODate();

  const { data: staff } = await supabase.from("staff").select("*");

  if (repeats === "once") {
    const dueDate = field(formData, "due_date").trim() || today;
    const targets = routineTargets(target, staff ?? [], dueDate);
    if (targets.length === 0) {
      redirect(withSaved(TEAM_PATH, "Nobody to send that to yet"));
    }
    await supabase.from("tasks").insert(
      targets.map((member) => ({
        camp_id: campId,
        created_by: userId,
        title,
        description,
        due_date: dueDate,
        due_time: dueTime,
        priority,
        assigned_to: member.id,
        checklist: checklistFrom(steps),
      }))
    );
    revalidateTeam();
    redirect(withSaved(TEAM_PATH, `Sent to ${people(targets.length)}`));
  }

  const startsOn = field(formData, "starts_on").trim() || today;
  const endsOn = field(formData, "ends_on").trim() || null;
  let weekdays: number[] | null = null;
  if (repeats === "weekly") {
    weekdays = fields(formData, "weekdays")
      .map(Number)
      .filter((d) => d >= 0 && d <= 6);
    if (weekdays.length === 0) weekdays = [weekdayOf(startsOn)];
  }

  await supabase.from("routines").insert({
    camp_id: campId,
    created_by: userId,
    title,
    description,
    ...target,
    frequency: repeats === "weekly" ? "weekly" : "daily",
    weekdays,
    due_time: dueTime,
    starts_on: startsOn,
    ends_on: endsOn,
    priority,
    checklist: steps.length ? steps : null,
  });

  await generateRoutineTasks(supabase, campId, today);
  const reach = routineTargets(target, staff ?? [], startsOn > today ? startsOn : today).length;
  revalidateTeam();
  redirect(withSaved(TEAM_PATH, `Routine set up for ${people(reach)}`));
}

export async function setRoutineActive(id: string, active: boolean) {
  const { supabase, campId } = await requireDirector();
  await supabase.from("routines").update({ active }).eq("id", id).eq("camp_id", campId);
  if (active) await generateRoutineTasks(supabase, campId, todayISODate());
  revalidateTeam();
  redirect(withSaved(TEAM_PATH, active ? "Routine resumed" : "Routine paused"));
}

/** Stops a routine for good. Finished copies stay as a record; unfinished ones from today on go. */
export async function deleteRoutine(id: string) {
  const { supabase, campId } = await requireDirector();
  await supabase
    .from("tasks")
    .delete()
    .eq("routine_id", id)
    .eq("status", "open")
    .gte("due_date", todayISODate())
    .eq("camp_id", campId);
  await supabase.from("routines").delete().eq("id", id).eq("camp_id", campId);
  revalidateTeam();
  redirect(withSaved(TEAM_PATH, "Routine deleted"));
}
