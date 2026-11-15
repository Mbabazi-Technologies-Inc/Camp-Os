"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWritableCamp } from "@/lib/auth";
import { field } from "@/lib/form";
import { withSaved } from "@/lib/saved";
import type { RetreatGroupStatus } from "@/lib/supabase/database.types";
import { postToGroupChannel } from "@/lib/chat";
import { campISODate, formatDateRange, todayISODate } from "@/lib/dates";
import { routineTargets } from "@/lib/routines";
import type { TaskPriority } from "@/lib/supabase/database.types";

const STATUSES: RetreatGroupStatus[] = ["inquiry", "tentative", "confirmed", "cancelled"];

function revalidateGroups() {
  // The whole app: group channels in the sidebar open and close with bookings.
  revalidatePath("/", "layout");
}

function groupFields(formData: FormData) {
  const status = field(formData, "status") as RetreatGroupStatus;
  const headcount = Number.parseInt(field(formData, "headcount"), 10);
  return {
    name: field(formData, "name").trim(),
    contact_name: field(formData, "contact_name").trim() || null,
    contact_email: field(formData, "contact_email").trim() || null,
    contact_phone: field(formData, "contact_phone").trim() || null,
    arrival_date: field(formData, "arrival_date") || null,
    departure_date: field(formData, "departure_date") || null,
    headcount: Number.isFinite(headcount) && headcount >= 0 ? headcount : null,
    status: STATUSES.includes(status) ? status : "inquiry",
    notes: field(formData, "notes").trim() || null,
  };
}

export async function createRetreatGroup(formData: FormData) {
  const { supabase, campId } = await requireWritableCamp();
  const values = groupFields(formData);
  if (!values.name) return;

  await supabase.from("retreat_groups").insert({ camp_id: campId, ...values });
  revalidateGroups();
}

export async function updateRetreatGroup(id: string, formData: FormData) {
  const { supabase, campId, fullName } = await requireWritableCamp();
  const values = groupFields(formData);
  if (!values.name) return;

  const { data: before } = await supabase.from("retreat_groups").select("*").eq("id", id).maybeSingle();
  await supabase.from("retreat_groups").update(values).eq("id", id).eq("camp_id", campId);

  // Tell the group's channel what changed, so the whole team sees it.
  if (before) {
    const by = fullName ? ` by ${fullName}` : "";
    const notes: string[] = [];
    if (before.headcount !== values.headcount && values.headcount !== null) {
      notes.push(`Headcount changed${before.headcount !== null ? ` from ${before.headcount}` : ""} to ${values.headcount}${by}.`);
    }
    if (before.arrival_date !== values.arrival_date || before.departure_date !== values.departure_date) {
      notes.push(`Dates changed to ${formatDateRange(values.arrival_date, values.departure_date)}${by}.`);
    }
    if (before.status !== values.status) notes.push(`Booking is now ${values.status}${by}.`);
    if (notes.length) await postToGroupChannel(supabase, campId, id, notes.join(" "));
  }
  revalidateGroups();
  redirect(withSaved("/groups", "Group saved"));
}

export async function deleteRetreatGroup(id: string) {
  const { supabase, campId } = await requireWritableCamp();
  await supabase.from("retreat_groups").delete().eq("id", id).eq("camp_id", campId);
  revalidateGroups();
  redirect(withSaved("/groups", "Group deleted"));
}

function refreshGroupTasks(groupId: string) {
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/tasks", "layout");
  revalidatePath("/dashboard");
}

/** A task for this group's prep, for one person or the office. */
export async function addGroupTask(groupId: string, formData: FormData) {
  const { supabase, campId, userId } = await requireWritableCamp();
  const title = field(formData, "title").trim();
  if (!title) return;
  await supabase.from("tasks").insert({
    camp_id: campId,
    created_by: userId,
    title,
    due_date: field(formData, "due_date") || null,
    priority: (field(formData, "priority") || "medium") as TaskPriority,
    assigned_to: field(formData, "assigned_to") || null,
    retreat_group_id: groupId,
  });
  refreshGroupTasks(groupId);
}

// The usual jobs around a group's stay: [title, team, days from arrival (or "after" departure), priority].
const PREP_LIST: [string, string, number | `after+${number}`, TaskPriority][] = [
  ["Send welcome email with directions and what to bring", "Office", -7, "medium"],
  ["Confirm final headcount and dietary needs", "Office", -3, "high"],
  ["Plan the menu and order food", "Kitchen", -3, "medium"],
  ["Prepare lodge and cabins (heat, linens, washrooms)", "Maintenance", -1, "high"],
  ["Print the room list and welcome sign", "Office", -1, "medium"],
  ["Lodge turnover after the group leaves", "Maintenance", "after+0", "medium"],
  ["Send the invoice and a thank-you note", "Office", "after+1", "medium"],
];

const addDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Adds the standard prep list for a group in one go: each job goes to
 * someone on the right team, timed around the group's dates. Jobs already
 * on the list aren't added twice.
 */
export async function addPrepList(groupId: string) {
  const { supabase, campId, userId } = await requireWritableCamp();
  const [{ data: group }, { data: staff }, { data: existing }] = await Promise.all([
    supabase.from("retreat_groups").select("*").eq("id", groupId).maybeSingle(),
    supabase.from("staff").select("*").order("first_name", { ascending: true }),
    supabase.from("tasks").select("title").eq("retreat_group_id", groupId),
  ]);
  if (!group) return;

  const today = todayISODate();
  const arrival = group.arrival_date ?? campISODate(7);
  const departure = group.departure_date ?? arrival;
  const have = new Set((existing ?? []).map((t) => t.title));
  // "Grace Fellowship youth retreat" -> "Grace Fellowship", to keep titles short.
  const shortName = group.name.split(" - ")[0].split(" ").slice(0, 2).join(" ");

  let added = 0;
  for (const [title, team, when, priority] of PREP_LIST) {
    const fullTitle = `${title} (${shortName})`;
    if (have.has(fullTitle)) continue;
    let due = typeof when === "number" ? addDays(arrival, when) : addDays(departure, Number(when.split("+")[1]));
    if (due < today) due = today;
    // Someone on the right team, preferring not to hand it to whoever is adding the list.
    const onTeam = routineTargets({ target_type: "team", target_team: team, target_staff_id: null }, staff ?? [], due);
    const person = onTeam.find((m) => m.profile_id !== userId) ?? onTeam[0];
    await supabase.from("tasks").insert({
      camp_id: campId,
      created_by: userId,
      title: fullTitle,
      due_date: due,
      priority,
      assigned_to: person?.id ?? null,
      retreat_group_id: groupId,
    });
    added += 1;
  }
  refreshGroupTasks(groupId);
  redirect(withSaved(`/groups/${groupId}`, added ? `Added ${added} prep tasks` : "The prep list is already here"));
}
