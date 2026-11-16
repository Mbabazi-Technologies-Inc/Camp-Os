import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";
import { TopBar } from "@/components/nav/TopBar";
import { DemoBanner } from "@/components/DemoBanner";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { getCampBilling } from "@/lib/auth";
import { todayISODate } from "@/lib/dates";
import { Suspense } from "react";
import { SavedToast } from "@/components/ui/SavedToast";
import { ensureRoutineTasks, getMyStaff, myTasksFilter } from "@/lib/routines";
import { getChannelList, statusOf, type SidebarChannel } from "@/lib/chat";
import { seasonFor } from "@/lib/season";
import { MainFrame } from "@/components/nav/MainFrame";
import { QuickSwitcher, type Destination } from "@/components/nav/QuickSwitcher";
import { ChatNotifier } from "@/components/chat/ChatNotifier";
import { formatDateRange } from "@/lib/dates";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("camp_id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  let campName: string | null = null;
  let readOnly = false;
  if (profile?.camp_id) {
    readOnly = (await getCampBilling(supabase, profile.camp_id))?.readOnly ?? false;
    const { data: camp } = await supabase
      .from("camps")
      .select("name")
      .eq("id", profile.camp_id)
      .maybeSingle();
    campName = camp?.name ?? null;
  }

  // Today's routine tasks are created on first visit each day, before anything counts them.
  const today = todayISODate();
  if (profile?.camp_id) await ensureRoutineTasks(today);
  const me = profile?.camp_id ? await getMyStaff() : null;
  const isDirector = profile?.role === "director";
  const mineFilter = myTasksFilter(isDirector, me);

  // Counts shown as badges in the navigation, so staff can see what's
  // waiting without opening each section.
  const [{ count: draftCount }, { count: dueTaskCount }] = await Promise.all([
    supabase.from("email_drafts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .or(mineFilter)
      .lte("due_date", today),
  ]);
  const channels: SidebarChannel[] = profile?.camp_id ? await getChannelList() : [];
  const badges: Record<string, number> = {
    "/email-assistant": draftCount ?? 0,
    "/tasks": dueTaskCount ?? 0,
    "/chat": channels.reduce((sum, c) => sum + c.unread, 0),
  };
  // Everything ⌘K can jump to.
  const [{ data: staffRows }, { data: groupRows }] = await Promise.all([
    supabase.from("staff").select("*"),
    supabase.from("retreat_groups").select("id, name, arrival_date, departure_date, status").neq("status", "cancelled"),
  ]);
  const destinations: Destination[] = [
    { label: "Home", detail: "Today's briefing", href: "/dashboard", group: "Page" },
    { label: "My tasks", detail: "Tasks for you", href: "/tasks", group: "Page" },
    ...(isDirector ? [{ label: "Team tasks", detail: "Everyone's progress and routines", href: "/tasks/team", group: "Page" }] : []),
    { label: "Email assistant", detail: "Drafted replies to review", href: "/email-assistant", group: "Page" },
    { label: "Retreat groups", detail: "Bookings", href: "/groups", group: "Page" },
    { label: "People", detail: "Campers, guardians and staff", href: "/people", group: "Page" },
    { label: "Knowledge base", detail: "Policies and answers", href: "/knowledge-base", group: "Page" },
    { label: "Settings", detail: "", href: "/settings", group: "Page" },
    { label: "Search", detail: "Messages and tasks", href: "/search", group: "Page" },
    ...channels.map((c) => ({
      label: c.kind === "direct" ? c.label : `#${c.label}`,
      detail: c.unread ? `${c.unread} unread` : c.meta ?? "",
      href: `/chat/${c.name}`,
      group: c.kind === "direct" ? "Message" : c.kind === "retreat_group" ? "Group chat" : "Channel",
    })),
    ...(groupRows ?? []).map((g) => ({
      label: g.name,
      detail: formatDateRange(g.arrival_date, g.departure_date),
      href: `/groups/${g.id}`,
      group: "Booking",
    })),
    ...(staffRows ?? []).map((m) => ({
      label: `${m.first_name} ${m.last_name}`,
      detail: [statusOf(m, today) && `${statusOf(m, today)!.emoji} ${statusOf(m, today)!.text}`, m.role, m.team]
        .filter(Boolean)
        .join(" · "),
      href: `/people/staff/${m.id}`,
      group: "People",
    })),
  ];

  const userName = profile?.full_name ?? me?.first_name ?? user.email ?? "You";
  const roleLabel = isDirector ? "Director" : (me?.role ?? "Staff");

  return (
    <div className="paper flex min-h-screen">
      <Sidebar
        campName={campName}
        userName={me ? `${me.first_name} ${me.last_name}` : userName}
        roleLabel={roleLabel}
        season={seasonFor()}
        channels={channels}
        badges={badges}
        isDirector={isDirector}
        status={me ? statusOf(me, today) : null}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <DemoBanner />
        {readOnly && <ReadOnlyBanner />}
        <TopBar campName={campName} />
        <MainFrame>{children}</MainFrame>
      </div>
      <BottomNav badges={badges} />
      <QuickSwitcher destinations={destinations} />
      <ChatNotifier initialUnread={badges["/chat"]} />
      <Suspense fallback={null}>
        <SavedToast />
      </Suspense>
    </div>
  );
}
