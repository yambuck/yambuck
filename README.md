# Yambuck

Yambuck makes Linux app distribution and installation dead simple for non-technical users, with a GUI-first cross-distro experience and optional CLI tooling, to help accelerate mainstream Linux adoption.

## Main Goal

The main goal is not to build another developer-focused packaging tool. The main goal is to make it easy for everyday users to install Linux apps safely and confidently.

Yambuck is Linux-first and GUI-first. The CLI is useful, but secondary.

For a single canonical summary of product goals/principles and trust constraints, see `docs/PRODUCT_CONTEXT.md`.

The UX target is a modern, step-by-step installer experience that feels familiar to users coming from Windows installers.

In practical terms, Yambuck focuses on:

- dead-simple install flow for non-technical users
- reliable app installation across Linux distributions
- GUI-first experience, with command-line support when needed
- easier app distribution for developers so users get a smoother install experience

## Problem

Today, Linux app distribution is fragmented across formats, package managers, distros, and user expectations. This creates friction for both developers and users, especially non-technical users who just want to download and install an app.

## Vision

Yambuck aims to provide a consistent system where users can:

1. Download an app package.
2. Open it in a familiar installer flow (GUI or CLI).
3. Install and run the app with minimal setup and confusion.

The distribution model is direct-download first: developers host their own `.yambuck` files (for example on GitHub releases or vendor sites), and users install those files with Yambuck.

And developers can:

1. Package applications once in a predictable format.
2. Distribute to users on different Linux distributions.
3. Provide a cleaner install and update experience.

## Scope (Early)

- Define a package format focused on cross-distro installability.
- Define installer/runtime behavior for GUI and CLI entry points.
- Define desktop integration expectations (icons, launchers, file associations).
- Define verification and trust model (integrity and signatures).
- Define an installed-apps view with uninstall support.
- Define a safe one-line bootstrap install flow for first-time setup.

## Product UX Principles

- Make installation understandable for non-technical users.
- Use a guided wizard flow instead of technical prompts.
- Keep visuals modern, clean, and consistent across desktop environments.
- Keep dangerous choices explicit and reversible where possible.

## Trust and Predictability Contract (MVP)

For Yambuck to succeed with non-technical users, installs must feel boringly reliable.

- If a `.yambuck` install reports success, the app must launch and remain visible in Yambuck until the user explicitly uninstalls it in Yambuck.
- Failed installs must never route to success UI. They must show a clear failed state with plain-language reason and copyable technical logs.
- Install and uninstall must be deterministic and ownership-safe:
  - Yambuck manages only Yambuck-installed apps.
  - Yambuck never mutates/removes apps installed by other methods (package manager, `.deb`, manual).
  - App list entries should not "magically disappear" unless changed by explicit Yambuck actions.
- Install paths should be Yambuck-managed roots (including a dedicated `yambuck` subdirectory per scope) to avoid cross-manager conflicts.
- The default installer flow should be highly standardized package-to-package (MSI-like familiarity): same core steps, same wording, minimal decisions.
- Advanced or app-specific options should be optional and collapsed by default so the normal path stays simple.

Core installer flow (v1):

1. Open package.
2. Show app and publisher details.
3. Show trust state (verified or unverified).
4. Choose install scope (`Just for me` or `All users`).
5. Install with clear progress and success state.

## V1 Decisions

- Primary workflow: install Yambuck once, then double-click `.yambuck` files.
- No required central store or hosting service in v1.
- GUI install flow is primary; CLI flow is optional parity.
- Default install choice is `Just for me`; `All users` is optional with elevation.
- Unsigned packages are allowed in MVP with a clear warning prompt.
- Yambuck includes an installed-apps view with uninstall actions.
- Distribution is direct-download only: vendors/devs host their own files.
- Bootstrap setup is a single command from the website, followed by GUI-first use.
- Update UX is user-controlled: notify clearly, then `Update and restart` or `Later`.
- Package identity includes both:
  - `app_id` (reverse-DNS, e.g. `com.voquill.app`)
  - `app_uuid` (immutable global UUID for future trust and reputation systems)
- Installed-apps UX should feel like a modern control-panel style manager:
  - searchable
  - sortable (at minimum by name/date installed)
  - filterable (at minimum by install scope)
  - clear ownership/status metadata per entry

## Implementation Direction

- Core language/runtime: Rust
- UI shell: Tauri (for modern, fully controlled cross-desktop UI)
- Architecture split:
  - `yambuck-core`: package parsing, install/uninstall, metadata, verification
  - `yambuck-gui`: installer and installed-apps UI
  - `yambuck-cli`: optional command interface that calls the same core logic

Voquill is the first reference app for end-to-end v1 testing via `voquill.yambuck`.

## Non-Goals (Right Now)

- Replacing all distro-native package systems.
- Solving every Linux runtime/sandbox problem in v1.
- Prioritizing CLI ergonomics over end-user install UX.
- Building an app store/catalog as a v1 requirement.
- Supporting Windows as a v1 target (possible future direction).

## Status

Pre-alpha. The project is in documentation and specification stage.

Website bootstrap commands:

- Install: `curl -fsSL https://yambuck.com/install.sh | bash`
- Uninstall (safe default): `curl -fsSL https://yambuck.com/uninstall.sh | bash`
- Uninstall (full purge): `curl -fsSL https://yambuck.com/uninstall.sh | bash -s -- --purge-managed-apps --yes`

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

## Initial Naming

- Project: `yambuck`
- Candidate package extension: `.yambuck`

These can be refined later if needed.
