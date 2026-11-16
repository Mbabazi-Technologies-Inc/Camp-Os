"use client";

import { setStatus } from "@/app/(app)/chat/actions";

const PRESETS = ["🏕️ On site", "🌙 Off today", "📅 In a meeting", "🚐 Driving", "🛶 At the waterfront", "🔧 Fixing something"];

/**
 * The status menu under your name in the sidebar: one tap to tell the team
 * where you are today. It clears itself tomorrow.
 */
export function StatusPicker({ status }: { status: { emoji: string; text: string } | null }) {
  return (
    <details className="group/status relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 truncate text-[11px] text-[#a9bfc4] hover:text-white [&::-webkit-details-marker]:hidden">
        {status ? (
          <>
            <span>{status.emoji}</span>
            <span className="truncate">{status.text}</span>
          </>
        ) : (
          <span>Set a status</span>
        )}
      </summary>
      <div className="absolute bottom-7 left-0 z-20 w-60 rounded-xl border border-border bg-surface p-2 text-foreground shadow-dock">
        <p className="px-2 pb-1.5 pt-1 text-xs font-semibold text-muted">Today I&apos;m…</p>
        {PRESETS.map((preset) => (
          <form key={preset} action={setStatus}>
            <input type="hidden" name="preset" value={preset} />
            <button type="submit" className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-muted">
              {preset}
            </button>
          </form>
        ))}
        <form action={setStatus} className="mt-1 flex gap-1 border-t border-border pt-2">
          <input
            name="text"
            maxLength={60}
            placeholder="Something else…"
            aria-label="Custom status"
            className="h-8 min-w-0 flex-1 rounded-lg border border-border px-2 text-sm focus:border-primary focus:outline-none"
          />
          <button type="submit" className="rounded-lg bg-primary px-2.5 text-xs font-semibold text-white">
            Set
          </button>
        </form>
        {status && (
          <form action={setStatus} className="mt-1">
            <input type="hidden" name="clear" value="1" />
            <button type="submit" className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-muted hover:bg-surface-muted">
              Clear status
            </button>
          </form>
        )}
      </div>
    </details>
  );
}
