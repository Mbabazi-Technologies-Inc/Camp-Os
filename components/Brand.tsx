import { brandInitial } from "@/lib/brand";

// The product's logo mark: its initial on the brand gradient, matching the
// generated app icon (lib/brand-icon.tsx). Both follow lib/brand.ts.
export function BrandMark({
  size = "md",
  tone = "gradient",
}: {
  size?: "sm" | "md" | "lg";
  tone?: "gradient" | "glass";
}) {
  const box =
    size === "lg" ? "h-12 w-12 rounded-2xl text-2xl" : size === "md" ? "h-9 w-9 rounded-xl text-lg" : "h-8 w-8 rounded-lg text-base";
  const bg = tone === "glass" ? "bg-white/15 backdrop-blur" : "bg-stream shadow-sm";
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center ${box} ${bg} text-white font-bold tracking-tight leading-none`}
    >
      {brandInitial()}
    </div>
  );
}
