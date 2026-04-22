#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Yambuck uninstall script

Usage:
  uninstall.sh [--system] [--purge-managed-apps] [--yes]

Options:
  --system              Remove system install paths (requires sudo)
  --purge-managed-apps  Also remove all Yambuck-managed app payloads and metadata
  --yes                 Skip confirmation prompts
  -h, --help            Show this help message

Examples:
  curl -fsSL https://yambuck.com/uninstall.sh | bash
  curl -fsSL https://yambuck.com/uninstall.sh | bash -s -- --purge-managed-apps --yes
EOF
}

log() {
  printf "[yambuck-uninstall] %s\n" "$*"
}

fail() {
  printf "[yambuck-uninstall] ERROR: %s\n" "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

optional_cmd() {
  command -v "$1" >/dev/null 2>&1
}

require_safe_path() {
  local path="$1"
  [[ -n "$path" ]] || fail "refusing empty path"
  [[ "$path" != "/" ]] || fail "refusing root path"
}

assert_expected_file_target() {
  local path="$1"
  if [[ "$install_system" == true ]]; then
    case "$path" in
      /usr/local/bin/yambuck|/usr/share/applications/yambuck.desktop|/usr/share/mime/packages/application-x-yambuck-package.xml|/usr/share/icons/hicolor/scalable/apps/com.yambuck.installer.svg|/usr/share/icons/hicolor/scalable/mimetypes/application-x-yambuck-package.svg)
        ;;
      *)
        fail "refusing unexpected file target: $path"
        ;;
    esac
  else
    case "$path" in
      "$HOME/.local/bin/yambuck"|"$HOME/.local/share/applications/yambuck.desktop"|"$HOME/.local/share/mime/packages/application-x-yambuck-package.xml"|"$HOME/.local/share/icons/hicolor/scalable/apps/com.yambuck.installer.svg"|"$HOME/.local/share/icons/hicolor/scalable/mimetypes/application-x-yambuck-package.svg")
        ;;
      *)
        fail "refusing unexpected file target: $path"
        ;;
    esac
  fi
}

assert_expected_dir_target() {
  local path="$1"
  if [[ "$install_system" == true ]]; then
    case "$path" in
      /var/lib/yambuck|/opt/yambuck/apps)
        ;;
      *)
        fail "refusing unexpected directory target: $path"
        ;;
    esac
  else
    case "$path" in
      "$HOME/.local/share/yambuck"|"$HOME/.local/share/yambuck/apps")
        ;;
      *)
        fail "refusing unexpected directory target: $path"
        ;;
    esac
  fi
}

install_system=false
purge_managed_apps=false
non_interactive=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --system)
      install_system=true
      ;;
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

if [[ "$install_system" == true ]]; then
  need_cmd sudo
  run_rm() {
    require_safe_path "$1"
    assert_expected_file_target "$1"
    sudo rm -f "$1"
  }
  run_rmrf() {
    require_safe_path "$1"
    assert_expected_dir_target "$1"
    sudo rm -rf "$1"
  }
else
  run_rm() {
    require_safe_path "$1"
    assert_expected_file_target "$1"
    rm -f "$1"
  }
  run_rmrf() {
    require_safe_path "$1"
    assert_expected_dir_target "$1"
    rm -rf "$1"
  }
fi

if [[ "$install_system" == true ]]; then
  bin_path="/usr/local/bin/yambuck"
  desktop_file="/usr/share/applications/yambuck.desktop"
  mime_xml="/usr/share/mime/packages/application-x-yambuck-package.xml"
  app_icon="/usr/share/icons/hicolor/scalable/apps/com.yambuck.installer.svg"
  mime_icon="/usr/share/icons/hicolor/scalable/mimetypes/application-x-yambuck-package.svg"
  icon_root="/usr/share/icons/hicolor"
  desktop_db_dir="/usr/share/applications"
  mime_root="/usr/share/mime"
  metadata_root="/var/lib/yambuck"
  app_payload_root="/opt/yambuck/apps"
