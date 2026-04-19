import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const stylesRoot = path.join(repoRoot, "src", "styles");
const baselinePath = path.join(repoRoot, "scripts", "style-color-literals-baseline.json");
const updateBaseline = process.argv.includes("--update-baseline");

const colorLiteralRegex = /(#[0-9a-fA-F]{3,8}\b|rgba?\([^\)]+\)|hsla?\([^\)]+\))/g;

const collectCssFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectCssFiles(fullPath);
    }
    if (entry.isFile() && entry.name.endsWith(".css")) {
      return [fullPath];
    }
    return [];
  }));
  return nested.flat();
};

const collectColorLiterals = async () => {
  const cssFiles = await collectCssFiles(stylesRoot);
  const snapshot = {};

  for (const filePath of cssFiles) {
    const relativePath = path.relative(repoRoot, filePath).replaceAll("\\", "/");
    const text = await readFile(filePath, "utf8");
    const matches = text.match(colorLiteralRegex) ?? [];
    const counts = {};
    for (const match of matches) {
      counts[match] = (counts[match] ?? 0) + 1;
    }
    snapshot[relativePath] = counts;
  }

  return snapshot;
};

const current = await collectColorLiterals();

if (updateBaseline) {
  await writeFile(baselinePath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  console.log(`Updated style color literal baseline at ${path.relative(repoRoot, baselinePath)}`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(await readFile(baselinePath, "utf8"));
} catch {
  console.error("Missing baseline. Run: node scripts/check-style-color-literals.mjs --update-baseline");
  process.exit(1);
}

const violations = [];
for (const [filePath, currentCounts] of Object.entries(current)) {
  const baselineCounts = baseline[filePath] ?? {};
  for (const [literal, count] of Object.entries(currentCounts)) {
    const allowedCount = baselineCounts[literal] ?? 0;
    if (count > allowedCount) {
      violations.push(`${filePath}: '${literal}' count ${count} exceeds baseline ${allowedCount}`);
    }
  }
}

if (violations.length > 0) {
  console.error("New raw color literals detected in CSS files:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  console.error("Use tokens or intentionally update baseline after review.");
  process.exit(1);
}

console.log("No new raw color literals detected (baseline-enforced).");
