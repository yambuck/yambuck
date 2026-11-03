#!/usr/bin/env node

// File size budget (App Standard section 8): source files should stay under
// 600 lines and must stay under 1000. Files over the soft limit are listed;
// files over the hard limit fail the check unless they are on the allowlist
// below while they are being split.
//
//   npm run check:structure

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOFT_MAX_LINES = 600;
const HARD_MAX_LINES = 1000;
const TARGET_DIRS = [
  "apps/yambuck-gui/src",
  "apps/yambuck-gui/src-tauri/src",
  "apps/yambuck-gui/scripts",
  "apps/example-app/src",
  "apps/example-app/src-tauri/src",
  "crates/yambuck-core/src",
  "crates/yambuck-core/tests",
  "scripts",
];
const SOURCE_EXTENSIONS = new Set([".rs", ".ts", ".tsx", ".css", ".mjs", ".js", ".sh"]);

// Over the hard limit while being split; each one has a docs/TODO.md item.
// Remove an entry as soon as its file is back under the limit.
const ALLOWLIST = new Map([
  // The package builder page renders every builder step in one component.
  ["apps/yambuck-gui/src/features/package-builder/PackageBuilderPage.tsx", "split builder steps into components"],
  // The UI Lab's mock of the same page mirrors its structure.
  ["apps/yambuck-gui/src/features/mock-preview/MockPackageBuilderPage.tsx", "split alongside PackageBuilderPage"],
]);

const gatherFiles = async (directoryPath) => {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await gatherFiles(fullPath)));
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
};

const lineCount = async (filePath) => {
  const content = await readFile(filePath, "utf8");
  if (content.length === 0) {
    return 0;
  }
  return content.replace(/\n$/, "").split(/\r?\n/).length;
};

const counts = [];
for (const directory of TARGET_DIRS) {
  for (const filePath of await gatherFiles(path.join(ROOT, directory))) {
    counts.push({ relativePath: path.relative(ROOT, filePath), count: await lineCount(filePath) });
  }
}
counts.sort((a, b) => b.count - a.count);

const overHard = counts.filter(({ count }) => count > HARD_MAX_LINES);
const failures = overHard.filter(({ relativePath }) => !ALLOWLIST.has(relativePath));
const staleAllowlist = [...ALLOWLIST.keys()].filter(
  (allowed) => !overHard.some(({ relativePath }) => relativePath === allowed),
);
const overSoft = counts.filter(({ count }) => count > SOFT_MAX_LINES && count <= HARD_MAX_LINES);

if (overSoft.length > 0) {
  console.log(`Over the ${SOFT_MAX_LINES}-line soft limit (split when next touched):`);
  for (const { relativePath, count } of overSoft) {
    console.log(`  ${relativePath}: ${count}`);
  }
}
for (const { relativePath, count } of overHard.filter(({ relativePath }) => ALLOWLIST.has(relativePath))) {
  console.log(`Allowlisted over ${HARD_MAX_LINES} lines: ${relativePath}: ${count} (${ALLOWLIST.get(relativePath)})`);
}

if (failures.length > 0 || staleAllowlist.length > 0) {
  for (const { relativePath, count } of failures) {
    console.error(`Over the ${HARD_MAX_LINES}-line hard limit: ${relativePath}: ${count}`);
  }
  for (const relativePath of staleAllowlist) {
    console.error(`Allowlisted but no longer over the hard limit (remove it): ${relativePath}`);
  }
  process.exit(1);
}

console.log(`File size check passed (${HARD_MAX_LINES}-line hard limit).`);
