import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { ListTodo, MessageSquare, Search } from "lucide-react";
import { requireCamp } from "@/lib/auth";
import { canSee, channelLabel } from "@/lib/chat";
import { formatDueDate, formatRelativeTime } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Search" };

export const dynamic = "force-dynamic";

/** Bolds each place the search term appears. */
function highlight(text: string, term: string) {
  if (!term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.split(new RegExp(`(${escaped})`, "ig")).map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark key={i} className="rounded bg-accent-soft px-0.5 font-semibold text-foreground">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/** Search every message you can see, and every task, from one box. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim().replaceAll("%", "").replaceAll(",", " ").slice(0, 80);
  const { supabase, userId } = await requireCamp();

  const [{ data: messageRows }, { data: channelRows }, { data: staffRows }, { data: taskRows }] = term
    ? await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .neq("kind", "system")
          .ilike("body", `%${term}%`)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase.from("channels").select("*"),
        supabase.from("staff").select("*"),
        supabase.from("tasks").select("*").ilike("title", `%${term}%`).order("updated_at", { ascending: false }).limit(20),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const channels = new Map((channelRows ?? []).map((c) => [c.id, c]));
  const messages = (messageRows ?? []).filter((m) => {
    const channel = channels.get(m.channel_id);
    return channel && canSee(channel, userId);
  });

  return (
    <div>
      <PageHeader icon={SearchIcon} eyebrow="Find anything" title="Search" description="Every message you can see, and every task." />
      <form action="/search" className="mb-6 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 shadow-card focus-within:border-primary">
        <Search size={18} className="text-muted" />
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="e.g. checkout, allergies, bus"
          aria-label="Search"
          className="h-12 flex-1 bg-transparent text-base text-foreground placeholder:text-muted focus:outline-none"
        />
      </form>

      {!term ? (
        <EmptyState title="What are you looking for?" description="Try a name, a group, or something someone said." />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
              <MessageSquare size={16} className="text-primary" /> Messages
              <span className="rounded-full bg-surface-muted px-2 text-xs font-semibold text-muted">{messages.length}</span>
            </h2>
            <Card>
              {messages.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">No messages mention “{term}”.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {messages.map((m) => {
                    const channel = channels.get(m.channel_id)!;
                    const where = channel.kind === "direct" ? channelLabel(channel, userId, staffRows ?? []) : `#${channel.name}`;
                    return (
                      <li key={m.id}>
                        <Link
                          href={`/chat/${channel.name}${m.parent_id ? `?thread=${m.parent_id}` : ""}`}
                          className="block px-4 py-3 transition-colors hover:bg-surface-muted/50"
                        >
                          <p className="text-xs text-muted">
                            <span className="font-semibold text-foreground">{m.author_name}</span> in {where}
                            {m.parent_id ? " (thread)" : ""} · {formatRelativeTime(m.created_at)}
                          </p>
                          <p className="mt-0.5 line-clamp-3 text-[15px] text-foreground">{highlight(m.body, term)}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </section>

          <section>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
              <ListTodo size={16} className="text-primary" /> Tasks
              <span className="rounded-full bg-surface-muted px-2 text-xs font-semibold text-muted">{(taskRows ?? []).length}</span>
            </h2>
            <Card>
              {(taskRows ?? []).length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">No tasks match “{term}”.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {(taskRows ?? []).map((t) => (
                    <li key={t.id}>
                      <Link href={`/tasks/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/50">
                        <span className={`min-w-0 flex-1 truncate ${t.status === "done" ? "text-muted line-through" : "text-foreground"}`}>
                          {highlight(t.title, term)}
                        </span>
                        <span className="shrink-0 text-xs text-muted">{t.status === "done" ? "Done" : formatDueDate(t.due_date).label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
