#!/usr/bin/env bash
set -euo pipefail

REPO="yambuck/yambuck"
DEFAULT_CHANNEL="latest"
BIN_NAME="yambuck"

usage() {
  cat <<'EOF'
Yambuck bootstrap installer

Usage:
  install.sh [--system] [--version <tag>] [--channel latest|stable] [--yes] [--insecure-skip-verify]

Options:
  --system                Install into /usr/local/bin (requires sudo)
  --version <tag>         Install specific release tag (for example v0.1.0)
  --channel <name>        Release channel (default: latest)
  --yes                   Skip interactive confirmation prompts
  --insecure-skip-verify  Skip checksum verification (not recommended)
  -h, --help              Show this help message

Environment overrides:
  YAMBUCK_INSTALL_URL     Full tarball URL override
  YAMBUCK_CHECKSUM_URL    Full checksum URL override
EOF
}

log() {
  printf "[yambuck] %s\n" "$*"
}

fail() {
  printf "[yambuck] ERROR: %s\n" "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

optional_cmd() {
  command -v "$1" >/dev/null 2>&1
}

guard_install_dir() {
  local path="$1"
  if [[ -z "$path" || "$path" == "/" ]]; then
    fail "refusing unsafe install dir: ${path:-<empty>}"
  fi

  if [[ "$install_system" == true ]]; then
    [[ "$path" == "/usr/local/bin" ]] || fail "unexpected system install dir: $path"
  else
    [[ "$path" == "${HOME}/.local/bin" ]] || fail "unexpected user install dir: $path"
  fi
}

resolve_arch() {
  local arch
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64) printf "x86_64" ;;
    aarch64|arm64) printf "aarch64" ;;
    *) fail "unsupported architecture: $arch" ;;
  esac
}

write_branded_icon_svg() {
  cat <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#153f66"/>
      <stop offset="1" stop-color="#081322"/>
    </linearGradient>
    <linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#61d7ff"/>
      <stop offset="1" stop-color="#55f0c0"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#bg)"/>
  <g transform="translate(-20.48 -20.48) scale(1.32)">
    <path d="M29 36h30l16 20H45z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
    <path d="M75 36h24L69 92H45z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
    <path d="M29 92h30l16-20H45z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="93" cy="34" r="7" fill="none" stroke="#ffffff" stroke-width="3"/>
    <circle cx="93" cy="94" r="7" fill="none" stroke="#ffffff" stroke-width="3"/>

    <path d="M29 36h30l16 20H45z" fill="#1b4e72"/>
    <path d="M75 36h24L69 92H45z" fill="url(#ribbon)"/>
    <path d="M29 92h30l16-20H45z" fill="#10324e"/>
    <circle cx="93" cy="34" r="7" fill="#63d8ff"/>
    <circle cx="93" cy="94" r="7" fill="#55f0c0"/>
  </g>
  <rect x="1" y="1" width="126" height="126" rx="23" fill="none" stroke="#97c3e7" stroke-opacity="0.34" stroke-width="2"/>
</svg>
EOF
}

