import Link from "next/link";
import { Hash, Sun, Trees } from "lucide-react";
import { requireCamp } from "@/lib/auth";
import { getChannelList } from "@/lib/chat";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { AddPanel } from "@/components/ui/AddPanel";
import { Input, Label, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createChannel } from "./actions";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { kind: "standing", title: "Channels", icon: Hash },
  { kind: "retreat_group", title: "Retreat groups", icon: Trees },
  { kind: "summer", title: "Summer", icon: Sun },
] as const;

export default async function ChatPage() {
  const { supabase, role } = await requireCamp();
  const channels = await getChannelList();

  // The latest line in each channel, shown under its name.
  const { data: recent } = await supabase
    .from("messages")
    .select("channel_id, author_name, body, created_at")
    .order("created_at", { ascending: false })
    .limit(400);
  const latest = new Map<string, { author_name: string | null; body: string }>();
  for (const m of recent ?? []) if (!latest.has(m.channel_id)) latest.set(m.channel_id, m);

  return (
    <div>
      <PageHeader title="Chat" description="Channels for the team, and one for every retreat group." />

      {role === "director" && (
        <AddPanel label="New channel">
          <form action={createChannel} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
            <div>
              <Label htmlFor="channel-name">Name</Label>
              <Input id="channel-name" name="name" required placeholder="e.g. waterfront" />
            </div>
            <div>
              <Label htmlFor="channel-kind">Kind</Label>
              <Select id="channel-kind" name="kind" defaultValue="standing">
                <option value="standing">All year</option>
                <option value="summer">Summer only</option>
              </Select>
            </div>
            <SubmitButton pendingText="Creating...">Create</SubmitButton>
          </form>
        </AddPanel>
      )}

      <div className="space-y-6">
        {SECTIONS.map(({ kind, title, icon: Icon }) => {
          const list = channels.filter((c) => c.kind === kind);
          if (list.length === 0) return null;
          return (
            <section key={kind}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
              <Card>
                <ul className="divide-y divide-border">
                  {list.map((channel) => {
                    const last = latest.get(channel.id);
                    return (
                      <li key={channel.id}>
                        <Link
                          href={`/chat/${channel.name}`}
                          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted/50"
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              kind === "standing" ? "bg-surface-muted text-muted" : "bg-accent-soft text-accent"
                            }`}
                          >
                            <Icon size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate ${channel.unread ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                              {channel.name}
                              {channel.meta && <span className="ml-2 text-xs font-normal text-muted">{channel.meta}</span>}
                            </span>
                            {last && (
                              <span className="block truncate text-sm text-muted">
                                {last.author_name ? `${last.author_name.split(" ")[0]}: ` : ""}
                                {last.body}
                              </span>
                            )}
                          </span>
                          {channel.unread > 0 && (
                            <span className="rounded-full bg-accent px-2 text-xs font-bold leading-5 text-white">{channel.unread}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          );
        })}
      </div>
    </div>
  );
}
