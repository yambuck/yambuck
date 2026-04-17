# Yambuck Uninstall Guide

Yambuck supports a one-command uninstall flow from the website, matching the install UX.

## Quick Uninstall (Safe Default)

Removes Yambuck itself (binary + desktop integration), but leaves Yambuck-managed apps in place.

```bash
curl -fsSL https://yambuck.com/uninstall.sh | bash
```

## Full Purge (Testing / Clean Slate)

Removes Yambuck and all Yambuck-managed app payloads/metadata for a fresh system state.

Important: purge only targets Yambuck-managed installs/metadata. It does not remove software installed by other package managers or manual methods.

```bash
curl -fsSL https://yambuck.com/uninstall.sh | bash -s -- --purge-managed-apps --yes
```

## Optional System Mode

Use `--system` to remove system-level install paths (requires sudo):

```bash
curl -fsSL https://yambuck.com/uninstall.sh | bash -s -- --system --yes
```

## Script Options

- `--system`: remove system install paths (`/usr/local/bin`, `/usr/share/...`, `/var/lib/...`)
- `--purge-managed-apps`: also remove Yambuck-managed app payloads and metadata
- `--yes`: run non-interactively
- `--help`: show script usage
