# Privilege Elevation Behavior (Linux)

This document defines how Yambuck requests elevation for `All users` operations.

Covered operations:

- system-scope install
- system-scope uninstall

## Native Strategy Order

Yambuck uses native policykit-based elevation and picks a strategy in this order:

1. `flatpak-host-pkexec`
   - Used when running in a Flatpak sandbox and both `flatpak-spawn` and host `pkexec` are available.
2. `pkexec-direct`
   - Used on normal host installs when `pkexec` is available.

If neither strategy is available, Yambuck blocks the requested system operation and shows an actionable error.

## X11 and Wayland

- On both X11 and Wayland, Yambuck uses policykit authentication prompts via the selected strategy.
- Session type is logged for diagnostics (`XDG_SESSION_TYPE`), but does not change the policykit contract.
- If policykit auth is denied or no auth agent is available, the requested system operation fails with explicit guidance.

## Logging and Diagnostics

For each system operation that requires elevation, Yambuck logs:

- detected session type and desktop environment
- whether a sandbox bridge was needed
- the selected elevation strategy label
- success/failure outcome and failure reason

## Manual Validation Matrix

Validate at least once per release cycle:

1. X11 session + user install (no elevation)
2. X11 session + all-users install (policykit prompt expected)
3. X11 session + all-users uninstall (policykit prompt expected)
4. Wayland session + user install (no elevation)
5. Wayland session + all-users install (policykit prompt expected)
6. Wayland session + all-users uninstall (policykit prompt expected)
7. Cancel auth prompt in both sessions (operation should fail with clear message)

Expected behavior:

- no success screen is shown on failed install
- failed screen includes copyable technical details
- logs include selected elevation strategy and session metadata
