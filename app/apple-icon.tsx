import { brandIcon } from "@/lib/brand-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon on iOS, generated from lib/brand.ts.
export default function AppleIcon() {
  return brandIcon(180, { maskable: true });
}
