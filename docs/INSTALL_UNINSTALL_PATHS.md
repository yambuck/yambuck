# Install And Uninstall Path Audit

This document records the exact directories currently used by Yambuck for install, metadata, desktop integration, updates, and uninstall behavior.

## Scope Model

Yambuck uses two explicit scopes:

- `user` (default): current user only
- `system`: all users, requires elevation

## Managed App Payload Roots

These are the roots for app payload extraction/install:

- User scope: `~/.local/share/yambuck/apps/{appId}`
- System scope: `/opt/yambuck/apps/{appId}`

Source:

- `crates/yambuck-core/src/install_flow.rs` (`create_install_preview`)

## Managed Ownership Metadata And Package Archives

Install index (ownership metadata):

- User scope: `~/.local/share/yambuck/installed-apps.json`
- System scope: `/var/lib/yambuck/installed-apps.json`

Archived package snapshots:

- User scope: `~/.local/share/yambuck/package-archives/{appId}/...`
- System scope: `/var/lib/yambuck/package-archives/{appId}/...`

Source:

- `crates/yambuck-core/src/storage.rs`

## Yambuck Binary Install Roots (Bootstrap Script)

- User mode: `~/.local/bin/yambuck`
- System mode: `/usr/local/bin/yambuck`

Source:

- `docs/install.sh`

## Desktop Integration Roots

### Website install script (`docs/install.sh`)

User mode:

- Desktop file: `~/.local/share/applications/com.yambuck.installer.desktop`
- MIME XML: `~/.local/share/mime/packages/application-x-yambuck-package.xml`
- Icons (hicolor): `~/.local/share/icons/hicolor/...`

System mode:

- Desktop file: `/usr/share/applications/com.yambuck.installer.desktop`
- MIME XML: `/usr/share/mime/packages/application-x-yambuck-package.xml`
- Icons (hicolor): `/usr/share/icons/hicolor/...`

### Runtime self-heal integration (Tauri)

Runtime writes under XDG user data home:

- `XDG_DATA_HOME` if set, otherwise `~/.local/share`
- includes active icon theme overlays when detected

Source:

- `apps/yambuck-gui/src-tauri/src/support/desktop_integration.rs`

## Logs And Update Helper

- Runtime log file: `~/.local/share/yambuck/logs/current.log`
- Update helper log: `~/.local/share/yambuck/logs/update-helper.log`

Source:

- `apps/yambuck-gui/src-tauri/src/support/logging.rs`

## Current Uninstall Targets

App-level uninstall from GUI (managed app uninstall):

- Removes app payload rooted at recorded destination path
- Removes archived package snapshot
- Optional data-path removal for manifest-declared config/cache/temp

Website uninstall script (`docs/uninstall.sh`) removes Yambuck itself and, optionally (`--purge-managed-apps`), managed app roots/metadata.

## Compatibility Assessment

Current path choices are appropriate for Linux/FHS and scale across mainstream distros:

- payloads in `/opt` (system) and `~/.local/share` (user)
- metadata in `/var/lib` (system) and `~/.local/share` (user)
- binary in `/usr/local/bin` (system) and `~/.local/bin` (user)

## Hardening Follow-Ups

The path locations are appropriate, but safety hardening is still required for strict ownership guarantees:

1. Canonical root-bound path validation for install/uninstall operations
2. Strong `appId` validation for path segment safety
3. Receipt-driven uninstall to avoid any non-Yambuck artifacts
4. Unify script/runtime path handling where XDG-aware behavior differs
