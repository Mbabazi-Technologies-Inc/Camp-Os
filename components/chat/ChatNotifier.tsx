"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, BellRing } from "lucide-react";

type Item = { id: string; title: string; body: string; href: string; at: string };

/**
 * Checks for new chat activity every 15 seconds on any page. Puts the unread
 * count in the browser tab, refreshes the sidebar when something arrives,
 * and (once allowed) shows a notification for @mentions and direct messages
 * while you're looking at something else.
 */
export function ChatNotifier({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const since = useRef(new Date().toISOString());
  const unread = useRef(initialUnread);
  const shown = useRef(new Set<string>());

  useEffect(() => {
    // Keep "(3) " in front of whatever title the current page sets.
    const setTitle = (n: number) => {
      const base = document.title.replace(/^\(\d+\)\s*/, "").trim();
      // Wait for the page's own title; never write a title the browser will
      // normalise differently (that would trigger the observer forever).
      if (!base) return;
      const next = n > 0 ? `(${n}) ${base}` : base;
      if (document.title.trim() !== next) document.title = next;
    };
    setTitle(unread.current);
    const observer = new MutationObserver(() => setTitle(unread.current));
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });

    async function check() {
      try {
        const res = await fetch(`/api/chat/notify?since=${encodeURIComponent(since.current)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data: { unread: number; items: Item[] } = await res.json();
        if (data.unread !== unread.current) {
          unread.current = data.unread;
          router.refresh();
        }
        setTitle(data.unread);
        for (const item of data.items) {
          since.current = item.at > since.current ? item.at : since.current;
          if (shown.current.has(item.id)) continue;
          shown.current.add(item.id);
          const away = document.hidden || !window.location.pathname.startsWith(item.href.split("?")[0]);
          if (away && "Notification" in window && Notification.permission === "granted") {
            const note = new Notification(item.title, { body: item.body, tag: item.id, icon: "/icons/icon-192.png" });
            note.onclick = () => {
              window.focus();
              router.push(item.href);
              note.close();
            };
          }
        }
      } catch {
        // Offline or mid-deploy: try again next time.
      }
    }

    const timer = setInterval(check, 15_000);
    return () => {
      clearInterval(timer);
      observer.disconnect();
    };
  }, [router]);

  return null;
}

/** Lets someone turn on notifications for @mentions and direct messages. */
export function NotificationToggle({ className = "" }: { className?: string }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(null);

  useEffect(() => {
    // Read after mount: the server can't know the browser's setting.
    const value = "Notification" in window ? Notification.permission : "unsupported";
    const id = requestAnimationFrame(() => setPermission(value));
    return () => cancelAnimationFrame(id);
  }, []);

  if (permission === null || permission === "unsupported") return null;
  if (permission === "granted") {
    return (
      <span className={className} title="You'll be notified about @mentions and direct messages">
        <BellRing size={14} /> Notifications on
      </span>
    );
  }
  if (permission === "denied") {
    return (
      <span className={className} title="Turn them on in your browser's site settings">
        <BellOff size={14} /> Notifications blocked
      </span>
    );
  }
  return (
    <button type="button" className={className} onClick={() => Notification.requestPermission().then(setPermission)}>
      <Bell size={14} /> Turn on notifications
    </button>
  );
}
