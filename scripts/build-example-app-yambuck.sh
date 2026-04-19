#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${ROOT_DIR}/apps/example-app"
TAURI_DIR="${APP_DIR}/src-tauri"
OUT_DIR="${ROOT_DIR}/release-artifacts/packages"
STAGE_DIR="${ROOT_DIR}/release-artifacts/.example-app-stage"
GENERATE_MEDIA_SCRIPT="${ROOT_DIR}/scripts/generate-example-media.sh"
PACKAGE_VERSION=""

resolve_arch() {
  local machine_arch
  machine_arch="$(uname -m)"
  case "$machine_arch" in
    x86_64|amd64) printf "x86_64" ;;
    aarch64|arm64) printf "aarch64" ;;
    *)
      printf "Unsupported architecture: %s\n" "$machine_arch" >&2
      exit 1
      ;;
  esac
}

log() {
  printf "[example-app] %s\n" "$*"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf "Missing required command: %s\n" "$1" >&2
    exit 1
  }
}

read_version_from_package_json() {
  local package_json_path="$1"
  sed -nE 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$package_json_path" | head -n1
}

if [[ ! -d "$APP_DIR" ]]; then
  printf "Example app not found at %s\n" "$APP_DIR" >&2
  exit 1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      [[ $# -ge 2 ]] || {
        printf "--version requires a value\n" >&2
        exit 1
      }
      PACKAGE_VERSION="$2"
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Build example-app .yambuck package

Usage:
  build-example-app-yambuck.sh [--version <semver>]

Options:
  --version <semver>  Override manifest version (default: apps/example-app/package.json)
  -h, --help          Show this help message
EOF
      exit 0
      ;;
    *)
      printf "Unknown option: %s\n" "$1" >&2
      exit 1
      ;;
  esac
  shift
done

if [[ -z "$PACKAGE_VERSION" ]]; then
  PACKAGE_VERSION="$(read_version_from_package_json "${APP_DIR}/package.json")"
fi

if [[ -z "$PACKAGE_VERSION" ]]; then
  printf "Could not resolve example app version\n" >&2
  exit 1
fi

need_cmd npm
need_cmd cargo
need_cmd zip
need_cmd bash

ARCH="$(resolve_arch)"
PACKAGE_PATH="${OUT_DIR}/example-app-linux-${ARCH}.yambuck"

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

if [[ ! -x "$GENERATE_MEDIA_SCRIPT" ]]; then
  printf "Expected executable media generator script at %s\n" "$GENERATE_MEDIA_SCRIPT" >&2
  exit 1
fi

log "Generating raster icon/screenshots from SVG source assets"
bash "$GENERATE_MEDIA_SCRIPT" --output-dir "$STAGE_DIR/assets" --screenshot-width 1024 --screenshot-height 640 --icon-size 256

cp "${APP_DIR}/assets/licenses/LICENSE.txt" "$STAGE_DIR/assets/licenses/LICENSE.txt"

cat > "${STAGE_DIR}/manifest.json" <<EOF
{
  "manifestVersion": "1.0.0",
  "packageUuid": "53fd0f34-8a39-4639-ac39-c67cc87b6a8d",
  "appId": "com.yambuck.example.app",
  "appUuid": "61144f08-8dd6-4bb2-9745-e8d2d8a3eefa",
  "displayName": "Yambuck Example App",
  "description": "Minimal hello-world desktop app for Yambuck install and bundling tests.",
  "longDescription": "This package exists for deterministic Yambuck smoke tests. It ships a real Tauri v2 binary with a tiny GUI and includes packaged PNG icon/screenshot assets that satisfy current manifest media validation rules.",
  "version": "${PACKAGE_VERSION}",
  "publisher": "Yambuck Project",
  "entrypoint": "app/bin/example-app",
  "iconPath": "assets/icon.png",
  "screenshots": [
    "assets/screenshots/screenshot-a.png",
    "assets/screenshots/screenshot-b.png",
    "assets/screenshots/screenshot-c.png",
    "assets/screenshots/screenshot-d.png",
    "assets/screenshots/screenshot-e.png",
    "assets/screenshots/screenshot-f.png"
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
