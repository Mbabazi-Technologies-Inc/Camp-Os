import { cache } from "react";
import type { Database } from "@/lib/supabase/database.types";
import type { CampContext } from "@/lib/auth";
import { getCampBilling, requireCamp } from "@/lib/auth";

type Routine = Database["public"]["Tables"]["routines"]["Row"];
type Staff = Database["public"]["Tables"]["staff"]["Row"];
type Supabase = CampContext["supabase"];

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAYS_PLURAL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

export function weekdayOf(isoDate: string): number {
  return new Date(isoDate + "T00:00:00").getDay();
}

/** Whether a routine produces tasks on the given day. */
export function routineRunsOn(routine: Routine, isoDate: string): boolean {
  if (!routine.active) return false;
  if (isoDate < routine.starts_on) return false;
  if (routine.ends_on && isoDate > routine.ends_on) return false;
  if (routine.frequency === "weekly") return (routine.weekdays ?? []).includes(weekdayOf(isoDate));
  return true;
}

/** Summer staff stop receiving tasks once their access has ended. */
export function staffActiveOn(member: Staff, isoDate: string): boolean {
  return !member.access_ends || isoDate <= member.access_ends;
}

const sameTeam = (a: string | null, b: string | null) =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase() && Boolean(a?.trim());

/** Everyone a routine (or a one-off send) reaches on a given day. */
export function routineTargets(
  routine: Pick<Routine, "target_type" | "target_staff_id" | "target_team">,
  staff: Staff[],
  isoDate: string
): Staff[] {
  const active = staff.filter((member) => staffActiveOn(member, isoDate));
  if (routine.target_type === "person") return active.filter((m) => m.id === routine.target_staff_id);
  return active.filter((m) => sameTeam(m.team, routine.target_team));
}

/** Distinct team names, for "send to a team". */
export function teamsOf(staff: Staff[]): string[] {
  const seen = new Map<string, string>();
  for (const member of staff) {
    const team = member.team?.trim();
    if (team && !seen.has(team.toLowerCase())) seen.set(team.toLowerCase(), team);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** "08:30" -> "8:30 am" */
export function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m || 0).padStart(2, "0")} ${suffix}`;
}

export function describeDays(routine: Pick<Routine, "frequency" | "weekdays">): string {
  if (routine.frequency === "daily") return "Every day";
  const days = [...(routine.weekdays ?? [])].sort();
  const key = days.join(",");
  if (key === "1,2,3,4,5") return "Weekdays";
  if (key === "0,6") return "Weekends";
  if (days.length === 7) return "Every day";
  if (days.length === 1) return WEEKDAYS_PLURAL[days[0]];
  return days.map((d) => WEEKDAYS[d]).join(", ");
}

export function describeSchedule(routine: Routine): string {
  const time = formatTime(routine.due_time);
  return time ? `${describeDays(routine)} · ${time}` : describeDays(routine);
}

export function describeTarget(routine: Pick<Routine, "target_type" | "target_staff_id" | "target_team">, staff: Staff[]): string {
  if (routine.target_type === "team") return `${routine.target_team} team`;
  const member = staff.find((m) => m.id === routine.target_staff_id);
  return member ? `${member.first_name} ${member.last_name}` : "Someone who has left";
}

/** "Now" as HH:MM in the camp's time zone, for spotting tasks that are late today. */
export function campTimeNow(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Toronto",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * Creates each person's copy of every routine due on `isoDate` that doesn't
 * exist yet. Safe to call repeatedly: existing copies are skipped, and the
 * database's unique index catches any race between two requests.
 */
export async function generateRoutineTasks(
  supabase: Supabase,
  campId: string,
  isoDate: string
): Promise<number> {
  const { data: routines } = await supabase.from("routines").select("*").eq("active", true);
  const due = (routines ?? []).filter((r) => routineRunsOn(r, isoDate));
  if (due.length === 0) return 0;

  const [{ data: staff }, { data: existing }] = await Promise.all([
    supabase.from("staff").select("*"),
    supabase
      .from("tasks")
      .select("routine_id, assigned_to")
      .eq("due_date", isoDate)
      .in(
        "routine_id",
        due.map((r) => r.id)
      ),
  ]);

  const have = new Set((existing ?? []).map((t) => `${t.routine_id}:${t.assigned_to}`));
  let created = 0;
  for (const routine of due) {
    for (const member of routineTargets(routine, staff ?? [], isoDate)) {
      if (have.has(`${routine.id}:${member.id}`)) continue;
      const { error } = await supabase.from("tasks").insert({
        camp_id: campId,
        created_by: routine.created_by,
        title: routine.title,
        description: routine.description,
        due_date: isoDate,
        due_time: routine.due_time,
        priority: routine.priority,
        assigned_to: member.id,
        routine_id: routine.id,
        checklist: checklistFrom(routine.checklist),
      });
      if (!error) created += 1;
      have.add(`${routine.id}:${member.id}`);
    }
  }
  return created;
}

/** Once per request: make sure today's routine tasks exist before anything lists tasks. */
export const ensureRoutineTasks = cache(async (isoDate: string) => {
  const { supabase, campId } = await requireCamp();
  // A read-only camp (trial over, not subscribed) gets no new rows, routine
  // tasks included.
  if ((await getCampBilling(supabase, campId))?.readOnly) return;
  await generateRoutineTasks(supabase, campId, isoDate);
});

/** The staff record linked to a login, if any. */
export const getMyStaff = cache(async (): Promise<Staff | null> => {
  const { supabase, userId } = await requireCamp();
  const { data } = await supabase.from("staff").select("*").eq("profile_id", userId).maybeSingle();
  return data ?? null;
});

/**
 * PostgREST `.or()` filter for "my tasks": what's assigned to me, plus, for
 * the director, the shared office tasks that belong to nobody in particular.
 */
export function myTasksFilter(isDirector: boolean, me: Staff | null): string {
  if (isDirector) return me ? `assigned_to.is.null,assigned_to.eq.${me.id}` : "assigned_to.is.null";
  return `assigned_to.eq.${me?.id ?? "00000000-0000-0000-0000-000000000000"}`;
}

/** A fresh, unticked copy of a list of steps (or null when there are none). */
export function checklistFrom(labels: string[] | null | undefined) {
  const items = (labels ?? []).map((label) => label.trim()).filter(Boolean);
  return items.length ? items.map((label) => ({ label, done: false })) : null;
}
