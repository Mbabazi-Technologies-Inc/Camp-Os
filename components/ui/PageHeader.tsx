export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted mt-1 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}
