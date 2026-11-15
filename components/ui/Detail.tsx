import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Shared building blocks for the record detail pages (tasks, people,
// knowledge entries): a back link, a profile header, side cards and a
// clearly separated delete area.

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
    >
      <ArrowLeft size={15} /> {label}
    </Link>
  );
}

const tones = {
  primary: "bg-primary text-white",
  forest: "bg-forest text-white",
  accent: "bg-accent text-white",
};

export function ProfileHeader({
  title,
  badge,
  tone = "primary",
  meta,
  actions,
}: {
  title: string;
  // Initials or an icon shown in the round badge.
  badge: React.ReactNode;
  tone?: keyof typeof tones;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-card sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-stream" aria-hidden />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-xl font-semibold ${tones[tone]}`}
          >
            {badge}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {meta && <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

// A small labelled fact for the profile header, e.g. "Cabin 4".
export function MetaItem({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {children}
    </span>
  );
}

// Two columns on wide screens: the edit form, and related information beside it.
export function DetailGrid({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  if (!aside) return <div className="max-w-3xl">{children}</div>;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0 space-y-4">{children}</div>
      <div className="min-w-0 space-y-4">{aside}</div>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DangerZone({ description, children }: { description: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-danger/20 bg-danger-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">{description}</p>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// Round icon link for quick contact actions (call, email).
export function ContactAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-surface-muted"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </a>
  );
}
