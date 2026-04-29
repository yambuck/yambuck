# Yambuck Release Checklist

Use this checklist for release smoke checks.

For the full repeatable process (version files, artifact, release, feed/hash updates), use `docs/RELEASE_RUNBOOK.md`.

Fast path for release prep:

```bash
./scripts/release-all.sh --version 0.1.23
```

Publish only when ready:

```bash
./scripts/release-all.sh --version 0.1.23 --publish
```

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
./scripts/build-example-app-yambuck.sh
```

```bash
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 \
  release-artifacts/yambuck-linux-*.tar.gz \
  release-artifacts/yambuck-linux-*.tar.gz.sha256 \
  release-artifacts/packages/example-app.yambuck \
  --title "Yambuck v0.1.0" \
  --notes "First bootstrap-compatible release for Yambuck installer testing."
```

## 3) Validate Website Bootstrap Command

On a test Linux machine:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://yambuck.com/install.sh | bash
```

Verify:

- `~/.local/bin/yambuck` exists
- `yambuck --help` runs
- installer reports checksum verification succeeded

## 4) Validate System Install Path (Optional)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://yambuck.com/install.sh | bash -s -- --system --yes
```

Verify:

- `/usr/local/bin/yambuck` exists
- `yambuck --help` runs

Note: in-app update apply for system installs is planned; current release gating expects in-app apply validation for user installs.

## 5) Validate First Package Flow

Build and use the canonical test package:

```bash
./scripts/build-example-app-yambuck.sh
```

Quick local smoke shortcut (build + open in local yambuck-gui dev runtime):

```bash
./scripts/smoke-example-app.sh
```

Then validate with `release-artifacts/packages/example-app.yambuck`:

- open package file in Yambuck GUI
- complete install flow (`Just for me` first)
- confirm app appears in Installed Apps
- uninstall and confirm it is removed from Installed Apps

## 6) DNS / Website Smoke Check

Confirm these URLs:

- `https://yambuck.com/`
- `https://yambuck.com/install.sh`
- `https://yambuck.com/uninstall.sh`

Confirm Copy button works and command matches current bootstrap script.

Validate uninstall command:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://yambuck.com/uninstall.sh | bash -s -- --yes
```

For full clean-slate testing:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://yambuck.com/uninstall.sh | bash -s -- --purge-managed-apps --yes
```

## 7) First Test Exit Criteria

First test is considered complete when all are true:

- bootstrap command installs `yambuck` binary successfully
- checksum verification passes in default flow
- GUI installs a real `.yambuck` test package
- Installed Apps list and uninstall path behave correctly

## 8) MVP Distro Reliability Matrix

Run the following checks on each distro before release:

- Linux Mint / Ubuntu family
- Debian family
- Fedora family
- Arch family

For each distro, validate:

- website install command succeeds in user mode
- in-app update (`Update and restart`) applies and relaunches on updated version for user installs
- safe uninstall removes Yambuck but leaves managed apps intact
- full purge uninstall removes Yambuck and managed app payloads/metadata
- reinstall after purge behaves like first install
