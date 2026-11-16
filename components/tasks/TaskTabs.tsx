"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// "My tasks" and "Team" for the director. Staff only ever see their own list.
export function TaskTabs({ teamAlert = 0 }: { teamAlert?: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/tasks", label: "My tasks", active: pathname === "/tasks" },
    { href: "/tasks/team", label: "Team", active: pathname.startsWith("/tasks/team") },
  ];

  return (
    <div className="mb-5 flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
            tab.active ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {tab.label}
          {tab.href === "/tasks/team" && teamAlert > 0 && (
            <span className="rounded-full bg-danger px-1.5 text-[11px] font-semibold leading-4 text-white">
              {teamAlert}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
