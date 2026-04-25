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

## Migration And Legacy Policy

- Do not keep legacy fallback paths once a new standard is adopted.
- When a format/field/flow is replaced, remove old behavior in the same implementation pass unless explicitly instructed otherwise.
- Do not add backward-compatibility shims for deprecated package formats.
- Enforce fail-fast validation on the current standard only.
- If temporary compatibility is truly required, it must be explicitly requested and documented with a concrete removal plan.

## Time Standard

- Canonical timestamps for logs, copied diagnostics, and exported error details must use ISO 8601 / RFC 3339 with milliseconds and explicit numeric offset (example: `2026-04-19T14:32:10.123+01:00`).
- UI text may present a friendlier local timestamp, but copy/export payloads should include canonical timestamps.

## Documentation Ownership (Single Source Of Truth)

Use one owner document per topic. Do not duplicate normative rules across docs.

- `README.md`: founder narrative, high-level product framing, quick-start links.
- `docs/PRODUCT_CONTEXT.md`: product intent, strategy, governance, and source-of-truth map.
- `docs/SPEC.md`: runtime/application technical contract (installer behavior, ownership model, update behavior, platform behavior).
- `docs/PACKAGE_SPEC.md`: package-authoring contract for `.yambuck` files (manifest/media/layout validation rules).
- `TODO.md`: single active work queue (open tasks only) and idea parking lot.

When updating docs:

- Put normative detail in the owner document only.
- In non-owner docs, use short pointers/links instead of restating rules.

## Spec Governance (Spec Is The Bar)

- Treat `docs/SPEC.md` and `docs/PACKAGE_SPEC.md` as the v1 quality bar.
- Do not lower spec to match temporary implementation gaps.
- If implementation is below spec, create/update TODO items and uplift code.
- If implementation clearly exceeds spec in a durable, testable way, uplift spec to that higher bar.

## Execution Hygiene (Single Queue)

- Use `TODO.md` as the single active planning queue.
- Keep completed items out of `TODO.md`; once done, remove them.
- Keep `TODO.md` split into:
  - `Now` (current priorities)
  - `Next` (queued work)
  - `Ideas / Parking Lot` (uncommitted ideas)
- When behavior changes, update the owner spec doc in the same session (`docs/SPEC.md` or `docs/PACKAGE_SPEC.md`).
- Do not create parallel status trackers unless explicitly requested.

## New Session Read Order

When starting a fresh chat/agent session for implementation work, read in this order:

1. `docs/PRODUCT_CONTEXT.md`
2. `docs/SPEC.md`
3. `docs/PACKAGE_SPEC.md`
4. `TODO.md`
