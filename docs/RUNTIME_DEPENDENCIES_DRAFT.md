# Runtime Dependencies Draft (Proposal)

Status: draft for review. This is not normative yet.

Owner spec remains `docs/PACKAGE_SPEC.md` until this draft is accepted.

## Goal

Define a minimal `runtimeDependencies` schema for `.yambuck` manifests that keeps preflight checks useful without turning Yambuck into a distro package manager abstraction layer.

This draft follows a bundle-first direction:

- package authors should bundle as much runtime as practical
- dependency checks should focus on unavoidable host requirements
- checks should produce clear user-facing guidance

## Practical Constraints

Linux distro/package naming differs widely. A dependency model that relies on distro package names (`apt`, `dnf`, `pacman`) would be brittle and hard to keep consistent.

v1 should avoid distro package-name resolution and instead check runtime capabilities directly (commands, files, libraries, environment).

## Non-Goals (v1)

- mapping distro package names across distributions
- SAT-style dependency solving
- automatic package-manager install actions
- broad ABI compatibility guarantees beyond explicit checks

## Proposed Manifest Field

`runtimeDependencies` is optional.

If omitted, Yambuck performs no additional runtime dependency checks beyond existing compatibility and install preflight checks.

```json
{
  "runtimeDependencies": {
    "strategy": "bundleFirst",
    "checks": [
      {
        "id": "glibc-min",
        "type": "soname",
        "name": "libc.so.6",
        "minimumVersion": "2.31",
        "severity": "block",
        "message": "This app needs a newer system C runtime."
      },
      {
        "id": "xdg-open",
        "type": "command",
        "name": "xdg-open",
        "severity": "warn",
        "message": "Open-link integration may be limited."
      }
    ]
  }
}
```

## Schema (Draft)

### `runtimeDependencies`

- `strategy` (required): `bundleFirst` | `hostRequired`
  - `bundleFirst`: default direction for v1 packages
  - `hostRequired`: publisher explicitly depends on host runtime components
- `checks` (required): array of 1-64 check objects

### `runtimeDependencies.checks[]`

Common fields:

- `id` (required): unique kebab-case identifier
- `type` (required): `command` | `file` | `soname` | `envVar`
- `severity` (required): `block` | `warn`
- `message` (optional): plain-language user guidance
- `technicalHint` (optional): copy-friendly technical detail
- `appliesTo` (optional): host filter

`appliesTo`:

- `os` (optional): `linux` | `windows` | `macos`
- `arch` (optional): `x86_64` | `aarch64` | `riscv64`
- `variant` (optional): target variant (`default`, `x11`, `wayland`, etc.)

Type-specific fields:

1. `type: "command"`
   - `name` (required): command resolved from `PATH`
   - `minimumVersion` (optional): semver-like string
   - `versionCommand` (optional): override probe command
   - `versionRegex` (optional): regex capture for version extraction

2. `type: "file"`
   - `path` (required): absolute host path
   - `mustBeExecutable` (optional, default `false`)

3. `type: "soname"`
   - `name` (required): shared library soname (`libssl.so.3`)
   - `minimumVersion` (optional): minimum required version text

4. `type: "envVar"`
   - `name` (required): environment variable name
   - `allowedValues` (optional): non-empty string array
   - `requiredPattern` (optional): regex pattern

## Validation Rules (Draft)

- reject unknown `strategy`
- reject empty or duplicate `checks[].id`
- reject unknown `type` or `severity`
- enforce required fields per check type
- reject empty strings for required text fields
- validate `appliesTo` values against known enums
- enforce canonical camelCase manifest key naming only

## Runtime Behavior (Draft)

Dependency checks run during install preflight after target selection.

Outcomes:

- no failed checks: continue
- only `warn` failures: continue with warning summary
- any `block` failure: block install

Proposed reason codes:

- `missing_runtime_dependency`
- `runtime_dependency_version_too_low`
- `runtime_dependency_misconfigured`
- `runtime_dependency_check_failed`

Each reason should include:

- plain-language message
- optional copy-friendly technical details

## UX Contract (Draft)

- keep default flow simple and non-technical
- show dependency details in `Advanced` when non-blocking
- if blocked, show concise top-level reason + actionable guidance
- if warning-only, show warning summary before final install action

## Author Guidance (Draft)

- bundle dependencies whenever practical
- use runtime checks only for host requirements you cannot bundle
- prefer `warn` unless the app truly cannot run
- keep checks minimal and high signal

## Open Questions

1. Should `soname` version checks be best-effort in v1 (warn when probing is inconclusive)?
2. Should `runtimeDependencies` remain top-level with `appliesTo`, or allow per-target declarations in a future revision?
3. Should warning-only dependency failures require explicit acknowledgment, or remain informational only?
