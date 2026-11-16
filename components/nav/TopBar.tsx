import Link from "next/link";
import { CampBadge } from "@/components/brand/CampBadge";
import { brand } from "@/lib/brand";
import { Settings } from "lucide-react";
import { QuickSwitcherIconButton } from "./QuickSwitcher";

export function TopBar({ campName }: { campName: string | null }) {
  return (
    <header
      className="md:hidden sticky top-0 z-20 flex items-center justify-between bg-surface/95 backdrop-blur border-b border-border px-4"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-2.5 h-14">
        <CampBadge name={campName ?? brand.name} className="h-9 w-9 shrink-0 drop-shadow-sm" />
        <div>
          <p className="font-display text-[15px] font-semibold text-foreground leading-tight tracking-tight">
            {campName ?? brand.name}
          </p>
          <p className="font-script text-sm leading-tight text-forest">Camp office</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <QuickSwitcherIconButton />
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground"
        >
          <Settings size={18} strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}
