import { campISODate } from "@/lib/dates";
// Sample Mill Stream data used when the app runs without a database, so the
// whole product can be explored before any keys exist.

function isoDate(offsetDays: number): string {
  return campISODate(offsetDays);
}

function isoTime(offsetMinutes: number): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

// The most recent summer camp season (July 5 to August 29).
function summerYear(): number {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}
function summerStart(): string {
  return `${summerYear()}-07-05`;
}
function summerEnd(): string {
  return `${summerYear()}-08-29`;
}

function staffRow(
  id: string,
  firstName: string,
  lastName: string,
  role: string,
  team: string,
  extra: DemoRow = {}
): DemoRow {
  return {
    id,
    camp_id: DEMO_CAMP_ID,
    first_name: firstName,
    last_name: lastName,
    role,
    team,
    email: null,
    phone: null,
    notes: null,
    season: "year_round",
    under_18: false,
    access_ends: null,
    profile_id: null,
    created_at: isoTime(-60 * 24 * 40),
    updated_at: isoTime(-60 * 24 * 40),
    ...extra,
  };
}

function routineRow(id: string, title: string, extra: DemoRow): DemoRow {
  return {
    id,
    camp_id: DEMO_CAMP_ID,
    created_by: DEMO_USER_ID,
    title,
    description: null,
    target_staff_id: null,
    target_team: null,
    frequency: "daily",
    weekdays: null,
    due_time: null,
    starts_on: isoDate(-30),
    ends_on: null,
    priority: "medium",
    active: true,
    created_at: isoTime(-60 * 24 * 30),
    updated_at: isoTime(-60 * 24 * 30),
    ...extra,
  };
}

// Today's routine copies, some already ticked off, plus one from yesterday
// that slipped, so the Team view has something to show.
const WALKTHROUGH_STEPS = [
  "Lodge doors and windows locked overnight",
  "Heat on in occupied buildings",
  "Washrooms stocked",
  "Paths and stairs clear",
  "Anything broken logged as a task",
];

function channelRow(id: string, name: string, kind: string, description: string, groupId: string | null = null): DemoRow {
  return {
    id,
    camp_id: DEMO_CAMP_ID,
    name,
    kind,
    description,
    retreat_group_id: groupId,
    archived: false,
    created_by: DEMO_USER_ID,
    created_at: isoTime(-60 * 24 * 60),
  };
}

// The demo login a staff member gets in "view as" (see ensureDemoStaffLogin).
function staffUser(staffId: string): string {
  return `demo-user-${staffId}`;
}

let messageCount = 0;
function msg(
  channelId: string,
  authorId: string | null,
  authorName: string,
  body: string,
  offsetMinutes: number,
  kind: "user" | "system" = "user"
): DemoRow {
  messageCount += 1;
  return {
    id: `demo-msg-${messageCount}`,
    camp_id: DEMO_CAMP_ID,
    channel_id: channelId,
    author_id: authorId,
    author_name: authorName,
    kind,
    body,
    task_id: null,
    created_at: isoTime(offsetMinutes),
  };
}

function isWeekday(dayOffset: number): boolean {
  const day = new Date(isoDate(dayOffset) + "T00:00:00").getDay();
  return day >= 1 && day <= 5;
}

function routineTask(routineId: string, title: string, staffId: string, dayOffset: number, dueTime: string, done: boolean): DemoRow {
  return {
    id: `demo-rtask-${routineId}-${staffId}-${dayOffset}`,
    camp_id: DEMO_CAMP_ID,
    created_by: DEMO_USER_ID,
    title,
    description: null,
    due_date: isoDate(dayOffset),
    due_time: dueTime,
    priority: "medium",
    status: done ? "done" : "open",
    source_email_id: null,
    assigned_to: staffId,
    routine_id: routineId,
    completed_at: done ? isoTime(dayOffset * 24 * 60 - 60) : null,
    checklist:
      routineId === "demo-routine-1"
        ? WALKTHROUGH_STEPS.map((label, i) => ({ label, done: done || i < 2 }))
        : null,
    created_at: isoTime(dayOffset * 24 * 60 - 600),
    updated_at: isoTime(dayOffset * 24 * 60 - 60),
  };
}

