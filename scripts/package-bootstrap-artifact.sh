#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GUI_DIR="${ROOT_DIR}/apps/yambuck-gui"
TAURI_DIR="${GUI_DIR}/src-tauri"
OUT_DIR="${ROOT_DIR}/release-artifacts"

log() {
  printf "[release] %s\n" "$*"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf "Missing required command: %s\n" "$1" >&2
    exit 1
  }
}

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

need_cmd npm
need_cmd cargo
need_cmd tar
need_cmd sha256sum

ARCH="$(resolve_arch)"
ARTIFACT_NAME="yambuck-linux-${ARCH}.tar.gz"
CHECKSUM_NAME="${ARTIFACT_NAME}.sha256"

log "Installing frontend dependencies"
npm --prefix "$GUI_DIR" ci

log "Building frontend"
npm --prefix "$GUI_DIR" run build

log "Building Tauri binary (custom protocol enabled)"
cargo build --release --features custom-protocol --manifest-path "${TAURI_DIR}/Cargo.toml"

BIN_SOURCE="${TAURI_DIR}/target/release/yambuck-gui"
if [[ ! -x "$BIN_SOURCE" ]]; then
  BIN_SOURCE="${TAURI_DIR}/target/release/yambuck"
fi

if [[ ! -x "$BIN_SOURCE" ]]; then
  printf "Could not find release binary at expected path.\n" >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "${OUT_DIR}/stage/bin"

log "Packaging binary as yambuck"
cp "$BIN_SOURCE" "${OUT_DIR}/stage/bin/yambuck"

log "Creating tarball ${ARTIFACT_NAME}"
tar -C "${OUT_DIR}/stage" -czf "${OUT_DIR}/${ARTIFACT_NAME}" bin/yambuck

log "Generating checksum ${CHECKSUM_NAME}"
sha256sum "${OUT_DIR}/${ARTIFACT_NAME}" | awk '{print $1}' > "${OUT_DIR}/${CHECKSUM_NAME}"

log "Artifacts ready:"
log "- ${OUT_DIR}/${ARTIFACT_NAME}"
log "- ${OUT_DIR}/${CHECKSUM_NAME}"
