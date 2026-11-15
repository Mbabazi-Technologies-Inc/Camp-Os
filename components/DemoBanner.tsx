import Link from "next/link";
import { cookies } from "next/headers";
import { isOpenAIConfigured, isSupabaseConfigured } from "@/lib/env";
import { FlaskConical } from "lucide-react";
import { DEMO_CAMP_NAME } from "@/lib/demo/seed";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USER_ID } from "@/lib/demo/seed";
import { DEMO_VIEW_AS_COOKIE } from "@/lib/demo/client";
import { staffActiveOn } from "@/lib/routines";
import { todayISODate } from "@/lib/dates";
import { DemoViewAs } from "@/components/DemoViewAs";

// Shown whenever the app is running on sample data, so nothing here is
// mistaken for the camp's real records.
export async function DemoBanner() {
  if (isSupabaseConfigured()) return null;

  // Staff the director can "view as": everyone still on staff except themselves.
  const supabase = await createClient();
  const { data: staff } = await supabase.from("staff").select("*").order("first_name", { ascending: true });
  const today = todayISODate();
  const people = (staff ?? [])
    .filter((m) => m.profile_id !== DEMO_USER_ID && staffActiveOn(m, today))
    .map((m) => ({ id: m.id, name: `${m.first_name} ${m.last_name}`, detail: m.role ?? m.team ?? "Staff" }));
  const current = (await cookies()).get(DEMO_VIEW_AS_COOKIE)?.value ?? "";

  const aiNote = isOpenAIConfigured()
    ? ""
    : " Replies are written by a built-in stand-in, not OpenAI.";

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 bg-accent-soft border-b border-accent/20 px-4 py-2 text-center">
      <p className="text-xs text-foreground">
        <FlaskConical size={12} className="inline-block mr-1.5 -mt-0.5 text-accent" />
        <strong className="font-semibold">Demo mode</strong> - sample data for {DEMO_CAMP_NAME},
        reset when the server restarts.{aiNote}{" "}
        <Link href="/setup" className="font-medium text-primary hover:underline">
          Connect a database
        </Link>
      </p>
      <DemoViewAs people={people} current={current} />
    </div>
  );
}
