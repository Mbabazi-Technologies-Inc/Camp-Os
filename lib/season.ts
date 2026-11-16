// Camps run summer camp in July and August; the rest of the year
// (September to June) the property is a retreat centre for groups.
export type Season = "summer" | "retreat";

export function seasonFor(date: Date = new Date()): Season {
  const month = date.getMonth();
  return month === 6 || month === 7 ? "summer" : "retreat";
}

export const SEASON_LABELS: Record<Season, string> = {
  summer: "Summer camp",
  retreat: "Retreat season",
};

/** Last day of the season `date` falls in: Aug 31 for summer, June 30 for retreats. */
export function seasonEndFor(date: Date = new Date()): string {
  const year = date.getFullYear();
  if (seasonFor(date) === "summer") return `${year}-08-31`;
  return date.getMonth() >= 8 ? `${year + 1}-06-30` : `${year}-06-30`;
}
