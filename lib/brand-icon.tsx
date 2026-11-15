import { ImageResponse } from "next/og";
import { brand, brandInitial } from "./brand";

// The app icon: the product's initial on the brand gradient. Generated at
// build time from lib/brand.ts, so a rename or new colours update every icon.
// `maskable` leaves the safe-zone padding Android expects and fills the corners.
export function brandIcon(size: number, { maskable = false } = {}) {
  const { colors } = brand;
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const fontSize = Math.round(size * (maskable ? 0.42 : 0.58));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius,
          background: `linear-gradient(135deg, ${colors.gradientFrom} 0%, ${colors.gradientVia} 55%, ${colors.gradientTo} 100%)`,
          color: colors.onPrimary,
          fontSize,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {brandInitial()}
      </div>
    ),
    { width: size, height: size }
  );
}
