import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build in demo mode: no Supabase,
// OpenAI or Google keys, so the app uses its in-memory sample data and the
// offline draft writer. DEMO_ENV blanks those keys on purpose.
const PORT = 3100;
const RENAME_PORT = 3101;
// Must match tests/e2e/rename.spec.ts.
const RENAMED_PRODUCT = "TestName";

const DEMO_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  OPENAI_API_KEY: "",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
  STRIPE_PRICE_ID: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /rename\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        // Set PW_CHANNEL=chrome to use an installed Google Chrome instead of
        // Playwright's bundled Chromium.
        ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
      },
    },
    {
      name: "mobile",
      testIgnore: /rename\.spec\.ts/,
      use: { ...devices["Pixel 7"], ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) },
    },
    // A second build with NEXT_PUBLIC_PRODUCT_NAME set proves the product
    // rename is one setting (see lib/brand.ts).
    {
      name: "rename",
      testMatch: /rename\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://127.0.0.1:${RENAME_PORT}`,
        ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
      },
    },
  ],
  webServer: [
    {
      command: `npx next start -p ${PORT}`,
      url: `http://127.0.0.1:${PORT}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: DEMO_ENV,
    },
    // Always rebuilt, never reused, so the rename check can't pass against an
    // old build. Building into .next-rename also points the gitignored
    // next-env.d.ts at that folder until the next `npm run build`; harmless.
    {
      command: `npx next build && npx next start -p ${RENAME_PORT}`,
      url: `http://127.0.0.1:${RENAME_PORT}/login`,
      reuseExistingServer: false,
      timeout: 300_000,
      env: {
        ...DEMO_ENV,
        NEXT_PUBLIC_PRODUCT_NAME: RENAMED_PRODUCT,
        NEXT_DIST_DIR: ".next-rename",
      },
    },
  ],
});
