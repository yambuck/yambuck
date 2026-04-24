# Yambuck Product Context

This is the canonical product brief for Yambuck.

It defines product intent, strategy, and governance. Normative technical rules live in owner specs, not here.

## Why Yambuck Exists

I built Yambuck because Linux app installation is still unnecessarily hard for normal users, especially when software is distributed through direct downloads instead of app stores.

After shipping my own apps, I kept seeing the same friction repeatedly:

- users must choose between package formats before they can even start
- install behavior changes across distros and desktop environments
- success/failure states are inconsistent and hard to trust
- uninstall visibility is messy and often unclear

Yambuck exists to make that experience predictable.

## Mission

Make installing Linux apps radically easier for non-technical users.

## Product Positioning

- Linux-first
- GUI-first
- CLI is planned/secondary (GUI is the active product surface today)
- Consumer-style installer UX (guided, plain language, modern)

## Target Users

- Everyday Linux users who do not want to learn package-manager complexity
- Users who install software from GitHub releases or vendor websites
- Developers/teams who distribute Linux desktop apps directly and want a cleaner install flow

## Product Thesis

- Linux installation is fragmented; users absorb too much complexity today.
- A standardized GUI-first install flow can remove that complexity for end users.
- If Yambuck is clearly easier and more reliable, users will prefer it.
- If users prefer it, developers have stronger incentive to ship `.yambuck` packages.

Strategic loop:

1. Better UX and trust.
2. More user preference for Yambuck installs.
3. More developer packaging demand for `.yambuck`.
4. Better ecosystem coverage.

## v1 Distribution Model

- Direct-download packages (`.yambuck`)
- Developers/vendors host files themselves (GitHub releases, vendor websites)
- No required central store or hosted backend in v1

## v1 Core User Experience

1. Install Yambuck once (bootstrap).
2. Download a `.yambuck` file.
3. Open it in the GUI flow (typically by double-clicking the package file).
4. Review app details, trust state, and install scope.
5. Install with clear progress and clear outcomes.
6. Manage installed apps and uninstall from Yambuck.

## Product Guardrails

- Trust and predictability are non-negotiable for v1.
- Scope and ownership boundaries must be explicit and safe.
- Default UX should be decision-light and consistent package-to-package.
- Reliability work takes priority over feature sprawl.

Normative behavior details are owned by `docs/SPEC.md`.

## Current Phase

Yambuck is past ideation and into execution hardening.

The direction is set. The work now is reliability, correctness, and cross-environment consistency so installs become boringly dependable.

## Spec Governance

- `docs/SPEC.md` and `docs/PACKAGE_SPEC.md` are the v1 quality bar.
- Do not lower spec to match temporary implementation gaps.
- If implementation is below spec, update TODO and uplift code.
- If implementation clearly exceeds spec in a durable, testable way, uplift spec to that higher bar.
- `TODO.md` is the single active queue for open work; completed items should be removed.

## Source of Truth Map

- Product overview and story: `README.md`
- Product context and decision baseline: `docs/PRODUCT_CONTEXT.md`
- Package authoring spec (`.yambuck` files): `docs/PACKAGE_SPEC.md`
- Technical/product spec: `docs/SPEC.md`
- Install/update/bootstrap specifics:
  - `docs/BOOTSTRAP_SPEC.md`
  - `docs/UPDATES_SPEC.md`
  - `docs/UNINSTALL.md`
- Active implementation backlog: `TODO.md`
