"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a conversation current by re-fetching it every few seconds while the
 * tab is visible, and starts the view at the newest message. (With a
 * database connected this can move to Supabase Realtime.)
 */
export function LiveRefresh({
  every = 5000,
  anchorId,
  count = 0,
}: {
  every?: number;
  anchorId?: string;
  /** Number of messages; when it grows and you're near the bottom, follow along. */
  count?: number;
}) {
  const router = useRouter();
  const seen = useRef<number | null>(null);

  useEffect(() => {
    if (!anchorId) return;
    const anchor = document.getElementById(anchorId);
    const gap = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    // First load always starts at the newest; later, only if you weren't reading back.
    if (seen.current === null || (count > seen.current && gap < 500)) {
      anchor?.scrollIntoView({ block: "end" });
    }
    seen.current = count;
  }, [anchorId, count]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, every);
    return () => clearInterval(timer);
  }, [every, router]);

  return null;
}
