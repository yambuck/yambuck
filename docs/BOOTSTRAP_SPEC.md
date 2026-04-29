# Yambuck Bootstrap Spec (v1)

## Purpose

The bootstrap flow installs Yambuck itself with one command, then enables the normal end-user workflow:

1. install Yambuck once
2. download `.yambuck` package files
3. open package files with Yambuck installer UI

## User Entry Point

Primary command shown on website:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://yambuck.com/install.sh | bash
```

Companion uninstall command:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://yambuck.com/uninstall.sh | bash
```

## Scope and Privilege

- default mode: per-user install
  - install directory: `~/.local/bin`
  - no sudo required
- optional mode: system install (`--system`)
  - install directory: `/usr/local/bin`
  - requires sudo

## Artifact Model

Bootstrap downloads a prebuilt release artifact from GitHub Releases by default.

- asset naming convention:
  - `yambuck-linux-x86_64.tar.gz`
  - `yambuck-linux-aarch64.tar.gz`
- checksum file:
  - `<asset>.sha256`

## Verification Rules

- checksum verification is required by default
- install fails if checksum download fails or hash mismatch occurs
- opt-out flag available only for development:
  - `--insecure-skip-verify`

## UX Requirements

- clear progress output for each stage
- explicit error messages and next steps when artifact unavailable
- minimal prompts, with `--yes` support for non-interactive execution

Trust and safety constraints:

- safe defaults first: per-user install is default, system install is explicit (`--system`)
- no ambiguous success: bootstrap reports success only after verify + install steps complete
- ownership clarity: bootstrap/uninstall flows must state that Yambuck manages only Yambuck-installed payloads
- no cross-manager mutation: uninstall/purge must not remove apps installed via package manager, `.deb`, or manual methods

## CLI Options

- `--system`
- `--version <tag>`
- `--channel latest|stable`
- `--yes`
- `--insecure-skip-verify`
- `--help`

## Environment Overrides

For internal testing and CI:

- `YAMBUCK_INSTALL_URL` (full URL to tarball)
- `YAMBUCK_CHECKSUM_URL` (full URL to checksum)

## Post-Install Expectations

- executable installed as `yambuck`
- command available in install path
- user sees next-step command: `yambuck --help`
- output includes short trust reminder that Yambuck install/uninstall actions apply only to Yambuck-managed apps

## Known v1 Limits

- bootstrap installs binary only
- desktop file association setup for `.yambuck` is handled in a dedicated integration step

## Reference Paths

- install script path: `docs/install.sh`
- uninstall script path: `docs/uninstall.sh`

## Open Gaps Tracking

Any implementation gaps against this spec should be tracked in `TODO.md`.
