"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Hash,
  Home,
  ListTodo,
  LogOut,
  Mail,
  Plus,
  Settings,
  Sun,
  Trees,
  Users,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/login/actions";
import { BrandMark } from "@/components/Brand";
import { Treeline } from "@/components/brand/Treeline";
import type { SidebarChannel } from "@/lib/chat";
import type { Season } from "@/lib/season";
import { QuickSwitcherButton } from "./QuickSwitcher";
import { NotificationToggle } from "@/components/chat/ChatNotifier";
import { StatusPicker } from "./StatusPicker";

const TOOLS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/email-assistant", label: "Email", icon: Mail },
  { href: "/groups", label: "Retreats", icon: Trees },
  { href: "/people", label: "People", icon: Users },
  { href: "/knowledge-base", label: "Knowledge", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

const SECTIONS = [
  { kind: "standing", title: "Channels", icon: Hash },
  { kind: "retreat_group", title: "Retreat groups", icon: Trees },
  { kind: "summer", title: "Summer", icon: Sun },
  { kind: "direct", title: "Direct messages", icon: Hash },
] as const;

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] font-bold leading-[18px] text-white">
      {count}
    </span>
  );
}

// Desktop navigation, laid out like a chat workspace: the camp at the top,
// Home and the tools, then every channel with its unread count.
export function Sidebar({
  campName,
  userName,
  roleLabel,
  season,
  channels,
  badges = {},
  isDirector,
  status = null,
}: {
  campName: string | null;
  userName: string;
  roleLabel: string;
  season: Season;
  channels: SidebarChannel[];
  badges?: Record<string, number>;
  isDirector: boolean;
  /** My status for today, if I've set one. */
  status?: { emoji: string; text: string } | null;
}) {
  const pathname = usePathname();
  const initials = userName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="relative isolate hidden overflow-hidden bg-[#0f2f37] text-[#c9d6d9] md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
      <Treeline className="pointer-events-none absolute bottom-12 left-0 -z-10 h-14 text-white/[0.06]" />

      {/* Workspace */}
      <Link href="/dashboard" className="flex items-center gap-3 border-b border-white/10 px-4 pb-3.5 pt-4">
        <BrandMark size="md" />
        <div className="min-w-0">
          <p className="line-clamp-2 font-display text-[15px] font-semibold leading-tight text-white">
            {campName ?? "Mill Stream"}
          </p>
          <span
            className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-px text-[10.5px] font-semibold ${
              season === "summer" ? "bg-accent/25 text-glow" : "bg-forest/40 text-[#b8dcbf]"
            }`}
          >
            {season === "summer" ? <Sun size={10} /> : <Trees size={10} />}
            {season === "summer" ? "Summer camp" : "Retreat season"}
          </span>
        </div>
      </Link>

      <div className="px-2 pt-2.5">
        <QuickSwitcherButton className="flex w-full items-center gap-2 rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-[13px] text-[#a9bfc4] transition-colors hover:bg-white/[0.12] hover:text-white" />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-6 pt-2" aria-label="Main">
        <Link
          href="/dashboard"
          aria-current={pathname === "/dashboard" ? "page" : undefined}
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm ${
            pathname === "/dashboard" ? "bg-primary font-semibold text-white" : "hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          <Home size={16} /> Home
        </Link>

        {/* Tools, like Slack's apps */}
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {TOOLS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            const count = badges[href] ?? 0;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[11px] transition-colors ${
                  active ? "bg-primary text-white" : "bg-white/[0.04] hover:bg-white/[0.09] hover:text-white"
                }`}
              >
                <Icon size={16} className={active ? "text-glow" : ""} />
                {label}
                {count > 0 && (
                  <span className="absolute right-1 top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[9.5px] font-bold leading-4 text-white">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {SECTIONS.map(({ kind, title, icon: Icon }) => {
          const list = channels.filter((c) => c.kind === kind);
          if (list.length === 0 && kind !== "standing" && kind !== "direct") return null;
          return (
            <div key={kind} className="mt-4">
              <div className="flex items-center justify-between px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86a0a6]">
                {title}
                {((kind === "standing" && isDirector) || kind === "direct") && (
                  <Link
                    href={kind === "direct" ? "/chat#people" : "/chat"}
                    aria-label={kind === "direct" ? "Message someone" : "New channel"}
                    className="rounded p-0.5 hover:bg-white/10 hover:text-white"
                  >
                    <Plus size={13} />
                  </Link>
                )}
              </div>
              {list.map((channel) => {
                const href = `/chat/${channel.name}`;
                const active = pathname === href;
                return (
                  <Link
                    key={channel.id}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1 text-[13.5px] ${
                      active
                        ? "bg-primary text-white"
                        : channel.unread
                          ? "font-semibold text-white hover:bg-white/[0.06]"
                          : "hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {kind === "direct" ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-white/15 text-[8px] font-bold text-white">
                        {channel.label
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                    ) : (
                      <Icon size={13} className="shrink-0 opacity-60" />
                    )}
                    <span className="truncate">{channel.label}</span>
                    {channel.status && (
                      <span title={channel.status.text} className="shrink-0 text-xs">
                        {channel.status.emoji}
                      </span>
                    )}
                    {channel.unread > 0 ? (
                      <Badge count={channel.unread} />
                    ) : (
                      channel.meta && <span className="ml-auto shrink-0 text-[11px] text-[#86a0a6]">{channel.meta}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <NotificationToggle className="mx-2 mb-1.5 flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs text-[#a9bfc4] hover:bg-white/[0.06] hover:text-white" />

      {/* Me */}
      <div className="flex items-center gap-2.5 border-t border-white/10 bg-[#0f2f37] px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
          {initials || "?"}
        </span>
        <div className="min-w-0 flex-1 text-xs leading-tight">
          <p className="truncate font-semibold text-white">{userName}</p>
          <p className="truncate">{roleLabel}</p>
          <StatusPicker status={status} />
        </div>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="rounded-lg p-1.5 text-[#86a0a6] hover:bg-white/10 hover:text-white"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </aside>
  );
}
