# UI Style Refactor Plan

This plan moves Yambuck GUI styling from shared global CSS toward scoped, component-owned styles while keeping design tokens centralized.

## Goals

- Eliminate style-leak regressions from broad descendant selectors.
- Keep styling local to components/features so changes are predictable.
- Preserve a single design language via shared tokens.
- Migrate without visual churn by reusing existing classes/values where possible.

## Architecture Decision

- Framework: keep **Preact**.
- Scoped styling system: **vanilla-extract** (`.css.ts`) for component/feature styles.
- Design tokens: continue using `src/theme/tokens.ts` + CSS variables initialized in `src/theme/initTokens.ts`.
- Global CSS ownership after migration:
  - `App.css` import entrypoint only.
  - shell/reset/global layout in `src/styles/shell.css`.
  - no component behavior selectors in global CSS.

## Migration Rules

- Prefer colocated `*.css.ts` next to component/feature files.
- No broad selectors like `.foo div` / `.foo button` in migrated code.
- Use token-backed CSS variables (`var(--colors-*)`, `var(--layout-*)`) in styles.
- Keep each migration PR/refactor step buildable and visually testable.

## Phase Plan

### Phase 1 - Foundation (in progress)

- Add vanilla-extract tooling (`@vanilla-extract/css`, `@vanilla-extract/vite-plugin`).
- Wire Vite plugin.
- Add style utility for token variable references (optional helper).
- Pilot migration on highest-risk control: custom select/dropdown.

Current phase status:

- Tooling installed and Vite plugin wired.
- `SelectField` migrated to scoped `vanilla-extract` styles (`src/components/ui/selectField.css.ts`).

### Phase 2 - UI Primitives

- Migrate `Button`, `TextField`, `CheckboxField`, `Panel`, `MetaField`, `ModalShell` to scoped styles.
- Keep public props stable; avoid behavior changes during style move.

Current phase status:

- `Button`, `TextField`, `CheckboxField`, `Panel`, and `ModalShell` migrated.
- `MetaField` remains pending in this phase.

### Phase 3 - High-Churn Feature Surfaces

- Migrate installer, installed-apps, settings feature styles from global CSS into feature-local `.css.ts`.
- Move table/grid/layout specifics into feature scope.

Current phase status:

- Installed Apps, Settings, and Installer migrated to feature-local scoped styles.

### Phase 4 - Modal and Overlay Surfaces

- Migrate review/update/license/screenshot/uninstall modal styles into modal-local styles.
- Ensure consistent z-index and overflow behavior with explicit ownership.

Current phase status:

- Modal and overlay presentation styles migrated to scoped styles (`modalStyles.css.ts` + `ModalShell` scoped styles).

### Phase 5 - Cleanup and Enforcement

- Remove migrated selectors from `src/styles/*.css`.
- Add lint/check guidance for selector scoping.
- Keep `check:styles` and `check:style-colors`; adjust baseline as needed.

Current phase status:

- Legacy global style files reduced to shell/reset and minimal compatibility/shared typography blocks.
- Existing style guardrails continue to pass on build.

## Completion Criteria

- Core controls and feature pages no longer rely on shared descendant selectors.
- New UI changes land primarily in component/feature-local `.css.ts` files.
- Global CSS files are limited to shell/reset and true global concerns.
- Build and style guardrails pass.
