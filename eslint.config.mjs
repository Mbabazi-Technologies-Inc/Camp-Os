import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-rename/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Expo shell has its own toolchain:
    "mobile/**",
    // macOS sidecar files written on exFAT/FAT drives:
    "**/._*",
  ]),
]);

export default eslintConfig;
