import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";
import { TopBar } from "@/components/nav/TopBar";
import { DemoBanner } from "@/components/DemoBanner";
import { todayISODate } from "@/lib/dates";
import { Suspense } from "react";
import { SavedToast } from "@/components/ui/SavedToast";
import { ensureRoutineTasks, getMyStaff, myTasksFilter } from "@/lib/routines";
import { getChannelList, type SidebarChannel } from "@/lib/chat";
import { seasonFor } from "@/lib/season";
import { MainFrame } from "@/components/nav/MainFrame";

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
  if (profile?.camp_id) {
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
      />
      <div className="flex-1 flex flex-col min-w-0">
        <DemoBanner />
        <TopBar campName={campName} />
        <MainFrame>{children}</MainFrame>
      </div>
      <BottomNav badges={badges} />
      <Suspense fallback={null}>
        <SavedToast />
      </Suspense>
    </div>
  );
}
