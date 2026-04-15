#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

ARCH="$(resolve_arch)"
PACKAGE_PATH="${ROOT_DIR}/release-artifacts/packages/example-app-linux-${ARCH}.yambuck"

"${ROOT_DIR}/scripts/build-example-app-yambuck.sh"

if [[ "${1:-}" == "--installed" ]]; then
  if ! command -v yambuck >/dev/null 2>&1; then
    printf "Installed yambuck binary not found in PATH.\n" >&2
    exit 1
  fi

  printf "[smoke] Opening package with installed yambuck binary\n"
  yambuck "$PACKAGE_PATH"
  exit 0
fi

printf "[smoke] Opening package in local yambuck-gui dev runtime\n"
npm --prefix "${ROOT_DIR}/apps/yambuck-gui" run tauri dev -- "$PACKAGE_PATH"
