# Yambuck Release Runbook

This runbook is the repeatable process for every Yambuck release.

It keeps four things aligned:

1. in-app version metadata
2. Git tag / GitHub Release
3. release artifact + checksum
4. update feed (`docs/updates/stable.json`)

## Files That Must Be Updated Every Release

Version metadata:

- `apps/yambuck-gui/package.json`
- `apps/yambuck-gui/src-tauri/Cargo.toml`
- `apps/yambuck-gui/src-tauri/tauri.conf.json`

Update feed metadata:

- `docs/updates/stable.json`
  - `version`
  - `notesUrl`
  - linux asset `url`
  - linux asset `sha256`

## Release Sequence

### 1) Bump version in app metadata files

Choose target version (example: `0.1.6`) and update all three version fields.

### 2) Build/test and commit version bump

From repo root:

```bash
npm --prefix apps/yambuck-gui install
npm --prefix apps/yambuck-gui run build
cargo check --manifest-path apps/yambuck-gui/src-tauri/Cargo.toml
git add apps/yambuck-gui/package.json apps/yambuck-gui/package-lock.json apps/yambuck-gui/src-tauri/Cargo.toml apps/yambuck-gui/src-tauri/Cargo.lock apps/yambuck-gui/src-tauri/tauri.conf.json
git commit -m "chore: bump app version to 0.1.6"
git push
```

### 3) Build release artifact

```bash
./scripts/package-bootstrap-artifact.sh
```

Expected outputs:

- `release-artifacts/yambuck-linux-x86_64.tar.gz`
- `release-artifacts/yambuck-linux-x86_64.tar.gz.sha256`

### 4) Create tag and GitHub release

```bash
./scripts/build-example-app-yambuck.sh
git tag v0.1.6
git push origin v0.1.6
gh release create v0.1.6 \
  release-artifacts/yambuck-linux-x86_64.tar.gz \
  release-artifacts/yambuck-linux-x86_64.tar.gz.sha256 \
  release-artifacts/packages/example-app-linux-x86_64.yambuck \
  --title "Yambuck v0.1.6" \
  --notes "<release notes>"
```

### 5) Compute checksum and update feed

```bash
sha256sum release-artifacts/yambuck-linux-x86_64.tar.gz
```

Use the hash output to update `docs/updates/stable.json` for the new version.

Example values to update:

- `version`: `0.1.6`
- `notesUrl`: `https://github.com/yambuck/yambuck/releases/tag/v0.1.6`
- `linux.x86_64.url`: `https://github.com/yambuck/yambuck/releases/download/v0.1.6/yambuck-linux-x86_64.tar.gz`
- `linux.x86_64.sha256`: `<computed hash>`
- `linux.aarch64.url`: `https://github.com/yambuck/yambuck/releases/download/v0.1.6/yambuck-linux-aarch64.tar.gz`

Commit and push feed update:

```bash
git add docs/updates/stable.json
git commit -m "chore: point stable update feed to v0.1.6"
git push
```

## Post-Release Validation

### Bootstrap install check

```bash
curl --proto '=https' --tlsv1.2 -sSf https://yambuck.com/install.sh | bash
```

Validate:

- binary installs successfully
- checksum verification passes
- app opens

### In-app update check

Validate in running app:

- `Check for updates` works
- update banner appears only once (no duplicate messaging)
- `Update and restart` works for user installs

## Common Failure Modes

- **Version mismatch**: app still shows old version after update
  - cause: one of the three version files was not bumped
- **Update download fails**
  - cause: feed points to non-existent release URL
- **Checksum mismatch**
  - cause: feed hash not updated from latest artifact
- **Duplicate update notices**
  - cause: both generic notice and dedicated banner being used

## Notes

- Current in-app apply flow supports **user installs** (`~/.local/bin/yambuck`) only.
- System install update path with elevation is planned next.
