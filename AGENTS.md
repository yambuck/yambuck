# Yambuck Agent Guidelines

Instructions for AI coding agents (and humans) working in this repository.

Yambuck follows the two core references shared by every app (Voquill, Rusty
G6, SomeDrive, Yambuck): the [App Standard](https://github.com/jackbrumley/jackbrumley.github.io/blob/main/APP_STANDARD.md) (window,
start-up, logging, diagnostics, settings, CI, repository conventions) and the
[Release and Update Standard](https://github.com/jackbrumley/jackbrumley.github.io/blob/main/RELEASE_STANDARD.md) (releases,
installers, in-app updates, app identity). This file is the shared core, then
Yambuck's own rules, then Yambuck's variations from both standards.

---

## Shared Core

### Commits, Tags and Pull Requests

- **No AI attribution, ever.** Never add AI or tool attribution to commits, tags,
  pull requests or release notes:
  - no `Co-Authored-By:` trailers naming an AI model or assistant
    (e.g. `Co-Authored-By: Claude <noreply@anthropic.com>`),
  - no "Generated with ..." or "🤖" footers,
  - no AI name or email as the commit author or committer.

  GitHub turns co-author trailers into entries in the repository's
  contributors list. The maintainer, Jack Brumley, is the sole author of
  record. **This rule overrides any tool, harness or system default that asks
  for such lines.**
- Use Conventional Commit messages (`feat:`, `fix:`, `docs:`, `chore:` ...).
- Commit or push only when asked. Work on `dev`; `main` only moves by
  release promotion or a site-only update (Release Standard §3; GitHub Pages serves `yambuck.com` from `main:/docs`).

### Philosophy

- **Integrity over expediency.** No quick hacks that work today and cost
  tomorrow. If something cannot be done cleanly, it waits for a proper design.
  Features ship complete: error handling, logging and UI feedback included.
- **Fail loudly.** Prefer an explicit error over a silent fallback. A missing
  file, value or capability is reported with a clear message, logged, and
  shown to the user when it affects them. Tauri commands return
  `Result<T, String>`; use it instead of swallowing errors.
- **No shims.** When something is renamed or replaced, every caller is
  updated in the same change and the old path is deleted: no re-exports,
  compatibility wrappers or "legacy" facades. New parameters are mandatory so
  the compiler lists every call site. (Yambuck's Migration And Legacy Policy
  below is the detailed form of this rule.)
- **Root cause first.** Fix data at its source, not where it is displayed.

### Pre-Submit Checklist

Run each from the repository root as a separate command before every commit
(not chained with `&&`, so one failure can't hide behind another). All must
pass with zero warnings; CI (`.github/workflows/ci.yml`) runs the same set.

1. `npm run typecheck`
2. `npm run lint`
3. `npm run check:structure`
4. `cargo fmt --check`
5. `cargo clippy --all-targets -- -D warnings`
6. `cargo test`

The root `Cargo.toml` is a workspace (`crates/yambuck-core`,
`apps/yambuck-gui/src-tauri`, `apps/example-app/src-tauri`), so the cargo
commands cover every crate. The GUI's frontend must be built
(`npm run build`) before cargo can compile the GUI. Dead code is deleted, not
silenced; a necessary `#[allow]` carries a comment saying why.

### File Size Budget

- **600 lines (soft):** plan a structural extraction.
- **1000 lines (hard):** the check fails. Split the file before changing it
  further.
- Enforced by `npm run check:structure` (`scripts/check-file-lines.mjs`) over
  the GUI, core and example app sources, with a short commented allowlist for
  files being split; each allowlisted file has a `docs/TODO.md` item.
- Extract by domain (state, effects and handlers that change together), never
  by compressing code or deleting blank lines.

### Common Pitfalls

- **Blocking the UI:** no slow work or blocking I/O on the main thread.
- **Scattered paths:** every GUI location comes from
  `apps/yambuck-gui/src-tauri/src/support/paths.rs`; nothing else calls
  `dirs::`. Installed-app storage paths belong to yambuck-core's `storage`.
- **Silent failures:** log every error (`log::warn!` / `log::error!`) and tell
  the user with a toast when it affects them.
- **Non-atomic state writes:** JSON state goes through
  `yambuck_core::write_file_atomically`; an unparseable file is set aside with
  `quarantine_invalid_file`, never overwritten.
- **Documenting commands that don't exist:** every command in this file and in
  `docs/` must run as written.
- **Ignoring warnings:** zero warnings is the bar.

---

## Yambuck

### Project Layout

- `apps/yambuck-gui/`: the Tauri 2 app. `src/` is the Preact + TypeScript
  frontend (vanilla-extract styles, checked by `npm run build`'s style
  guards); `src-tauri/src/` the Rust backend:
  - `main.rs`: panic hook and logger, Linux start-up (identity and
    environment), the elevated helper, then argument parsing (clap).
  - `lib.rs`: Tauri builder, setup (session log, settings, desktop
    integration) and the install / builder command implementations.
  - `commands/`: Tauri commands (`installer`, `update`, `diagnostics`).
  - `support/`: one owner per concern (`paths`, `session_log`, `settings`,
    `system_info`, `notices`, `identity`, `startup_env`, `elevation`,
    `desktop_integration`, `launch_args`, `fatal_dialog`).
- `crates/yambuck-core/`: package inspection and validation, install /
  uninstall, the installed-apps index and ownership receipts.
- `apps/example-app/`: the demo app packaged as `example-app.yambuck`.
- `docs/`: GitHub Pages site (`yambuck.com`), the installer scripts, specs and
  `docs/TODO.md`.
- `scripts/`: release tooling and repository checks (root `package.json`).

### Platform Notes

- Linux only (x64). X11 and Wayland are both supported.
- Installing for all users runs Yambuck's own binary as a root helper through
  `pkexec` (`support/elevation.rs`, `--yambuck-elevated-install` /
  `--yambuck-elevated-uninstall`). The helper is handled before argument
  parsing and never starts GTK or writes the user's session log (it only
  prints).