install_system=false
non_interactive=false
skip_verify=false
version=""
channel="$DEFAULT_CHANNEL"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --system)
      install_system=true
      ;;
    --version)
      [[ $# -ge 2 ]] || fail "--version requires a value"
      version="$2"
      shift
      ;;
    --channel)
      [[ $# -ge 2 ]] || fail "--channel requires a value"
      channel="$2"
      shift
      ;;
    --yes)
      non_interactive=true
      ;;
    --insecure-skip-verify)
      skip_verify=true
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

need_cmd curl
need_cmd tar

if [[ ! -t 0 ]]; then
  non_interactive=true
fi

arch="$(resolve_arch)"
os="linux"

if [[ -z "$version" ]]; then
  if [[ "$channel" == "latest" || "$channel" == "stable" ]]; then
    version="latest"
  else
    fail "unsupported channel: $channel"
  fi
fi

if [[ "$install_system" == true ]]; then
  install_dir="/usr/local/bin"
else
  install_dir="${HOME}/.local/bin"
fi
guard_install_dir "$install_dir"

if [[ -n "${YAMBUCK_INSTALL_URL:-}" ]]; then
  asset_url="$YAMBUCK_INSTALL_URL"
else
  if [[ "$version" == "latest" ]]; then
    asset_url="https://github.com/${REPO}/releases/latest/download/yambuck-${os}-${arch}.tar.gz"
  else
    asset_url="https://github.com/${REPO}/releases/download/${version}/yambuck-${os}-${arch}.tar.gz"
  fi
fi

if [[ -n "${YAMBUCK_CHECKSUM_URL:-}" ]]; then
  checksum_url="$YAMBUCK_CHECKSUM_URL"
else
  checksum_url="${asset_url}.sha256"
fi

log "Preparing Yambuck install"
log "Target directory: ${install_dir}"
log "Asset URL: ${asset_url}"

if [[ "$non_interactive" == false ]]; then
  printf "Proceed with installation? [y/N] "
  read -r answer
  if [[ "${answer:-}" != "y" && "${answer:-}" != "Y" ]]; then
    fail "installation cancelled"
  fi
else
  log "Non-interactive mode detected, continuing automatically"
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

archive_path="${tmp_dir}/yambuck.tar.gz"
checksum_path="${tmp_dir}/yambuck.sha256"

log "Downloading release artifact"
if ! curl -fL --retry 3 --connect-timeout 15 -o "$archive_path" "$asset_url"; then
  fail "download failed. No release artifact was found for this target yet.\nTry local development run:\n  git clone https://github.com/${REPO}\n  cd yambuck/apps/yambuck-gui\n  npm install\n  npm run tauri dev"
fi

if [[ "$skip_verify" == false ]]; then
  need_cmd sha256sum
  log "Downloading checksum"
  curl -fL --retry 3 --connect-timeout 15 -o "$checksum_path" "$checksum_url" || fail "checksum download failed"
  expected="$(awk '{print $1}' "$checksum_path" | head -n1)"
  actual="$(sha256sum "$archive_path" | awk '{print $1}')"
  [[ -n "$expected" ]] || fail "checksum file invalid"
  [[ "$expected" == "$actual" ]] || fail "checksum mismatch"
  log "Checksum verified"
else
  log "WARNING: checksum verification disabled"
fi

extract_dir="${tmp_dir}/extract"
mkdir -p "$extract_dir"
tar -xzf "$archive_path" -C "$extract_dir"

candidate_bin=""
if [[ -x "${extract_dir}/${BIN_NAME}" ]]; then
  candidate_bin="${extract_dir}/${BIN_NAME}"
elif [[ -x "${extract_dir}/bin/${BIN_NAME}" ]]; then
  candidate_bin="${extract_dir}/bin/${BIN_NAME}"
else
  candidate_bin="$(find "$extract_dir" -maxdepth 3 -type f -name "$BIN_NAME" -perm -u+x | head -n1 || true)"
fi

[[ -n "$candidate_bin" ]] || fail "downloaded archive did not contain ${BIN_NAME} binary"
[[ -f "$candidate_bin" ]] || fail "downloaded archive candidate is not a file"
[[ -x "$candidate_bin" ]] || fail "downloaded archive candidate is not executable"

if [[ "$install_system" == true ]]; then
  need_cmd sudo
  need_cmd install
  log "Installing binary with sudo"
  sudo install -d "$install_dir"
  sudo install -m 0755 "$candidate_bin" "${install_dir}/${BIN_NAME}"
else
  need_cmd install
  log "Installing binary"
  install -d "$install_dir"
  install -m 0755 "$candidate_bin" "${install_dir}/${BIN_NAME}"
fi

installed_bin="${install_dir}/${BIN_NAME}"
[[ -x "$installed_bin" ]] || fail "installed binary is missing or not executable at ${installed_bin}"

desktop_file_name="com.yambuck.installer.desktop"
mime_xml_name="application-x-yambuck-package.xml"
desktop_icon_name="com.yambuck.installer"
mime_icon_name="application-x-yambuck-package"

if [[ "$install_system" == true ]]; then
  desktop_dir="/usr/share/applications"
  mime_packages_dir="/usr/share/mime/packages"
  icon_apps_dir="/usr/share/icons/hicolor/scalable/apps"
  icon_mime_dir="/usr/share/icons/hicolor/scalable/mimetypes"
  yambuck_exec="${install_dir}/${BIN_NAME}"

  log "Installing branded icons"
  sudo install -d "$icon_apps_dir" "$icon_mime_dir"
  write_branded_icon_svg | sudo tee "${icon_apps_dir}/${desktop_icon_name}.svg" >/dev/null
  write_branded_icon_svg | sudo tee "${icon_mime_dir}/${mime_icon_name}.svg" >/dev/null

  log "Installing desktop launcher"
  sudo install -d "$desktop_dir"
  sudo tee "${desktop_dir}/${desktop_file_name}" >/dev/null <<EOF
[Desktop Entry]
Name=Yambuck
Comment=Install .yambuck application packages
Exec=${yambuck_exec} %F
Terminal=false
Type=Application
Icon=${desktop_icon_name}
Categories=Utility;PackageManager;
MimeType=application/x-yambuck-package;
StartupNotify=true
EOF

  log "Installing MIME type definition"
  sudo install -d "$mime_packages_dir"
  sudo tee "${mime_packages_dir}/${mime_xml_name}" >/dev/null <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns='http://www.freedesktop.org/standards/shared-mime-info'>
  <mime-type type="application/x-yambuck-package">
    <comment>Yambuck package</comment>
    <icon name="application-x-yambuck-package"/>
    <glob pattern="*.yambuck"/>
  </mime-type>
</mime-info>
EOF
else
  desktop_dir="${HOME}/.local/share/applications"
  mime_packages_dir="${HOME}/.local/share/mime/packages"
  icon_apps_dir="${HOME}/.local/share/icons/hicolor/scalable/apps"
  icon_mime_dir="${HOME}/.local/share/icons/hicolor/scalable/mimetypes"
  yambuck_exec="${install_dir}/${BIN_NAME}"

  log "Installing branded icons"
  install -d "$icon_apps_dir" "$icon_mime_dir"
  write_branded_icon_svg > "${icon_apps_dir}/${desktop_icon_name}.svg"
  write_branded_icon_svg > "${icon_mime_dir}/${mime_icon_name}.svg"

  log "Installing desktop launcher"
  install -d "$desktop_dir"
  cat > "${desktop_dir}/${desktop_file_name}" <<EOF
[Desktop Entry]
Name=Yambuck
Comment=Install .yambuck application packages
Exec=${yambuck_exec} %F
Terminal=false
Type=Application
Icon=${desktop_icon_name}
Categories=Utility;PackageManager;
MimeType=application/x-yambuck-package;
StartupNotify=true
EOF

  log "Installing MIME type definition"
  install -d "$mime_packages_dir"
  cat > "${mime_packages_dir}/${mime_xml_name}" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns='http://www.freedesktop.org/standards/shared-mime-info'>
  <mime-type type="application/x-yambuck-package">
    <comment>Yambuck package</comment>
    <icon name="application-x-yambuck-package"/>
    <glob pattern="*.yambuck"/>
  </mime-type>
</mime-info>
EOF
fi

if optional_cmd gtk-update-icon-cache; then
  log "Refreshing icon cache"
  if [[ "$install_system" == true ]]; then
    sudo gtk-update-icon-cache -f -t /usr/share/icons/hicolor >/dev/null 2>&1 || true
  else
    gtk-update-icon-cache -f -t "${HOME}/.local/share/icons/hicolor" >/dev/null 2>&1 || true
  fi
fi

if optional_cmd update-mime-database; then
  log "Refreshing MIME database"
  if [[ "$install_system" == true ]]; then
    sudo update-mime-database /usr/share/mime >/dev/null 2>&1 || true
  else
    update-mime-database "${HOME}/.local/share/mime" >/dev/null 2>&1 || true
  fi
fi

if optional_cmd update-desktop-database; then
  log "Refreshing desktop database"
  if [[ "$install_system" == true ]]; then
    sudo update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
  else
    update-desktop-database "${HOME}/.local/share/applications" >/dev/null 2>&1 || true
  fi
fi

if optional_cmd xdg-mime; then
  log "Registering default handler for .yambuck files"
  xdg-mime default "$desktop_file_name" application/x-yambuck-package >/dev/null 2>&1 || true
fi

if [[ ":$PATH:" != *":${install_dir}:"* ]]; then
  log "${install_dir} is not currently in PATH"
  log "Add this line to your shell profile and restart terminal:"
  log "  export PATH=\"${install_dir}:\$PATH\""
fi

log "Installation complete"
log "Run: ${BIN_NAME}"
log "You can now open .yambuck files with Yambuck"
