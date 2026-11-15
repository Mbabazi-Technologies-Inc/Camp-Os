"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export type Destination = { label: string; detail: string; href: string; group: string };

/**
 * Press ⌘K (Ctrl+K on Windows) anywhere to jump to a channel, person,
 * retreat group or tool by typing a few letters, like Slack's "Jump to".
 * The sidebar's "Jump to…" button opens it too.
 */
export function QuickSwitcher({ destinations }: { destinations: Destination[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-quick-switcher", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-quick-switcher", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? destinations.filter((d) => `${d.label} ${d.detail}`.toLowerCase().includes(q))
      : destinations.filter((d) => d.group !== "People");
    const top = list.slice(0, 8);
    // Always offer a full search of messages and tasks for what was typed.
    return q ? [...top, { label: `Search messages and tasks for “${query.trim()}”`, detail: "", href: `/search?q=${encodeURIComponent(query.trim())}`, group: "Search" }] : top;
  }, [destinations, query]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function go(destination: Destination | undefined) {
    if (!destination) return;
    close();
    router.push(destination.href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#0b1416]/40 px-4 pt-[12vh]" onMouseDown={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Jump to"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-dock"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={18} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const step = e.key === "ArrowDown" ? 1 : -1;
                setActive((a) => (a + step + results.length) % Math.max(results.length, 1));
              }
              if (e.key === "Enter") go(results[active]);
            }}
            placeholder="Jump to… or search messages"
            aria-label="Jump to"
            className="h-14 flex-1 bg-transparent text-base text-foreground placeholder:text-muted focus:outline-none"
          />
          <kbd className="hidden rounded border border-border px-1.5 text-[11px] text-muted sm:inline">Esc</kbd>
        </div>
        <ul role="listbox" className="max-h-[50vh] overflow-y-auto py-1.5">
          {results.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Nothing matches “{query}”.</li>}
          {results.map((d, i) => (
            <li key={d.href} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(d)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${i === active ? "bg-primary-soft" : ""}`}
              >
                <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">{d.group}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{d.label}</span>
                  {d.detail && <span className="block truncate text-xs text-muted">{d.detail}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** A button that opens the switcher (for the sidebar). */
export function QuickSwitcherButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-quick-switcher"))}
      className={className}
    >
      <Search size={14} />
      <span className="flex-1 text-left">Jump to…</span>
      <kbd className="rounded bg-white/10 px-1.5 text-[10px]">⌘K</kbd>
    </button>
  );
}

/** The phone's search icon in the top bar. */
export function QuickSwitcherIconButton() {
  return (
    <button
      type="button"
      aria-label="Jump to"
      onClick={() => window.dispatchEvent(new Event("open-quick-switcher"))}
      className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground"
    >
      <Search size={18} />
    </button>
  );
}