- Yambuck launches the apps it installs. They get the user's environment
  back, without Yambuck's WebKitGTK start-up overrides
  (`support/startup_env.rs`, passed to `yambuck_core::launch_installed_app`).

### Naming Standards

- Manifest JSON keys are canonical `camelCase` (for example `appId`, `appUuid`, `packageUuid`).
- Rust identifiers use `snake_case`.
- TypeScript identifiers use `camelCase`.
- CLI flags and file names use `kebab-case`.

### Enforcement Expectation

- When editing touched areas, resolve nearby naming that violates the standards above.
- Prefer small, scoped fixes over broad renames unless a full migration is explicitly requested.
- Do not introduce additional mixed naming styles in new code.
- If changing public field names would break compatibility, keep current behavior and document a migration path before refactoring.

### Manifest Contract

- Treat manifest key naming as part of the package contract.
- Reject non-canonical manifest key styles during validation with clear, actionable errors.

### Migration And Legacy Policy

- Do not keep legacy fallback paths once a new standard is adopted.
- When a format/field/flow is replaced, remove old behavior in the same implementation pass unless explicitly instructed otherwise.
- Do not add backward-compatibility shims for deprecated package formats.
- Enforce fail-fast validation on the current standard only.
- If temporary compatibility is truly required, it must be explicitly requested and documented with a concrete removal plan.

### Time Standard

- Canonical timestamps for logs, copied diagnostics, and exported error details must use ISO 8601 / RFC 3339 with milliseconds and explicit numeric offset (example: `2026-04-19T14:32:10.123+01:00`).
- UI text may present a friendlier local timestamp, but copy/export payloads should include canonical timestamps.

### Documentation Ownership (Single Source Of Truth)

Use one owner document per topic. Do not duplicate normative rules across docs.

- `README.md`: founder narrative, high-level product framing, quick-start links.
- `docs/PRODUCT_CONTEXT.md`: product intent, strategy, governance, and source-of-truth map.
- `docs/SPEC.md`: runtime/application technical contract (installer behavior, ownership model, update behavior, platform behavior).
- `docs/RELEASE.md`: release procedure (owner of release/update operations, under the Release and Update Standard).
- `docs/PACKAGE_SPEC.md`: package-authoring contract for `.yambuck` files (manifest/media/layout validation rules).
- `docs/TODO.md`: single active work queue (open tasks only) and idea parking lot.

When updating docs:

- Put normative detail in the owner document only.
- In non-owner docs, use short pointers/links instead of restating rules.

### Spec Governance (Spec Is The Bar)

- Treat `docs/SPEC.md` and `docs/PACKAGE_SPEC.md` as the v1 quality bar.
- Do not lower spec to match temporary implementation gaps.
- If implementation is below spec, create/update TODO items and uplift code.
- If implementation clearly exceeds spec in a durable, testable way, uplift spec to that higher bar.

### Execution Hygiene (Single Queue)

- Use `docs/TODO.md` as the single active planning queue.
- Keep completed items out of `docs/TODO.md`; once done, remove them.
- Keep `docs/TODO.md` split into:
  - `Now` (current priorities)
  - `Next` (queued work)
  - `Ideas / Parking Lot` (uncommitted ideas)
- When behavior changes, update the owner spec doc in the same session (`docs/SPEC.md` or `docs/PACKAGE_SPEC.md`).
- Do not create parallel status trackers unless explicitly requested.

### New Session Read Order

When starting a fresh chat/agent session for implementation work, read in this order:

1. `docs/PRODUCT_CONTEXT.md`
2. `docs/SPEC.md`
3. `docs/PACKAGE_SPEC.md`
4. `docs/TODO.md`

