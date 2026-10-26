// Mill Stream runs summer camp in July and August; the rest of the year
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
