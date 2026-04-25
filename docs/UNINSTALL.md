# Yambuck Uninstall Guide

Yambuck supports a one-command uninstall flow from the website, matching the install UX.

## Quick Uninstall (Safe Default)

Removes Yambuck itself (binary + desktop integration) from user and system locations when present,
but leaves Yambuck-managed apps in place.

```bash
curl -fsSL https://yambuck.com/uninstall.sh | bash
```

## Full Purge (Testing / Clean Slate)

Removes Yambuck and all Yambuck-managed app payloads/metadata (user + system) for a fresh system
state.

Important: purge only targets Yambuck-managed installs/metadata. It does not remove software installed by other package managers or manual methods.

If system-managed paths are present, the script requests admin permission when needed.

```bash
curl -fsSL https://yambuck.com/uninstall.sh | bash -s -- --purge-managed-apps --yes
```

## Script Options

- `--purge-managed-apps`: also remove all Yambuck-managed app payloads and metadata (user + system)
- `--yes`: run non-interactively
- `--help`: show script usage
