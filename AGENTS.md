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
