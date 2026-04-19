import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const stylesRoot = path.join(repoRoot, "src");
const maxLines = 1000;
const softLines = 800;

const collectCssFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectCssFiles(fullPath);
    }
    if (entry.isFile() && entry.name.endsWith(".css")) {
      return [fullPath];
    }
    return [];
  }));
  return files.flat();
};

const cssFiles = await collectCssFiles(stylesRoot);
const violations = [];
const warnings = [];

for (const file of cssFiles) {
  const text = await readFile(file, "utf8");
  const lines = text.split(/\r?\n/).length;
  const relative = path.relative(repoRoot, file);

  if (lines > maxLines) {
    violations.push(`${relative}: ${lines} lines (max ${maxLines})`);
    continue;
  }

  if (lines > softLines) {
    warnings.push(`${relative}: ${lines} lines (soft target ${softLines})`);
  }
}

if (warnings.length > 0) {
  console.warn("Style size warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (violations.length > 0) {
  console.error("Style size violations:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Checked ${cssFiles.length} CSS files. No style size violations.`);
