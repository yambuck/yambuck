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
                       and Yambuck's own logs (~/.config/yambuck)
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

user_bin_path="${HOME}/.local/bin/yambuck"
user_desktop_file="${HOME}/.local/share/applications/yambuck.desktop"
user_legacy_desktop_file="${HOME}/.local/share/applications/com.yambuck.installer.desktop"
user_mime_xml="${HOME}/.local/share/mime/packages/application-x-yambuck-package.xml"
user_app_icon="${HOME}/.local/share/icons/hicolor/scalable/apps/com.yambuck.installer.svg"
user_mime_icon="${HOME}/.local/share/icons/hicolor/scalable/mimetypes/application-x-yambuck-package.svg"
user_mime_symbolic_icon="${HOME}/.local/share/icons/hicolor/symbolic/mimetypes/application-x-yambuck-package-symbolic.svg"
user_config_root="${HOME}/.config/yambuck"
user_metadata_root="${HOME}/.local/share/yambuck"
user_app_payload_root="${HOME}/.local/share/yambuck/apps"

system_bin_path="/usr/local/bin/yambuck"
system_desktop_file="/usr/share/applications/yambuck.desktop"
system_legacy_desktop_file="/usr/share/applications/com.yambuck.installer.desktop"
system_mime_xml="/usr/share/mime/packages/application-x-yambuck-package.xml"
system_app_icon="/usr/share/icons/hicolor/scalable/apps/com.yambuck.installer.svg"
system_mime_icon="/usr/share/icons/hicolor/scalable/mimetypes/application-x-yambuck-package.svg"
system_mime_symbolic_icon="/usr/share/icons/hicolor/symbolic/mimetypes/application-x-yambuck-package-symbolic.svg"
system_metadata_root="/var/lib/yambuck"
system_app_payload_root="/opt/yambuck/apps"

is_allowed_file_target() {
  local path="$1"
  case "$path" in
    "$user_bin_path"|"$user_desktop_file"|"$user_legacy_desktop_file"|"$user_mime_xml"|"$user_app_icon"|"$user_mime_icon"|"$user_mime_symbolic_icon"|"$system_bin_path"|"$system_desktop_file"|"$system_legacy_desktop_file"|"$system_mime_xml"|"$system_app_icon"|"$system_mime_icon"|"$system_mime_symbolic_icon")
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_allowed_dir_target() {
  local path="$1"
  case "$path" in
    "$user_metadata_root"|"$user_app_payload_root"|"$user_config_root"|"$system_metadata_root"|"$system_app_payload_root")
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
if [[ -e "$system_bin_path" || -e "$system_desktop_file" || -e "$system_legacy_desktop_file" || -e "$system_mime_xml" || -e "$system_app_icon" || -e "$system_mime_icon" || -e "$system_mime_symbolic_icon" ]]; then
  system_changes_required=true
fi
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

remove_file_if_exists "$user_bin_path" false
remove_file_if_exists "$user_desktop_file" false
remove_file_if_exists "$user_legacy_desktop_file" false
remove_file_if_exists "$user_mime_xml" false
remove_file_if_exists "$user_app_icon" false
remove_file_if_exists "$user_mime_icon" false
remove_file_if_exists "$user_mime_symbolic_icon" false

remove_file_if_exists "$system_bin_path" true
remove_file_if_exists "$system_desktop_file" true
remove_file_if_exists "$system_legacy_desktop_file" true
remove_file_if_exists "$system_mime_xml" true
remove_file_if_exists "$system_app_icon" true
remove_file_if_exists "$system_mime_icon" true
remove_file_if_exists "$system_mime_symbolic_icon" true

if [[ "$purge_managed_apps" == true ]]; then
  remove_dir_if_exists "$user_metadata_root" false
  remove_dir_if_exists "$user_app_payload_root" false
  remove_dir_if_exists "$user_config_root" false
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
