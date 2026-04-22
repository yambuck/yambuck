# Yambuck Scope and Ownership Policy

This document captures the agreed direction for install scope behavior, ownership tracking, update behavior, and uninstall behavior.

## Goals

- Keep behavior predictable for non-technical users.
- Support both `user` and `system` install scopes.
- Avoid accidental cross-scope targeting.
- Keep uninstall simple while preserving safe multi-user boundaries.
- Maintain strict, explicit scope cleanliness and separation at all times.

## Scope Vocabulary (UI)

- `user` is displayed as **My user**.
- `system` is displayed as **System wide**.

Duplicates in the app list are allowed when they are clear and intentional (one per scope).

## Core Policy

1. Install/update actions are scope-specific.
2. If user selects **My user**, only user-scope records/payloads are changed.
3. If user selects **System wide**, only system-scope records/payloads are changed.
4. System-scope actions require elevation.
5. User-scope actions never require elevation.

## Multi-User Policy

- Per-user installs belong to each Linux account independently.
- One user does not manage or remove another user's per-user install by default.
- System scope is shared machine-wide and admin-managed.

This works cleanly because the Yambuck app itself is installed per user in normal usage. A given Yambuck session operates in the context of the current OS account, so it sees current-user installs plus system-scope installs, not per-user installs from other accounts.

## Ownership and Registry Model

Yambuck maintains separate stores per scope:

- User registry and metadata under `~/.local/share/yambuck`
- System registry and metadata under `/var/lib/yambuck`
- User app payload root under `~/.local/share/yambuck/apps`
- System app payload root under `/opt/yambuck/apps`

This separation remains the baseline design.

## Critical Robustness Rule: Composite Identity for Operations

All operational actions must target apps by composite identity:

- `appId + installScope`

Do not target details/launch/uninstall/update by `appId` alone.

Why:

- The same `appId` can exist in both scopes.
- `appId`-only lookups can select the wrong scope and cause user confusion.

Scope isolation is a hard requirement, not a nice-to-have. The implementation should prefer explicit separation and deterministic scope targeting over convenience shortcuts.

## Expected Behavior Matrix

### Install/update package when a same-app record exists

- Existing in selected scope: update/reinstall/downgrade rules apply to selected scope only.
- Existing only in other scope: selected scope install/update still targets selected scope only.
- Existing in both scopes: each row remains independently manageable by scope.

### Scope selection outcomes

- Select **My user**: update/install user copy only.
- Select **System wide**: update/install system copy only.

## Uninstall Policy (CLI)

Current UX direction:

- `uninstall.sh`: remove Yambuck app/integration from user and system locations when present.
- `--remove-all-apps`: purge Yambuck-managed app payloads and metadata for current user and system scope.
- `--remove-user-apps`: purge user-scope managed apps only.
- `--remove-system-apps`: purge system-scope managed apps only.

Important boundary:

- Full purge does not imply deleting per-user installs for every other OS account by default.

## UI Clarity Requirements

- If an app appears twice, scope labels must clearly explain why.
- Installed Apps table should show scope as **My user** or **System wide**.
- Scope filter labels should match the same terminology.

## Backend/API Hardening Requirements

To ensure complete scope separation in behavior:

1. Change details API to require scope (`appId + scope`).
2. Change launch API to require scope (`appId + scope`).
3. Ensure reinstall-wipe paths target selected scope only.
4. Ensure list row identity is unique per scope (`appId + scope` key in UI rows).
5. Keep install/update decision messaging selected-scope-first and only reference other scope as secondary context.
6. Add startup/list reconciliation for stale index records (missing payload/receipt) with clear status and recovery actions.
7. Auto-clean legacy desktop artifacts during uninstall/upgrade paths where safe.

## Implementation Sequence

1. Update backend lookup APIs to require `appId + scope` for details and launch.
2. Update frontend API calls and action plumbing to carry explicit scope.
3. Update Installed Apps table row keying to composite identity.
4. Update scope labels in all relevant UI to **My user** and **System wide**.
5. Add reconciliation and legacy cleanup follow-up tasks.

## Implementation Status

- In progress.
- Completed in current pass:
  - scope-required targeting for details and launch paths (`appId + scope`)
  - frontend action plumbing updated to pass explicit scope
  - installed-app table row keying switched to composite identity (`appId:scope`)
  - UI scope labels normalized to **My user** and **System wide** in installed/review/uninstall surfaces
- Remaining follow-up:
  - selected-scope-first decision messaging polish
  - startup/list reconciliation for stale records
  - legacy desktop artifact auto-cleanup

## Safety and Predictability

- No implicit cross-scope mutation.
- No implicit cross-user mutation.
- All destructive operations remain scope-bounded and explicit.

## Test Matrix (Required)

1. User-only install/update/uninstall.
2. System-only install/update/uninstall.
3. Same app in both scopes: details/launch/uninstall target correct scope.
4. System actions without sudo fail safely with clear error.
5. Full purge removes current user + system managed data only.

## Summary

The agreed model is:

- Allow both scopes.
- Keep duplicates understandable when they exist.
- Enforce strict operational targeting by `appId + installScope`.
- Keep uninstall simple for users while preserving safe ownership boundaries.
