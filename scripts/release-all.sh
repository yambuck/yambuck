#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Paths and constants
# -----------------------------------------------------------------------------

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MAIN_PACKAGE_JSON="${ROOT_DIR}/apps/yambuck-gui/package.json"
MAIN_CARGO_TOML="${ROOT_DIR}/apps/yambuck-gui/src-tauri/Cargo.toml"
MAIN_CARGO_LOCK="${ROOT_DIR}/apps/yambuck-gui/src-tauri/Cargo.lock"
MAIN_TAURI_CONF="${ROOT_DIR}/apps/yambuck-gui/src-tauri/tauri.conf.json"

EXAMPLE_PACKAGE_JSON="${ROOT_DIR}/apps/example-app/package.json"
EXAMPLE_CARGO_TOML="${ROOT_DIR}/apps/example-app/src-tauri/Cargo.toml"
EXAMPLE_CARGO_LOCK="${ROOT_DIR}/apps/example-app/src-tauri/Cargo.lock"
EXAMPLE_TAURI_CONF="${ROOT_DIR}/apps/example-app/src-tauri/tauri.conf.json"

STABLE_FEED_JSON="${ROOT_DIR}/docs/updates/stable.json"

MAIN_ARTIFACT_DIR="${ROOT_DIR}/release-artifacts"
EXAMPLE_ARTIFACT_DIR="${ROOT_DIR}/release-artifacts/packages"

VERSION=""
EXAMPLE_VERSION=""
PUBLISH=false
YES=false
DRY_RUN=false

# -----------------------------------------------------------------------------
# Utility functions
# -----------------------------------------------------------------------------

usage() {
  cat <<'EOF'
Yambuck release orchestrator

Runs the full release pipeline in clear phases:
1) sync installer icon from branding source
2) bump version metadata files
3) build main + example release artifacts
4) update stable feed metadata/checksum
5) optionally commit/tag/push/create GitHub release

Usage:
  release-all.sh --version <x.y.z> [options]

Options:
  --version <x.y.z>         Target Yambuck release version (required)
  --example-version <x.y.z> Optional example-app version bump
  --publish                 Run git + GitHub release publishing phase
  --yes                     Skip publish confirmation prompt
  --dry-run                 Print planned actions without mutating files
  -h, --help                Show this help message

Examples:
  ./scripts/release-all.sh --version 0.1.23
  ./scripts/release-all.sh --version 0.1.23 --publish
  ./scripts/release-all.sh --version 0.1.23 --example-version 0.1.23 --publish --yes
EOF
}

log() {
  printf "[release-all] %s\n" "$*"
}

fail() {
  printf "[release-all] ERROR: %s\n" "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

validate_semver() {
  local candidate="$1"
  [[ "$candidate" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

resolve_arch() {
  local machine_arch
  machine_arch="$(uname -m)"
  case "$machine_arch" in
    x86_64|amd64) printf "x86_64" ;;
    aarch64|arm64) printf "aarch64" ;;
    *) fail "unsupported architecture: $machine_arch" ;;
  esac
}

utc_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

run_cmd() {
  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] $*"
    return
  fi

  "$@"
}

replace_first_match() {
  local file_path="$1"
  local match_regex="$2"
  local replacement="$3"
  local safe_replacement

  safe_replacement="${replacement//&/\\&}"

  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] update first match in ${file_path}: ${replacement}"
    return
  fi

  sed -E -i "0,/${match_regex}/s~${match_regex}~${safe_replacement}~" "$file_path"
}

# -----------------------------------------------------------------------------
# Argument parsing
# -----------------------------------------------------------------------------

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      [[ $# -ge 2 ]] || fail "--version requires a value"
      VERSION="$2"
      shift
      ;;
    --example-version)
      [[ $# -ge 2 ]] || fail "--example-version requires a value"
      EXAMPLE_VERSION="$2"
      shift
      ;;
    --publish)
      PUBLISH=true
      ;;
    --yes)
      YES=true
      ;;
    --dry-run)
      DRY_RUN=true
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

[[ -n "$VERSION" ]] || fail "--version is required"
validate_semver "$VERSION" || fail "invalid version '$VERSION' (expected x.y.z)"

