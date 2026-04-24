# Example App (Yambuck Reference Package)

This app is a small reference payload used to test Yambuck end to end.

It exists to validate the real user path:

1. build a `.yambuck` package
2. open it in Yambuck
3. install/uninstall reliably
4. verify Installed Apps metadata and lifecycle behavior

## Why This Exists

I use this as a stable, low-risk fixture while hardening installer behavior.

It is intentionally simple so failures are easier to attribute to Yambuck flow/runtime behavior rather than app complexity.

## Common Commands

- Build the example `.yambuck` package from repo root: `./scripts/build-example-app-yambuck.sh`
- Run the one-command smoke flow from repo root: `./scripts/smoke-example-app.sh`

## Notes

- This app is a test/reference artifact, not a product surface.
- Packaging and validation behavior is defined at the repo level in `docs/SPEC.md` and `TODO.md`.