export const DEMO_USER_ID = "demo-user-0001";
export const DEMO_CAMP_ID = "demo-camp-0001";
export const DEMO_EMAIL = "director@millstream.camp";
export const DEMO_FULL_NAME = "Alex Rivera";

export type DemoRow = Record<string, unknown>;

export function buildSeed(): Record<string, DemoRow[]> {
  return {
    camps: [
      {
        id: DEMO_CAMP_ID,
        name: "Mill Stream Bible Camp",
        owner_id: DEMO_USER_ID,
        created_at: isoTime(-60 * 24 * 30),
      },
    ],

    profiles: [
      {
        id: DEMO_USER_ID,
        full_name: DEMO_FULL_NAME,
        camp_id: DEMO_CAMP_ID,
        role: "director",
        created_at: isoTime(-60 * 24 * 30),
      },
      {
        id: "demo-user-0002",
        full_name: "Dana Brooks",
        camp_id: DEMO_CAMP_ID,
        role: "staff",
        created_at: isoTime(-60 * 24 * 12),
      },
    ],

    camp_invites: [
      {
        id: "demo-invite-1",
        camp_id: DEMO_CAMP_ID,
        email: "office@millstream.camp",
        role: "staff",
        invited_by: DEMO_USER_ID,
        accepted_at: null,
        created_at: isoTime(-60 * 30),
      },
    ],

    tasks: [
      {
        id: "demo-task-1",
        camp_id: DEMO_CAMP_ID,
        created_by: DEMO_USER_ID,
        title: "Call the Parkers back about Friday pickup",
        description: "They left a voicemail during rest hour.",
        due_date: isoDate(0),
        priority: "high",
        status: "open",
        source_email_id: null,
        created_at: isoTime(-90),
        updated_at: isoTime(-90),
      },
      {
        id: "demo-task-2",
        camp_id: DEMO_CAMP_ID,
        created_by: DEMO_USER_ID,
        title: "Restock sunscreen at the waterfront shed",
        description: null,
        due_date: isoDate(-2),
        priority: "medium",
        status: "open",
        source_email_id: null,
        created_at: isoTime(-60 * 50),
        updated_at: isoTime(-60 * 50),
      },
      {
        id: "demo-task-3",
        camp_id: DEMO_CAMP_ID,
        created_by: DEMO_USER_ID,
        title: "Confirm Saturday campfire speaker",
        description: "Pastor Nate - confirm arrival time and sound setup.",
        due_date: isoDate(0),
        priority: "medium",
        status: "open",
        source_email_id: null,
        created_at: isoTime(-60 * 20),
        updated_at: isoTime(-60 * 20),
      },
      {
        id: "demo-task-4",
        camp_id: DEMO_CAMP_ID,
        created_by: DEMO_USER_ID,
        title: "Send week 3 photos to the parent mailing list",
        description: null,
        due_date: isoDate(2),
        priority: "low",
        status: "open",
        source_email_id: null,
        created_at: isoTime(-60 * 8),
        updated_at: isoTime(-60 * 8),
      },
      {
        id: "demo-task-5",
        camp_id: DEMO_CAMP_ID,
        created_by: DEMO_USER_ID,
        title: "Check the med form for Maya P. arrived",
        description: "Nurse flagged it as missing at check-in.",
        due_date: isoDate(1),
        priority: "high",
        status: "open",
        source_email_id: null,
        created_at: isoTime(-60 * 5),
        updated_at: isoTime(-60 * 5),
      },
      {
        id: "demo-task-6",
        camp_id: DEMO_CAMP_ID,
        created_by: DEMO_USER_ID,
        title: "Post the updated packing list to the website",
        description: null,
        due_date: isoDate(-4),
        priority: "medium",
        status: "done",
        source_email_id: null,
        created_at: isoTime(-60 * 24 * 5),
        updated_at: isoTime(-60 * 24 * 3),
      },
      // Routine copies that came due (see routineTask above).
      routineTask("demo-routine-2", "Log fridge and freezer temperatures", "demo-staff-7", 0, "07:30", true),
      routineTask("demo-routine-1", "Morning walkthrough: lodge, cabins and grounds", "demo-staff-6", 0, "08:30", true),
      routineTask("demo-routine-2", "Log fridge and freezer temperatures", "demo-staff-7", -1, "07:30", true),
      routineTask("demo-routine-1", "Morning walkthrough: lodge, cabins and grounds", "demo-staff-6", -1, "08:30", false),
      ...(isWeekday(0)
        ? [routineTask("demo-routine-3", "Reply to new retreat inquiries", "demo-staff-1", 0, "11:00", true)]
        : []),
      // Sent by the director to one person.
      {
        id: "demo-task-sent-1",
        camp_id: DEMO_CAMP_ID,
        created_by: DEMO_USER_ID,
        title: "Send Lakeview School their final invoice",
        description: "62 people, 2 nights. Use the school rate.",
        due_date: isoDate(0),
        due_time: "15:00",
        priority: "high",
        status: "open",
        source_email_id: null,
        assigned_to: "demo-staff-5",
        routine_id: null,
        completed_at: null,
        created_at: isoTime(-120),
        updated_at: isoTime(-120),
      },
    ],

    knowledge_base: [
      {
        id: "demo-kb-1",
        camp_id: DEMO_CAMP_ID,
        category: "pickup_times",
        title: "Daily pickup window",
        content:
          "Pickup is between 4:30 and 5:30 PM at the main lodge loop. Please stay in your vehicle; a counsellor will walk your camper out. Campers are only released to adults on the authorized pickup list, and we ask for photo ID for the first few days.",
        created_at: isoTime(-60 * 24 * 20),
        updated_at: isoTime(-60 * 24 * 20),
      },
      {
        id: "demo-kb-2",
        camp_id: DEMO_CAMP_ID,
        category: "pickup_times",
        title: "Early pickup procedure",
        content:
          "Email or call the camp office at least two hours ahead. Early pickups are signed out at the office, and we need the request from the email address we have on file. Please allow ten minutes for us to bring your camper up from their activity.",
        created_at: isoTime(-60 * 24 * 18),
        updated_at: isoTime(-60 * 24 * 18),
      },
      {
        id: "demo-kb-3",
        camp_id: DEMO_CAMP_ID,
        category: "packing_list",
        title: "Overnight trip packing list",
        content:
          "Sleeping bag, pillow, flashlight, toiletries, two changes of clothes, a warm layer for the evening, rain jacket, and closed-toe shoes. Medication goes to the camp nurse in its original container. Please leave electronics at home and label everything.",
        created_at: isoTime(-60 * 24 * 16),
        updated_at: isoTime(-60 * 24 * 16),
      },
      {
        id: "demo-kb-4",
        camp_id: DEMO_CAMP_ID,
        category: "policy",
        title: "Medication policy",
        content:
          "All medication, including over-the-counter, is checked in with the camp nurse in its original labelled container with a completed authorization form. Campers do not keep medication in their cabins, apart from physician-authorized inhalers and epinephrine auto-injectors.",
        created_at: isoTime(-60 * 24 * 15),
        updated_at: isoTime(-60 * 24 * 15),
      },
      {
        id: "demo-kb-5",
        camp_id: DEMO_CAMP_ID,
        category: "policy",
        title: "Refund and cancellation policy",
        content:
          "Cancellations more than two weeks before a session receive a full refund less the fifty dollar deposit. Within two weeks, half the fee is refunded. After a session begins we do not refund, though documented medical withdrawals are credited toward a future session.",
        created_at: isoTime(-60 * 24 * 14),
        updated_at: isoTime(-60 * 24 * 14),
      },
      {
        id: "demo-kb-6",
        camp_id: DEMO_CAMP_ID,
        category: "rules",
        title: "Phones and electronics",
        content:
          "Camp is screen-free. Phones, tablets, smart watches and gaming devices stay at home. If a camper needs to reach a parent the office phone is always available, and we will call you directly if anything comes up.",
        created_at: isoTime(-60 * 24 * 13),
        updated_at: isoTime(-60 * 24 * 13),
      },
    ],

    guardians: [
      {
        id: "demo-guardian-1",
        camp_id: DEMO_CAMP_ID,
        first_name: "Jordan",
        last_name: "Parker",
        email: "jordan.parker@example.com",
        phone: "705-555-0142",
        relationship: "Mother",
        notes: "Prefers email over phone during work hours.",
        created_at: isoTime(-60 * 24 * 22),
        updated_at: isoTime(-60 * 24 * 22),
      },
      {
        id: "demo-guardian-2",
        camp_id: DEMO_CAMP_ID,
        first_name: "Sam",
        last_name: "Whitfield",
        email: "sam.whitfield@example.com",
        phone: "705-555-0198",
        relationship: "Father",
        notes: null,
        created_at: isoTime(-60 * 24 * 21),
        updated_at: isoTime(-60 * 24 * 21),
      },
      {
        id: "demo-guardian-3",
        camp_id: DEMO_CAMP_ID,
        first_name: "Renee",
        last_name: "Osei",
        email: "renee.osei@example.com",
        phone: "705-555-0167",
        relationship: "Guardian",
        notes: "Two campers this session.",
        created_at: isoTime(-60 * 24 * 19),
        updated_at: isoTime(-60 * 24 * 19),
      },
    ],

    campers: [
      {
        id: "demo-camper-1",
        camp_id: DEMO_CAMP_ID,
        first_name: "Maya",
        last_name: "Parker",
        cabin: "Cabin 4",
        age: 11,
        guardian_id: "demo-guardian-1",
        notes: "Peanut allergy - EpiPen with the nurse.",
        created_at: isoTime(-60 * 24 * 22),
        updated_at: isoTime(-60 * 24 * 22),
      },
      {
        id: "demo-camper-2",
        camp_id: DEMO_CAMP_ID,
        first_name: "Eli",
        last_name: "Whitfield",
        cabin: "Cabin 2",
        age: 9,
        guardian_id: "demo-guardian-2",
        notes: null,
        created_at: isoTime(-60 * 24 * 21),
        updated_at: isoTime(-60 * 24 * 21),
      },
      {
        id: "demo-camper-3",
        camp_id: DEMO_CAMP_ID,
        first_name: "Ama",
        last_name: "Osei",
        cabin: "Cabin 6",
        age: 13,
        guardian_id: "demo-guardian-3",
        notes: "Returning camper - asked about the leadership program.",
        created_at: isoTime(-60 * 24 * 19),
        updated_at: isoTime(-60 * 24 * 19),
      },
      {
        id: "demo-camper-4",
        camp_id: DEMO_CAMP_ID,
        first_name: "Kofi",
        last_name: "Osei",
        cabin: "Cabin 3",
        age: 10,
        guardian_id: "demo-guardian-3",
        notes: null,
        created_at: isoTime(-60 * 24 * 19),
        updated_at: isoTime(-60 * 24 * 19),
      },
      {
        id: "demo-camper-5",
        camp_id: DEMO_CAMP_ID,
        first_name: "Nina",
        last_name: "Doyle",
        cabin: "Cabin 4",
        age: 12,
        guardian_id: null,
        notes: "Sponsored spot - paperwork with the office.",
        created_at: isoTime(-60 * 24 * 11),
        updated_at: isoTime(-60 * 24 * 11),
      },
    ],

    retreat_groups: [
      {
        id: "demo-group-1",
        camp_id: DEMO_CAMP_ID,
        name: "Grace Fellowship youth retreat",
        contact_name: "Marcus Lee",
        contact_email: "marcus@gracefellowship.example.com",
        contact_phone: "705-555-0140",
        arrival_date: isoDate(4),
        departure_date: isoDate(6),
        headcount: 48,
        status: "confirmed",
        notes: "Arriving by bus Friday around 6pm. Two vegetarian meals.",
        created_at: isoTime(-60 * 24 * 30),
        updated_at: isoTime(-60 * 24 * 30),
      },
      {
        id: "demo-group-2",
        camp_id: DEMO_CAMP_ID,
        name: "Lakeview Public School - Grade 6",
        contact_name: "Hannah Cho",
        contact_email: "hcho@lakeview.example.com",
        contact_phone: "705-555-0141",
        arrival_date: isoDate(11),
        departure_date: isoDate(13),
        headcount: 64,
        status: "confirmed",
        notes: "Outdoor education trip; teachers bringing their own program.",
        created_at: isoTime(-60 * 24 * 21),
        updated_at: isoTime(-60 * 24 * 21),
      },
      {
        id: "demo-group-3",
        camp_id: DEMO_CAMP_ID,
        name: "Morrison family reunion",
        contact_name: "Ruth Morrison",
        contact_email: "ruth.morrison@example.com",
        contact_phone: "705-555-0142",
        arrival_date: isoDate(25),
        departure_date: isoDate(27),
        headcount: 35,
        status: "tentative",
        notes: "Waiting on final numbers by the end of the month.",
        created_at: isoTime(-60 * 24 * 9),
        updated_at: isoTime(-60 * 24 * 9),
      },
      {
        id: "demo-group-4",
        camp_id: DEMO_CAMP_ID,
        name: "Kawartha churches leaders' weekend",
        contact_name: "Pastor Ben Adeyemi",
        contact_email: "ben@kawarthachurches.example.com",
        contact_phone: "705-555-0143",
        arrival_date: isoDate(46),
        departure_date: isoDate(48),
        headcount: 90,
        status: "inquiry",
        notes: "Asked about meeting space for 90 and a quote.",
        created_at: isoTime(-60 * 24 * 2),
        updated_at: isoTime(-60 * 24 * 2),
      },
      {
        id: "demo-group-5",
        camp_id: DEMO_CAMP_ID,
        name: "St. Andrew's men's retreat",
        contact_name: "Tom Walsh",
        contact_email: "tom.walsh@example.com",
        contact_phone: "705-555-0144",
        arrival_date: isoDate(-12),
        departure_date: isoDate(-10),
        headcount: 28,
        status: "confirmed",
        notes: null,
        created_at: isoTime(-60 * 24 * 60),
        updated_at: isoTime(-60 * 24 * 60),
      },
    ],

    staff: [
      // Year-round team: they're the only ones in the app from September to June.
      staffRow("demo-staff-0", "Alex", "Rivera", "Director", "Office", {
        email: DEMO_EMAIL,
        profile_id: DEMO_USER_ID,
      }),
      staffRow("demo-staff-1", "Dana", "Brooks", "Program Director", "Office", {
        email: "dana@millstream.camp",
        phone: "705-555-0110",
      }),
      staffRow("demo-staff-5", "Jordan", "Reyes", "Retreat Coordinator", "Office", {
        email: "jordan@millstream.camp",
        phone: "705-555-0131",
      }),
      staffRow("demo-staff-6", "Sam", "Okafor", "Facilities Manager", "Maintenance", {
        phone: "705-555-0142",
      }),
      staffRow("demo-staff-7", "Rosa", "Bell", "Kitchen Lead", "Kitchen", {
        email: "kitchen@millstream.camp",
        notes: "Needs final headcounts 48 hours before each retreat.",
      }),
      // Summer staff: their access ended with the season, so routines skip them.
      staffRow("demo-staff-2", "Priya", "Raman", "Camp Nurse", "Health", {
        email: "nurse@millstream.camp",
        phone: "705-555-0111",
        notes: "On site Sunday evening through Friday.",
        season: "summer",
        access_ends: summerEnd(),
      }),
      staffRow("demo-staff-3", "Tomas", "Vega", "Waterfront Lead", "Waterfront", {
        phone: "705-555-0124",
        notes: "Lifeguard certification renews in March.",
        season: "summer",
        access_ends: summerEnd(),
      }),
      staffRow("demo-staff-4", "Hannah", "Lindgren", "Cabin 4 Counsellor", "Cabin leaders", {
        season: "summer",
        access_ends: summerEnd(),
      }),
      staffRow("demo-staff-8", "Eli", "Nguyen", "Counsellor in training", "Cabin leaders", {
        season: "summer",
        under_18: true,
        access_ends: summerEnd(),
      }),
    ],

    channels: [
      channelRow("demo-chan-office", "office", "standing", "Day-to-day office chat for the year-round team."),
      channelRow("demo-chan-maintenance", "maintenance", "standing", "Repairs, grounds and anything broken."),
      channelRow("demo-chan-kitchen", "kitchen", "standing", "Menus, headcounts and dietary needs."),
      channelRow("demo-chan-grace", "grace-fellowship", "retreat_group", "Everything about Grace Fellowship youth retreat.", "demo-group-1"),
      channelRow("demo-chan-lakeview", "lakeview-grade-6", "retreat_group", "Everything about Lakeview Public School - Grade 6.", "demo-group-2"),
    ],

    messages: [
      // #grace-fellowship, the mockup's conversation
      msg("demo-chan-grace", null, "Camp office", "Grace Fellowship youth retreat is confirmed for 42 people. This channel is for everything about their stay.", -60 * 50, "system"),
      msg("demo-chan-grace", null, "Camp office", "Headcount changed from 42 to 48 by Jordan Reyes. Kitchen has been told.", -60 * 26, "system"),
      msg("demo-chan-grace", staffUser("demo-staff-5"), "Jordan Reyes", "Marcus (their leader) called. Two more with nut allergies, so six dietary needs now. I've updated the booking notes.", -60 * 25),
      msg("demo-chan-grace", staffUser("demo-staff-7"), "Rosa Bell", "Got it. I'll do a separate nut-free prep table for the weekend.", -60 * 24),
      msg("demo-chan-grace", staffUser("demo-staff-6"), "Sam Okafor", "The cabin 4 door is sticking again. I'll sort it before Friday.", -60 * 3),
      msg("demo-chan-grace", DEMO_USER_ID, "Alex Rivera", "Marcus asked about a late checkout Sunday (2pm instead of noon). I'm fine with it if the kitchen can do a later lunch. @Rosa Bell?", -60 * 2),
      msg("demo-chan-grace", staffUser("demo-staff-7"), "Rosa Bell", "Later lunch works. I'll push it to 1pm.", -50),

      // #office
      msg("demo-chan-office", staffUser("demo-staff-1"), "Dana Brooks", "Morning! Spring program brochure draft is in the shared drive for comments.", -60 * 30),
      msg("demo-chan-office", staffUser("demo-staff-5"), "Jordan Reyes", "Two new retreat inquiries came in overnight, a church youth group for March and a family reunion in May. On it.", -60 * 4),
      msg("demo-chan-office", staffUser("demo-staff-1"), "Dana Brooks", "@Alex Rivera can you sign off the winter rates before Friday?", -40),

      // #maintenance
      msg("demo-chan-maintenance", staffUser("demo-staff-6"), "Sam Okafor", "Furnace service booked for the lodge on the 18th, between groups.", -60 * 20),

      // #lakeview-grade-6
      msg("demo-chan-lakeview", null, "Camp office", "Lakeview Public School - Grade 6 is confirmed for 64 people. This channel is for everything about their stay.", -60 * 24 * 6, "system"),
      msg("demo-chan-lakeview", staffUser("demo-staff-5"), "Jordan Reyes", "Teachers want the night hike on Saturday. I'll check the forecast closer to the date.", -60 * 9),
    ],

    // Alex has read everything up to an hour ago, so the newest messages show as unread.
    channel_reads: ["demo-chan-office", "demo-chan-maintenance", "demo-chan-kitchen", "demo-chan-grace", "demo-chan-lakeview"].map(
      (channel_id) => ({ channel_id, user_id: DEMO_USER_ID, last_read_at: isoTime(-60 * 2 - 5) })
    ),

    routines: [
      routineRow("demo-routine-1", "Morning walkthrough: lodge, cabins and grounds", {
        target_type: "team",
        target_team: "Maintenance",
        due_time: "08:30",
        description: "Doors, heat, lights and anything a group would notice first.",
        checklist: WALKTHROUGH_STEPS,
      }),
      routineRow("demo-routine-2", "Log fridge and freezer temperatures", {
        target_type: "team",
        target_team: "Kitchen",
        due_time: "07:30",
        priority: "high",
      }),
      routineRow("demo-routine-3", "Reply to new retreat inquiries", {
        target_type: "team",
        target_team: "Office",
        frequency: "weekly",
        weekdays: [1, 2, 3, 4, 5],
        due_time: "11:00",
      }),
      routineRow("demo-routine-4", "Test fire alarms and check extinguishers", {
        target_type: "person",
        target_staff_id: "demo-staff-6",
        frequency: "weekly",
        weekdays: [1],
        due_time: "10:00",
        priority: "high",
      }),
      // A summer routine: set up once, it only runs between these dates.
      routineRow("demo-routine-5", "Morning cabin inspection", {
        target_type: "team",
        target_team: "Cabin leaders",
        due_time: "08:00",
        starts_on: summerStart(),
        ends_on: summerEnd(),
      }),
    ],


    email_drafts: [
      {
        id: "demo-email-1",
        camp_id: DEMO_CAMP_ID,
        original_email:
          "Hi there,\n\nMaya has a dentist appointment on Friday afternoon that we couldn't move. Would it be alright if I picked her up at 3pm instead of the usual time? I can come to the office if that's easier.\n\nThanks so much,\nJordan Parker",
        sender_name: "Jordan Parker",
        sender_email: "jordan.parker@example.com",
        subject: "Early pickup Friday?",
        source: "manual",
        gmail_message_id: null,
        gmail_thread_id: null,
        category: "pickup",
        urgency: "high",
        ai_summary: "Asking to pick Maya up at 3pm this Friday for a dentist appointment.",
        ai_draft:
          "Hi Jordan,\n\nThat's no problem at all - a 3pm pickup on Friday works. Please come to the camp office to sign Maya out, and allow about ten minutes for us to bring her up from her afternoon activity.\n\nOne small thing: we do need the request to come from the email address we have on file, which this is, so you're all set.\n\nSee you Friday,\nThe Camp Office\nMill Stream Bible Camp",
        edited_draft:
          "Hi Jordan,\n\nThat's no problem at all - a 3pm pickup on Friday works. Please come to the camp office to sign Maya out, and allow about ten minutes for us to bring her up from her afternoon activity.\n\nOne small thing: we do need the request to come from the email address we have on file, which this is, so you're all set.\n\nSee you Friday,\nThe Camp Office\nMill Stream Bible Camp",
        suggested_task_title: "Tell Cabin 4 about Maya's 3pm Friday pickup",
        suggested_task_due: isoDate(3),
        suggested_task_accepted: false,
        status: "pending",
        created_at: isoTime(-12),
        updated_at: isoTime(-12),
      },
      {
        id: "demo-email-2",
        camp_id: DEMO_CAMP_ID,
        original_email:
          "Hello,\n\nCould you send along the packing list for the overnight trip next week? I want to make sure Eli has everything, especially if it's going to be cold at night.\n\nThank you,\nSam",
        sender_name: "Sam Whitfield",
        sender_email: "sam.whitfield@example.com",
        subject: "Packing list for the overnight",
        source: "manual",
        gmail_message_id: null,
        gmail_thread_id: null,
        category: "logistics",
        urgency: "low",
        ai_summary: "Wants the overnight trip packing list for Eli.",
        ai_draft:
          "Hi Sam,\n\nHappy to help. For the overnight trip Eli will need a sleeping bag, pillow, flashlight, toiletries, two changes of clothes, a warm layer for the evening, a rain jacket, and closed-toe shoes.\n\nIf Eli takes any medication, please hand it to our camp nurse in its original container rather than packing it. And we do ask that electronics stay home - labelling everything with his name saves a lot of lost-and-found.\n\nWarmly,\nThe Camp Office\nMill Stream Bible Camp",
        edited_draft:
          "Hi Sam,\n\nHappy to help. For the overnight trip Eli will need a sleeping bag, pillow, flashlight, toiletries, two changes of clothes, a warm layer for the evening, a rain jacket, and closed-toe shoes.\n\nIf Eli takes any medication, please hand it to our camp nurse in its original container rather than packing it. And we do ask that electronics stay home - labelling everything with his name saves a lot of lost-and-found.\n\nWarmly,\nThe Camp Office\nMill Stream Bible Camp",
        suggested_task_title: null,
        suggested_task_due: null,
        suggested_task_accepted: false,
        status: "pending",
        created_at: isoTime(-95),
        updated_at: isoTime(-95),
      },
      {
        id: "demo-email-3",
        camp_id: DEMO_CAMP_ID,
        original_email:
          "Good morning,\n\nAma mentioned there's a leadership program for older campers. Is there information about it, and is there still space for next summer?\n\nRenee Osei",
        sender_name: "Renee Osei",
        sender_email: "renee.osei@example.com",
        subject: "Leadership program",
        source: "manual",
        gmail_message_id: null,
        gmail_thread_id: null,
        category: "general",
        urgency: "medium",
        ai_summary:
          "Asking about the older-camper leadership program and next summer's availability.",
        ai_draft:
          "Hi Renee,\n\nThank you for asking - it's lovely to hear Ama is interested.\n\nI don't have the leadership program details in front of me in a form I can quote accurately, so rather than guess at dates or spaces I'll confirm with our program director and come back to you this week with the specifics.\n\nWarmly,\nThe Camp Office\nMill Stream Bible Camp",
        edited_draft:
          "Hi Renee,\n\nThank you for asking - it's lovely to hear Ama is interested.\n\nI don't have the leadership program details in front of me in a form I can quote accurately, so rather than guess at dates or spaces I'll confirm with our program director and come back to you this week with the specifics.\n\nWarmly,\nThe Camp Office\nMill Stream Bible Camp",
        suggested_task_title: "Get leadership program details from Dana for Renee Osei",
        suggested_task_due: isoDate(2),
        suggested_task_accepted: false,
        status: "pending",
        created_at: isoTime(-60 * 26),
        updated_at: isoTime(-60 * 26),
      },
      {
        id: "demo-email-4",
        camp_id: DEMO_CAMP_ID,
        original_email:
          "Hi, just checking whether the bus leaves from the church parking lot or the camp itself on Sunday. Thanks!",
        sender_name: "Sam Whitfield",
        sender_email: "sam.whitfield@example.com",
        subject: "Sunday bus",
        source: "manual",
        gmail_message_id: null,
        gmail_thread_id: null,
        category: "logistics",
        urgency: "medium",
        ai_summary: "Asking where the Sunday bus departs from.",
        ai_draft: "",
        edited_draft:
          "Hi Sam,\n\nThe bus leaves from the church parking lot at 2:00 PM on Sunday - please arrive about fifteen minutes early so we can check everyone in.\n\nSee you then,\nThe Camp Office",
        suggested_task_title: null,
        suggested_task_due: null,
        suggested_task_accepted: false,
        status: "approved",
        created_at: isoTime(-60 * 24 * 2),
        updated_at: isoTime(-60 * 24 * 2 + 30),
      },
    ],

    gmail_accounts: [],
  };
}
