"use client";

import { useEffect, useRef } from "react";

/**
 * Marks where unread messages start. The page re-fetches every few seconds
 * (and each fetch counts as "read"), so this remembers the read point from
 * when you opened the channel and keeps the line there until you leave.
 */
export function NewMarker({ lastSeen, userId }: { lastSeen: string; userId: string }) {
  const openedAt = useRef(lastSeen);

  useEffect(() => {
    const since = openedAt.current;
    document.querySelectorAll("[data-new]").forEach((el) => el.removeAttribute("data-new"));
    // Never opened before: everything from other people is new.
    const first = [...document.querySelectorAll<HTMLElement>("[data-created]")].find(
      (el) => (el.dataset.created ?? "") > since && el.dataset.author !== userId
    );
    first?.setAttribute("data-new", "true");
  });

  return null;
}
