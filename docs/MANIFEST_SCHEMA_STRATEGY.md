# Manifest Schema Strategy (Exploration)

This note captures the explored options for keeping manifest specification and runtime validation in sync across versions.

## Current State

- Versioned parser entry exists in `crates/yambuck-core/src/manifest/mod.rs`.
- `v1` is active and validated.
- `v2` has an explicit parser stub that returns not implemented.

## Options Considered

1. Runtime-only handwritten validation (current baseline)
   - Pros: simple, no generation step.
   - Cons: risk of spec drift if docs and code diverge.

2. JSON schema as source-of-truth + generated Rust structs/validators
   - Pros: strong contract artifact for tooling and publisher validation.
   - Cons: generation pipeline complexity and serde compatibility overhead.

3. Code-defined schema descriptors per version (recommended for now)
   - Pros: keeps validation logic and field contract in one code path.
   - Pros: easier incremental evolution while product is still changing quickly.
   - Cons: still requires explicit artifact export for external tooling.

## Recommended Direction

Adopt a code-defined schema descriptor per manifest major version, then optionally export a generated JSON schema artifact from that descriptor during release tooling.

This gives:

- strict runtime validation in one place
- deterministic version dispatch (`v1`, `v2`, ...)
- ability to expose machine-readable schema without rewriting runtime validation

## Follow-on Implementation Tasks

1. Add `ManifestSchemaDescriptor` per major version in core.
2. Add release/dev command to emit JSON schema artifact from descriptors.
3. Add fixture tests asserting descriptor and parser behavior stay aligned.
