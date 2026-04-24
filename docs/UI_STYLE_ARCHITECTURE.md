# UI Style Architecture

This document defines the long-term styling architecture for the Yambuck GUI.

## Decision

Yambuck uses a token-driven hybrid styling model:

- Design tokens are defined in TypeScript (`apps/yambuck-gui/src/theme/tokens.ts`).
- Tokens are injected as CSS variables at startup (`apps/yambuck-gui/src/theme/initTokens.ts`).
- Reusable UI primitives provide consistent controls and states.
- Scoped component styles are migrating to `vanilla-extract` (`.css.ts`) for isolation.
- Global CSS remains responsible for shell/reset/global layout behavior only.

Yambuck does not use full inline-only styling as the default architecture.

## Principles

- Use shared UI primitives for common controls (`Button`, `SelectField`, `TextField`, `CheckboxField`, `Panel`).
- Avoid one-off control markup when a primitive exists.
- Prefer token variables over hardcoded style values in new or edited code.
- Keep focus-visible behavior explicit and consistent across interactive controls.

## File Ownership

- `apps/yambuck-gui/src/theme/tokens.ts`: source of truth for semantic tokens.
- `apps/yambuck-gui/src/components/ui/*`: reusable control primitives.
- `apps/yambuck-gui/src/components/ui/*.css.ts`: component-scoped styles (migration target).
- `apps/yambuck-gui/src/App.css`: import-only stylesheet composition entrypoint.
- `apps/yambuck-gui/src/styles/shell.css`: app shell, topbar, toasts, modal shell, global responsive rules.
- `apps/yambuck-gui/src/styles/common.css`: shared panel/meta/button/progress/scope styles.
- `apps/yambuck-gui/src/styles/installed.css`: installed-apps and shared select/text control styles.
- `apps/yambuck-gui/src/styles/settings.css`: settings/debug section styles.

## File Size Guardrails

- Soft target: keep CSS files at or under 800 lines.
- Hard limit: 1000 lines per CSS file.
- Enforcement command: `npm run check:styles` in `apps/yambuck-gui`.
- Build enforcement: `npm run build` runs style-size checks before typecheck/build.

## Raw Color Literal Guardrails

- New raw color literals in `src/styles/*.css` are blocked by baseline check.
- Enforcement command: `npm run check:style-colors` in `apps/yambuck-gui`.
- Baseline file: `apps/yambuck-gui/scripts/style-color-literals-baseline.json`.
- Baseline maintenance command: `node scripts/check-style-color-literals.mjs --update-baseline` (use only after intentional styling review).

## Open Gaps Tracking

Any open implementation gaps against this architecture should be tracked in `TODO.md`.
