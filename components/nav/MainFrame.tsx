"use client";

import { usePathname } from "next/navigation";

// Pages get a centred, padded column; chat uses the full width like Slack.
// <main> is a size container so page headers can stretch edge to edge
// (see PageHeader) while the content stays in a readable column.
export function MainFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname.startsWith("/chat/");
  if (fullBleed) return <main className="w-full flex-1">{children}</main>;
  return (
    <main className="@container w-full flex-1">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-8">{children}</div>
    </main>
  );
}