if [[ -n "$EXAMPLE_VERSION" ]]; then
  validate_semver "$EXAMPLE_VERSION" || fail "invalid example version '$EXAMPLE_VERSION' (expected x.y.z)"
fi

# -----------------------------------------------------------------------------
# Preconditions
# -----------------------------------------------------------------------------

need_cmd sed
need_cmd awk
need_cmd git
need_cmd npm
need_cmd cargo
need_cmd zip
need_cmd sha256sum

if [[ "$PUBLISH" == true ]]; then
  need_cmd gh
fi

ARCH="$(resolve_arch)"
TAG="v${VERSION}"
PUBLISHED_AT="$(utc_now)"

MAIN_TARBALL_PATH="${MAIN_ARTIFACT_DIR}/yambuck-linux-${ARCH}.tar.gz"
MAIN_SHA_PATH="${MAIN_ARTIFACT_DIR}/yambuck-linux-${ARCH}.tar.gz.sha256"
EXAMPLE_PACKAGE_PATH="${EXAMPLE_ARTIFACT_DIR}/example-app-linux-${ARCH}.yambuck"

log "Starting release pipeline for ${TAG}"

# -----------------------------------------------------------------------------
# Phase 1: Sync installer icon block
# -----------------------------------------------------------------------------

log "Phase 1/5: Sync installer icon from canonical branding source"
run_cmd "${ROOT_DIR}/scripts/sync-install-icon.sh"

# -----------------------------------------------------------------------------
# Phase 2: Bump version metadata files
# -----------------------------------------------------------------------------

log "Phase 2/5: Bump main app versions to ${VERSION}"

replace_first_match "$MAIN_PACKAGE_JSON" '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "\"version\": \"${VERSION}\""
replace_first_match "$MAIN_TAURI_CONF" '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "\"version\": \"${VERSION}\""
replace_first_match "$MAIN_CARGO_TOML" '^version = "[^"]+"' "version = \"${VERSION}\""

if [[ -n "$EXAMPLE_VERSION" ]]; then
  log "Bumping example app versions to ${EXAMPLE_VERSION}"
  replace_first_match "$EXAMPLE_PACKAGE_JSON" '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "\"version\": \"${EXAMPLE_VERSION}\""
  replace_first_match "$EXAMPLE_TAURI_CONF" '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "\"version\": \"${EXAMPLE_VERSION}\""
  replace_first_match "$EXAMPLE_CARGO_TOML" '^version = "[^"]+"' "version = \"${EXAMPLE_VERSION}\""
fi

# -----------------------------------------------------------------------------
# Phase 3: Build release artifacts
# -----------------------------------------------------------------------------

log "Phase 3/5: Build main release artifact"
run_cmd "${ROOT_DIR}/scripts/package-bootstrap-artifact.sh"

log "Build example app package"
if [[ -n "$EXAMPLE_VERSION" ]]; then
  run_cmd "${ROOT_DIR}/scripts/build-example-app-yambuck.sh" --version "$EXAMPLE_VERSION"
else
  run_cmd "${ROOT_DIR}/scripts/build-example-app-yambuck.sh"
fi

# -----------------------------------------------------------------------------
# Phase 4: Update stable feed metadata
# -----------------------------------------------------------------------------

log "Phase 4/5: Update stable update feed"

if [[ "$DRY_RUN" == false ]]; then
  [[ -f "$MAIN_SHA_PATH" ]] || fail "missing checksum file: ${MAIN_SHA_PATH}"
fi

MAIN_SHA256="<dry-run-sha256>"
if [[ "$DRY_RUN" == false ]]; then
  MAIN_SHA256="$(awk 'NR==1{print $1}' "$MAIN_SHA_PATH")"
  [[ -n "$MAIN_SHA256" ]] || fail "could not read checksum from ${MAIN_SHA_PATH}"
fi

replace_first_match "$STABLE_FEED_JSON" '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "\"version\": \"${VERSION}\""
replace_first_match "$STABLE_FEED_JSON" '"publishedAt"[[:space:]]*:[[:space:]]*"[^"]+"' "\"publishedAt\": \"${PUBLISHED_AT}\""
replace_first_match "$STABLE_FEED_JSON" '"notesUrl"[[:space:]]*:[[:space:]]*"[^"]+"' "\"notesUrl\": \"https://github.com/yambuck/yambuck/releases/tag/${TAG}\""

