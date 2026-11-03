#!/usr/bin/env bash
# Runs inside the Linux release container (see Containerfile).
#   /src   - the host repository, mounted read-only
#   /out   - receives the yambuck binary, version.txt and example-app.yambuck
#   /cache - persistent volume for Cargo registry, build targets and npm cache
set -euo pipefail

cargo_registry_cache=/cache/cargo-registry
export npm_config_cache=/cache/npm
mkdir -p "$cargo_registry_cache" /cache/target "$npm_config_cache"
ln -sfn "$cargo_registry_cache" "${CARGO_HOME}/registry"

# Build from a fresh copy of the working tree: tracked plus untracked,
# non-ignored files only, so host node_modules/target never leak in.
git config --global --add safe.directory /src
rm -rf /build
mkdir -p /build
git -C /src ls-files -z --cached --others --exclude-standard \
    | rsync -a --from0 --files-from=- --ignore-missing-args /src/ /build/

cd /build

# Yambuck itself. The tarball ships the plain release binary (no Tauri
# bundle), built the same way the pre-standard release script built it.
export CARGO_TARGET_DIR=/cache/target/yambuck-gui
npm --prefix apps/yambuck-gui ci
npm --prefix apps/yambuck-gui run build
cargo build --release --locked --features custom-protocol \
    --manifest-path apps/yambuck-gui/src-tauri/Cargo.toml
binary="${CARGO_TARGET_DIR}/release/yambuck-gui"

# The demo package attached to every release (install page "Download Example
# Package" button).
CARGO_TARGET_DIR=/cache/target/example-app ./scripts/build-example-app-yambuck.sh

rm -rf /out/yambuck /out/version.txt /out/example-app.yambuck
install -m 0755 "$binary" /out/yambuck
# package-release.mjs checks this against the configured release version.
/out/yambuck --version > /out/version.txt
cp release-artifacts/packages/example-app.yambuck /out/example-app.yambuck

echo "Linux release build written to /out: $(cat /out/version.txt) (glibc $(ldd --version | head -n1 | awk '{print $NF}'))"
