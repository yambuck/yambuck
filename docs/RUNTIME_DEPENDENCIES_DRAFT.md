# Runtime Dependencies Temporary Spec (v1 Working Draft)

Status: temporary implementation spec used during development. This is not yet normative.

Owner spec remains `docs/PACKAGE_SPEC.md` until final behavior is ratified.

## Purpose

Define a minimal `runtimeDependencies` contract that lets package authors declare host requirements without modifying app code and without turning Yambuck into a distro package manager frontend.

Core direction:

- bundle-first by default
- manifest remains optional and lightweight
- checks describe capabilities, not distro package names
- installer preflight reports blockers vs warnings before launch

## Product Constraints

Linux package names differ by distro and frequently change over time. Encoding package-manager knowledge into app manifests creates long-term maintenance burden and noisy metadata.

For v1, manifests must declare runtime requirements in distro-agnostic terms (for example `command` and `file` checks). Any distro-specific install guidance belongs in Yambuck runtime messaging, not in the package contract.

## Non-Goals (v1)

- package-manager automation (`apt`, `dnf`, `pacman`, etc.)
- distro package-name mapping in manifest fields
- dependency graph solving or SAT-style resolution
- broad ABI guarantees beyond explicit checks

## Manifest Contract (Working)

`runtimeDependencies` is optional. If omitted, no extra runtime dependency checks are added.

```json
{
  "runtimeDependencies": {
    "strategy": "bundleFirst",
    "checks": [
      {
        "id": "xdg-open",
        "type": "command",
        "name": "xdg-open",
        "severity": "warn",
        "message": "Open-link integration may be limited.",
        "technicalHint": "Ensure xdg-utils is installed.",
        "appliesTo": {
          "os": "linux"
        }
      },
      {
        "id": "portal-service",
        "type": "file",
        "path": "/usr/share/dbus-1/services/org.freedesktop.portal.Desktop.service",
        "severity": "block",
        "message": "Desktop portal support is required for this app on Linux.",
        "technicalHint": "Install and enable xdg-desktop-portal for your desktop environment.",
        "appliesTo": {
          "os": "linux"
        }
      }
    ]
  }
}
```

## Schema (Working)

### `runtimeDependencies`

- `strategy` (required): `bundleFirst` | `hostRequired`
  - `bundleFirst`: app should bundle dependencies whenever practical; host checks are exceptions
  - `hostRequired`: app intentionally relies on host-provided runtime components
- `checks` (required): array of 1-32 check objects
  - guidance budget: keep practical usage around 8-12 checks per package

### `runtimeDependencies.checks[]`

Common fields:

- `id` (required): unique kebab-case identifier
- `type` (required): `command` | `file` (v1)
- `severity` (required): `block` | `warn`
- `message` (optional): user-facing plain-language explanation
- `technicalHint` (optional): copy-friendly technical detail
- `appliesTo` (optional): host filter

`appliesTo` (v1):

- `os` (optional): `linux` | `windows` | `macos`

Type-specific fields (v1):

1. `type: "command"`
   - `name` (required): command resolved from `PATH`

2. `type: "file"`
   - `path` (required): absolute host path
   - `mustBeExecutable` (optional, default `false`)

Deferred to phase 2:

- `soname` checks and version extraction
- command version parsing (`minimumVersion`, `versionRegex`)
- environment-variable policy checks

## Validation Rules (Working)

- reject unknown `strategy`, `type`, or `severity`
- reject empty or duplicate `checks[].id`
- reject unknown keys inside each check object
- enforce required fields per check type
- reject empty strings for required text fields
- validate `appliesTo.os` against known enum values
- enforce canonical camelCase manifest key naming only

## Runtime Preflight Behavior (Working)

Checks execute during install preflight after target selection.

Outcomes:

- no failures: continue
- only `warn` failures: continue with warning summary
- any `block` failure: stop install until user resolves requirements

Result payload should include:

- check `id`, `type`, and evaluated result
- severity (`block` or `warn`)
- message shown to users
- optional technical hint for expanded details/copy
- machine-readable reason code

Suggested reason codes:

- `missing_runtime_dependency`
- `runtime_dependency_misconfigured`
- `runtime_dependency_check_failed`

`runtime_dependency_check_failed` is used when probe execution itself is inconclusive. In v1, inconclusive results must not escalate above declared severity.

## UX Contract (Working)

- default UI stays non-technical
- show clear blocker/warning counts in review and preflight screens
- show concise actionable text first (`message`)
- show `technicalHint` under expandable advanced detail
- do not show package-manager commands as first-class install actions in v1

## Author Guidance (Working)

- bundle whenever possible
- declare only host requirements that cannot be bundled
- use `block` only when launch or core function is impossible
- use `warn` for degraded or optional behavior
- keep checks sparse and high-signal

## Distro Variance Policy (Working)

Manifests stay distro-agnostic. Distro-aware wording may be provided by installer/runtime diagnostics, but distro package names are not part of manifest validation in v1.

If a requirement truly differs by environment, prefer capability-level checks scoped by `appliesTo.os` and runtime detection rather than distro-specific manifests.

## Migration To Owner Spec

When behavior is finalized:

1. Move normative rules into `docs/PACKAGE_SPEC.md`.
2. Replace this file with a short pointer to the owner spec.
3. Align validation and installer behavior tests to the finalized contract.
