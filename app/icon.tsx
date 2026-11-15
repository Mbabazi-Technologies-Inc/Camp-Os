import { brandIcon } from "@/lib/brand-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon, generated from lib/brand.ts.
export default function Icon() {
  return brandIcon(32);
}
