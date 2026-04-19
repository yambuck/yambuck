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
- Update flow is user-controlled: `Update and restart` or `Later`
- Users are always informed of update progress and outcomes
- Yambuck only manages Yambuck-installed apps; no cross-manager mutation
- Existing Yambuck-managed app updates use clean replace (remove then reinstall)
- Success UI is only shown after verification passes
- Failed installs always show dedicated failure UI with copyable logs and retry path
- Default install flow remains highly standardized with minimal decisions
- Any app-specific install inputs (if supported) belong behind optional "Advanced" UI
- Compatibility should be checked early in the flow (before install execution) with clear unsupported-system messaging

## Update Source (v1)

- Latest update metadata is published at `https://yambuck.com/updates/stable.json`
- Feed points to immutable GitHub Release artifacts
- No silent background auto-update in v1

Current implementation status:

- in-app apply flow currently targets user installs first
- system install update path with elevation remains planned work

## Security/Trust (v1)

- Unsigned packages are allowed during MVP
- Unverified packages must show explicit warning with `Cancel` and `Install anyway`
- Bootstrap and installer should verify artifacts/integrity where applicable
- Yambuck-managed payloads should live in dedicated scope-specific roots that include a `yambuck` subdirectory
- Installed-app entries should be ownership-backed and only change via explicit Yambuck install/uninstall actions
- Uninstall must never remove/modify non-Yambuck installations (even when app names overlap)

Future direction:

- signatures and stronger trust defaults
- reputation/allowlist features

## Package Identity

Manifest uses dual identity:

- `appId` (required, reverse-DNS, stable): human-readable identity (e.g. `com.voquill.app`)
- `appUuid` (required, immutable): global machine identity for future trust/reputation
- `packageUuid` (required, immutable): unique package artifact/build identity

Field naming note:

- manifest schema fields are canonical camelCase (`appId`, `packageUuid`) as defined in `docs/SPEC.md`
- manifest keys are canonical camelCase; snake_case and kebab-case manifest keys should fail validation with actionable error text

## Multi-Architecture Package Direction (v1)

- Single `.yambuck` files may include multiple architecture payloads
- Installer selects the host-matching payload automatically
- Unsupported architecture/target combinations must fail early with clear plain-language feedback
- Yambuck should install/manage only the selected host payload artifacts

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

## Installed Apps UX Direction (v1)

- UI should resemble a modern control-panel app manager experience:
  - searchable installed list
  - sortable fields (minimum: name and install date)
  - scope filter (`user` vs `all users`)
  - clear visibility of status/scope/location metadata
