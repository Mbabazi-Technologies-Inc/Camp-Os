// A row of quick facts that overlaps the bottom of a page hero. Hairline
// dividers come from the border colour showing through a 1px grid gap.
export function FactStrip({ facts, className = "max-w-5xl" }: { facts: [label: string, value: string][]; className?: string }) {
  const cols = facts.length === 4 ? "grid-cols-2 md:grid-cols-4" : facts.length === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={`relative z-10 mx-auto -mt-6 px-4 sm:px-6 ${className}`}>
      <dl className={`grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-card ${cols}`}>
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse justify-center bg-surface px-3 py-5 text-center">
            <dt className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted sm:text-xs">{label}</dt>
            <dd className="font-display text-lg font-semibold leading-tight text-primary text-balance sm:text-2xl">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
