"use client";

import { usePathname } from "next/navigation";

// Pages get a centred, padded column; chat uses the full width like Slack.
export function MainFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname.startsWith("/chat/");
  return (
    <main
      className={
        fullBleed
          ? "flex-1 w-full"
          : "flex-1 px-4 py-5 md:px-8 md:py-8 pb-28 md:pb-8 max-w-5xl w-full mx-auto"
      }
    >
      {children}
    </main>
  );
}