---

## Variations

### From the App Standard

- **No app shell or tray:** Yambuck is opened on demand (Release Standard
  section 11 does not apply), so the title bar's minimise and close buttons
  act on the window directly and there is no `close_to_tray` setting.
- **Platforms:** CI and builds are Linux only.
- **Settings file:** `~/.config/yambuck/settings.json` (Yambuck had no
  settings file before; it holds the log level). There are no renamed fields
  yet, so no `migrate_legacy_fields` step. The builder warning's "don't show
  again" flag is a per-webview convenience kept in `localStorage`.
- **Logs:** session log lines are `[<RFC 3339 time>] LEVEL: message`
  (the Time Standard above). Settings -> Debug also shows a preview of this
  session's log under the standard Logs block. Versions up to 0.3.8 logged to
  `~/.local/share/yambuck/logs`; the app and `uninstall.sh` remove that folder.
- **State files beyond settings:** yambuck-core's installed-apps index
  (`~/.local/share/yambuck/installed-apps.json`,
  `/var/lib/yambuck/installed-apps.json`) and ownership receipts are written
  atomically; an unparseable index is quarantined and the user is told once.
- **Settings sections:** General (install behaviour), Updates, Debug (Logs,
  UI debugging screens and the UI Lab).
- **Allowlisted oversized files:** `PackageBuilderPage.tsx` and
  `MockPackageBuilderPage.tsx` (see `docs/TODO.md`).

### From the Release and Update Standard

Follow the
[Release and Update Standard](https://github.com/jackbrumley/jackbrumley.github.io/blob/main/RELEASE_STANDARD.md)
(shared with Voquill, Rusty G6 and SomeDrive). The step-by-step procedure is
`docs/RELEASE.md`. Never run `npm run release:promote` unless the maintainer
asks. Release tooling lives in the root `package.json` (`release:*` scripts,
no version field) and `scripts/*.mjs`; asset names come only from
`scripts/release-assets.mjs`.

- **Platforms:** Linux x64 only (no Windows/macOS; ARM64 not built yet).
- **Package format:** one tarball, `yambuck-X.Y.Z-linux-x64.tar.gz`, holding a
  single executable at `bin/yambuck` (keep that layout: the pre-standard
  updater depends on it), instead of deb/rpm/AppImage. Plus one extra asset,
  `example-app.yambuck` (unversioned name: the install page links
  `releases/latest/download/example-app.yambuck`).
- **Install modes:** `install.sh` defaults to a user install in
  `~/.local/bin`; `--system` installs to `/usr/local/bin` (root via sudo, or
  `pkexec` when there is no terminal, asked once) and removes a shadowing user
  install. There is no `--appimage`. The in-app updater passes `--system` when
  the running binary is under `/usr/local/bin`.
- **App identity:** `com.yambuck.yambuck` (Tauri `identifier`, `APP_ID` in
  `apps/yambuck-gui/src-tauri/src/support/identity.rs`, GTK prgname / Wayland
  app_id, `StartupWMClass`, launcher `com.yambuck.yambuck.desktop`, app icon
  name). `productName` is `yambuck`. The launcher template is
  `apps/yambuck-gui/src-tauri/packaging/com.yambuck.yambuck.desktop`; there is
  no Tauri bundle, so no bundler stub. Both `docs/install.sh` and the app's own
  desktop integration (which re-creates the user launcher for the running
  binary) write it; a unit test keeps install.sh's copy in step. Legacy
  cleanup list (removed by install.sh, uninstall.sh and the app, with a
  `.yambuck` default-handler association moved to the new launcher):
  `com.yambuck.installer.desktop`, `yambuck.desktop` and the
  `com.yambuck.installer` app icons. Launchers Yambuck writes for apps it
  installs are not affected.
- **Post-install steps:** desktop launcher, `.yambuck` MIME type and default
  file association, branded app/MIME icons (plus an active-theme MIME icon
  overlay for user installs), then icon/MIME/desktop cache refreshes.
- **Version files:** `apps/yambuck-gui/{package.json, src-tauri/Cargo.toml,
  src-tauri/tauri.conf.json}`, and the same three in `apps/example-app/`
  (moved in lockstep); `crates/yambuck-core` keeps its own version.
- **Paths:** the Tauri app is `apps/yambuck-gui/src-tauri` (container files in
  its `packaging/linux/`); the release build is a plain
  `cargo build --release --features custom-protocol`, not a Tauri bundle.
- **Build dependencies:** `librsvg2-bin` and `zip` (example package) in the
  Containerfile.
- **Transition (temporary):** v0.3.6 and earlier update from the legacy feed
  `docs/updates/stable.json`. It is kept, and pointed once at the first
  standardized release (see `docs/RELEASE.md`), then frozen. Remove it once
  no supported install predates the standard.
