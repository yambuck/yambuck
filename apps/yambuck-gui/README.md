# Yambuck GUI

Desktop installer UI built with Tauri + Preact + TypeScript.

This app is the primary Yambuck user experience and should optimize for:

- simple, repeatable install/uninstall flows
- clear trust and failure states
- consistency with non-technical user expectations

## Common Commands

- Start Tauri dev app: `npm run tauri dev`
- Start frontend-only dev server: `npm run dev`
- Build frontend assets: `npm run build`
- Verify GUI build + Rust compile: `../../scripts/verify-yambuck-gui.sh`

## Architecture Notes

- Frontend architecture guide: `src/ARCHITECTURE.md`
- Tauri backend entrypoint: `src-tauri/src/lib.rs`