else
  bin_path="${HOME}/.local/bin/yambuck"
  desktop_file="${HOME}/.local/share/applications/yambuck.desktop"
  mime_xml="${HOME}/.local/share/mime/packages/application-x-yambuck-package.xml"
  app_icon="${HOME}/.local/share/icons/hicolor/scalable/apps/com.yambuck.installer.svg"
  mime_icon="${HOME}/.local/share/icons/hicolor/scalable/mimetypes/application-x-yambuck-package.svg"
  icon_root="${HOME}/.local/share/icons/hicolor"
  desktop_db_dir="${HOME}/.local/share/applications"
  mime_root="${HOME}/.local/share/mime"
  metadata_root="${HOME}/.local/share/yambuck"
  app_payload_root="${HOME}/.local/share/yambuck/apps"
fi

log "Preparing uninstall"
log "Mode: $([[ "$install_system" == true ]] && printf "system" || printf "user")"
log "Will remove:"
log "- ${bin_path}"
log "- ${desktop_file}"
log "- ${mime_xml}"
log "- ${app_icon}"
log "- ${mime_icon}"

if [[ "$purge_managed_apps" == true ]]; then
  log "Purge enabled; will also remove:"
  log "- ${metadata_root}"
  log "- ${app_payload_root}"
fi

if [[ "$non_interactive" == false ]]; then
  printf "Proceed with uninstall? [y/N] "
  read -r answer
  if [[ "${answer:-}" != "y" && "${answer:-}" != "Y" ]]; then
    fail "uninstall cancelled"
  fi

  if [[ "$purge_managed_apps" == true ]]; then
    printf "Type REMOVE ALL to purge all Yambuck-managed apps and metadata: "
    read -r confirm_purge
    if [[ "${confirm_purge:-}" != "REMOVE ALL" ]]; then
      fail "purge confirmation failed"
    fi
  fi
else
  log "Non-interactive mode detected"
fi

remove_if_exists() {
  local path="$1"
  if [[ -e "$path" || -L "$path" ]]; then
    log "Removing ${path}"
    run_rm "$path"
  fi
}

remove_dir_if_exists() {
  local path="$1"
  if [[ -d "$path" ]]; then
    log "Removing ${path}"
    run_rmrf "$path"
  fi
}

remove_if_exists "$bin_path"
remove_if_exists "$desktop_file"
remove_if_exists "$mime_xml"
remove_if_exists "$app_icon"
remove_if_exists "$mime_icon"

if [[ "$purge_managed_apps" == true ]]; then
  remove_dir_if_exists "$metadata_root"
  remove_dir_if_exists "$app_payload_root"
fi

if optional_cmd update-mime-database; then
  log "Refreshing MIME database"
  if [[ "$install_system" == true ]]; then
    sudo update-mime-database "$mime_root" >/dev/null 2>&1 || true
  else
    update-mime-database "$mime_root" >/dev/null 2>&1 || true
  fi
fi

if optional_cmd update-desktop-database; then
  log "Refreshing desktop database"
  if [[ "$install_system" == true ]]; then
    sudo update-desktop-database "$desktop_db_dir" >/dev/null 2>&1 || true
  else
    update-desktop-database "$desktop_db_dir" >/dev/null 2>&1 || true
  fi
fi

if optional_cmd gtk-update-icon-cache; then
  log "Refreshing icon cache"
  if [[ "$install_system" == true ]]; then
    sudo gtk-update-icon-cache -f -t "$icon_root" >/dev/null 2>&1 || true
  else
    gtk-update-icon-cache -f -t "$icon_root" >/dev/null 2>&1 || true
  fi
fi

log "Uninstall complete"
if [[ "$purge_managed_apps" == true ]]; then
  log "Yambuck and all Yambuck-managed app payloads/metadata were removed."
else
  log "Yambuck was removed. Managed apps were left intact."
fi
