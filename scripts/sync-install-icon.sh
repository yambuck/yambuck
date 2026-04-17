#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ICON_SOURCE_PATH="${ROOT_DIR}/assets/branding/yambuck-icon-app.svg"
INSTALL_SCRIPT_PATH="${ROOT_DIR}/docs/install.sh"
START_MARKER="  # BEGIN GENERATED ICON SVG (from assets/branding/yambuck-icon-app.svg)"
END_MARKER="  # END GENERATED ICON SVG"

if [[ ! -f "${ICON_SOURCE_PATH}" ]]; then
  echo "[sync-install-icon] Missing icon source: ${ICON_SOURCE_PATH}" >&2
  exit 1
fi

if [[ ! -f "${INSTALL_SCRIPT_PATH}" ]]; then
  echo "[sync-install-icon] Missing install script: ${INSTALL_SCRIPT_PATH}" >&2
  exit 1
fi

tmp_output="$(mktemp)"
cleanup() {
  rm -f "$tmp_output"
}
trap cleanup EXIT

awk \
  -v start_marker="$START_MARKER" \
  -v end_marker="$END_MARKER" \
  -v icon_source_path="$ICON_SOURCE_PATH" \
  '
BEGIN {
  state = "outside"
  saw_start = 0
  saw_end = 0
}

{
  line = $0

  if (state == "outside") {
    if (line == start_marker) {
      saw_start = 1
      state = "inside"

      print line
      print "  cat <<'\''EOF'\''"

      while ((getline icon_line < icon_source_path) > 0) {
        print icon_line
      }
      close(icon_source_path)
      print "EOF"
      next
    }

    print line
    next
  }

  if (state == "inside") {
    if (line == end_marker) {
      saw_end = 1
      state = "outside"
      print line
      next
    }

    next
  }
}

END {
  if (!saw_start) {
    print "[sync-install-icon] Start marker not found" > "/dev/stderr"
    exit 1
  }

  if (!saw_end) {
    print "[sync-install-icon] End marker not found" > "/dev/stderr"
    exit 1
  }

  if (state != "outside") {
    print "[sync-install-icon] Invalid marker order" > "/dev/stderr"
    exit 1
  }
}
' "$INSTALL_SCRIPT_PATH" > "$tmp_output"

if cmp -s "$tmp_output" "$INSTALL_SCRIPT_PATH"; then
  echo "[sync-install-icon] Already up to date: ${INSTALL_SCRIPT_PATH}"
  exit 0
fi

mv "$tmp_output" "$INSTALL_SCRIPT_PATH"
echo "[sync-install-icon] Synced icon from ${ICON_SOURCE_PATH} to ${INSTALL_SCRIPT_PATH}"
