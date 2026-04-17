#!/usr/bin/env bash
set -euo pipefail

echo "[verify] Building yambuck-gui frontend"
npm --prefix apps/yambuck-gui run build

echo "[verify] Checking Tauri backend"
cargo check --manifest-path apps/yambuck-gui/src-tauri/Cargo.toml

echo "[verify] OK"
