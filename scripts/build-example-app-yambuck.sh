#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${ROOT_DIR}/apps/example-app"
TAURI_DIR="${APP_DIR}/src-tauri"
OUT_DIR="${ROOT_DIR}/release-artifacts/packages"
STAGE_DIR="${ROOT_DIR}/release-artifacts/.example-app-stage"
PACKAGE_PATH="${OUT_DIR}/example-app.yambuck"

log() {
  printf "[example-app] %s\n" "$*"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf "Missing required command: %s\n" "$1" >&2
    exit 1
  }
}

if [[ ! -d "$APP_DIR" ]]; then
  printf "Example app not found at %s\n" "$APP_DIR" >&2
  exit 1
fi

need_cmd npm
need_cmd cargo
need_cmd zip

log "Installing frontend dependencies"
npm --prefix "$APP_DIR" ci

log "Building frontend"
npm --prefix "$APP_DIR" run build

log "Building release binary"
cargo build --release --features custom-protocol --manifest-path "${TAURI_DIR}/Cargo.toml"

BIN_SOURCE="${TAURI_DIR}/target/release/example-app"
if [[ ! -x "$BIN_SOURCE" ]]; then
  printf "Could not find release binary at %s\n" "$BIN_SOURCE" >&2
  exit 1
fi

rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/app/bin"
mkdir -p "$STAGE_DIR/assets/screenshots"
mkdir -p "$STAGE_DIR/assets/licenses"
mkdir -p "$OUT_DIR"

cp "$BIN_SOURCE" "$STAGE_DIR/app/bin/example-app"
chmod +x "$STAGE_DIR/app/bin/example-app"

cp "${APP_DIR}/src/assets/debug/mock-icon.svg" "$STAGE_DIR/assets/icon.svg"
cp "${APP_DIR}/src/assets/debug/mock-shot-a.svg" "$STAGE_DIR/assets/screenshots/screenshot-a.svg"
cp "${APP_DIR}/src/assets/debug/mock-shot-b.svg" "$STAGE_DIR/assets/screenshots/screenshot-b.svg"
cp "${APP_DIR}/src/assets/debug/mock-shot-c.svg" "$STAGE_DIR/assets/screenshots/screenshot-c.svg"
cp "${APP_DIR}/src/assets/debug/mock-shot-d.svg" "$STAGE_DIR/assets/screenshots/screenshot-d.svg"
cp "${APP_DIR}/src/assets/debug/mock-shot-e.svg" "$STAGE_DIR/assets/screenshots/screenshot-e.svg"
cp "${APP_DIR}/src/assets/debug/mock-shot-f.svg" "$STAGE_DIR/assets/screenshots/screenshot-f.svg"
cp "${APP_DIR}/assets/licenses/LICENSE.txt" "$STAGE_DIR/assets/licenses/LICENSE.txt"

cat > "${STAGE_DIR}/manifest.json" <<'EOF'
{
  "manifestVersion": "1.0.0",
  "packageUuid": "53fd0f34-8a39-4639-ac39-c67cc87b6a8d",
  "appId": "com.yambuck.example.app",
  "appUuid": "61144f08-8dd6-4bb2-9745-e8d2d8a3eefa",
  "displayName": "Yambuck Example App",
  "description": "Minimal hello-world desktop app for Yambuck install and bundling tests.",
  "longDescription": "This package exists for deterministic Yambuck smoke tests. It ships a real Tauri v2 binary with a tiny GUI and includes the same mock preview icon/screenshots used by Yambuck's debug page.",
  "version": "0.1.0",
  "publisher": "Yambuck Project",
  "entrypoint": "app/bin/example-app",
  "iconPath": "assets/icon.svg",
  "screenshots": [
    "assets/screenshots/screenshot-a.svg",
    "assets/screenshots/screenshot-b.svg",
    "assets/screenshots/screenshot-c.svg",
    "assets/screenshots/screenshot-d.svg",
    "assets/screenshots/screenshot-e.svg",
    "assets/screenshots/screenshot-f.svg"
  ],
  "homepageUrl": "https://yambuck.com",
  "supportUrl": "https://github.com/yambuck/yambuck",
  "license": "MIT",
  "licenseFile": "assets/licenses/LICENSE.txt",
  "requiresLicenseAcceptance": true,
  "trustStatus": "unverified"
}
EOF

rm -f "$PACKAGE_PATH"
(
  cd "$STAGE_DIR"
  zip -rq "$PACKAGE_PATH" manifest.json app assets
)

log "Created ${PACKAGE_PATH}"
