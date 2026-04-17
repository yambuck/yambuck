# Yambuck Product Context

This is the canonical context document for future chats and contributors.

If you only read one file to understand product intent, read this one first.

## Mission

Yambuck exists to make installing Linux apps radically easier for non-technical users.

The product should feel:

- familiar
- predictable
- trustworthy
- polished

## Target User

- Everyday Linux users who do not want to learn distro/package-manager complexity.
- Users who want a simple, repeatable installer flow and clear outcomes.
- Users who care about confidence: "if it says installed, it is installed."

## Product Thesis (Why This Can Work)

- Linux app installation is fragmented and inconsistent across distros/tools.
- A consistent GUI-first installer flow can remove that friction for end users.
- If Yambuck is clearly easier and more reliable, users will prefer it.
- If users prefer it, developers have stronger incentive to ship `.yambuck` packages.

Core strategic loop:

1. Better UX and trust.
2. More user preference for Yambuck installs.
3. More pressure/demand for developers to package for Yambuck.
4. Better ecosystem coverage.

## Realism and Adoption Risk

This project has a real chicken-and-egg risk (users need packages, developers need user demand), but the underlying user need is real.

Key reality checks:

- Success depends on trust and reliability first, not breadth of ecosystem on day one.
- If Yambuck feels clearly easier than current Linux install flows, users will pull adoption forward.
- Early wins should come from a small set of high-value apps that prove the experience end to end.
- The bar is not "support everything immediately"; the bar is "make common installs feel effortless and safe."

## Non-Negotiable UX Principles

- Keep installs simple and decision-light by default.
- Keep flow standardized package-to-package (MSI-like consistency).
- Avoid clutter and "boxes inside boxes" UI where it hurts readability.
- Keep language plain and outcomes unambiguous.
- Use progressive disclosure: advanced/technical details behind expandable sections.

## Trust Contract (MVP)

The following behaviors are mandatory for trust:

- If install shows success, the app must be installed and launchable.
- Failed installs must never route to success UI.
- Failure UI must include plain-language error + copyable technical logs.
- Installed apps must remain listed unless the user explicitly uninstalls in Yambuck.
- Install/uninstall behavior must be deterministic and repeatable.

## Ownership and Safety Model

- Yambuck manages only Yambuck-installed apps.
- Yambuck must never mutate/remove apps installed by package managers, `.deb`, or manual methods.
- Install roots should be scope-specific and Yambuck-managed (dedicated `yambuck` subdirectory).
- Uninstall removes Yambuck-managed artifacts only.

## UX Direction: Installed Apps

Installed Apps should behave like a modern control-panel style manager:

- searchable
- sortable (minimum: name, install date)
- filterable (minimum: user vs all-users scope)
- clear metadata per app (status, scope, version, location)

## Platform and Integration Expectations

- First-class Linux desktop behavior (starting with Linux Mint, then broader desktop coverage).
- Correct permission/elevation handling for both X11 and Wayland.
- Use native Wayland portals where appropriate.
- Proper file association and icon behavior for `.yambuck` files.

## Packaging and Flow Direction

- `.yambuck` is a rigid, predictable install format.
- Default flow should be the same every time.
- App-specific install options (if supported) should be constrained and optional.
- Review/installer modals should use consistent shared components and interaction patterns.

## MVP Success Criteria

MVP is successful when users consistently experience:

- install succeeds cleanly or fails clearly (no ambiguous states)
- installed apps are reliably present and manageable in Yambuck
- uninstall is complete for Yambuck-managed payloads and safe for everything else
- common install/manage tasks are easier than distro-native alternatives for non-technical users

## Current Open Questions

- exact model for optional app-specific install inputs in manifest
- final install location layout per scope and migration/compatibility details
- full desktop-environment matrix and edge-case handling

## Source of Truth Map

- Product overview: `README.md`
- Technical/product spec: `docs/SPEC.md`
- Current agreed decisions: `docs/DECISIONS.md`
- Install/update/bootstrap specifics:
  - `docs/BOOTSTRAP_SPEC.md`
  - `docs/UPDATES_SPEC.md`
  - `docs/UNINSTALL.md`
- Active work backlog and issues: `TODO.md`

## How To Use This Document In New AI Chats

Before planning work, read:

1. `docs/PRODUCT_CONTEXT.md`
2. `docs/DECISIONS.md`
3. `TODO.md`

Then propose solutions that optimize for trust, simplicity, and repeatable UX first.
