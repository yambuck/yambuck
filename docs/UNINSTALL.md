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

```bash
curl -fsSL https://yambuck.com/uninstall.sh | bash -s -- --remove-all-apps
```

## Optional Scope-Specific Purge

Remove only system-scope Yambuck-managed apps:

```bash
curl -fsSL https://yambuck.com/uninstall.sh | bash -s -- --remove-system-apps
```

Remove only user-scope Yambuck-managed apps:

```bash
curl -fsSL https://yambuck.com/uninstall.sh | bash -s -- --remove-user-apps
```

## Script Options

- `--remove-all-apps`: also remove all Yambuck-managed app payloads and metadata (user + system)
- `--remove-system-apps`: also remove system-scope Yambuck-managed app payloads and metadata only
- `--remove-user-apps`: also remove user-scope Yambuck-managed app payloads and metadata only
- `--yes`: run non-interactively
- `--help`: show script usage
