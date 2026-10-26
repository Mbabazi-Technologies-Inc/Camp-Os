"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { signOut } from "@/app/login/actions";
import { BrandMark } from "@/components/Brand";
import { Treeline } from "@/components/site/Treeline";
import { LogOut, Settings } from "lucide-react";

// Desktop navigation: a dark forest panel that echoes the public site's footer.
export function Sidebar({
  campName,
  email,
  badges = {},
}: {
  campName: string | null;
  email: string | null;
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();

  const itemClass = (active: boolean) =>
    `relative flex items-center gap-3 rounded-xl px-3 h-11 text-sm font-medium transition-colors ${
      active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white"
    }`;

  return (
    <aside className="relative isolate hidden overflow-hidden bg-[#0f2f37] text-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col">
      <Treeline className="pointer-events-none absolute bottom-0 left-0 -z-10 h-16 text-white/[0.05]" />

      <div className="px-5 pt-6 pb-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <BrandMark size="md" />
          <div className="min-w-0">
            <p className="font-display text-[17px] font-semibold leading-tight tracking-tight text-white">
              {campName ?? "Mill Stream"}
            </p>
            <p className="font-script text-lg leading-tight text-glow">Camp office</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={itemClass(active)} aria-current={active ? "page" : undefined}>
              {active && <span className="absolute inset-y-2.5 left-0 w-1 rounded-r-full bg-accent" aria-hidden />}
              <Icon size={18} strokeWidth={2} className={active ? "text-glow" : ""} />
              <span className="flex-1">{item.label}</span>
              {(badges[item.href] ?? 0) > 0 && (
                <span className="min-w-6 rounded-full bg-accent px-1.5 py-0.5 text-center text-xs font-semibold text-white">
                  {badges[item.href]}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 pb-20 pt-2">
        <Link href="/settings" className={`${itemClass(pathname.startsWith("/settings"))} mt-2 h-10`}>
          <Settings size={17} strokeWidth={2} />
          Settings
        </Link>
        <p className="truncate px-3 pb-1 pt-3 text-xs text-white/50">{email}</p>
        <form action={signOut}>
          <button type="submit" className={`${itemClass(false)} h-10 w-full`}>
            <LogOut size={17} strokeWidth={2} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
