# TODO

Fast-moving reminder list with enough detail to debug/fix without re-explaining.

## Bugs / Known Issues
- [ ] License acceptance checkbox UI is too small and not in keeping with the rest of the app styling.
  - Why this matters: weak visual consistency and lower clarity on an important consent action.

- [ ] "Install for current user" works, but "install for all users" currently fails.
  - Observed error: "Install finished with issues. Could not update installed apps index."
  - Current behavior after failure is incorrect: app shows the normal install-complete screen with actions like "install another" and "launch application".
  - Expected behavior: do not show success/complete UI when install failed.
  - Required UX: show a dedicated install-failed screen instead.
  - Failure screen should include:
    - a short plain-language error summary
    - detailed logs in a code-style block (ideally easy to copy)
  - Reason for logs: allow user/vendor/support (including you) to diagnose install failures quickly.
  - Probable root cause to confirm: all-users path likely needs elevated permissions, but app does not request elevation now.
  - Symptom supporting that theory: no username/password or sudo-style auth prompt appears during all-users install attempt.
  - Platform requirement: implement permission/elevation correctly for both X11 and Wayland.
  - Implementation preference: use proper native Wayland portals where appropriate.

- [ ] `.yambuck` file icon/thumbnail is blank in file browser (observed on Linux Mint).
  - Current state: double-click/open behavior works, so file association is at least partially in place.
  - UX gap: downloaded `.yambuck` files do not show Yambuck app branding in the file manager.
  - Desired behavior: `.yambuck` files should display the Yambuck application icon for instant recognition of which app opens the file.
  - Why this matters: quick visual trust/recognition is important, especially for non-technical end users.
  - Scope note: only validated so far on Linux Mint; likely needs proper desktop integration for Linux environments/desktops.

- [ ] Review screen/modal window behavior is inconsistent with the rest of the app.
  - Missing UI: review screen should have the same top-right close `X` icon as other screens/modals.
  - Layout bug: this screen currently covers the app title bar/window chrome.
  - Why this is wrong: it blocks native window controls (close, maximize, minimize), which should always remain accessible.
  - Expected behavior: review flow should use the same presentation/code path/look-and-feel pattern as when opening a `.yambuck` file.
  - Consistency requirement: standardized/shared components and consistent interaction model across all modal/pop-up style screens.

- [ ] On review screen, tooltip in the license section blocks clicking the `View license` button.
  - Current bug: user cannot click `View license` because tooltip overlay/hover behavior sits in the way.
  - Expected behavior: `View license` must always be directly clickable and keyboard-accessible.
  - Requirement: tooltip must not capture/intercept pointer events intended for the button.

- [ ] Review screen needs richer, optional technical details similar to `.yambuck` open screen.
  - Desired layout: normal application info first, plus a small "expand technical information" control.
  - Expanded details should include:
    - install path
    - configuration location
    - almost all other useful manifest metadata
  - Why this matters now: important for early-stage debugging while product behavior is still being stabilized.
  - Why this matters long-term: helps users self-serve common questions (for example where config lives) without external searching.

- [ ] Installed Apps layout has too many "boxes inside boxes" and wastes horizontal space.
  - Current pattern uses nested cards (`Installed Apps`, `Choose Package`, `Settings`) that can feel over-framed.
  - On Installed Apps screen, content behaves like a list/table but card containers appear to have fixed/max width.
  - Result: widening/fullscreen window does not reveal more info; large unused whitespace remains.
  - Impact: reduced information density, harder scanning, weaker use of available screen real estate.
  - Need to evaluate reducing/removing inner cards and placing content directly on page backdrop where appropriate.
  - Goal: responsive layout that expands with window width and uses extra space for more columns/details.

- [ ] Installed Apps list needs stronger usability features (icon size, search, sorting, filtering).
  - Increase per-app icon size slightly in the installed apps list for quicker recognition/scanning.
  - Add a search box to filter installed applications by name (fast type-to-filter behavior).
  - Consider moving to a reusable data-table component for Installed Apps to support richer controls.
  - Sorting requirements to support early: by name and by date installed (similar to familiar OS app-management lists).
  - Filtering requirement to support early: install scope (user vs system-wide), likely via dropdown filter.
  - Goal: start with these controls now, then iterate/refine once real usage feedback comes in.

