import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ClipboardList, Mail, MessagesSquare, Moon, Phone, Plus, Sparkles, Trees, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateRetreatGroup, deleteRetreatGroup, addGroupTask, addPrepList } from "../actions";
import { TaskItem } from "@/components/tasks/TaskItem";
import { Input, Select } from "@/components/ui/Field";
import { staffActiveOn } from "@/lib/routines";
import { campISODate, formatRelativeTime, todayISODate } from "@/lib/dates";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Badge } from "@/components/ui/Badge";
import {
  BackLink,
  ContactAction,
  DangerZone,
  DetailGrid,
  MetaItem,
  ProfileHeader,
  SectionCard,
} from "@/components/ui/Detail";
import { GroupFields } from "@/components/groups/GroupFields";
import { formatDateRange, nightsBetween } from "@/lib/dates";
import { RETREAT_STATUS_LABELS, RETREAT_STATUS_STYLES } from "@/lib/labels";

export const metadata: Metadata = { title: "Retreat group" };

export const dynamic = "force-dynamic";

function longDate(iso: string | null) {
  if (!iso) return "To be confirmed";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default async function RetreatGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: group } = await supabase.from("retreat_groups").select("*").eq("id", id).maybeSingle();

  if (!group) notFound();

  const today = todayISODate();
  const [{ data: channel }, { data: taskRows }, { data: staffRows }] = await Promise.all([
    supabase.from("channels").select("*").eq("retreat_group_id", group.id).maybeSingle(),
    supabase.from("tasks").select("*").eq("retreat_group_id", group.id).order("due_date", { ascending: true }),
    supabase.from("staff").select("*").order("first_name", { ascending: true }),
  ]);
  const { data: recent } = channel
    ? await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", channel.id)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(4)
    : { data: [] as never[] };

  const staff = staffRows ?? [];
  const nameOf = (id: string | null) => {
    const m = staff.find((s) => s.id === id);
    return m ? `${m.first_name} ${m.last_name}` : null;
  };
  const tasks = taskRows ?? [];
  const openTasks = tasks.filter((t) => t.status === "open");
  const doneCount = tasks.length - openTasks.length;

  // Where the booking is in its life, for the progress track.
  const arrival = group.arrival_date;
  const departure = group.departure_date ?? arrival;
  const daysToArrival = arrival
    ? Math.round((new Date(arrival + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86_400_000)
    : null;
  const onSite = Boolean(arrival && departure && today >= arrival && today <= departure);
  const departed = Boolean(departure && today > departure);
  const stages = ["Inquiry", "Confirmed", "Arriving", "On site", "Departed"];
  const stage =
    group.status === "cancelled"
      ? -1
      : departed
        ? 4
        : onSite
          ? 3
          : group.status === "confirmed" && daysToArrival !== null && daysToArrival <= 7
            ? 2
            : group.status === "confirmed"
              ? 1
              : 0;
  const countdown =
    group.status === "cancelled"
      ? "Cancelled"
      : onSite
        ? "On site now"
        : departed
          ? "Has left"
          : daysToArrival === null
            ? "Dates to be confirmed"
            : daysToArrival === 0
              ? "Arrives today"
              : daysToArrival === 1
                ? "Arrives tomorrow"
                : `Arrives in ${daysToArrival} days`;
  const suggestedDue = arrival && arrival > today ? (daysToArrival! > 3 ? campISODate(daysToArrival! - 3) : today) : today;

  const updateWithId = updateRetreatGroup.bind(null, group.id);
  const deleteWithId = deleteRetreatGroup.bind(null, group.id);
  const nights = nightsBetween(group.arrival_date, group.departure_date);

  return (
    <div>
      <BackLink href="/groups" label="All retreat groups" />
      <ProfileHeader
        title={group.name}
        badge={<Trees size={24} />}
        tone={group.status === "cancelled" ? "primary" : "forest"}
        meta={
          <>
            <MetaItem icon={<CalendarDays size={14} />}>{formatDateRange(group.arrival_date, group.departure_date)}</MetaItem>
            {group.headcount != null && <MetaItem icon={<Users size={14} />}>{group.headcount} guests</MetaItem>}
            <MetaItem icon={<Sparkles size={14} />}>
              <span className="font-semibold text-foreground">{countdown}</span>
            </MetaItem>
            <Badge className={RETREAT_STATUS_STYLES[group.status]}>{RETREAT_STATUS_LABELS[group.status]}</Badge>
          </>
        }
        actions={
          <>
            {channel && (
              <Link
                href={`/chat/${channel.name}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
              >
                <MessagesSquare size={16} /> Group chat
              </Link>
            )}
            {group.contact_phone && (
              <ContactAction href={`tel:${group.contact_phone}`} label="Call" icon={<Phone size={15} />} />
            )}
            {group.contact_email && (
              <ContactAction href={`mailto:${group.contact_email}`} label="Email" icon={<Mail size={15} />} />
            )}
          </>
        }
      />

      {/* Where the booking is */}
      {stage >= 0 && (
        <ol className="mb-6 grid grid-cols-5 gap-1.5 rounded-2xl border border-border bg-surface p-2 shadow-card" aria-label="Booking progress">
          {stages.map((label, i) => (
            <li
              key={label}
              aria-current={i === stage ? "step" : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-semibold sm:flex-row sm:justify-center sm:gap-2 sm:text-xs ${
                i === stage ? "bg-forest text-white" : i < stage ? "text-forest" : "text-muted"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  i === stage ? "bg-white/25" : i < stage ? "bg-forest-soft" : "bg-surface-muted"
                }`}
              >
                {i < stage ? "✓" : i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
      )}

      <DetailGrid
        aside={
          <>
            <SectionCard title="The stay">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <CalendarDays size={16} className="mt-0.5 shrink-0 text-forest" />
                  <span>
                    <span className="block text-xs text-muted">Arrives</span>
                    <span className="font-medium text-foreground">{longDate(group.arrival_date)}</span>
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CalendarDays size={16} className="mt-0.5 shrink-0 text-forest" />
                  <span>
                    <span className="block text-xs text-muted">Leaves</span>
                    <span className="font-medium text-foreground">{longDate(group.departure_date)}</span>
                  </span>
                </li>
                {nights != null && (
                  <li className="flex items-center gap-2.5">
                    <Moon size={16} className="shrink-0 text-forest" />
                    <span className="font-medium text-foreground">
                      {nights} night{nights === 1 ? "" : "s"}
                    </span>
                  </li>
                )}
              </ul>
            </SectionCard>
            {(group.contact_name || group.contact_email || group.contact_phone) && (
              <SectionCard title="Group contact">
                <p className="font-semibold text-foreground">{group.contact_name ?? "Contact"}</p>
                <div className="mt-2 space-y-2 text-sm">
                  {group.contact_phone && (
                    <a href={`tel:${group.contact_phone}`} className="flex items-center gap-2.5 text-foreground hover:text-primary">
                      <Phone size={15} className="text-muted" /> {group.contact_phone}
                    </a>
                  )}
                  {group.contact_email && (
                    <a href={`mailto:${group.contact_email}`} className="flex items-center gap-2.5 break-all text-foreground hover:text-primary">
                      <Mail size={15} className="shrink-0 text-muted" /> {group.contact_email}
                    </a>
                  )}
                </div>
              </SectionCard>
            )}
          </>
        }
      >
        <SectionCard
          title="Prep for this group"
          description={
            tasks.length
              ? `${doneCount} of ${tasks.length} done${openTasks.length ? `, ${openTasks.length} to go` : ". Ready for them."}`
              : "Everything that needs doing before, during and after the stay."
          }
        >
          {tasks.length > 0 && (
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-forest" style={{ width: `${Math.round((doneCount / tasks.length) * 100)}%` }} />
            </div>
          )}
          {tasks.length > 0 ? (
            <div className="-mx-1 divide-y divide-border">
              {[...openTasks, ...tasks.filter((t) => t.status === "done")].map((task) => (
                <TaskItem key={task.id} task={task} assignee={nameOf(task.assigned_to)} />
              ))}
            </div>
          ) : (
            <form action={addPrepList.bind(null, group.id)} className="rounded-2xl border border-dashed border-forest/40 bg-forest-soft/50 p-4 text-center">
              <ClipboardList size={22} className="mx-auto mb-2 text-forest" />
              <p className="font-semibold text-foreground">Start with the usual prep list</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Welcome email, final headcount, menu, cabins, room list, turnover and invoice, each sent to the right team and timed around their dates.
              </p>
              <SubmitButton pendingText="Adding..." className="mt-3">
                <Sparkles size={15} /> Add the prep list
              </SubmitButton>
            </form>
          )}
          <form action={addGroupTask.bind(null, group.id)} className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 border-t border-border pt-3">
            <Input name="title" required placeholder="Add a prep task…" aria-label="Prep task" className="col-span-3" />
            <Select name="assigned_to" defaultValue="" aria-label="For">
              <option value="">For: office</option>
              {staff
                .filter((m) => staffActiveOn(m, today))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name}
                  </option>
                ))}
            </Select>
            <Input name="due_date" type="date" defaultValue={suggestedDue} aria-label="Due" />
            <SubmitButton pendingText="…">
              <Plus size={16} /> Add
            </SubmitButton>
          </form>
          {tasks.length > 0 && (
            <form action={addPrepList.bind(null, group.id)} className="mt-2">
              <button type="submit" className="text-xs font-medium text-primary hover:underline">
                Add any missing items from the usual prep list
              </button>
            </form>
          )}
        </SectionCard>

        {channel && (
          <SectionCard title="Latest in the group chat" description={`#${channel.name}`}>
            {(recent ?? []).length === 0 ? (
              <p className="text-sm text-muted">No messages yet.</p>
            ) : (
              <ul className="-my-1 divide-y divide-border">
                {[...(recent ?? [])].reverse().map((m) => (
                  <li key={m.id} className="py-2.5 text-sm">
                    <span className="font-semibold text-foreground">{m.kind === "system" ? "Camp office" : m.author_name}</span>
                    <span className="ml-2 text-xs text-muted">{formatRelativeTime(m.created_at)}</span>
                    <p className="line-clamp-2 text-foreground">{m.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/chat/${channel.name}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              <MessagesSquare size={15} /> Open the group chat
            </Link>
          </SectionCard>
        )}

        <SectionCard title="Booking details">
          <form action={updateWithId} className="space-y-4">
            <GroupFields group={group} />
            <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
          </form>
        </SectionCard>
      </DetailGrid>

      <DangerZone description="To keep a record of the booking, set its status to Cancelled instead of deleting it.">
        <form action={deleteWithId}>
          <ConfirmButton confirmMessage="Delete this retreat group? This can't be undone.">Delete group</ConfirmButton>
        </form>
      </DangerZone>
    </div>
  );
}
