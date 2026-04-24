# TODO

Single active queue for open work only.

Completed items should be removed from this file.

## Now

- [ ] Implement host compatibility preflight before install execution (architecture/target checks with clear plain-language block reasons + technical details).
- [ ] Define and implement v1 multi-architecture manifest schema and payload mapping rules.
- [ ] Implement deterministic host payload selection for multi-arch packages and block unsupported hosts before install begins.
- [ ] Implement post-install cleanup to retain only selected host payload artifacts and remove unused architecture binaries.
- [ ] Keep default install flow minimal; move app-specific/technical controls behind collapsed `Advanced` sections.
- [ ] Implement system-scope in-app update apply flow with elevation and failure-safe parity with user-scope updates.
- [ ] Complete Linux desktop validation matrix and document outcomes (Mint/Cinnamon, GNOME, KDE; X11 and Wayland; MIME/icon/launcher behavior).

## Next

- [ ] Enforce strict semver validation for `manifestVersion` to match `docs/PACKAGE_SPEC.md` v1 bar.
- [ ] Add lightweight command/script to export `v1` manifest schema artifact from code-defined structs.
- [ ] Standardize user-facing copy across install/uninstall success, failure, warnings, retries, and policy blocks.
- [ ] Define dependency/conflict handling rules (missing deps, incompatible versions, duplicate app IDs/names).
- [ ] Define interruption resilience policy (power loss/crash during install) with resume-or-rollback guarantees.
- [ ] Fix title-bar window controls so maximize and close glyphs are visually centered in circular buttons.
- [ ] Add lightweight release-gate checklist for spec/code alignment before release (package conformance, reliability checks, desktop validation sign-off).
- [ ] Revisit uninstall CLI flag model after logging/elevation stabilization (consider reintroducing scoped purge flags with clear UX contract).

## Ideas / Parking Lot

- Keep a short section in `docs/PACKAGE_SPEC.md` that labels items as `enforced now` vs `planned` to reduce ambiguity while v1 is still being completed.
- Consider adding a one-command "pre-release sanity" script that bundles core checks (build, smoke install/uninstall, feed validation).
