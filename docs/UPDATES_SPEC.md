# Yambuck Updates Spec (v1 Draft)

## Goal

Provide a simple, user-controlled update experience where users are informed before changes and can update with one click, then restart.

## User Experience

- Yambuck checks for updates on startup and periodically (every 12 hours).
- If an update is available, Yambuck shows:
  - current version
  - new version
  - short release note summary / link
- User chooses:
  - `Update and restart` (recommended)
  - `Later`
- On success:
  - show confirmation
  - restart app automatically when possible, or show "Please reopen Yambuck" fallback.

## Update Source of Truth

Use a Yambuck-hosted update feed JSON:

- `https://yambuck.com/updates/stable.json`

This feed points to immutable release assets hosted on GitHub Releases.

## Feed Schema (v1)

```json
{
  "channel": "stable",
  "version": "0.1.3",
  "publishedAt": "2026-04-14T00:00:00Z",
  "notesUrl": "https://github.com/yambuck/yambuck/releases/tag/v0.1.3",
  "linux": {
    "x86_64": {
      "url": "https://github.com/yambuck/yambuck/releases/download/v0.1.3/yambuck-linux-x86_64.tar.gz",
      "sha256": "<sha256>"
    },
    "aarch64": {
      "url": "https://github.com/yambuck/yambuck/releases/download/v0.1.3/yambuck-linux-aarch64.tar.gz",
      "sha256": "<sha256>"
    }
  }
}
```

## Update Mechanics

- Download target artifact for current arch.
- Verify checksum from feed.
- Stage updated binary in temp path.
- Replace installed binary atomically:
  - user install: `~/.local/bin/yambuck`
  - system install: `/usr/local/bin/yambuck` (requires elevation)
- Restart process after swap.

## Privilege Model

- Per-user install updates without elevation.
- System install update prompts for elevation when user clicks update.

## Safety and Transparency

- Never auto-update silently in v1.
- Always notify user before update.
- Show progress states: `Checking`, `Downloading`, `Verifying`, `Applying`, `Restarting`.
- On failure, show actionable message and keep current version.

## Out of Scope (v1)

- delta patch updates
- rollback UI
- mandatory signature-based update policy (planned later)

## Operations Note

Release/update operational steps are documented in `docs/RELEASE_RUNBOOK.md`.
