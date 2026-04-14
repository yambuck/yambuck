#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VOQUILL_DIR="${ROOT_DIR}/reference-systems/voquill"
OUT_DIR="${ROOT_DIR}/release-artifacts/packages"
STAGE_DIR="${ROOT_DIR}/release-artifacts/.voquill-stage"
PACKAGE_PATH="${OUT_DIR}/voquill.yambuck"

if [[ ! -d "$VOQUILL_DIR" ]]; then
  echo "Voquill reference project not found at ${VOQUILL_DIR}" >&2
  exit 1
fi

rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/app/bin"
mkdir -p "$STAGE_DIR/assets/screenshots"
mkdir -p "$OUT_DIR"

cp "${VOQUILL_DIR}/src-tauri/icons/128x128.png" "${STAGE_DIR}/assets/icon.png"
cp "${VOQUILL_DIR}/docs/screenshots/screenshot-status.png" "${STAGE_DIR}/assets/screenshots/screenshot-status.png"
cp "${VOQUILL_DIR}/docs/screenshots/screenshot-history.png" "${STAGE_DIR}/assets/screenshots/screenshot-history.png"
cp "${VOQUILL_DIR}/docs/screenshots/screenshot-config1.png" "${STAGE_DIR}/assets/screenshots/screenshot-config1.png"

cat > "${STAGE_DIR}/manifest.json" <<'EOF'
{
  "manifestVersion": "1.0.0",
  "packageUuid": "7f2f2d3e-2662-4d8c-a4ae-05f14de8f8c6",
  "appId": "com.voquill.app",
  "appUuid": "6b61815c-66c5-4cc6-85ba-ec0736ecef4c",
  "displayName": "Voquill",
  "description": "Voice-first dictation app with fast keyboard-driven workflows.",
  "version": "1.3.1",
  "publisher": "Voquill Project",
  "entrypoint": "app/bin/voquill",
  "iconPath": "assets/icon.png",
  "screenshots": [
    "assets/screenshots/screenshot-status.png",
    "assets/screenshots/screenshot-history.png",
    "assets/screenshots/screenshot-config1.png"
  ],
  "homepageUrl": "https://voquill.org",
  "supportUrl": "https://github.com/voquill/voquill",
  "license": "MIT",
  "trustStatus": "unverified"
}
EOF

cat > "${STAGE_DIR}/app/bin/voquill" <<'EOF'
#!/usr/bin/env bash
echo "Voquill payload placeholder for Yambuck package integration testing."
echo "Replace app/bin/voquill with a real bundled Voquill binary for production packaging."
EOF
chmod +x "${STAGE_DIR}/app/bin/voquill"

rm -f "$PACKAGE_PATH"
(
  cd "$STAGE_DIR"
  zip -rq "$PACKAGE_PATH" manifest.json app assets
)

echo "Created ${PACKAGE_PATH}"
