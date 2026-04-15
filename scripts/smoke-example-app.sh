#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_PATH="${ROOT_DIR}/release-artifacts/packages/example-app.yambuck"

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
