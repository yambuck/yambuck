#!/usr/bin/env bash
set -euo pipefail

# Yambuck uninstaller for Linux.
#   curl -sf https://yambuck.com/uninstall.sh | bash

usage() {
  cat <<'EOF'
Yambuck uninstall script

Usage:
  uninstall.sh [--purge-managed-apps] [--yes]

Default behavior:
  Removes Yambuck itself (user ~/.local/bin and system /usr/local/bin installs
  when present) and its desktop integration. Leaves Yambuck-managed apps in place.

Options:
  --purge-managed-apps Also remove all Yambuck-managed app payloads + metadata (user + system)
                       and Yambuck's own logs and webview data (~/.config/yambuck,
                       ~/.local/share/com.yambuck.yambuck)
  --yes                Skip confirmation prompts
  -h, --help           Show this help message

Examples:
  curl -sf https://yambuck.com/uninstall.sh | bash
  curl -sf https://yambuck.com/uninstall.sh | bash -s -- --purge-managed-apps --yes
EOF
}

log() {
  printf "[yambuck-uninstall] %s\n" "$*"
}

fail() {
  printf "[yambuck-uninstall] ERROR: %s\n" "$*" >&2
  exit 1
}

optional_cmd() {
  command -v "$1" >/dev/null 2>&1
}

has_display() {
  [[ -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ]]
}

# Piped from curl, stdin is the script, but sudo can still prompt through the
# controlling terminal.
tty_available() {
  [[ -r /dev/tty ]] && { : < /dev/tty; } 2>/dev/null
}

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

# Asks for root once up front (cached sudo, or an interactive sudo prompt).
acquire_root() {
  if [[ "$EUID" -eq 0 ]] || { optional_cmd sudo && sudo -n true 2>/dev/null; }; then
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

require_safe_path() {
  local path="$1"
  [[ -n "$path" ]] || fail "refusing empty path"
  [[ "$path" != "/" ]] || fail "refusing root path"
}

non_interactive=false
purge_managed_apps=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --purge-managed-apps)
      purge_managed_apps=true
      ;;
    --yes)
      non_interactive=true
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

if [[ ! -t 0 ]]; then
  non_interactive=true
fi

# The app ID (Release and Update Standard, section 10) names the launcher
# and app icon; the legacy names are launchers/icons from before it.
APP_ID="com.yambuck.yambuck"
DESKTOP_FILE_NAMES=("${APP_ID}.desktop" "com.yambuck.installer.desktop" "yambuck.desktop")
APP_ICON_NAMES=("${APP_ID}" "com.yambuck.installer")

# Yambuck's own files under a share root (~/.local/share or /usr/share).
yambuck_share_files() {
  local share="$1" name
  for name in "${DESKTOP_FILE_NAMES[@]}"; do
    printf "%s\n" "${share}/applications/${name}"
  done
  printf "%s\n" "${share}/mime/packages/application-x-yambuck-package.xml"
  for name in "${APP_ICON_NAMES[@]}"; do
    printf "%s\n" "${share}/icons/hicolor/scalable/apps/${name}.svg" \
      "${share}/icons/hicolor/32x32/apps/${name}.png" \
      "${share}/icons/hicolor/128x128/apps/${name}.png"
  done
  printf "%s\n" "${share}/icons/hicolor/scalable/mimetypes/application-x-yambuck-package.svg" \
    "${share}/icons/hicolor/symbolic/mimetypes/application-x-yambuck-package-symbolic.svg"
}

mapfile -t user_files < <(printf "%s\n" "${HOME}/.local/bin/yambuck"; yambuck_share_files "${HOME}/.local/share")
mapfile -t system_files < <(printf "%s\n" "/usr/local/bin/yambuck"; yambuck_share_files "/usr/share")

user_config_root="${HOME}/.config/yambuck"
user_metadata_root="${HOME}/.local/share/yambuck"
user_app_payload_root="${HOME}/.local/share/yambuck/apps"
# The webview's data (cache, local storage), named by the app ID.
user_webview_roots=("${HOME}/.local/share/${APP_ID}" "${HOME}/.local/share/com.yambuck.installer")

system_metadata_root="/var/lib/yambuck"
system_app_payload_root="/opt/yambuck/apps"

is_allowed_file_target() {
  local path="$1" candidate
  for candidate in "${user_files[@]}" "${system_files[@]}"; do
    [[ "$path" == "$candidate" ]] && return 0
  done
  return 1
}

is_allowed_dir_target() {
  local path="$1"
  case "$path" in
    "$user_metadata_root"|"$user_app_payload_root"|"$user_config_root"|"${user_webview_roots[0]}"|"${user_webview_roots[1]}"|"$system_metadata_root"|"$system_app_payload_root")
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

remove_file_if_exists() {
  local path="$1"
  local system_path="$2"
  require_safe_path "$path"
  is_allowed_file_target "$path" || fail "refusing unexpected file target: $path"
  if [[ -e "$path" || -L "$path" ]]; then
    log "Removing ${path}"
    if [[ "$system_path" == true ]]; then
      run_as_root rm -f "$path"
    else
      rm -f "$path"
    fi
  fi
}

