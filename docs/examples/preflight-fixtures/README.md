# Preflight QA Fixtures

These fixture manifests are for compatibility preflight QA and UX verification.

Goal: confirm that Yambuck blocks unsupported installs with clear, copyable reasons.

## Fixture Files

- `manifest.unsupported-os.json`: Linux host should block with `unsupported_operating_system`.
- `manifest.unsupported-arch.json`: non-matching host arch should block with `unsupported_architecture`.
- `manifest.wayland-only.json`: blocks on X11 sessions with `unsupported_desktop_environment`.
- `manifest.cli-only.json`: should pass desktop-environment checks because app is CLI-only.

## How To Use Quickly

1. Build the example package assets once:
   - `./scripts/build-example-app-yambuck.sh`
2. Copy one fixture manifest over stage manifest:
   - source fixture: `docs/examples/preflight-fixtures/<fixture>.json`
   - destination: `release-artifacts/.example-app-stage/manifest.json`
   - if your host arch is not `x86_64`, update fixture `payloadRoot`/target IDs to match your stage folder (for example `payloads/linux/aarch64/default`)
3. Re-zip stage contents into a test package:
   - from `release-artifacts/.example-app-stage`: `zip -rq ../packages/qa-<fixture>.yambuck manifest.json payloads assets`
4. Open in Yambuck and verify preflight behavior.

## Expected User-Facing Result

- Unsupported target: install is blocked before execution.
- Message is plain language and points users to contact developer/publisher.
- "Copy compatibility report" includes host, package, and reason-code details.
