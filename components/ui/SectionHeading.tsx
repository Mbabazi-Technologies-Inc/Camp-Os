import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

/** A list's heading: icon, title, an optional count and a link to see more. */
export function SectionHeading({
  title,
  icon: Icon,
  count,
  href,
  linkLabel = "View all",
  tone = "primary",
}: {
  title: string;
  icon?: LucideIcon;
  count?: number;
  href?: string;
  linkLabel?: string;
  tone?: "primary" | "accent" | "forest" | "danger";
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    forest: "bg-forest-soft text-forest",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      {Icon && (
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon size={15} />
        </span>
      )}
      <h2 className="font-semibold text-foreground">{title}</h2>
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-muted">{count}</span>
      )}
      {href && (
        <Link href={href} className="group ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {linkLabel}
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