- [ ] Review and harden install-location ownership model for trust and non-conflicting behavior.
  - Need an explicit review of where apps are currently installed (user scope and system-wide scope paths).
  - Confirm whether installs currently land in generic/shared directories and where conflicts could happen.
  - Direction to implement: in both scopes, install into a dedicated `/yambuck` subdirectory under the appropriate base path.
  - Goal: keep Yambuck-managed app payloads separated from apps installed by other methods (package manager, `.deb`, manual installs, etc.).
  - Ownership rule: Yambuck should only manage/uninstall apps it installed itself.
  - Safety rule: Yambuck uninstall must never remove or alter copies installed outside Yambuck.
  - Product behavior goal: Installed Apps list shows Yambuck-managed installs only, and entries only disappear when user uninstalls from Yambuck.
  - Trust requirement: if installed via Yambuck, app should not "magically disappear" from the list unless explicitly uninstalled in Yambuck.

- [ ] Install flow must be rigid, predictable, and familiar every time (MSI-like consistency).
  - Goal: same flow, same screens, same choices, same language for every `.yambuck` install.
  - UX requirement: avoid weird/wacky one-off installer behavior that forces user decisions.
  - Product bar: easiest Linux install experience by a large margin; polished front-end even while backend evolves.
  - Outcome requirement: if app installs via `.yambuck`, it should install, run, remain listed, and only disappear when explicitly uninstalled in Yambuck.

- [ ] Need explicit strategy for optional app-specific install inputs without breaking default simplicity.
  - Keep default install path decision-light for non-technical users.
  - Investigate manifest-defined install options model (only when truly required by package).
  - Ensure optional choices are constrained/standardized so installer experience remains familiar.

- [ ] Add multi-architecture package support with compatibility preflight and clear user messaging.
  - Support a single `.yambuck` file containing multiple architecture payloads (at minimum `x86_64` and `aarch64`).
  - On open/install, detect host architecture early and select matching payload automatically.
  - If no compatible payload exists, block before install execution and show plain-language reason plus expandable technical details.
  - Keep this behavior deterministic and consistent across supported distro families.

- [ ] Persist rich installed-app metadata independently of the original downloaded `.yambuck` file.
  - Keep icon, screenshots, key manifest fields, and ownership/install metadata in Yambuck-managed state after install.
  - Ensure Installed Apps remains fully informative even if user deletes the downloaded installer file from `Downloads`.
  - Retain only metadata/assets required for Installed Apps UX and lifecycle actions.

- [ ] Enforce multi-arch storage hygiene after install.
  - Install and retain only the host-matching payload.
  - Do not retain unused architecture binaries from the package after successful install.
  - Ensure uninstall receipts/ownership metadata only reference actually installed artifacts.

- [ ] Trust and adoption depend on reliability + clarity at every stage.
  - User confidence target: installed means installed, removable means fully removed via Yambuck.
  - UX target: refined, uncluttered, repeatable interactions with clear status and no ambiguous outcomes.
  - Strategic note: stronger trust and ease-of-use should increase user demand for software packaged in `.yambuck` format.

