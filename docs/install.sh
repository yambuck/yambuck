#!/usr/bin/env bash
set -euo pipefail

# Yambuck one-line installer for Linux.
#   curl --proto '=https' --tlsv1.2 -sSf https://yambuck.com/install.sh | bash
# The in-app updater re-runs this same script (adding --system for a
# /usr/local/bin install), so keep its options stable.
# Follows the Release and Update Standard; see docs/RELEASE.md.

REPO="yambuck/yambuck"
BIN_NAME="yambuck"
# The app ID (Release and Update Standard, section 10): launcher name,
# StartupWMClass and the Wayland app_id. Never change it.
APP_ID="com.yambuck.yambuck"
# Launchers and app icons Yambuck used before the app ID was standardized;
# removed on every install so the menu shows one Yambuck.
LEGACY_DESKTOP_FILE_NAMES=("com.yambuck.installer.desktop" "yambuck.desktop")
LEGACY_ICON_NAMES=("com.yambuck.installer")
INSTALL_BASE_URL="https://yambuck.com"
USER_INSTALL_DIR="${HOME}/.local/bin"
SYSTEM_INSTALL_DIR="/usr/local/bin"

# GitHub API request headers. YAMBUCK_GITHUB_TOKEN is optional: anonymous
# requests are limited to 60 an hour per IP address.
GITHUB_API_HEADERS=(-H "Accept: application/vnd.github+json")
if [[ -n "${YAMBUCK_GITHUB_TOKEN:-}" ]]; then
  GITHUB_API_HEADERS+=(-H "Authorization: Bearer ${YAMBUCK_GITHUB_TOKEN}")
fi

usage() {
  cat <<EOF
Yambuck installer

Usage:
  install.sh [--system] [--version <tag>] [--yes] [--no-relaunch] [--insecure-skip-verify]

Default: install for the current user to ~/.local/bin (no password needed).

Options:
  --system                Install for all users to /usr/local/bin (asks for your password)
  --version <tag>         Install a specific release tag (e.g. v0.3.7)
  --yes                   Skip the confirmation prompt
  --no-relaunch           Do not start Yambuck after installing
  --insecure-skip-verify  Skip checksum verification (not recommended)
  -h, --help              Show this help message

Environment:
  YAMBUCK_GITHUB_TOKEN    GitHub token for API requests (avoids the anonymous rate limit)
  YAMBUCK_NO_RELAUNCH     Set to 1 to not start Yambuck after installing
  YAMBUCK_INSTALL_URL     Testing only: install this tarball URL instead of a
                          GitHub release (requires --insecure-skip-verify)

Examples:
  curl --proto '=https' --tlsv1.2 -sSf ${INSTALL_BASE_URL}/install.sh | bash
  curl --proto '=https' --tlsv1.2 -sSf ${INSTALL_BASE_URL}/install.sh | bash -s -- --system
EOF
}

LOG_DIR="${HOME}/.config/yambuck/debug"
mkdir -p "$LOG_DIR" 2>/dev/null || true
LOG_FILE="${LOG_DIR}/update.log"

log() {
  printf "[yambuck] %s\n" "$*"
  printf "[%s] [yambuck] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG_FILE" 2>/dev/null || true
}

warn() {
  printf "[yambuck] WARNING: %s\n" "$*" >&2
  printf "[%s] [yambuck] WARNING: %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG_FILE" 2>/dev/null || true
}

