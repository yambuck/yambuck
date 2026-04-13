# Yambuck Decisions Log (Current)

This file captures currently agreed product and technical decisions so future chats can continue without restating context.

## Mission

Yambuck exists to make Linux app distribution and installation dead simple for non-technical users, and to reduce friction that blocks Linux adoption.

## Product Positioning

- Linux-first
- GUI-first
- CLI is optional/secondary
- Consumer-style installer UX (familiar, guided, modern)

## Distribution Model (v1)

- Direct-download packages (`.yambuck`)
- Developers/vendors host files themselves (e.g. GitHub releases, vendor websites)
- No central store or required hosted backend in v1

## Core User Experience (v1)

- Install Yambuck once (bootstrap)
- Double-click `.yambuck` file to open installer
- Installer offers:
  - `Just for me` (default)
  - `All users` (optional, elevated)
- Installed-apps screen includes uninstall
- Optional checkbox to remove user config/data on uninstall

## Security/Trust (v1)

- Unsigned packages are allowed during MVP
- Unverified packages must show explicit warning with `Cancel` and `Install anyway`
- Bootstrap and installer should verify artifacts/integrity where applicable

Future direction:

- signatures and stronger trust defaults
- reputation/allowlist features

## Package Identity

Manifest uses dual identity:

- `app_id` (required, reverse-DNS, stable): human-readable identity (e.g. `com.voquill.app`)
- `app_uuid` (required, immutable): global machine identity for future trust/reputation
- `package_uuid` (optional): unique artifact/build id

## Architecture Direction

- Rust core logic
- Tauri GUI shell (modern, fully controlled look/feel)
- Shared core APIs for GUI and CLI

Planned split:

- `yambuck-core`
- `yambuck-gui`
- `yambuck-cli`

## Validation Targets

Initial distro targets:

- Ubuntu/Debian-based
- Fedora-based
- Arch-based

Reference validation app:

- Voquill (`voquill.yambuck`)

## Explicit Non-Goals (v1)

- replacing distro package managers/repositories
- central app store requirement
- Windows support in MVP
- prioritizing CLI over GUI
