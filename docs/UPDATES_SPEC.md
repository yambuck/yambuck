# Yambuck Updates Spec

**Superseded.** Yambuck's install and update mechanism follows the shared
[Release and Update Standard](https://github.com/jackbrumley/jackbrumley.github.io/blob/main/RELEASE_STANDARD.md)
(the same one Voquill, Rusty G6 and SomeDrive use). The standard is the
contract; `docs/RELEASE.md` is Yambuck's release procedure and `AGENTS.md`
lists Yambuck's variations. This page only records what is Yambuck-specific.

## How Updates Work Now

- **Check:** on startup (silently; failures are only logged) and from
  Settings → Check for Updates, the app reads
  `https://api.github.com/repos/yambuck/yambuck/releases/latest` and compares
  plain `X.Y.Z` versions. There is no hand-maintained feed.
- **Prompt:** when a newer release exists, the update dialog shows the current
  and latest versions with **Update Now**, **View Release Notes** and
  **Later**. Never silent: the user always chooses.
- **Install:** **Update Now** re-runs the one-line installer in a detached
  process and exits the app:
  - user install (`~/.local/bin/yambuck`): `curl --proto '=https' --tlsv1.2 -sSf https://yambuck.com/install.sh | bash`
  - system install (`/usr/local/bin/yambuck`):
    `curl --proto '=https' --tlsv1.2 -sSf https://yambuck.com/install.sh | bash -s -- --system`.
    The installer obtains root itself; started from the app there is no
    terminal, so it uses the desktop's graphical `pkexec` prompt, once.
- **Verify:** the installer checks the tarball against the SHA-256 digest
  GitHub publishes for the asset and refuses to install on a mismatch.
- **Restart:** the installer relaunches Yambuck when it finishes.
- **Failure:** if the installer fails (download, checksum, cancelled password
  prompt, copy), the still-installed version is relaunched with
  `--update-failed` and shows "Yambuck could not install the update, so this
  version is still installed" with **Open Update Log**. Nothing was replaced.
  The installer's full output is in `~/.config/yambuck/debug/update.log`.

## Legacy Feed (`docs/updates/stable.json`)

Versions up to and including v0.3.6 used a feed at
`https://yambuck.com/updates/stable.json` and swapped their own binary. The
file is kept so those installs can update once more; the one-time transition
step is in `docs/RELEASE.md` ("One-Time Transition From the Update Feed").
After that it is frozen.
