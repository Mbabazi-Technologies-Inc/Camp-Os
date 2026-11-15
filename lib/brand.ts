// The product's brand, in one place. Every product name, tagline and brand
// colour in the app comes from here, so renaming the product is one line:
// change DEFAULT_PRODUCT_NAME below (or set NEXT_PUBLIC_PRODUCT_NAME).
//
// This is the only file outside lib/demo/ allowed to contain the literal
// product name; tests/unit/brand.test.ts enforces that.

export const DEFAULT_PRODUCT_NAME = "CampFlow";

// Referenced statically so Next inlines it into the client bundle at build time.
const productName = process.env.NEXT_PUBLIC_PRODUCT_NAME?.trim() || DEFAULT_PRODUCT_NAME;

export const brand = {
  name: productName,
  tagline: "Less time on email, more time with campers.",
  // Placeholders until the final name and domain are chosen.
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@example.com",
  websiteUrl: process.env.NEXT_PUBLIC_WEBSITE_URL?.trim() || "https://example.com",
  /** Brand colours used by the generated app icon, favicon and manifest. */
  colors: {
    primary: "#14586b",
    gradientFrom: "#3c7146",
    gradientVia: "#1d6a70",
    gradientTo: "#14586b",
    background: "#f4f6f4",
    onPrimary: "#ffffff",
  },
} as const;

/** "<Page> · <Product name>", the title format for every page. */
export const TITLE_TEMPLATE = `%s · ${brand.name}`;

/** The letter shown in the logo mark and app icon. */
export function brandInitial(): string {
  return brand.name.trim().charAt(0).toUpperCase() || "?";
}
