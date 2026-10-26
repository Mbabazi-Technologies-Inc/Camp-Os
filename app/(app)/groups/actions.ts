"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCamp } from "@/lib/auth";
import { field } from "@/lib/form";
import { withSaved } from "@/lib/saved";
import type { RetreatGroupStatus } from "@/lib/supabase/database.types";

const STATUSES: RetreatGroupStatus[] = ["inquiry", "tentative", "confirmed", "cancelled"];

function revalidateGroups() {
  revalidatePath("/groups", "layout");
  revalidatePath("/dashboard");
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
  const { supabase, campId } = await requireCamp();
  const values = groupFields(formData);
  if (!values.name) return;

  await supabase.from("retreat_groups").update(values).eq("id", id).eq("camp_id", campId);
  revalidateGroups();
  redirect(withSaved("/groups", "Group saved"));
}

export async function deleteRetreatGroup(id: string) {
  const { supabase, campId } = await requireCamp();
  await supabase.from("retreat_groups").delete().eq("id", id).eq("camp_id", campId);
  revalidateGroups();
  redirect(withSaved("/groups", "Group deleted"));
}
