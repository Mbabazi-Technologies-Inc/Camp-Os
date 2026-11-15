import type { LucideIcon } from "lucide-react";

/**
 * The top of every page, styled like a Slack channel header: one slim bar
 * across the full width, pinned while you scroll, with the page's icon,
 * name, a line of context and its main action. Compact on purpose, so the
 * page's content starts right away.
 */
export function PageHeader({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  /** Kept for older call sites; the slim bar doesn't show it. */
  eyebrow?: string;
}) {
  return (
    <header className="sticky top-14 z-20 -mt-5 mb-5 ml-[calc(50%-50cqw)] w-[100cqw] border-b border-border bg-surface/90 backdrop-blur-md md:top-0 md:-mt-8 md:mb-7">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 md:px-8 md:py-3.5">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon size={18} strokeWidth={2.2} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold leading-tight text-foreground md:text-lg">{title}</h1>
          {description && <p className="truncate text-xs text-muted md:text-[13px]">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
