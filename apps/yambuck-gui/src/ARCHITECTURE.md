# Yambuck GUI Architecture

This document defines the current frontend structure and where new code should go.

## High-Level Structure

- `App.tsx`: shell composition only (topbar, routing between pages, modal mounting).
- `features/*`: page-level and feature-specific UI components.
- `components/ui/*`: reusable, presentation-focused primitives.
- `hooks/*`: stateful orchestration and side-effect logic.
- `lib/tauri/api.ts`: typed invoke boundary to backend commands.
- `types/app.ts`: shared frontend domain models and discriminated UI state types.
- `theme/*`: design token source and CSS variable bootstrap.
- `utils/*`: pure utility functions with no UI/state side effects.

## Current Hook Responsibilities

- `useInstallerFlow`: package selection/open events, install flow steps, install progress/state.
- `useInstalledAppsManager`: installed list actions, app review details, uninstall wizard state/actions.
- `useUpdateManager`: update check/apply state and actions.
- `useDebugTools`: system info/log loading and copy/clear helpers.
- `useWindowControls`: custom titlebar drag and window control actions.
- `useToastManager`: toast queueing/dismiss lifecycle.

## Conventions

- Keep Tauri command calls out of components; call through hooks and `lib/tauri/api.ts`.
- Keep modals in `features/modals/*` with explicit props for all actions/state.
- Keep feature state local to hooks; avoid large state clusters directly in `App.tsx`.
- Keep visual constants in tokens (`theme/tokens.ts`) rather than inline literals where possible.
- Prefer small, composable hooks over monolithic orchestrators when adding new behavior.

## UX Invariants (Do Not Regress)

- Never route failed operations to success screens (install/update/uninstall).
- Success state is shown only after verification checks pass.
- Failure views always provide plain-language summary plus copyable technical details/logs.
- Keep window/titlebar controls accessible on modal-like flows; do not obscure native controls.
- Keep installer flow standardized package-to-package; optional advanced inputs stay collapsed by default.
- Installed Apps reflects Yambuck-managed ownership data and should not lose entries unless changed by explicit Yambuck actions.

## Next Backend Refactor Targets

- Split `apps/yambuck-gui/src-tauri/src/lib.rs` helpers into focused modules (`updates`, `logs`, `system`, `launch`).
- Split `crates/yambuck-core/src/lib.rs` into domain modules (`package`, `install`, `installed`, `update_feed`, `storage`).

## Verification

- Run `./scripts/verify-yambuck-gui.sh` before committing larger refactors.
- This script enforces the minimum safety checks:
  - `npm --prefix apps/yambuck-gui run build`
  - `cargo check --manifest-path apps/yambuck-gui/src-tauri/Cargo.toml`
