import type { createClient } from "@/lib/supabase/server";
import { brand } from "@/lib/brand";
import { getCalendarConnection } from "@/lib/calendar-account";
import { createEvent, deleteEvent, updateEvent, type CalendarEventInput } from "@/lib/calendar";
import type { RetreatGroupStatus } from "@/lib/supabase/database.types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface RetreatGroupForCalendar {
  name: string;
  arrival_date: string | null;
  departure_date: string | null;
  headcount: number | null;
  contact_name: string | null;
  status: RetreatGroupStatus;
  google_event_id: string | null;
}

export type CalendarAction =
  | { kind: "none" }
  | { kind: "create"; event: CalendarEventInput }
  | { kind: "update"; eventId: string; event: CalendarEventInput }
  | { kind: "delete"; eventId: string };

/**
 * What a retreat group's calendar event should become. Only confirmed groups
 * with dates are on the calendar; an inquiry or tentative hold that may never
 * happen stays off it, and cancelling or clearing the dates removes the event.
 */
export function calendarActionFor(group: RetreatGroupForCalendar): CalendarAction {
  const wanted = group.status === "confirmed" && Boolean(group.arrival_date);
  if (!wanted) {
    return group.google_event_id ? { kind: "delete", eventId: group.google_event_id } : { kind: "none" };
  }
  const event: CalendarEventInput = {
    summary: group.name,
    description: [
      group.headcount !== null ? `${group.headcount} people` : null,
      group.contact_name ? `Contact: ${group.contact_name}` : null,
      `Added by ${brand.name}.`,
    ]
      .filter(Boolean)
      .join("\n"),
    startDate: group.arrival_date as string,
    endDate: group.departure_date ?? (group.arrival_date as string),
  };
  return group.google_event_id
    ? { kind: "update", eventId: group.google_event_id, event }
    : { kind: "create", event };
}

/**
 * Mirrors a retreat group onto the camp's Google Calendar. Best-effort: the
 * group is the record of truth, so a calendar problem never blocks a save.
 */
export async function syncRetreatGroupToCalendar(
  supabase: Supabase,
  campId: string,
  groupId: string
): Promise<void> {
  try {
    const { data: group } = await supabase
      .from("retreat_groups")
      .select("name, arrival_date, departure_date, headcount, contact_name, status, google_event_id")
      .eq("id", groupId)
      .eq("camp_id", campId)
      .maybeSingle();
    if (!group) return;

    const action = calendarActionFor(group);
    if (action.kind === "none") return;

    const connection = await getCalendarConnection(supabase, campId);
    if (!connection) return;

    let eventId: string | null | undefined;
    if (action.kind === "delete") {
      await deleteEvent(connection.accessToken, connection.calendarId, action.eventId);
      eventId = null;
    } else if (action.kind === "update") {
      await updateEvent(connection.accessToken, connection.calendarId, action.eventId, action.event);
    } else {
      eventId = await createEvent(connection.accessToken, connection.calendarId, action.event);
    }

    if (eventId !== undefined) {
      await supabase
        .from("retreat_groups")
        .update({ google_event_id: eventId })
        .eq("id", groupId)
        .eq("camp_id", campId);
    }
    await supabase
      .from("calendar_accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("camp_id", campId);
  } catch {
    // Best-effort: the retreat group itself is already saved.
  }
}

/** Removes a deleted group's event, if it had one. Best-effort. */
export async function removeRetreatGroupFromCalendar(
  supabase: Supabase,
  campId: string,
  eventId: string | null
): Promise<void> {
  if (!eventId) return;
  try {
    const connection = await getCalendarConnection(supabase, campId);
    if (connection) await deleteEvent(connection.accessToken, connection.calendarId, eventId);
  } catch {
    // Best-effort.
  }
}
