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

resolve_arch() {
  local arch
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64) printf "x86_64" ;;
    aarch64|arm64) printf "aarch64" ;;
    *) fail "unsupported architecture: $arch" ;;
  esac
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

if [[ "$install_system" == true ]]; then
  need_cmd sudo
  log "Installing binary with sudo"
  sudo install -d "$install_dir"
  sudo install -m 0755 "$candidate_bin" "${install_dir}/${BIN_NAME}"
else
  log "Installing binary"
  install -d "$install_dir"
  install -m 0755 "$candidate_bin" "${install_dir}/${BIN_NAME}"
fi

if [[ ":$PATH:" != *":${install_dir}:"* ]]; then
  log "${install_dir} is not currently in PATH"
  log "Add this line to your shell profile and restart terminal:"
  log "  export PATH=\"${install_dir}:\$PATH\""
fi

log "Installation complete"
log "Run: ${BIN_NAME} --help"