if [[ "$DRY_RUN" == true ]]; then
  log "[dry-run] update release URLs in ${STABLE_FEED_JSON} to ${TAG}"
else
  sed -E -i "s#(https://github.com/yambuck/yambuck/releases/(tag|download)/)v[0-9]+\.[0-9]+\.[0-9]+#\1${TAG}#g" "$STABLE_FEED_JSON"
fi

replace_first_match "$STABLE_FEED_JSON" '"sha256"[[:space:]]*:[[:space:]]*"[^"]+"' "\"sha256\": \"${MAIN_SHA256}\""

if [[ "$PUBLISH" != true ]]; then
  log "Phase 5 skipped (publish disabled)."
  log "Done preparing release files for ${TAG}."
  log "Run again with --publish when you are ready to tag and publish."
  exit 0
fi

# -----------------------------------------------------------------------------
# Phase 5: Commit, tag, push, and publish GitHub release
# -----------------------------------------------------------------------------

log "Phase 5/5: Publish release"

if [[ "$YES" != true ]]; then
  printf "Publish %s to GitHub now? [y/N] " "$TAG"
  read -r answer
  if [[ "${answer:-}" != "y" && "${answer:-}" != "Y" ]]; then
    fail "publish cancelled"
  fi
fi

if [[ "$DRY_RUN" == false ]]; then
  git rev-parse "$TAG" >/dev/null 2>&1 && fail "tag already exists locally: ${TAG}"
  git ls-remote --tags origin "refs/tags/${TAG}" | grep -q "${TAG}" && fail "tag already exists on origin: ${TAG}"
fi

FILES_TO_STAGE=(
  "$MAIN_PACKAGE_JSON"
  "$MAIN_CARGO_TOML"
  "$MAIN_CARGO_LOCK"
  "$MAIN_TAURI_CONF"
  "$STABLE_FEED_JSON"
)

if [[ -n "$EXAMPLE_VERSION" ]]; then
  FILES_TO_STAGE+=(
    "$EXAMPLE_PACKAGE_JSON"
    "$EXAMPLE_CARGO_TOML"
    "$EXAMPLE_CARGO_LOCK"
    "$EXAMPLE_TAURI_CONF"
  )
fi

if [[ "$DRY_RUN" == true ]]; then
  log "[dry-run] git add selected release files"
  log "[dry-run] git commit -m \"chore: cut ${TAG} release\""
  log "[dry-run] git tag -a ${TAG} -m \"Yambuck ${TAG}\""
  log "[dry-run] git push origin main"
  log "[dry-run] git push origin ${TAG}"
  log "[dry-run] gh release create ${TAG} <assets>"
  log "Release dry run complete"
  exit 0
fi

for staged_file in "${FILES_TO_STAGE[@]}"; do
  if [[ -f "$staged_file" ]]; then
    git add "$staged_file"
  fi
done

git commit -m "chore: cut ${TAG} release"
git tag -a "$TAG" -m "Yambuck ${TAG}"
git push origin main
git push origin "$TAG"

[[ -f "$MAIN_TARBALL_PATH" ]] || fail "missing artifact: ${MAIN_TARBALL_PATH}"
[[ -f "$MAIN_SHA_PATH" ]] || fail "missing artifact: ${MAIN_SHA_PATH}"
[[ -f "$EXAMPLE_PACKAGE_PATH" ]] || fail "missing artifact: ${EXAMPLE_PACKAGE_PATH}"

gh release create "$TAG" \
  "$MAIN_TARBALL_PATH" \
  "$MAIN_SHA_PATH" \
  "$EXAMPLE_PACKAGE_PATH" \
  --title "Yambuck ${TAG}" \
  --notes "## Summary
- Cut ${TAG} with refreshed bootstrap/update metadata.
- Publish Linux installer tarball + checksum.
- Attach the example app package for end-to-end install validation."

log "Release published: ${TAG}"
