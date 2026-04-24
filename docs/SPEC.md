# Yambuck v1 Specification

Package authoring note:

- If you are building `.yambuck` files, use `docs/PACKAGE_SPEC.md` as your primary reference.
- This document is the full product/runtime spec (installer behavior, trust contract, ownership rules, update model, and platform behavior).

Product intent and positioning are owned by `docs/PRODUCT_CONTEXT.md`.

## v1 User Experience Contract

1. User installs Yambuck once from the website bootstrap command.
2. User downloads a `.yambuck` file from a publisher website or release page.
3. User opens the file in Yambuck.
4. Yambuck shows rich package details (icon, description, screenshots where available), trust state, and install scope.
5. User installs with a guided flow.
6. User can later view installed apps and uninstall from Yambuck.

Compatibility preflight requirement:

- Before install execution, Yambuck checks package compatibility for host architecture/target.
- If unsupported, install is blocked with clear plain-language reason and optional technical details.

Additional UX contract constraints:

- Success state is only shown after install verification passes.
- Failed installs always route to a dedicated failure screen (never to success UI).
- Failure screen includes:
  - short plain-language summary
  - technical logs in a copy-friendly block
  - recovery actions (`Retry`, `Copy logs`, `Open logs`)
- Default install flow is consistent package-to-package with minimal user decisions.
- Any app-specific install inputs (if supported) are constrained and shown in an "Advanced" section by default.

Time standard:

- Canonical timestamps for logs, copied diagnostics, and exported error details must use ISO 8601 / RFC 3339 with milliseconds and explicit numeric offset.
- Example canonical timestamp: `2026-04-19T14:32:10.123+01:00`.
- UI may present a friendlier local display, but copy/export payloads must include the canonical timestamp value.
- Installer/runtime record fields such as `installedAt` must store canonical timestamps.

## Architecture Direction

- Rust core for package/install/update logic
- Tauri GUI shell for modern, consistent cross-desktop UI
- Shared core APIs used by GUI and CLI

Current structure:

- `crates/yambuck-core`
- `apps/yambuck-gui`
- `yambuck-cli` planned as secondary interface

## Package Format (Locked Direction)

Canonical package-authoring rules live in `docs/PACKAGE_SPEC.md`.

This section keeps only runtime expectations that interact with install behavior.

- v1 packaging is bundle-first.
- Installer/runtime behavior must treat package identity and validation results as hard gates.
- Multi-architecture support is a v1 direction and is enforced through compatibility preflight rules in this spec.

### Install Model

- Yambuck installs package contents into managed install paths.
- This is install-first (not portable-first) for v1.
- Portable/run-without-install mode is a future enhancement.
- Yambuck manages only Yambuck-installed apps; it does not modify apps installed by other package systems.
- Managed install roots should be explicit per scope and use a dedicated `yambuck` subdirectory to avoid path conflicts with non-Yambuck installs.
- Install execution should be transactional where possible (all-or-rollback behavior on failure).

## Manifest Specification (v1)

For package authoring details (field-by-field requirements, media constraints, and examples), see `docs/PACKAGE_SPEC.md`.

This section keeps runtime decision semantics only.

### Versioning and Compatibility

- Unknown manifest major versions are rejected.
- New optional fields may be added in backward-compatible minor/patch updates.
- `minInstallerVersion` may be provided by packages that require newer Yambuck behavior.

### Identity

- Install/update decisions rely on package identity continuity (`appId` + `appUuid`), with `packageUuid` representing artifact identity.

## Rich Install Preview Requirements

When opening a package, Yambuck should be able to show:

- app name
- publisher
- version
- description
- icon
- screenshots
- trust state (`verified` or `unverified`)

UI behavior:

- `description` is the quick summary shown at a glance and is truncated in preview UI at 500 characters with `...`.
- `longDescription` is required and is shown as plain text with paragraph breaks for deeper context.
- `licenseFile` (if present) is viewable in-app from bundled package content, without internet access.
- when `requiresLicenseAcceptance` is `true`, installer requires explicit acceptance before install can continue.
- `screenshots` is required with at least 1 image and installer preview renders up to 6 screenshots.

Media and manifest validation rules are owned by `docs/PACKAGE_SPEC.md`.

## Installation and Uninstallation

