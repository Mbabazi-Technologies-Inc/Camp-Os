import { faqs } from "@/lib/site/content";

// The common questions, as an accordion card.
export function FaqList({ className = "" }: { className?: string }) {
  return (
    <div className={`divide-y divide-border rounded-2xl border border-border bg-surface shadow-card ${className}`}>
      {faqs.map((f) => (
        <details key={f.q} className="group px-6 py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
            {f.q}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-lg text-muted transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