remove_dir_if_exists() {
  local path="$1"
  local system_path="$2"
  require_safe_path "$path"
  is_allowed_dir_target "$path" || fail "refusing unexpected directory target: $path"
  if [[ -d "$path" ]]; then
    log "Removing ${path}"
    if [[ "$system_path" == true ]]; then
      run_as_root rm -rf "$path"
    else
      rm -rf "$path"
    fi
  fi
}

system_changes_required=false
for path in "${system_files[@]}"; do
  if [[ -e "$path" || -L "$path" ]]; then
    system_changes_required=true
  fi
done
if [[ "$purge_managed_apps" == true && ( -d "$system_metadata_root" || -d "$system_app_payload_root" ) ]]; then
  system_changes_required=true
fi

log "Preparing uninstall"
log "Will remove Yambuck launcher/binary from user + system locations when present"
if [[ "$purge_managed_apps" == true ]]; then
  log "App purge mode: remove all Yambuck-managed apps (user + system)"
else
  log "App purge mode: keep Yambuck-managed apps"
fi

if [[ "$non_interactive" == false ]]; then
  printf "Proceed with uninstall? [y/N] "
  read -r answer
  if [[ "${answer:-}" != "y" && "${answer:-}" != "Y" ]]; then
    fail "uninstall cancelled"
  fi
else
  log "Non-interactive mode detected"
fi

if optional_cmd pgrep && pgrep -x yambuck >/dev/null 2>&1; then
  if optional_cmd pkill; then
    log "Closing running Yambuck process"
    pkill -TERM -x yambuck >/dev/null 2>&1 || true
    sleep 1
    pkill -KILL -x yambuck >/dev/null 2>&1 || true
  else
    log "Yambuck appears to be running, but pkill is unavailable"
  fi
fi

if [[ "$system_changes_required" == true && "$EUID" -ne 0 ]]; then
  log "System-level cleanup detected; you may be asked for your password"
  acquire_root || fail "system cleanup requires root access (run the command in a terminal, or install pkexec)"
fi

for path in "${user_files[@]}"; do
  remove_file_if_exists "$path" false
done
for path in "${system_files[@]}"; do
  remove_file_if_exists "$path" true
done

if [[ "$purge_managed_apps" == true ]]; then
  remove_dir_if_exists "$user_metadata_root" false
  remove_dir_if_exists "$user_app_payload_root" false
  remove_dir_if_exists "$user_config_root" false
  for path in "${user_webview_roots[@]}"; do
    remove_dir_if_exists "$path" false
  done
  remove_dir_if_exists "$system_metadata_root" true
  remove_dir_if_exists "$system_app_payload_root" true
fi

if optional_cmd update-mime-database; then
  if [[ -d "${HOME}/.local/share/mime" ]]; then
    log "Refreshing user MIME database"
    update-mime-database "${HOME}/.local/share/mime" >/dev/null 2>&1 || true
  fi
  if [[ "$system_changes_required" == true && -d "/usr/share/mime" ]]; then
    log "Refreshing system MIME database"
    run_as_root update-mime-database "/usr/share/mime" >/dev/null 2>&1 || true
  fi
fi

if optional_cmd update-desktop-database; then
  if [[ -d "${HOME}/.local/share/applications" ]]; then
    log "Refreshing user desktop database"
    update-desktop-database "${HOME}/.local/share/applications" >/dev/null 2>&1 || true
  fi
  if [[ "$system_changes_required" == true && -d "/usr/share/applications" ]]; then
    log "Refreshing system desktop database"
    run_as_root update-desktop-database "/usr/share/applications" >/dev/null 2>&1 || true
  fi
fi

if optional_cmd gtk-update-icon-cache; then
  if [[ -d "${HOME}/.local/share/icons/hicolor" ]]; then
    log "Refreshing user icon cache"
    gtk-update-icon-cache -f -t "${HOME}/.local/share/icons/hicolor" >/dev/null 2>&1 || true
  fi
  if [[ "$system_changes_required" == true && -d "/usr/share/icons/hicolor" ]]; then
    log "Refreshing system icon cache"
    run_as_root gtk-update-icon-cache -f -t "/usr/share/icons/hicolor" >/dev/null 2>&1 || true
  fi
fi

if [[ "$purge_managed_apps" == false && ( -d "$system_metadata_root" || -d "$system_app_payload_root" ) ]]; then
  log "System-managed app data still exists."
  log "Run full purge to remove everything:"
  log "curl -sf https://yambuck.com/uninstall.sh | bash -s -- --purge-managed-apps --yes"
fi

log "Uninstall complete"
if [[ "$purge_managed_apps" == true ]]; then
  log "Yambuck and all Yambuck-managed app payloads/metadata were removed."
else
  log "Yambuck was removed. Yambuck-managed apps were left intact."
fi
