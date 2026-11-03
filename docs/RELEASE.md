# Release Process

Yambuck follows the
[Release and Update Standard](https://github.com/jackbrumley/jackbrumley.github.io/blob/main/RELEASE_STANDARD.md),
the same process as Voquill, Rusty G6 and SomeDrive. This is Yambuck's copy of
the procedure; the standard has the reasoning and the full installer and
updater contracts. Yambuck's variations are listed in `AGENTS.md`.

Release identity (tag, title, asset names, download links) is consumed by
`docs/install.sh` and the in-app updater, so a format mistake breaks updates
and one-line installs for every user.

## Format

| Where | Format | Example |
|---|---|---|
| `apps/yambuck-gui/{package.json, src-tauri/Cargo.toml, src-tauri/tauri.conf.json}` | `X.Y.Z` | `0.3.7` |
| `apps/example-app/` (same three files, moved in lockstep) | `X.Y.Z` | `0.3.7` |
| Version bump commit | `chore: bump version to X.Y.Z` | |
| Git tag and release title | `vX.Y.Z` | `v0.3.7` |
| First line of the release notes | `# Yambuck vX.Y.Z` | |
| Assets | see below | `yambuck-0.3.7-linux-x64.tar.gz` |

The root `package.json` only runs the release scripts and has no version.
`crates/yambuck-core` keeps its own internal version.

A complete release carries two assets, both named by `scripts/release-assets.mjs`:
- `yambuck-X.Y.Z-linux-x64.tar.gz`: the app. It contains a single executable,
  `bin/yambuck`. Keep that layout: `install.sh` and the pre-standard updater
  (v0.3.6 and earlier) both expect it.
- `example-app.yambuck`: the demo package behind the install page's
  "Download Example Package" button
  (`releases/latest/download/example-app.yambuck`), so it has no version in
  its name.

No `.sha256` files: installers verify against the SHA-256 digest GitHub
computes for each asset.

## Branches

Development happens on `dev`; releases are tagged on `dev`. Promotion
fast-forwards `main` to the release tag, so `main` always equals the latest
release. GitHub Pages serves `yambuck.com` (install page, `install.sh`,
`uninstall.sh`, `updates/stable.json`) from `main:/docs`, so promotion also
deploys installer changes. Never commit to `main` directly.

## 1. Prepare and Tag

```bash
npm run release:prepare -- X.Y.Z
git push origin dev vX.Y.Z
```

`release:prepare` sets the version in the six version files, refreshes the
four lockfiles, commits and tags. Pushing the tag starts the **Release**
workflow (`.github/workflows/release.yml`):
1. **Prepare** checks the tag matches `apps/yambuck-gui/src-tauri/tauri.conf.json`
   and creates the pre-release with the notes skeleton.
2. **Build** runs `npm run release:linux` (inside the Ubuntu 22.04 container)
   and `scripts/package-release.mjs`, and uploads the assets.
3. **Verify** fails unless the release carries exactly the two assets, each
   with a SHA-256 digest.
4. **Install test** installs the pre-release with the installer scripts from
   the tag: user install (`~/.local/bin`), system install (`/usr/local/bin`,
   which also removes the user copy), then uninstall; each install checks
   `yambuck --version`.

Follow it with:
```bash
gh run watch "$(gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```

## 2. Write the Release Notes

```bash
npm run --silent release:notes > release-notes.md   # commits since the last tag print to the terminal
gh release edit vX.Y.Z --notes-file release-notes.md
```

Replace every `TODO`. Structure: `# Yambuck vX.Y.Z`, one summary paragraph,
themed `###` sections of `- Label: sentence` bullets separated by `---`, then
the generated Downloads block (never edited). Write for users, not developers.

## 3. Promote

```bash
npm run release:promote
```

Refuses unless both assets have digests and the notes contain no `TODO`. It
marks the release latest and fast-forwards `main` to the tag. From then on the
in-app updater and the one-line installer serve the new version.

## 4. Verify

- An older installed version offers the update and **Update Now** installs and
  relaunches it (user install, and a system install, which asks for the
  password through the desktop's authentication dialog).
- `curl --proto '=https' --tlsv1.2 -sSf https://yambuck.com/install.sh | bash` installs the new version.

## One-Time Transition From the Update Feed

Yambuck v0.3.6 and earlier do not ask GitHub for updates. They read
`https://yambuck.com/updates/stable.json` and swap their binary for
`bin/yambuck` from the tarball URL listed there (user installs in
`~/.local/bin` only; system installs show "use the website installer").
They have never heard of the new asset name. So the **first** standardized
release (the first one published as `yambuck-X.Y.Z-linux-x64.tar.gz`) needs one
extra step, after `release:promote`.

Order matters for that first release: the new `install.sh` only knows the new
asset name, so it must not reach `main` (the live site) before a release that
carries `yambuck-X.Y.Z-linux-x64.tar.gz` is promoted. Land the migration on
`dev`, release from there, and let promotion move `main`.

Steps:

1. Get the new tarball's digest:
   ```bash
   gh api repos/yambuck/yambuck/releases/tags/vX.Y.Z \
     --jq '.assets[] | select(.name == "yambuck-X.Y.Z-linux-x64.tar.gz") | .digest'
   ```
2. On `dev`, edit `docs/updates/stable.json` (keep its schema exactly):
   - `version`: `X.Y.Z`
   - `publishedAt`: the release's publish time (UTC, `YYYY-MM-DDTHH:MM:SSZ`)
   - `notesUrl`: `https://github.com/yambuck/yambuck/releases/tag/vX.Y.Z`
   - `linux.x86_64.url`: `https://github.com/yambuck/yambuck/releases/download/vX.Y.Z/yambuck-X.Y.Z-linux-x64.tar.gz`
   - `linux.x86_64.sha256`: the digest without the `sha256:` prefix
   - leave `linux.aarch64` as it is (`"sha256": "unpublished"`)
3. Commit (`chore: point legacy update feed at vX.Y.Z`), then fast-forward
   `main` to it so Pages serves it:
   `git push origin dev && git push origin dev:main` (a fast-forward, since
   `main` equals the release tag and this commit is the only one on top).
   This is the one exception to "`main` only moves by promotion": the digest
   only exists once the workflow has uploaded the tarball, so it cannot be in
   the tagged commit.

Old user installs then update once through their own updater and use the
standard from that version on. Old system installs (`/usr/local/bin`) never
could update in-app; their users run
`curl --proto '=https' --tlsv1.2 -sSf https://yambuck.com/install.sh | bash -s -- --system` once.

The same release also changes the app ID from `com.yambuck.installer` to
`com.yambuck.yambuck` (see `AGENTS.md`). Both upgrade paths (install.sh, and
an old updater that only swaps the binary, after which the new app's desktop
integration runs) remove the old launchers and move the `.yambuck` file
association to `com.yambuck.yambuck.desktop`. The webview data directory
moves to `~/.local/share/com.yambuck.yambuck`; the old one only held caches
and the "builder gate dismissed" flag, so that dialog shows once more. Say so
in the release notes.

After that, `stable.json` is frozen: later releases do not touch it. Keep
serving it (it costs nothing and catches anyone still on v0.3.6 or earlier);
it can be deleted once no supported install predates the standard.

## When Something Fails

- **Transient failure** (network, runner): `gh run rerun <run-id> --failed`.
- **Code failure:** nothing was promoted, so nobody received it. Fix on `dev`,
  then:
  ```bash
  gh release delete vX.Y.Z --cleanup-tag --yes
  git tag -d vX.Y.Z
  git tag vX.Y.Z
  git push origin dev vX.Y.Z
  ```
- **Dry run** of the build without a release:
  `gh workflow run release.yml --ref dev`.

## Building Locally (Fallback)

Needs `podman`:

```bash
npm run release:linux              # Ubuntu 22.04 container; output in apps/yambuck-gui/src-tauri/target/linux-release
node scripts/package-release.mjs   # release-artifacts/yambuck-X.Y.Z-linux-x64.tar.gz + example-app.yambuck
gh release upload vX.Y.Z release-artifacts/*
```

To try a local tarball with the real installer (testing only, unverified):

```bash
YAMBUCK_INSTALL_URL="file://$PWD/release-artifacts/yambuck-X.Y.Z-linux-x64.tar.gz" \
  bash docs/install.sh --insecure-skip-verify --yes --no-relaunch
```

If `assets/branding/yambuck-icon-app.svg` changes, run
`scripts/sync-install-icon.sh` and commit the regenerated block in
`docs/install.sh`.

## Agent Checklist

- [ ] Version prepared with `npm run release:prepare`; tag is `vX.Y.Z`.
- [ ] Release workflow green: build, verify and install test.
- [ ] Notes from `npm run release:notes`; no `TODO`; Downloads block untouched.
- [ ] Assets only from the workflow or `package-release.mjs`.
- [ ] `npm run release:promote` only when the maintainer asks.
- [ ] First standardized release only: `docs/updates/stable.json` pointed at it.
- [ ] No AI attribution in commits, tags or notes.
