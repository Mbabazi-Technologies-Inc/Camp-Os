// Which retreat groups belong on the camp's Google Calendar, and what
// happens to their event as the booking changes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarActionFor, type RetreatGroupForCalendar } from "../../lib/retreat-calendar";

const base: RetreatGroupForCalendar = {
  name: "Grace Fellowship youth retreat",
  arrival_date: "2026-11-20",
  departure_date: "2026-11-22",
  headcount: 40,
  contact_name: "Pat Lee",
  status: "confirmed",
  google_event_id: null,
};

test("a confirmed group with dates gets a new all-day event", () => {
  const action = calendarActionFor(base);
  assert.equal(action.kind, "create");
  if (action.kind !== "create") return;
  assert.equal(action.event.summary, base.name);
  assert.equal(action.event.startDate, "2026-11-20");
  assert.equal(action.event.endDate, "2026-11-22");
  assert.match(action.event.description ?? "", /40 people/);
  assert.match(action.event.description ?? "", /Contact: Pat Lee/);
});

test("a confirmed group that already has an event updates it", () => {
  const action = calendarActionFor({ ...base, google_event_id: "evt_1" });
  assert.deepEqual(action.kind === "update" && action.eventId, "evt_1");
});

test("a one-day group without a departure date ends on its arrival date", () => {
  const action = calendarActionFor({ ...base, departure_date: null });
  assert.ok(action.kind === "create" && action.event.endDate === "2026-11-20");
});

test("inquiries and tentative holds stay off the calendar", () => {
  for (const status of ["inquiry", "tentative"] as const) {
    assert.deepEqual(calendarActionFor({ ...base, status }), { kind: "none" });
  }
});

test("cancelling, or losing its dates, removes an existing event", () => {
  assert.deepEqual(calendarActionFor({ ...base, status: "cancelled", google_event_id: "evt_1" }), {
    kind: "delete",
    eventId: "evt_1",
  });
  assert.deepEqual(calendarActionFor({ ...base, arrival_date: null, google_event_id: "evt_2" }), {
    kind: "delete",
    eventId: "evt_2",
  });
  assert.deepEqual(calendarActionFor({ ...base, status: "cancelled" }), { kind: "none" });
});
