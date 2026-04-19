# Yambuck Agent Guidelines

This file defines project-level conventions for AI/code agents working in this repository.

## Naming Standards

- Manifest JSON keys are canonical `camelCase` (for example `appId`, `appUuid`, `packageUuid`).
- Rust identifiers use `snake_case`.
- TypeScript identifiers use `camelCase`.
- CLI flags and file names use `kebab-case`.

## Enforcement Expectation

- When editing touched areas, resolve nearby naming that violates the standards above.
- Prefer small, scoped fixes over broad renames unless a full migration is explicitly requested.
- Do not introduce additional mixed naming styles in new code.
- If changing public field names would break compatibility, keep current behavior and document a migration path before refactoring.

## Manifest Contract

- Treat manifest key naming as part of the package contract.
- Reject non-canonical manifest key styles during validation with clear, actionable errors.

## Time Standard

- Canonical timestamps for logs, copied diagnostics, and exported error details must use ISO 8601 / RFC 3339 with milliseconds and explicit numeric offset (example: `2026-04-19T14:32:10.123+01:00`).
- UI text may present a friendlier local timestamp, but copy/export payloads should include canonical timestamps.
