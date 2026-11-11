// The camp is in Ontario, so "today" follows Eastern time wherever the server
// runs (Vercel is on UTC, which would roll over to tomorrow at 7-8 pm).
export const CAMP_TIME_ZONE = "America/Toronto";

/** YYYY-MM-DD in camp time, `offsetDays` from today. */
export function campISODate(offsetDays = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CAMP_TIME_ZONE }).format(
    new Date(Date.now() + offsetDays * 86_400_000)
  );
}

export function todayISODate() {
  return campISODate(0);
}

export function tomorrowISODate() {
  return campISODate(1);
}

export function formatDueDate(dueDate: string | null): {
  label: string;
  overdue: boolean;
} {
  if (!dueDate) return { label: "No due date", overdue: false };

  const today = todayISODate();
  const diffDays = Math.round(
    (new Date(dueDate + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) /
      86_400_000
  );

  if (diffDays === 0) return { label: "Due today", overdue: false };
  if (diffDays === 1) return { label: "Due tomorrow", overdue: false };
  if (diffDays === -1) return { label: "1 day overdue", overdue: true };
  if (diffDays < 0) return { label: `${Math.abs(diffDays)} days overdue`, overdue: true };
  if (diffDays <= 6) {
    const weekday = new Date(dueDate + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
    });
    return { label: `Due ${weekday}`, overdue: false };
  }

  const formatted = new Date(dueDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return { label: `Due ${formatted}`, overdue: false };
}

export function formatRelativeTime(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// "Oct 30 - Nov 1" for a stay, or a single date when there's no departure.
export function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "Dates to be confirmed";
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return end && end !== start ? `${fmt(start)} - ${fmt(end)}` : fmt(start);
}

export function nightsBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const nights = Math.round(
    (new Date(end + "T00:00:00").getTime() - new Date(start + "T00:00:00").getTime()) / 86_400_000
  );
  return nights >= 0 ? nights : null;
}