fail() {
  printf "[yambuck] ERROR: %b\n" "$*" >&2
  printf "[%s] [yambuck] ERROR: %b\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG_FILE" 2>/dev/null || true
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

optional_cmd() {
  command -v "$1" >/dev/null 2>&1
}

has_display() {
  [[ -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ]]
}

# The in-app updater runs this script detached from any terminal, so there
# sudo cannot prompt and the graphical pkexec prompt is used instead.
run_as_root() {
  if [[ "$EUID" -eq 0 ]]; then
    "$@"
  elif optional_cmd sudo && sudo -n true 2>/dev/null; then
    sudo "$@"
  elif [[ -t 0 ]] && optional_cmd sudo; then
    sudo "$@"
  elif optional_cmd sudo && tty_available; then
    sudo "$@" < /dev/tty
  elif optional_cmd pkexec && has_display; then
    pkexec "$@"
  else
    fail "root permissions required but neither sudo (with a terminal) nor pkexec (with a display) is available"
  fi
}

# Piped from curl, stdin is the script, but sudo can still prompt through the
# controlling terminal.
tty_available() {
  [[ -r /dev/tty ]] && { : < /dev/tty; } 2>/dev/null
}

# Returns 0 when root commands can run (already root, cached sudo, an
# interactive sudo prompt, or a graphical pkexec prompt).
acquire_root() {
  if [[ "$EUID" -eq 0 ]]; then
    return 0
  fi
  if optional_cmd sudo && sudo -n true 2>/dev/null; then
    return 0
  fi
  if [[ -t 0 ]] && optional_cmd sudo; then
    sudo -v
  elif optional_cmd sudo && tty_available; then
    sudo -v < /dev/tty
  elif optional_cmd pkexec && has_display; then
    return 0
  else
    return 1
  fi
}

stop_running_process() {
  if optional_cmd pgrep && pgrep -x "$BIN_NAME" >/dev/null 2>&1; then
    log "Closing running Yambuck"
    if optional_cmd pkill; then
      pkill -TERM -x "$BIN_NAME" >/dev/null 2>&1 || true
      sleep 1
      pkill -KILL -x "$BIN_NAME" >/dev/null 2>&1 || true
    fi
  fi
}

resolve_arch() {
  case "$(uname -m)" in
    x86_64|amd64) printf "x64" ;;
    aarch64|arm64) fail "ARM64 builds of Yambuck are not available yet; only x64 (x86_64) is supported." ;;
    *) fail "unsupported architecture: $(uname -m)" ;;
  esac
}

fetch_latest_release_tag() {
  local tag
  tag="$(curl -fsL --retry 3 --connect-timeout 10 "${GITHUB_API_HEADERS[@]}" \
    "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep -o '"tag_name": *"[^"]*"' | head -n1 | sed 's/.*"\([^"]*\)"$/\1/')" || true
  [[ -n "$tag" ]] || fail "could not determine the latest release from GitHub (you may be rate limited; try again in a few minutes)"
  printf "%s" "$tag"
}

# GitHub computes a SHA-256 digest for every uploaded release asset and
# exposes it through the releases API; that is the source of truth.
verify_checksum() {
  local file="$1" asset_name="$2"
  local release_json expected actual
  release_json="$(curl -fsL --retry 3 --connect-timeout 10 "${GITHUB_API_HEADERS[@]}" \
    "https://api.github.com/repos/${REPO}/releases/tags/${release_tag}")" \
    || fail "could not fetch the checksum for ${asset_name} from GitHub. Try again later, or re-run with --insecure-skip-verify."
  if optional_cmd python3; then
    expected="$(printf "%s" "$release_json" | python3 -c '
import json, sys
name = sys.argv[1]
for asset in json.load(sys.stdin).get("assets", []):
    if asset.get("name") == name:
        print(asset.get("digest") or "")
' "$asset_name" 2>/dev/null)" || true
  else
    # No JSON parser: each asset lists "digest" shortly before its
    # "browser_download_url", with only flat fields in between.
    expected="$(printf "%s" "$release_json" | tr -d '\n' \
      | grep -o "\"digest\": *\"sha256:[0-9a-f]*\"[^{}]*\"browser_download_url\": *\"[^\"]*/${asset_name//./\\.}\"" \
      | grep -o 'sha256:[0-9a-f]*' | head -n1)" || true
  fi
  expected="${expected#sha256:}"
  [[ -n "$expected" ]] || fail "GitHub did not provide a checksum for ${asset_name}. Re-run with --insecure-skip-verify to bypass verification."
  actual="$(sha256sum "$file" | awk '{print $1}')"
  [[ "$expected" == "$actual" ]] || fail "checksum mismatch (expected $expected, got $actual)"
  log "Checksum verified"
}

