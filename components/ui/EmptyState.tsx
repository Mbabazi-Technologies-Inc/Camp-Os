/**
 * Shown when a list is empty: a small camp scene (a tent by the water under
 * the pines) so an empty page feels calm rather than broken.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <svg viewBox="0 0 160 84" className="mx-auto mb-4 h-20 w-auto" aria-hidden>
        <defs>
          <linearGradient id="empty-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-primary-soft)" />
            <stop offset="1" stopColor="var(--color-surface)" />
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="44" rx="74" ry="40" fill="url(#empty-sky)" />
        <circle cx="118" cy="22" r="8" fill="var(--color-glow)" opacity="0.85" />
        {/* pines */}
        <path d="M30 60 L40 30 L50 60Z" fill="var(--color-forest)" opacity="0.55" />
        <path d="M42 60 L54 22 L66 60Z" fill="var(--color-forest)" />
        <path d="M112 60 L121 36 L130 60Z" fill="var(--color-forest)" opacity="0.6" />
        {/* tent */}
        <path d="M70 60 L86 34 L102 60Z" fill="var(--color-accent)" />
        <path d="M86 34 L86 60 L80 60Z" fill="#b8701f" />
        <path d="M86 46 L91 60 L81 60Z" fill="#7a4710" opacity="0.6" />
        {/* water */}
        <path d="M18 64 Q34 60 50 64 T82 64 T114 64 T146 64" stroke="var(--color-primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.55" />
        <path d="M34 72 Q48 68 62 72 T90 72 T118 72" stroke="var(--color-glow)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      </svg>
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
