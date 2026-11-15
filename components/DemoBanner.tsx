import Link from "next/link";
import { isOpenAIConfigured, isSupabaseConfigured } from "@/lib/env";
import { FlaskConical } from "lucide-react";
import { DEMO_CAMP_NAME } from "@/lib/demo/seed";

// Shown whenever the app is running on sample data, so nothing here is
// mistaken for the camp's real records.
export function DemoBanner() {
  if (isSupabaseConfigured()) return null;

  const aiNote = isOpenAIConfigured()
    ? ""
    : " Replies are written by a built-in stand-in, not OpenAI.";

  return (
    <div className="bg-accent-soft border-b border-accent/20 px-4 py-2 text-center">
      <p className="text-xs text-foreground">
        <FlaskConical size={12} className="inline-block mr-1.5 -mt-0.5 text-accent" />
        <strong className="font-semibold">Demo mode</strong> - sample data for {DEMO_CAMP_NAME},
        reset when the server restarts.{aiNote}{" "}
        <Link href="/setup" className="font-medium text-primary hover:underline">
          Connect a database
        </Link>
      </p>
    </div>
  );
}
