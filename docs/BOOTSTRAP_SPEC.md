# Yambuck Bootstrap Spec (v1)

## Purpose

The bootstrap flow installs Yambuck itself with one command, then enables the normal end-user workflow:

1. install Yambuck once
2. download `.yambuck` package files
3. open package files with Yambuck installer UI

## User Entry Point

Primary command shown on website:

```bash
curl -fsSL https://yambuck.com/install.sh | bash
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

## Known v1 Limits

- bootstrap currently installs binary only
- desktop file association setup for `.yambuck` will be added in a dedicated integration step

## Implementation Status

- install script path: `docs/install.sh`
- active status: bootstrap installer implemented for release artifacts
- pending: publish first signed release artifact + desktop association integration
