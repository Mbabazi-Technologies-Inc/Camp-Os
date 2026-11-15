import { Plus } from "lucide-react";

// A folded-away "add" form: a button that opens the form in place, so the
// list it adds to stays at the top of the page. Works without JavaScript.
export function AddPanel({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group mb-6" open={defaultOpen || undefined}>
      <summary className="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
        <Plus size={17} className="transition-transform group-open:rotate-45" />
        <span className="group-open:hidden">{label}</span>
        <span className="hidden group-open:inline">Close</span>
      </summary>
      <div className="mt-3 rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5">{children}</div>
    </details>
  );
}
