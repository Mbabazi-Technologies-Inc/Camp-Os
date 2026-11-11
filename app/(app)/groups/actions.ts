"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCamp } from "@/lib/auth";
import { field } from "@/lib/form";
import { withSaved } from "@/lib/saved";
import type { RetreatGroupStatus } from "@/lib/supabase/database.types";
import { postToGroupChannel } from "@/lib/chat";
import { formatDateRange } from "@/lib/dates";

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
  const { supabase, campId } = await requireCamp();
  const values = groupFields(formData);
  if (!values.name) return;

  await supabase.from("retreat_groups").insert({ camp_id: campId, ...values });
  revalidateGroups();
}

export async function updateRetreatGroup(id: string, formData: FormData) {
  const { supabase, campId, fullName } = await requireCamp();
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
  const { supabase, campId } = await requireCamp();
  await supabase.from("retreat_groups").delete().eq("id", id).eq("camp_id", campId);
  revalidateGroups();
  redirect(withSaved("/groups", "Group deleted"));
}
