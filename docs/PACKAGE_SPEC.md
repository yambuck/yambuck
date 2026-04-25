# Yambuck Package Spec (v1)

This document is for developers who want to build valid `.yambuck` packages.

It focuses only on package authoring and validation rules. It does not cover Yambuck app internals, UI architecture, or release operations.

Status markers used in this document:

- `enforced now`: implemented in current validation behavior
- `required by spec (implementation below)`: part of the v1 bar, code uplift still pending
- `planned`: not yet part of the enforced package surface

## What A `.yambuck` File Is

A `.yambuck` file is a zip archive with a required `manifest.json`, one or more target payload directories, and app assets.

Expected layout:

```text
my-app.yambuck
├── manifest.json
├── payloads/
│   └── linux/
│       ├── x86_64/
│       │   ├── default/
│       │   │   └── app/
│       │   │       ├── bin/
│       │   │       │   ├── my-app-gui
│       │   │       │   └── my-app-cli
│       │   │       └── lib/
│       │   │           └── ... runtime files ...
│       │   ├── x11/
│       │   │   └── app/
│       │   │       └── ... optional split payload ...
│       │   └── wayland/
│       │       └── app/
│       │           └── ... optional split payload ...
│       └── aarch64/
│           └── default/
│               └── app/
│                   └── ... app files ...
└── assets/
    ├── icon.png
    ├── screenshots/
    │   ├── screenshot-a.png
    │   └── screenshot-b.png
    └── licenses/
        └── LICENSE.txt
```

Important:

- only files under the selected target `payloadRoot` are installed as app payload
- install/display asset paths must point to files that exist in the archive (`iconPath`, `screenshots`, `licenseFile` when provided)
- validation is strict and fail-fast: invalid manifest structure, invalid field values, or missing files cause package-open failure before install preflight begins

## Manifest Version Rules

- `manifestVersion` is required and must be semver-style text (example: `1.0.0`) (`required by spec (implementation below)`)
- only major version `1` is currently supported for installable packages
- major version `2` is recognized but not implemented yet

## Manifest Key Naming

Manifest keys must use canonical `camelCase`.

Examples:

- correct: `manifestVersion`, `appId`, `packageUuid`, `iconPath`
- invalid: `manifest_version`, `app_id`, `package-uuid`, `icon_path`

Non-canonical key styles are rejected with actionable validation errors.

## Required Manifest Fields (v1)

These fields are required and must be non-empty:

- `manifestVersion`
- `displayName`
- `description`
- `longDescription`
- `version`
- `publisher`
- `appId`
- `appUuid`
- `packageUuid`
- `iconPath`
- `screenshots` (must contain 1-6 entries)
- `targets` (must contain 1 or more entries)

## Optional Manifest Fields (v1)

Enforced now:

- `homepageUrl`
- `supportUrl`
- `license`
- `licenseFile`
- `requiresLicenseAcceptance`
- `configPath`
- `cachePath`
- `tempPath`
- `trustStatus`
- `interfaces`

Planned/reserved:

- `releaseNotes`
- `runtimeDependencies`

## Identity Fields

Three identity fields are required:

- `appId`: stable reverse-DNS app identity (example: `com.example.myapp`)
- `appUuid`: immutable app identity UUID
- `packageUuid`: immutable package artifact UUID

Use stable values for `appId` and `appUuid` across releases of the same app. Generate a new `packageUuid` per package build.

## Target And Payload Rules

- `targets` must contain at least one target object
- each target must include `id`, `os`, `arch`, `payloadRoot`, and `entrypoints`
- `os` supported values: `linux`, `windows`, `macos`
- `arch` supported values: `x86_64`, `aarch64`, `riscv64`
- target tuple (`os`, `arch`, `variant`) must be unique
- `payloadRoot` must be a safe relative path and must start with `payloads/`
- `payloadRoot` should follow `payloads/<os>/<arch>/<variant>/...`
- each selected target entrypoint must exist within its `payloadRoot`

## Entrypoint Rules

- `entrypoints.gui` and/or `entrypoints.cli` are used for target-based packages
- packages without `targets` are rejected
- if GUI mode is enabled, each compatible target must provide `entrypoints.gui`
- if CLI mode is enabled, each compatible target must provide `entrypoints.cli`
- absolute paths are invalid
- parent traversal (`..`) is invalid
- the target file must exist after extraction

## Interface Rules

- `interfaces` is optional; when omitted, package defaults to GUI-only behavior
- supported interface keys: `gui`, `cli`
- each interface can set `enabled: true|false`
- at least one interface must be enabled
- CLI metadata (optional): `commandName`, `usageHint`
- Linux desktop environment compatibility (`linux.desktopEnvironments`) is validated for GUI apps

Strict enforcement behavior:

- when GUI mode is enabled, `linux.desktopEnvironments` should be explicitly set for Linux targets
- if the host desktop environment cannot be detected for a GUI compatibility check, preflight blocks install with an actionable message

## Icon And Screenshot Rules (Strict)

### `iconPath`

- required
- allowed formats: `.png`, `.jpg`, `.jpeg`
- minimum size: `128x128`
- minimum file size: `512` bytes
- must be a valid decodable image
- extension must match detected image data

### `screenshots`

