# Yambuck v1 Specification

## Mission

Yambuck makes Linux app distribution and installation dead simple for non-technical users, with a GUI-first cross-distro experience and optional CLI tooling, to help accelerate mainstream Linux adoption.

This mission is the primary design constraint for all technical choices.

## Product Position

- Linux-first, GUI-first product
- Direct-download model (developer-hosted `.yambuck` files)
- No required central store/repository
- Optional CLI support, secondary to GUI
- Familiar installer UX inspired by mainstream consumer installers

## v1 User Experience Contract

1. User installs Yambuck once from the website bootstrap command.
2. User downloads a `.yambuck` file from a publisher website or release page.
3. User opens the file in Yambuck.
4. Yambuck shows rich package details (icon, description, screenshots where available), trust state, and install scope.
5. User installs with a guided flow.
6. User can later view installed apps and uninstall from Yambuck.

## Architecture Direction

- Rust core for package/install/update logic
- Tauri GUI shell for modern, consistent cross-desktop UI
- Shared core APIs used by GUI and CLI

Current structure:

- `crates/yambuck-core`
- `apps/yambuck-gui`
- `yambuck-cli` planned as secondary interface

## Package Format (Locked Direction)

### Container

- A `.yambuck` file is a zip container.
- Top-level layout is explicit and readable (no required hidden `.yambuck/` root folder).

Expected layout:

```text
<app>.yambuck
├── manifest.json
├── app/
│   └── ... packaged app payload ...
└── assets/
    ├── icon.(png|jpg|webp)
    └── screenshots/
        └── ... optional screenshot images ...
```

### Payload Strategy

- v1 packaging is **bundle-first**.
- The package should include what the app needs to run after install, rather than relying on distro-specific dependency resolution.
- Yambuck v1 does not attempt full distro dependency resolution for app runtime.

### Install Model

- Yambuck installs package contents into managed install paths.
- This is install-first (not portable-first) for v1.
- Portable/run-without-install mode is a future enhancement.
- Yambuck manages only Yambuck-installed apps; it does not modify apps installed by other package systems.

## Manifest Specification (v1)

### Versioning and Compatibility

- `manifestVersion` is required and uses semver (example: `1.0.0`).
- Unknown major versions are rejected.
- New optional fields may be added in backward-compatible minor/patch updates.
- `minInstallerVersion` may be provided by packages that require newer Yambuck behavior.

### Identity

- `appId` (required): stable reverse-DNS identifier (example: `com.voquill.app`)
- `appUuid` (required): immutable global UUID for app identity continuity
- `packageUuid` (required): unique package artifact UUID

### Required v1 fields

- `manifestVersion`
- `displayName`
- `description`
- `version`
- `publisher`
- `appId`
- `appUuid`
- `packageUuid`
- `entrypoint`
- `iconPath`

### Optional v1 fields

- `screenshots` (array of local asset paths)
- `longDescription` (plain text, paragraph-friendly app details)
- `homepageUrl`
- `supportUrl`
- `license`
- `releaseNotes`
- `target` / `targets`
- `runtimeDependencies` (informational only in v1)
- `trustStatus` (defaults to `unverified` if not present)

## Rich Install Preview Requirements

When opening a package, Yambuck should be able to show:

- app name
- publisher
- version
- description
- icon
- screenshots (if packaged)
- trust state (`verified` or `unverified`)

UI behavior:

- `description` is the quick summary shown at a glance and is truncated in preview UI at 500 characters with `...`.
- `longDescription` (if present) is shown as plain text with paragraph breaks for deeper context.
- installer preview renders up to 6 screenshots.

This is required to make install decisions easy for non-technical users.

## Installation and Uninstallation

### Scope

- Default: `Just for me` (user scope)
- Optional: `All users` (system scope with elevation)

### Installed apps experience

- list installed apps
- show app/version/scope
- uninstall action
- optional remove user data/config checkbox

### Ownership and conflict policy (v1)

- If an app with the same `appId` is already tracked by Yambuck, install proceeds as a clean replace flow.
- Replace flow for v1 is remove-and-reinstall for cleanliness.
- If same `appId` appears to be installed outside Yambuck ownership, Yambuck blocks install and tells the user to uninstall with their original package manager first.

### Install index

- Yambuck keeps its own local install index for reliable uninstall/update behavior.

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

### Future policy

- signatures by default
- app reputation/allowlist/revocation systems using `appUuid` and signing identity continuity

## Bootstrap Installation (Yambuck itself)

- Website one-liner installs Yambuck binary.
- Verification (checksum) is required by default.
- Per-user install is default; system install is explicit.
- Re-running bootstrap should safely replace existing binary for updates.

## Self-Update Model (v1)

- checks on startup and manual check action
- user-controlled updates only (no silent auto-update)
- `Update and restart` / `Later`
- update metadata source: `https://yambuck.com/updates/stable.json`
- feed points to immutable GitHub Release artifact URLs + checksums
- in-app apply flow currently targets user installs first

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
