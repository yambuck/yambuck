# Yambuck Specification (Draft v0)

## Mission

Yambuck makes Linux app distribution and installation dead simple for non-technical users, with a GUI-first cross-distro experience and optional CLI tooling, to help accelerate mainstream Linux adoption.

This mission is the primary design constraint for all technical decisions.

## Product Emphasis

Priority order:

1. End-user installation simplicity (especially non-technical users)
2. Cross-distro reliability and predictability
3. Easy packaging workflow for developers
4. Optional CLI support (nice to have, not the core product)

## Product Shape (Locked for v1)

- Linux-first
- GUI-first installer UX
- Direct-download distribution (developer-hosted files)
- No required central repository/store service
- CLI available as secondary interface
- Installer UX modeled on familiar consumer installers (step-by-step wizard)
- Modern, branded UI controlled by Yambuck (not desktop-theme-dependent)

## Objectives

### 1) End-user objective

Provide a straightforward install experience where users can download an app package, open it, and install with a familiar GUI flow.

### 2) Developer objective

Provide a predictable packaging flow so developers can prepare and distribute Linux apps with minimal distro-specific complexity.

### 3) Ecosystem objective

Reduce Linux software distribution friction and improve confidence for mainstream users.

## Non-Objectives (v0)

- Replace all existing package managers and distro repositories.
- Solve every containerization or sandboxing use case.
- Require users to prefer CLI over GUI.

## High-Level Architecture (Draft)

Yambuck is expected to include:

- package format definition (`.yambuck` candidate)
- installer/runtime capable of opening package files
- GUI install path (primary)
- CLI install path (secondary)
- desktop integration hooks
- package integrity and trust verification
- installed-apps index for list/uninstall

Implementation direction:

- Rust for core installer/runtime logic
- Tauri for GUI shell and visual experience
- Shared core APIs consumed by both GUI and CLI

## Package Model (Draft)

A package should include at minimum:

- app payload (executables/resources)
- metadata manifest
- app identity and version information
- desktop integration assets (icon, launcher metadata where applicable)
- optional signature metadata

### Manifest (Concept)

The manifest should describe:

- package name and ids
- version
- target architecture
- entrypoint(s)
- install mode requirements (user/system)
- desktop metadata
- dependency/runtime expectations
- checksums/signature references

Identity requirements for v1:

- `app_id` (required): reverse-DNS identifier, stable across versions (e.g. `com.voquill.app`)
- `app_uuid` (required): immutable UUID for global machine identity and future trust systems
- `package_uuid` (optional): unique build/release artifact identifier

Rationale:

- `app_id` is human-readable and support-friendly
- `app_uuid` provides stable machine identity for future allowlists/reputation layers

## Installation Model

### GUI path (primary)

1. User opens a `.yambuck` file.
2. Installer shows app identity and publisher details.
3. Installer verifies package integrity/signature.
4. Installer shows install options (location, scope, shortcuts).
5. Installer performs install and confirms success.

Default GUI behavior:

- Default scope is `Just for me`.
- `All users` is optional and requires privilege elevation.

Recommended first screens:

1. package details
2. trust status and warning (if unverified)
3. scope selection
4. install progress
5. completion actions (launch/close)

### CLI path (secondary)

Example shape (subject to change):

`yambuck install app.yambuck`

CLI must mirror core installer behavior but is not the primary UX target.

## Installed Apps and Uninstall

Yambuck provides a simple installed-apps view that includes:

- app name and version
- install scope (`user` or `system`)
- uninstall action

Uninstall behavior:

- remove installed application files
- optionally remove user data/config via explicit checkbox

Storage model for this feature:

- no distro package repository integration required for v1
- maintain a minimal Yambuck-managed local install index
- per-user install metadata under user data directory
- system install metadata under system data directory

## Desktop Integration

The system should integrate with standard Linux desktop conventions where practical:

- launcher/menu entry creation
- icon registration
- file association support
- uninstall visibility

Use established desktop standards where available rather than inventing replacements.

## Security and Trust

Minimum security expectations for v1 direction:

- package integrity checks (checksums)
- optional/required signature validation model (to be finalized)
- clear trust prompts in GUI
- transparent error messages on verification failure

MVP trust policy:

- unsigned packages are allowed
- unsigned packages must display an explicit warning: "Publisher not verified. Only install if you trust this source."
- user must choose `Cancel` or `Install anyway`

Future trust direction (post-MVP):

- signed package verification by default
- app reputation signals using `app_uuid` plus signing key continuity
- optional allowlist/revocation systems

## Bootstrap Installation (Yambuck Itself)

V1 onboarding model:

- user runs one install command from the Yambuck website
- bootstrap installs Yambuck and configures file association for `.yambuck`
- day-to-day app installation happens through GUI by opening package files

Bootstrap requirements:

- minimal and auditable script/runtime
- explicit logging of actions
- verification of downloaded artifacts before install
- least-privilege behavior where possible

## Yambuck Self-Update Model (v1 Direction)

- update checks happen on startup and periodic interval
- updates are user-controlled, not silent
- users see `Update and restart` and `Later` options
- update metadata feed: `https://yambuck.com/updates/stable.json`
- feed points to GitHub Releases artifact URLs + checksums
- user install updates without elevation; system install updates require elevation

## Compatibility Approach

The target is broad Linux distribution support through a stable installer/runtime behavior and package format.

Compatibility is defined by outcome:

- users can install and run successfully on major distributions
- developers do not need separate packaging logic per distro for core flow

Initial distro target set for validation:

- Ubuntu/Debian-based
- Fedora-based
- Arch-based

Reference validation app:

- Voquill (`voquill.yambuck`) used to test end-to-end packaging and install UX

## Open Questions

- final package container format (archive type and layout)
- final manifest schema and versioning rules
- signature model and key distribution strategy
- system-wide vs per-user install defaults
- UX behavior for missing runtime dependencies

Resolved defaults:

- install scope default is per-user (`Just for me`)
- system install path is optional with elevation flow
- package identity is dual-field (`app_id` + `app_uuid`)
- distribution model is direct-download, developer-hosted
- unsigned packages are allowed in MVP with explicit warning
- GUI is primary interface; CLI is secondary
- modern installer UX is a core requirement, not cosmetic

## Roadmap (Draft)

1. Lock mission and product requirements
2. Finalize package and manifest schema v0
3. Build installer/runtime prototype with GUI-first flow
4. Add CLI parity for core commands
5. Validate cross-distro behavior on real environments
6. Iterate on trust model and packaging ergonomics
7. Add updater design and implementation in post-MVP phase

## Out of Scope for v1

- central app store or hosted package repository
- mandatory code signing infrastructure
- Windows support
