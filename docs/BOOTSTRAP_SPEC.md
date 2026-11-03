# Yambuck Bootstrap Spec (v1)

## Purpose

The bootstrap flow installs Yambuck itself with one command, then enables the normal end-user workflow:

1. install Yambuck once
2. download `.yambuck` package files
3. open package files with Yambuck installer UI

The installer contract (options, verification, logging, relaunch) is the
shared [Release and Update Standard](https://github.com/jackbrumley/jackbrumley.github.io/blob/main/RELEASE_STANDARD.md),
section 6. This page records Yambuck's product rules on top of it.

## User Entry Point

Primary command shown on website:

```bash
curl -sf https://yambuck.com/install.sh | bash
```

System-wide variant:

```bash
curl -sf https://yambuck.com/install.sh | bash -s -- --system
```

Companion uninstall command:

```bash
curl -sf https://yambuck.com/uninstall.sh | bash
```

## Scope and Privilege

- default mode: per-user install
  - install directory: `~/.local/bin`
  - no root required
- optional mode: system install (`--system`)
  - install directory: `/usr/local/bin`
  - requires root: cached/interactive `sudo` from a terminal, otherwise the
    graphical `pkexec` prompt (used by the in-app updater), asked once
  - removes a user install that would shadow it

## Artifact Model

The installer downloads `yambuck-X.Y.Z-linux-x64.tar.gz` (single executable
at `bin/yambuck`) from the GitHub release resolved via the GitHub API
(`releases/latest`, or `--version vX.Y.Z`). ARM64 is not published yet.

## Verification Rules

- checksum verification is required by default, against the SHA-256 `digest`
  GitHub publishes for the release asset (no separate checksum files)
- install fails if the digest is missing or the hash does not match
- opt-out flag for development only: `--insecure-skip-verify`

## UX Requirements

- clear progress output for each stage, also logged to `~/.config/yambuck/debug/update.log`
- explicit error messages and next steps when artifact unavailable
- minimal prompts, with `--yes` support for non-interactive execution; never
  prompts when piped
- starts Yambuck at the end unless `--no-relaunch` / `YAMBUCK_NO_RELAUNCH=1`

Trust and safety constraints:

- safe defaults first: per-user install is default, system install is explicit (`--system`)
- no ambiguous success: bootstrap reports success only after verify + install steps complete
- ownership clarity: bootstrap/uninstall flows must state that Yambuck manages only Yambuck-installed payloads
- no cross-manager mutation: uninstall/purge must not remove apps installed via package manager, `.deb`, or manual methods

## CLI Options

- `--system`
- `--version <tag>`
- `--yes`
- `--no-relaunch`
- `--insecure-skip-verify`
- `--help`
- `--channel <name>`: accepted and ignored, for older commands

## Environment Overrides

- `YAMBUCK_GITHUB_TOKEN`: bearer token for GitHub API requests (CI, shared IPs)
- `YAMBUCK_NO_RELAUNCH=1`: same as `--no-relaunch`
- `YAMBUCK_INSTALL_URL`: testing only, full tarball URL (`file://` works);
  requires `--insecure-skip-verify`

## Post-Install Expectations

- executable installed as `yambuck`; `yambuck --version` prints the version
- desktop launcher, `.yambuck` MIME type, file association (when no other
  default handler is set) and branded icons installed for the chosen scope
- output includes short trust reminder that Yambuck install/uninstall actions apply only to Yambuck-managed apps

## Reference Paths

- install script path: `docs/install.sh`
- uninstall script path: `docs/uninstall.sh`

## Open Gaps Tracking

Any implementation gaps against this spec should be tracked in `TODO.md`.
