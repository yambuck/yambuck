# UI Shell And Wrapper Standard

This document defines the standard layout shell for page and modal surfaces in Yambuck GUI, and records the current nested-card audit.

## Goals

- Keep major pages visually consistent and predictable.
- Use nested card treatment only when it adds functional grouping.
- Avoid card-inside-card framing that compresses content width without improving scanability.

## Standard: App Pages

All major pages should follow this structure:

1. Root content area: `section.panel`
2. Page heading: `h1`
3. Optional subtitle: `p.subtitle`
4. Primary page actions in `div.actions`
5. Feature-specific content blocks below actions

Guidance:

- Use `panel package-panel` for package-centric flows where top-right close affordance is needed.
- Prefer list/table rows over full nested cards for collection views (Installed Apps).
- Keep metadata groups (`meta-grid`) when they provide structured scanability and tooltip help.

## Standard: Modals

All modals should follow this structure:

1. Root overlay: `div.modal-overlay`
2. If top bar should stay visible: add `topbar-safe`
3. Container: `section.modal-card`
4. Header row: `.screenshot-modal-toolbar` or equivalent header layout
5. Explicit close affordance in top-right (`CardCloseButton` preferred where shell allows)

Guidance:

- Use `modal-card panel package-panel` for detail/review modals that share installer shell behavior.
- Keep lightweight confirmation modals (`Update`, `Uninstall`) on plain `modal-card` unless layout pressure requires package shell.

## Nested-Card Audit (Current State)

### Installer page

- Status: **Accept as-is**
- Why: `meta-grid` blocks and trust/technical sections are functional grouping with strong readability value.

### Installed Apps page

- Status: **Needs refactor (primary target)**
- Why: `panel` + repeated `installed-card` blocks create dense nested framing and constrained layout for list-scale content.
- Next: move to width-fluid list/table shell (TODO 122-129).

### Settings page

- Status: **Mostly keep**
- Why: `setting-card` and `debug-section` boundaries separate unrelated controls and diagnostics clearly.
- Constraint: avoid adding deeper card nesting inside these blocks.

### Installed app review modal

- Status: **Aligned**
- Why: now uses `modal-card panel package-panel` with standard close affordance and shared shell behavior.

### Other modals (`Update`, `Uninstall`, `License`)

- Status: **Accept with standard contract**
- Why: modal wrappers are consistent enough; future cleanup should normalize close affordance and header spacing, not redesign behavior.

## Implementation Order

1. Standardize Installed Apps container/layout (TODO 122-124)
2. Apply list/table interaction model (TODO 125-129)
3. Opportunistic modal-shell consistency cleanup during adjacent feature work
