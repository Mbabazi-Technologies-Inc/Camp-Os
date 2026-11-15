"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

// Shows the `?saved=` confirmation that actions add to their redirects (see
// lib/saved.ts), then removes it from the URL so a refresh doesn't repeat it.
export function SavedToast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const saved = params.get("saved");
  const [message, setMessage] = useState<string | null>(null);
  const [seen, setSeen] = useState<string | null>(null);

  // Pick up a new confirmation as soon as it appears in the URL.
  if (saved && saved !== seen) {
    setSeen(saved);
    setMessage(saved);
  }

  // Clear it from the URL, and hide the toast after a few seconds.
  useEffect(() => {
    if (!saved) return;
    const rest = new URLSearchParams(params);
    rest.delete("saved");
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [saved, params, pathname, router]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage(null);
      setSeen(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 md:bottom-6 md:left-64"
    >
      <div className="flex items-center gap-2.5 rounded-full bg-[#0f2f37] py-2.5 pl-4 pr-2 text-sm font-medium text-white shadow-dock">
        <CheckCircle2 size={17} className="text-glow" />
        {message}
        <button
          type="button"
          onClick={() => setMessage(null)}
          aria-label="Dismiss"
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
