# Yambuck Release Checklist

Use this checklist for release smoke checks.

For the full repeatable process (version files, artifact, release, feed/hash updates), use `docs/RELEASE_RUNBOOK.md`.

## 1) Build Bootstrap Artifact

From repo root:

```bash
./scripts/package-bootstrap-artifact.sh
```

Expected output files under `release-artifacts/`:

- `yambuck-linux-x86_64.tar.gz` (or `yambuck-linux-aarch64.tar.gz` depending on build machine)
- matching `.sha256` file

## 2) Create GitHub Release

Use a semver tag (example `v0.1.0`):

```bash
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 \
  release-artifacts/yambuck-linux-*.tar.gz \
  release-artifacts/yambuck-linux-*.tar.gz.sha256 \
  --title "Yambuck v0.1.0" \
  --notes "First bootstrap-compatible release for Yambuck installer testing."
```

## 3) Validate Website Bootstrap Command

On a test Linux machine:

```bash
curl -fsSL https://yambuck.com/install.sh | bash
```

Verify:

- `~/.local/bin/yambuck` exists
- `yambuck --help` runs
- installer reports checksum verification succeeded

## 4) Validate System Install Path (Optional)

```bash
curl -fsSL https://yambuck.com/install.sh | bash -s -- --system --yes
```

Verify:

- `/usr/local/bin/yambuck` exists
- `yambuck --help` runs

## 5) Validate First Package Flow

Use a test `.yambuck` artifact (Voquill target):

- open package file in Yambuck GUI
- complete install flow (`Just for me` first)
- confirm app appears in Installed Apps
- uninstall and confirm it is removed from Installed Apps

## 6) DNS / Website Smoke Check

Confirm these URLs:

- `https://yambuck.com/`
- `https://yambuck.com/install.sh`

Confirm Copy button works and command matches current bootstrap script.

## 7) First Test Exit Criteria

First test is considered complete when all are true:

- bootstrap command installs `yambuck` binary successfully
- checksum verification passes in default flow
- GUI installs a real `.yambuck` test package
- Installed Apps list and uninstall path behave correctly
