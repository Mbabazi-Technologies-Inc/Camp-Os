"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_ITEMS } from "./nav-items";

// Pages reached from More, so More lights up on them.
const UNDER_MORE = ["/more", "/groups", "/people", "/knowledge-base", "/settings"];

// Floating dock: detached pill bar with blur, hovering above the safe area.
export function BottomNav({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-20 px-3"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.625rem)" }}
    >
      <div className="mx-auto max-w-md grid grid-cols-5 rounded-3xl bg-surface/90 backdrop-blur-xl border border-border shadow-dock">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active =
            item.href === "/more" ? UNDER_MORE.some((p) => pathname.startsWith(p)) : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              <span
                className={`relative flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-primary-soft" : ""
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                {(badges[item.href] ?? 0) > 0 && (
                  <span className="absolute -right-0.5 -top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-white ring-2 ring-surface">
                    {badges[item.href]}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