## Tasks
- [x] Define and implement correct privilege escalation flow for all-users installs.
- [x] Add install-failed screen and wire failed install paths to it (never route failures to success screen).
- [x] Surface structured failure details/log output in the failed screen for support/debug use.
- [x] Verify/install flow behavior on both X11 and Wayland with native-first portal usage where appropriate.
- [x] Implement `.yambuck` MIME type + icon integration so file managers show Yambuck icon instead of blank file icon.
- [ ] Validate `.yambuck` icon visibility and open-with association on Linux Mint first, then test other Linux desktop environments.
- [x] Refactor review screen to use the same shell/container/modal code path as `.yambuck` open flow.
- [x] Ensure review screen always preserves visible native title bar/window controls and includes standard top-right `X` close action.
- [ ] Fix license-section tooltip layering/pointer behavior so `View license` is reliably clickable.
- [ ] Add expandable technical-information panel in review screen (aligned with `.yambuck` open screen UX).
- [ ] Populate technical panel with install path, config location, and broad manifest metadata useful for debugging/support.
- [ ] Audit major pages for nested-card usage and identify where cards add value vs visual clutter.
- [ ] Refactor Installed Apps view to a width-fluid list/table container (remove fixed narrow card constraints).
- [ ] Ensure layout scales from small window to fullscreen with progressive information density.
- [ ] Keep visual consistency while avoiding card-inside-card patterns unless functionally necessary.
- [ ] Increase installed-app icon size in list rows while keeping row spacing and alignment clean.
- [ ] Add installed-app search input (name-based filtering with responsive updates).
- [ ] Define or adopt a reusable data-table component for Installed Apps (sorting + filtering + search).
- [ ] Implement table sorting (minimum: app name and date installed).
- [ ] Implement scope filter control (user-installed vs system-wide).
- [ ] Audit current install/uninstall paths for user + system scopes and document exact directories in use.
- [ ] Implement dedicated Yambuck-managed install roots (including `/yambuck` subdirectory strategy per scope).
- [ ] Persist and rely on Yambuck ownership metadata so only Yambuck-installed apps are listed/managed by Yambuck.
- [ ] Guard uninstall logic to never touch non-Yambuck installs, even when app names overlap.
- [ ] Ensure Installed Apps list is source-of-truth for Yambuck-managed installs and entries change only through explicit Yambuck install/uninstall actions.
- [ ] Implement atomic install transactions with rollback so failures never leave partial installs.
- [ ] Add post-install verification checks (payload files, launchers/entry points, registration) before showing success state.
- [ ] Implement deterministic uninstall that removes all Yambuck-managed artifacts while never touching non-Yambuck installs.
- [ ] Persist per-install ownership receipts/manifests (files, paths, version, scope, timestamps) as source of truth.
- [ ] Define clear install state machine (queued, downloading, validating, installing, verifying, success, failed).
- [ ] Improve failure UX with one-click recovery actions (`Retry`, `Copy logs`, `Open logs`) and short plain-language root-cause summary.
- [ ] Add package integrity/authenticity validation for `.yambuck` payloads before install execution.
- [ ] Enforce manifest schema validation with user-readable hard-fail errors.
- [ ] Tighten manifest validation to require non-empty `iconPath`, `description`, and `longDescription` fields (trim whitespace; hard-fail when missing/blank).
- [ ] Require at least 1 screenshot in `screenshots` and cap at 6 (to match installer preview limits).
- [ ] Restrict screenshot formats to `.png`, `.jpg`, `.jpeg`, or `.gif` only (hard-fail unsupported formats).
- [ ] Restrict icon formats to `.png`, `.jpg`, or `.jpeg` only (no `.webp` in v1 strict mode).
- [ ] Validate icon and screenshot files by actual file signature (magic bytes) and decode success, not filename extension.
- [ ] Reject zero-byte and tiny placeholder image assets using minimum file-size thresholds for icon and screenshots.
- [ ] Enforce minimum media dimensions (`icon`: at least `128x128`; `screenshots`: at least `256x256`).
- [ ] Ensure installer screenshot rendering never stretches images and always preserves original aspect ratio in preview and modal.
- [ ] Add screenshot aspect-ratio guardrails (reject extreme banner/tall-strip shapes that degrade preview UX).
- [ ] Fail validation when required asset paths point to missing files, directories, or unreadable/corrupt image data.
- [ ] Return field-specific manifest/file errors (for example `iconPath`, `screenshots[0]`) with clear fix guidance for packagers.
- [ ] Add fixture-based tests for strict media validation cases: blank files, renamed text files, corrupt images, too-small dimensions, unsupported extensions, and missing required assets.
- [ ] Add versioned manifest parsing pipeline with explicit handlers per major version (`v1`, future `v2`, etc.).
- [ ] Preserve backward compatibility by routing older package manifests to their matching parser/validator instead of newest-only rules.
- [ ] Define manifest evolution policy: allowed minor additions, major-version breaking changes, and deprecation windows.
- [ ] Add fixture-based compatibility tests for multiple manifest versions (valid/invalid cases per version + upgrade safety checks).
- [ ] Explore code-defined schema representation (or generated schema artifact) per manifest version to keep spec and validation in sync.
- [ ] Add path safety protections (block traversal/symlink escape and writes outside approved roots).
- [ ] Limit privilege escalation to required steps only; log why elevation was required.
- [ ] Expand Installed Apps list fields to include status, scope, version, install date, and install location.
- [ ] Keep default install flow minimal; place advanced/technical controls behind expandable "Advanced" sections.
- [ ] Standardize user-facing copy across install/uninstall success, failure, warnings, and retries.
- [ ] Validate behavior across Linux desktop environments (Mint/Cinnamon, GNOME, KDE) for MIME/icon/launcher consistency.
- [ ] Validate privilege/auth behavior differences across Wayland and X11 and document fallback rules.
- [ ] Define dependency/conflict handling rules (missing deps, incompatible versions, duplicate app IDs/names).
- [ ] Define upgrade/downgrade behavior rules across versions and install scopes.
- [ ] Add interruption resilience plan (power loss/crash during install) with resume-or-rollback guarantees.
- [ ] Define multi-architecture manifest schema and validation rules (required arch map, payload paths, optional fallback guidance).
- [ ] Add host compatibility preflight stage before install execution (arch/target support checks with clear block reasons).
- [ ] Persist Installed Apps presentation metadata (icon, screenshots, descriptions) in Yambuck-managed state independent of source package file.
- [ ] Ensure post-install cleanup keeps only selected host payload and removes unused architecture payloads.
