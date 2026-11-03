#!/usr/bin/env bash
set -euo pipefail

echo "[verify] Building yambuck-gui frontend"
npm --prefix apps/yambuck-gui run build

echo "[verify] Checking Tauri backend"
cargo check --workspace

echo "[verify] OK"