write_branded_icon_svg() {
  # BEGIN GENERATED ICON SVG (from assets/branding/yambuck-icon-app.svg)
  cat <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="edge" x1="6.36" y1="9.24" x2="92.14" y2="63.27" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#154067"/>
      <stop offset="1" stop-color="#070d16"/>
    </linearGradient>
    <linearGradient id="ribbon" x1="18.59" y1="118.76" x2="121.69" y2="9.24" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#61d7ff"/>
      <stop offset="1" stop-color="#55f0c0"/>
    </linearGradient>
  </defs>
  <path d="m14.68182 14.386552 40.915122 0a11.01176 11.01176 28.584731 0 1 9.252937 5.041667l21.715522 33.656484a3.2692322 3.2692322 118.58473 0 1-2.747063 5.041667l-40.915121 0a11.01176 11.01176 28.584731 0 1-9.252936-5.041667l-21.715523-33.656484a3.2692322 3.2692322 118.58473 0 1 2.747062-5.041667z" fill="none" stroke="#ffffff" stroke-width="10.2901" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m81.56626 14.386552 31.47611 0a3.5548328 3.5548328 59.35444 0 1 3.11784 5.26243l-48.580815 88.702038a10.127059 10.127059 149.35444 0 1-8.882157 5.26243h-31.476088a3.5548335 3.5548335 59.354436 0 1-3.117844-5.26243l48.580798-88.702037a10.127057 10.127057 149.35444 0 1 8.882156-5.262431z" fill="none" stroke="#ffffff" stroke-width="10.2901" stroke-linejoin="round"/>
  <path d="m14.681819 14.386552h40.915125a11.01176 11.01176 28.584731 0 1 9.252937 5.041667l21.715523 33.656484a3.2692322 3.2692322 118.58473 0 1-2.747063 5.041667h-40.915125a11.01176 11.01176 28.584731 0 1-9.252937-5.041667l-21.715522-33.656484a3.2692322 3.2692322 118.58473 0 1 2.747062-5.041667z" fill="url(#edge)"/>
  <path d="m81.56626 14.386552 31.47611 0a3.5548327 3.5548327 59.354441 0 1 3.11784 5.26243l-48.580816 88.702038a10.127059 10.127059 149.35444 0 1-8.882157 5.26243h-31.476087a3.5548335 3.5548335 59.354436 0 1-3.117844-5.26243l48.580798-88.702037a10.127057 10.127057 149.35444 0 1 8.882156-5.262431z" fill="url(#ribbon)"/>
</svg>
EOF
  # END GENERATED ICON SVG
}

write_branded_icon_symbolic_svg() {
  cat <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <path fill="currentColor" d="M16 18h34l14 22L82 18h30L78 74v36H50V74L16 18z"/>
</svg>
EOF
}

detect_active_icon_theme() {
  if ! optional_cmd gsettings; then
    return 0
  fi

  local current
  current="$(gsettings get org.cinnamon.desktop.interface icon-theme 2>/dev/null | tr -d "'\"")"
  if [[ -n "$current" ]]; then
    printf "%s" "$current"
    return 0
  fi

  current="$(gsettings get org.gnome.desktop.interface icon-theme 2>/dev/null | tr -d "'\"")"
  if [[ -n "$current" ]]; then
    printf "%s" "$current"
  fi
}

# Some icon themes (e.g. Mint's) ignore hicolor MIME icons, so a user install
# also drops the .yambuck file icon into the active theme.
install_theme_overlay_icons() {
  local theme_name="$1"
  local theme_mime_dir="${HOME}/.local/share/icons/${theme_name}/mimetypes"

  log "Installing MIME icon overlay for active theme: ${theme_name}"
  install -d "${theme_mime_dir}/scalable" "${theme_mime_dir}/symbolic"
  write_branded_icon_svg > "${theme_mime_dir}/scalable/${mime_icon_name}.svg"
  write_branded_icon_svg > "${theme_mime_dir}/${mime_icon_name}.svg"
  write_branded_icon_symbolic_svg > "${theme_mime_dir}/symbolic/${mime_icon_name}-symbolic.svg"
  optional_cmd gtk-update-icon-cache && gtk-update-icon-cache -f -t -q "${HOME}/.local/share/icons/${theme_name}" >/dev/null 2>&1 || true
}

write_desktop_entry() {
  cat <<EOF
[Desktop Entry]
Name=Yambuck
Comment=Install .yambuck application packages
Exec=${installed_bin} %F
Terminal=false
Type=Application
Icon=${APP_ID}
StartupWMClass=${APP_ID}
Categories=Utility;PackageManager;
MimeType=application/x-yambuck-package;
StartupNotify=true
EOF
}