- required
- must contain between `1` and `6` image paths
- allowed formats: `.png`, `.jpg`, `.jpeg`, `.gif`
- minimum size per screenshot: `256x256`
- minimum file size per screenshot: `1024` bytes
- must be valid decodable images
- extension must match detected image data
- aspect ratio per screenshot must be within `0.40` to `2.50`

## License Rules

- if `licenseFile` is provided, it must exist and contain non-empty text
- if `requiresLicenseAcceptance` is `true`, non-empty `licenseFile` text is required

## Trust Status

- `trustStatus` is optional
- currently supported values in package behavior:
  - `verified`
  - anything else defaults to `unverified`

## Install Option Fields

Installer option authoring through package manifest is not yet a stable public packaging surface in v1.

Status: planned

## Minimal Valid Manifest Example

```json
{
  "manifestVersion": "1.0.0",
  "displayName": "Example App",
  "description": "Small example package for Yambuck.",
  "longDescription": "This package demonstrates the required v1 manifest fields.",
  "version": "1.2.3",
  "publisher": "Example Labs",
  "appId": "com.example.app",
  "appUuid": "11111111-2222-3333-4444-555555555555",
  "packageUuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "iconPath": "assets/icon.png",
  "screenshots": [
    "assets/screenshots/screen-1.png"
  ],
  "homepageUrl": "https://example.com",
  "supportUrl": "https://example.com/support",
  "license": "MIT",
  "licenseFile": "assets/licenses/LICENSE.txt",
  "requiresLicenseAcceptance": false,
  "trustStatus": "unverified",
  "interfaces": {
    "gui": { "enabled": true },
    "cli": {
      "enabled": true,
      "commandName": "example-app",
      "usageHint": "Open Terminal and run: example-app --help"
    }
  },
  "targets": [
    {
      "id": "linux-x86_64-default",
      "os": "linux",
      "arch": "x86_64",
      "variant": "default",
      "payloadRoot": "payloads/linux/x86_64/default",
      "entrypoints": {
        "gui": "app/example-app",
        "cli": "app/example-app"
      },
      "linux": {
        "desktopEnvironments": ["x11", "wayland"]
      }
    }
  ]
}
```

## Additional Copy/Paste Templates

### CLI-only Linux app

```json
{
  "manifestVersion": "1.0.0",
  "displayName": "Example CLI",
  "description": "Command-line utility packaged for Yambuck.",
  "longDescription": "This package installs a command-line app only.",
  "version": "1.0.0",
  "publisher": "Example Labs",
  "appId": "com.example.cli",
  "appUuid": "11111111-2222-3333-4444-555555555556",
  "packageUuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeef",
  "iconPath": "assets/icon.png",
  "screenshots": ["assets/screenshots/screen-1.png"],
  "interfaces": {
    "cli": {
      "enabled": true,
      "commandName": "example-cli",
      "usageHint": "Open Terminal and run: example-cli --help"
    }
  },
  "targets": [
    {
      "id": "linux-x86_64-default",
      "os": "linux",
      "arch": "x86_64",
      "variant": "default",
      "payloadRoot": "payloads/linux/x86_64/default",
      "entrypoints": {
        "cli": "app/bin/example-cli"
      }
    }
  ]
}
```

### Rare split build: Linux `x11` and `wayland` payloads

Use this only when binaries are genuinely different between desktop sessions.

```json
{
  "manifestVersion": "1.0.0",
  "displayName": "Example Split Session App",
  "description": "Example package with session-specific Linux payloads.",
  "longDescription": "This package demonstrates a rare X11/Wayland split build.",
  "version": "1.0.0",
  "publisher": "Example Labs",
  "appId": "com.example.split",
  "appUuid": "11111111-2222-3333-4444-555555555557",
  "packageUuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeee0a",
  "iconPath": "assets/icon.png",
  "screenshots": ["assets/screenshots/screen-1.png"],
  "interfaces": {
    "gui": { "enabled": true }
  },
  "targets": [
    {
      "id": "linux-x86_64-x11",
      "os": "linux",
      "arch": "x86_64",
      "variant": "x11",
      "payloadRoot": "payloads/linux/x86_64/x11",
      "entrypoints": { "gui": "app/bin/example-split" },
      "linux": { "desktopEnvironments": ["x11"] }
    },
    {
      "id": "linux-x86_64-wayland",
      "os": "linux",
      "arch": "x86_64",
      "variant": "wayland",
      "payloadRoot": "payloads/linux/x86_64/wayland",
      "entrypoints": { "gui": "app/bin/example-split" },
      "linux": { "desktopEnvironments": ["wayland"] }
    }
  ]
}
```

## Preflight Checklist For Package Authors

- archive is named `*.yambuck`
- `manifest.json` exists at archive root
- all required fields are present and non-empty
- all manifest keys are `camelCase`
- `appId`, `appUuid`, `packageUuid` are set correctly
- each target resolves to a safe, existing payload root and entrypoint
- GUI/CLI interface flags match provided target entrypoints
- icon meets format/size/dimension/decode rules
- screenshots meet count/format/size/dimension/aspect/decode rules
- `licenseFile` text is non-empty when used
- `requiresLicenseAcceptance=true` only when `licenseFile` text is present

## Related Docs

- Full system/product/runtime spec: `docs/SPEC.md`
- Product context and decision baseline: `docs/PRODUCT_CONTEXT.md`
- QA preflight fixtures: `docs/examples/preflight-fixtures/README.md`
