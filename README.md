# Yambuck

I built Yambuck to make Linux app installation feel normal for everyday people.

After shipping my own desktop apps, I kept hitting the same wall: Linux distribution is fragmented, the install story changes distro-to-distro, and normal users are forced to think about package formats and internals they should never need to care about.

Yambuck is my answer to that. It is Linux-first and GUI-first. CLI support is planned, but today the real product surface is the GUI installer and app manager.

## Why I Built Yambuck

I did not start this as a packaging science project. I started it because the current experience is too inconsistent for non-technical users, especially when apps are distributed outside app stores.

What I want instead is straightforward:

- download an app
- open it
- review what it is and who published it
- choose scope
- install with clear outcomes

If Yambuck says install succeeded, it should be installed, launchable, and stay visible in Yambuck until explicitly uninstalled.

Yambuck is Linux-first and GUI-first. CLI is a planned secondary surface, not the current focus.

## Read This Next

- Product intent and governance: `docs/PRODUCT_CONTEXT.md`
- Runtime/application technical contract: `docs/SPEC.md`
- Package authoring contract for `.yambuck`: `docs/PACKAGE_SPEC.md`
- Active work queue: `TODO.md`

## Implementation Direction

- Core language/runtime: Rust
- UI shell: Tauri (for modern, fully controlled cross-desktop UI)
- Architecture split:
  - `yambuck-core`: package parsing, install/uninstall, metadata, verification
  - `yambuck-gui`: installer and installed-apps UI
  - `yambuck-cli`: planned secondary interface

Voquill is the first reference app for end-to-end v1 testing via `voquill.yambuck`.

## Status

Pre-alpha with a working end-to-end prototype flow (bootstrap, user-scope install/uninstall, update feed wiring), plus active reliability and UX hardening in progress.

Website bootstrap commands:

- Install: `curl -fsSL https://yambuck.com/install.sh | bash`
- Uninstall (safe default): `curl -fsSL https://yambuck.com/uninstall.sh | bash`
- Uninstall (full purge): `curl -fsSL https://yambuck.com/uninstall.sh | bash -s -- --remove-all-apps --yes`

## Common Commands

- Start desktop dev app with Tauri + Vite HMR: `npm --prefix apps/yambuck-gui run tauri dev`
- Start frontend-only dev server: `npm --prefix apps/yambuck-gui run dev`
- Build frontend bundle: `npm --prefix apps/yambuck-gui run build`
- Check Rust/Tauri compile status: `cargo check --manifest-path apps/yambuck-gui/src-tauri/Cargo.toml`
- Build real example test package: `./scripts/build-example-app-yambuck.sh`
- Run one-command example package smoke flow: `./scripts/smoke-example-app.sh`
- Build release artifact + checksum: `./scripts/package-bootstrap-artifact.sh`
- Prepare full release bundle (main + example + feed updates): `./scripts/release-all.sh --version 0.1.23`

## Brand Assets

- Master icon files live in `assets/branding/`:
  - `assets/branding/yambuck-icon-app.svg` (app icon source, with background)
  - `assets/branding/yambuck-icon-mark.svg` (website/favicon mark, transparent)
- Regenerate Tauri app icon outputs from the SVG source:
  - `npm --prefix apps/yambuck-gui run tauri icon src-tauri/icons/icon-source.svg`