write_mime_definition() {
  cat <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns='http://www.freedesktop.org/standards/shared-mime-info'>
  <mime-type type="application/x-yambuck-package">
    <comment>Yambuck package</comment>
    <icon name="application-x-yambuck-package"/>
    <glob pattern="*.yambuck"/>
  </mime-type>
</mime-info>
EOF
}

# Installs a staged file. A user install copies it straight away; a system
# install queues the copy into one root script, so an update started from the
# app asks for the password once rather than once per file.
place_file() {
  local mode="$1" source="$2" target="$3"
  if [[ "$install_system" == true ]]; then
    printf "install -D -m %q %q %q\n" "$mode" "$source" "$target" >> "$root_script"
  else
    install -D -m "$mode" "$source" "$target"
  fi
}

# A user install (~/.local/bin, ~/.local/share/applications) would shadow the
# system one in PATH and the app menu, so a system install removes it.
remove_user_install() {
  local path
  for path in "${USER_INSTALL_DIR}/${BIN_NAME}" "${HOME}/.local/share/applications/${desktop_file_name}"; do
    if [[ -e "$path" || -L "$path" ]]; then
      log "Removing previous user install: ${path}"
      rm -f "$path"
    fi
  done
}

# Removes launchers and app icons left by earlier app IDs, in the install
# location (queued for root in a system install) and, for the user's own
# files, always.
remove_legacy_integration() {
  local name path paths=() user_share="${HOME}/.local/share"
  for name in "${LEGACY_DESKTOP_FILE_NAMES[@]}"; do
    paths+=("${user_share}/applications/${name}")
    [[ "$install_system" == true ]] && paths+=("/usr/share/applications/${name}")
  done
  for name in "${LEGACY_ICON_NAMES[@]}"; do
    for path in "scalable/apps/${name}.svg" "32x32/apps/${name}.png" "128x128/apps/${name}.png"; do
      paths+=("${user_share}/icons/hicolor/${path}")
      [[ "$install_system" == true ]] && paths+=("/usr/share/icons/hicolor/${path}")
    done
  done
  for path in "${paths[@]}"; do
    [[ -e "$path" || -L "$path" ]] || continue
    log "Removing legacy launcher/icon: ${path}"
    if [[ "$path" == /usr/* ]]; then
      printf "rm -f %q\n" "$path" >> "$root_script"
    else
      rm -f "$path"
    fi
  done
}

is_legacy_desktop_file_name() {
  local name
  for name in "${LEGACY_DESKTOP_FILE_NAMES[@]}"; do
    [[ "$1" == "$name" ]] && return 0
  done
  return 1
}

# True when the user's mimeapps.list still has a legacy launcher as the
# .yambuck default. xdg-mime may already report the new launcher once the old
# file is gone, but the stale entry stays until it is rewritten.
mimeapps_names_legacy_launcher() {
  local mimeapps="${XDG_CONFIG_HOME:-${HOME}/.config}/mimeapps.list" name
  [[ -f "$mimeapps" ]] || return 1
  for name in "${LEGACY_DESKTOP_FILE_NAMES[@]}"; do
    grep -Eq "^application/x-yambuck-package=${name//./\\.}(;|$)" "$mimeapps" && return 0
  done
  return 1
}

install_system=false
non_interactive=false
skip_verify=false
relaunch=true
if [[ "${YAMBUCK_NO_RELAUNCH:-}" == "1" || "${YAMBUCK_NO_RELAUNCH:-}" == "true" ]]; then
  relaunch=false
fi
version=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --system) install_system=true ;;
    --relaunch) relaunch=true ;;
    --no-relaunch) relaunch=false ;;
    --version)
      [[ $# -ge 2 ]] || fail "--version requires a value"
      version="$2"
      shift
      ;;
    # Accepted and ignored so older commands keep working: there is only one
    # channel now, GitHub's latest release.
    --channel)
      [[ $# -ge 2 ]] || fail "--channel requires a value"
      shift
      ;;
    --yes) non_interactive=true ;;
    --insecure-skip-verify) skip_verify=true ;;
    -h|--help) usage; exit 0 ;;
    *) fail "unknown option: $1" ;;
  esac
  shift
done

[[ "$(uname -s)" == "Linux" ]] || fail "Yambuck is for Linux only."

need_cmd curl
need_cmd tar
need_cmd install
need_cmd sha256sum

# Piped into bash (curl | bash), stdin is the script, so prompts can't be answered.
if [[ ! -t 0 ]]; then
  non_interactive=true
fi

arch="$(resolve_arch)"

if [[ "$install_system" == true ]]; then
  install_dir="$SYSTEM_INSTALL_DIR"
  log "System install requested; root access required"
  acquire_root || fail "could not get root access for a system install (run the command in a terminal, or install pkexec)"
else
  install_dir="$USER_INSTALL_DIR"
  if [[ -x "${SYSTEM_INSTALL_DIR}/${BIN_NAME}" ]]; then
    log "Note: a system install exists in ${SYSTEM_INSTALL_DIR}; this user install takes precedence over it. Use --system to update that one instead."
  fi
fi
installed_bin="${install_dir}/${BIN_NAME}"

if [[ -n "${YAMBUCK_INSTALL_URL:-}" ]]; then
  # Testing only (local tarballs, CI before a release exists): there is no
  # GitHub digest to check it against, so it must be explicitly unverified.
  [[ "$skip_verify" == true ]] || fail "YAMBUCK_INSTALL_URL is for testing only and requires --insecure-skip-verify"
  release_tag="${version:-custom}"
  asset_name="$(basename "$YAMBUCK_INSTALL_URL")"
  asset_url="$YAMBUCK_INSTALL_URL"
else
  if [[ -n "$version" ]]; then
    release_tag="$version"
  else
    release_tag="$(fetch_latest_release_tag)"
  fi
  asset_name="${BIN_NAME}-${release_tag#v}-linux-${arch}.tar.gz"
  asset_url="https://github.com/${REPO}/releases/download/${release_tag}/${asset_name}"
fi

log "Release: ${release_tag}"
if [[ "$install_system" == true ]]; then
  log "Install mode: system-wide (${install_dir})"
else
  log "Install mode: user (${install_dir})"
fi

if [[ "$non_interactive" == false ]]; then
  printf "Proceed with installation? [y/N] "
  read -r answer
  [[ "${answer:-}" == "y" || "${answer:-}" == "Y" ]] || fail "installation cancelled"
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
archive_path="${tmp_dir}/${asset_name}"

log "Downloading ${asset_url}"
curl -fL --retry 3 --connect-timeout 15 -o "$archive_path" "$asset_url" \
  || fail "download failed: ${asset_name} was not found in release ${release_tag}."

if [[ "$skip_verify" == true ]]; then
  warn "checksum verification disabled"
else
  verify_checksum "$archive_path" "$asset_name"
fi

extract_dir="${tmp_dir}/extract"
mkdir -p "$extract_dir"
tar -xzf "$archive_path" -C "$extract_dir" || fail "could not extract ${asset_name}"

# Release tarballs carry bin/yambuck; a bare yambuck is tolerated too.
candidate_bin=""
if [[ -f "${extract_dir}/bin/${BIN_NAME}" ]]; then
  candidate_bin="${extract_dir}/bin/${BIN_NAME}"
elif [[ -f "${extract_dir}/${BIN_NAME}" ]]; then
  candidate_bin="${extract_dir}/${BIN_NAME}"
fi
[[ -n "$candidate_bin" ]] || fail "downloaded archive did not contain bin/${BIN_NAME}"

desktop_file_name="${APP_ID}.desktop"
mime_xml_name="application-x-yambuck-package.xml"
desktop_icon_name="${APP_ID}"
mime_icon_name="application-x-yambuck-package"

if [[ "$install_system" == true ]]; then
  share_dir="/usr/share"
else
  share_dir="${HOME}/.local/share"
fi
desktop_dir="${share_dir}/applications"
mime_dir="${share_dir}/mime"
icon_dir="${share_dir}/icons/hicolor"

# Desktop integration (launcher, the .yambuck MIME type and file association,
# branded icons), staged as files so both modes install them the same way.
stage_dir="${tmp_dir}/stage"
mkdir -p "$stage_dir"
write_branded_icon_svg > "${stage_dir}/icon.svg"
write_branded_icon_symbolic_svg > "${stage_dir}/icon-symbolic.svg"
write_desktop_entry > "${stage_dir}/${desktop_file_name}"
write_mime_definition > "${stage_dir}/${mime_xml_name}"

root_script="${tmp_dir}/install-as-root.sh"
printf "set -eu\n" > "$root_script"

stop_running_process

if [[ "$install_system" == true ]]; then
  remove_user_install
fi
remove_legacy_integration

log "Installing ${installed_bin}"
place_file 0755 "$candidate_bin" "$installed_bin"
place_file 0644 "${stage_dir}/icon.svg" "${icon_dir}/scalable/apps/${desktop_icon_name}.svg"
place_file 0644 "${stage_dir}/icon.svg" "${icon_dir}/scalable/mimetypes/${mime_icon_name}.svg"
place_file 0644 "${stage_dir}/icon-symbolic.svg" "${icon_dir}/symbolic/mimetypes/${mime_icon_name}-symbolic.svg"
place_file 0644 "${stage_dir}/${desktop_file_name}" "${desktop_dir}/${desktop_file_name}"
place_file 0644 "${stage_dir}/${mime_xml_name}" "${mime_dir}/packages/${mime_xml_name}"

# Icon, MIME and desktop cache refreshes for the install location.
refresh_commands=()
if optional_cmd gtk-update-icon-cache; then
  refresh_commands+=("gtk-update-icon-cache -f -t -q $(printf %q "$icon_dir")")
fi
if optional_cmd update-mime-database; then
  refresh_commands+=("update-mime-database $(printf %q "$mime_dir")")
fi
if optional_cmd update-desktop-database; then
  refresh_commands+=("update-desktop-database $(printf %q "$desktop_dir")")
fi

if [[ "$install_system" == true ]]; then
  for refresh in "${refresh_commands[@]}"; do
    printf "%s >/dev/null 2>&1 || true\n" "$refresh" >> "$root_script"
  done
  # mktemp creates a private directory; root (via pkexec) must read it.
  chmod -R a+rX "$tmp_dir"
  log "Installing system files (needs root)"
  run_as_root bash "$root_script" || fail "system install failed (root access was denied, or copying a file failed)"
else
  for refresh in "${refresh_commands[@]}"; do
    bash -c "$refresh" >/dev/null 2>&1 || true
  done
  active_icon_theme="$(detect_active_icon_theme)"
  if [[ -n "$active_icon_theme" ]]; then
    install_theme_overlay_icons "$active_icon_theme"
  fi
fi

[[ -x "$installed_bin" ]] || fail "installed binary is missing or not executable at ${installed_bin}"
log "Installed $("$installed_bin" --version 2>/dev/null || printf "%s (version check unavailable)" "$installed_bin")"

if optional_cmd kbuildsycoca6; then
  kbuildsycoca6 --noincremental >/dev/null 2>&1 || true
elif optional_cmd kbuildsycoca5; then
  kbuildsycoca5 --noincremental >/dev/null 2>&1 || true
fi

if optional_cmd xdg-mime; then
  current_default="$(xdg-mime query default application/x-yambuck-package 2>/dev/null || true)"
  # An association with a pre-app-ID launcher name is moved to the new one,
  # so double-clicking a .yambuck file keeps opening Yambuck.
  if [[ -z "$current_default" ]] || is_legacy_desktop_file_name "$current_default" || mimeapps_names_legacy_launcher; then
    log "Registering ${desktop_file_name} as the default handler for .yambuck files"
    xdg-mime default "$desktop_file_name" application/x-yambuck-package >/dev/null 2>&1 || true
  else
    log "Leaving existing default .yambuck handler unchanged (${current_default})"
  fi
fi

if [[ ":$PATH:" != *":${install_dir}:"* ]]; then
  log "Note: ${install_dir} is not in your PATH. Launch Yambuck from your app menu, or add this to your shell profile:"
  log "  export PATH=\"${install_dir}:\$PATH\""
fi

log "Installation complete. Open a .yambuck file, or launch Yambuck from your application menu."

if [[ "$relaunch" == true ]] && has_display; then
  log "Starting Yambuck"
  nohup "$installed_bin" >/dev/null 2>&1 &
fi
