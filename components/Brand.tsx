import { CampBadge } from "@/components/site/CampBadge";

// The Mill Stream brand mark: the round camp-patch badge from the public site.
export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14" : size === "md" ? "h-11 w-11" : "h-9 w-9";
  return <CampBadge className={`${box} shrink-0 drop-shadow-sm`} />;
}
