// Renaming the product must be a one-line change in lib/brand.ts, and the
// app must not carry one camp's branding. This scans the source for the
// literal product name and "Mill Stream" outside the two places allowed to
// hold them: lib/brand.ts (the brand config) and lib/demo/ (sample data).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { DEFAULT_PRODUCT_NAME } from "../../lib/brand";

const ROOT = join(__dirname, "..", "..");
const SCANNED_DIRS = ["app", "components", "lib"];
const ALLOWED = [join("lib", "brand.ts"), join("lib", "demo") + sep];
const TEXT_FILE = /\.(tsx?|jsx?|mjs|cjs|css|json|md|html|svg|txt)$/;

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const FORBIDDEN: { label: string; pattern: RegExp }[] = [
  { label: `product name "${DEFAULT_PRODUCT_NAME}"`, pattern: new RegExp(escape(DEFAULT_PRODUCT_NAME), "i") },
  { label: '"Mill Stream"', pattern: /mill[\s_-]?stream/i },
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

function offenders(paths: string[]) {
  const found: string[] = [];
  for (const path of paths) {
    const rel = relative(ROOT, path);
    if (!TEXT_FILE.test(rel) || ALLOWED.some((a) => rel === a || rel.startsWith(a))) continue;
    readFileSync(path, "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const { label, pattern } of FORBIDDEN) {
          if (pattern.test(line)) found.push(`${rel}:${i + 1} contains ${label}`);
        }
      });
  }
  return found;
}

const sourceFiles = SCANNED_DIRS.flatMap((d) => files(join(ROOT, d)));

test("no file in app/, components/ or lib/ hard-codes the product name or Mill Stream", () => {
  assert.ok(sourceFiles.length > 50, "expected to scan the app's source files");
  assert.deepEqual(offenders(sourceFiles), []);
});

test("the scan does catch the name where it is allowed (so it isn't silently passing)", () => {
  const brandFile = join(ROOT, "lib", "brand.ts");
  assert.match(readFileSync(brandFile, "utf8"), FORBIDDEN[0].pattern);
  const demoSeed = join(ROOT, "lib", "demo", "seed.ts");
  assert.match(readFileSync(demoSeed, "utf8"), FORBIDDEN[1].pattern);
});
