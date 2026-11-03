#!/usr/bin/env node

// Packages the containerized Linux build outputs into release-artifacts/
// under their standard release names (from release-assets.mjs). The release
// workflow uploads the folder's whole contents.
//
//   node scripts/package-release.mjs
//
// The tarball keeps the layout every Yambuck installer and updater expects:
// a single executable at bin/yambuck. docs/install.sh and the pre-standard
// in-app updater (v0.3.6 and earlier, which swaps the binary itself) both
// look for bin/yambuck, so do not change it.

import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_NAMES, VERSION, assertPlainVersion } from "./release-assets.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = resolve(ROOT, "apps", "yambuck-gui", "src-tauri", "target", "linux-release");
const OUT_DIR = resolve(ROOT, "release-artifacts");
const STAGE_DIR = resolve(OUT_DIR, ".stage");

function fail(message) {
  console.error(`\nRelease packaging failed: ${message}`);
  process.exit(1);
}

// Linux releases come only from the containerized build (npm run
// release:linux), which records the binary's own `yambuck --version` output
// next to it. Refuse to package a binary whose version differs from the
// configured release version, so a stale build is never mislabeled.
function checkBuiltVersion() {
  const versionFile = resolve(BUILD_DIR, "version.txt");
  if (!existsSync(versionFile)) {
    fail(`${versionFile} is missing. Run 'npm run release:linux' first.`);
  }
  const reported = readFileSync(versionFile, "utf8").trim();
  if (reported !== `yambuck ${VERSION}`) {
    fail(`the built binary reports '${reported}', expected 'yambuck ${VERSION}'. Re-run 'npm run release:linux'.`);
  }
  console.log(`  Built binary reports: ${reported}`);
}

// No checksum files are produced: GitHub computes a SHA-256 digest for every
// uploaded release asset, and the installers verify against that digest.
function packageTarball() {
  const binary = resolve(BUILD_DIR, "yambuck");
  if (!existsSync(binary)) fail(`${binary} is missing. Run 'npm run release:linux' first.`);

  mkdirSync(resolve(STAGE_DIR, "bin"), { recursive: true });
  const staged = resolve(STAGE_DIR, "bin", "yambuck");
  copyFileSync(binary, staged);
  chmodSync(staged, 0o755);

  const target = resolve(OUT_DIR, ASSET_NAMES.linuxTarball);
  execFileSync("tar", ["--owner=0", "--group=0", "-C", STAGE_DIR, "-czf", target, "bin/yambuck"], {
    stdio: "inherit",
  });
  rmSync(STAGE_DIR, { recursive: true, force: true });
  console.log(`  ${basename(binary)}  →  ${ASSET_NAMES.linuxTarball} (bin/yambuck)`);
}

function packageExample() {
  const source = resolve(BUILD_DIR, ASSET_NAMES.examplePackage);
  if (!existsSync(source)) fail(`${source} is missing. Run 'npm run release:linux' first.`);
  copyFileSync(source, resolve(OUT_DIR, ASSET_NAMES.examplePackage));
  console.log(`  ${basename(source)}  →  ${ASSET_NAMES.examplePackage}`);
}

function main() {
  assertPlainVersion();
  if (process.platform !== "linux") {
    fail("Yambuck ships Linux only; package on Linux after 'npm run release:linux'.");
  }

  // Start from an empty folder so its whole contents can be uploaded as-is.
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Yambuck v${VERSION} release packaging`);
  console.log(`Output: ${OUT_DIR}\n`);

  checkBuiltVersion();
  packageTarball();
  packageExample();

  console.log(`\nDone. 2 artifact(s) packaged in ${OUT_DIR}`);
}

main();