### Scope

- Default: `Just for me` (user scope)
- Optional: `All users` (system scope with elevation)

### Installed apps experience

- list installed apps
- show app/version/scope/status/install date/install location
- uninstall action
- optional remove user data/config checkbox
- provide search, sorting, and scope filtering in a control-panel-like management view

### Ownership and conflict policy (v1)

- If an app with the same `appId` is already tracked by Yambuck, install decision is evaluated using both `appId` and `appUuid`.
- `appId` + `appUuid` match:
  - incoming version higher => `update`
  - incoming version equal => `reinstall`
  - incoming version lower => `downgrade` (requires explicit confirmation)
- `appId` matches and `appUuid` differs => hard block (`identity mismatch`).
- Update/reinstall execution uses transactional replace with rollback on failure.
- If same `appId` appears to be installed outside Yambuck ownership, Yambuck blocks install and tells the user to uninstall with their original package manager first.
- For managed reinstall flows, optional data wipe is allowed but must require explicit destructive confirmation before execution.

Install decision table (v1):

| Condition | Action | User-facing behavior |
|---|---|---|
| No Yambuck-managed record for `appId` | `new install` | Standard install flow |
| Managed record exists, `appId` + `appUuid` match, incoming version `>` installed | `update` | Update messaging and replace flow |
| Managed record exists, `appId` + `appUuid` match, incoming version `=` installed | `reinstall` | Reinstall messaging; optional wipe controls |
| Managed record exists, `appId` + `appUuid` match, incoming version `<` installed | `downgrade` | Block by default until explicit downgrade confirmation |
| Managed record exists, `appId` matches but `appUuid` differs | `blocked identity mismatch` | Hard block with identity mismatch message |
| External install indicator exists and no managed record | `external conflict` | Hard block; direct user to uninstall via original manager first |

### Install index

- Yambuck keeps its own local install index for reliable uninstall/update behavior.
- Each install should persist enough ownership metadata (receipt/manifest-derived data) to support deterministic uninstall and list integrity.
- Installed Apps should remain informative even when the original downloaded `.yambuck` file is deleted.
- Yambuck should persist the metadata/assets required for Installed Apps presentation (icon, screenshots, core manifest fields) in Yambuck-managed state.

## Desktop Integration (v1 direction)

- launcher/menu entry creation
- icon registration
- `.yambuck` file association to Yambuck
- uninstall visibility

## Trust and Security

### MVP policy

- unsigned packages are allowed
- unverified packages must show explicit warning and user choice:
  - `Cancel`
  - `Install anyway`
- package integrity checks are required before install proceeds
- manifest schema validation failures are hard-fail with readable error output
- installer must block unsafe extraction/write behavior (path traversal, symlink escape, writes outside approved roots)

### Future policy

- signatures by default
- app reputation/allowlist/revocation systems using `appUuid` and signing identity continuity

## Bootstrap Installation (Yambuck itself)

- Website one-liner installs Yambuck binary.
- Website one-liner uninstall removes Yambuck safely; optional purge mode removes Yambuck-managed app payloads.
- Verification (checksum) is required by default.
- Per-user install is default; system install is explicit.
- Re-running bootstrap should safely replace existing binary for updates.

## Self-Update Model (v1)

- checks on startup and manual check action
- user-controlled updates only (no silent auto-update)
- `Update and restart` / `Later`
- update metadata source: `https://yambuck.com/updates/stable.json`
- feed points to immutable GitHub Release artifact URLs + checksums
- in-app apply flow must support both user installs and system installs (with elevation when required)

## Compatibility and Targets

### Product goal

- Users should not have to understand distro packaging differences.
- If package is valid and targeted for the user system, install/run should be predictable.

### v1 targeting direction

- Start with mainstream Linux desktop targets and bundled payloads.
- Initial validation families:
  - Debian/Ubuntu-based
  - Fedora-based
  - Arch-based
- Reference app for end-to-end validation: `Voquill`.

## Out of Scope (v1)

- central app store requirement
- replacing distro-native package managers
- mandatory signing infrastructure on day one
- Windows support
- portable-first app execution mode

## Release and Update Operations

Operational release process is documented in:

- `docs/RELEASE_RUNBOOK.md`
- `docs/UPDATES_SPEC.md`
