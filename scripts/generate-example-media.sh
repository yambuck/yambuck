#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${ROOT_DIR}/apps/example-app/src/assets/debug"
OUTPUT_DIR=""
SCREENSHOT_WIDTH="1024"
SCREENSHOT_HEIGHT="640"
ICON_SIZE="256"

usage() {
  cat <<'EOF'
Generate raster media assets for the example app package.

Usage:
  generate-example-media.sh --output-dir <path> [options]

Options:
  --output-dir <path>       Target assets directory (required)
  --screenshot-width <px>   Screenshot width (default: 1024)
  --screenshot-height <px>  Screenshot height (default: 640)
  --icon-size <px>          Square icon size (default: 256)
  -h, --help                Show this help message
EOF
}

log() {
  printf "[example-media] %s\n" "$*"
}

fail() {
  printf "[example-media] ERROR: %s\n" "$*" >&2
  exit 1
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      [[ $# -ge 2 ]] || fail "--output-dir requires a value"
      OUTPUT_DIR="$2"
      shift
      ;;
    --screenshot-width)
      [[ $# -ge 2 ]] || fail "--screenshot-width requires a value"
      SCREENSHOT_WIDTH="$2"
      shift
      ;;
    --screenshot-height)
      [[ $# -ge 2 ]] || fail "--screenshot-height requires a value"
      SCREENSHOT_HEIGHT="$2"
      shift
      ;;
    --icon-size)
      [[ $# -ge 2 ]] || fail "--icon-size requires a value"
      ICON_SIZE="$2"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "unknown option: $1"
      ;;
  esac
  shift
done

[[ -n "$OUTPUT_DIR" ]] || fail "--output-dir is required"
[[ -d "$SOURCE_DIR" ]] || fail "source assets not found: ${SOURCE_DIR}"

RENDER_BACKEND=""
if has_cmd rsvg-convert; then
  RENDER_BACKEND="rsvg-convert"
elif has_cmd inkscape; then
  RENDER_BACKEND="inkscape"
elif has_cmd magick; then
  RENDER_BACKEND="magick"
else
  fail "no SVG rasterizer found. Install one of: rsvg-convert, inkscape, or ImageMagick (magick)."
fi

render_svg() {
  local source_file="$1"
  local output_file="$2"
  local width="$3"
  local height="$4"

  case "$RENDER_BACKEND" in
    rsvg-convert)
      rsvg-convert --width "$width" --height "$height" "$source_file" --output "$output_file"
      ;;
    inkscape)
      inkscape "$source_file" --export-type=png --export-filename="$output_file" --export-width="$width" --export-height="$height" >/dev/null 2>&1
      ;;
    magick)
      magick -background none "$source_file" -resize "${width}x${height}!" "$output_file"
      ;;
  esac
}

log "Using renderer: ${RENDER_BACKEND}"

mkdir -p "${OUTPUT_DIR}/screenshots"

render_svg "${SOURCE_DIR}/mock-icon.svg" "${OUTPUT_DIR}/icon.png" "$ICON_SIZE" "$ICON_SIZE"

for suffix in a b c d e f; do
  render_svg \
    "${SOURCE_DIR}/mock-shot-${suffix}.svg" \
    "${OUTPUT_DIR}/screenshots/screenshot-${suffix}.png" \
    "$SCREENSHOT_WIDTH" \
    "$SCREENSHOT_HEIGHT"
done

log "Generated icon and 6 screenshots in ${OUTPUT_DIR}"
