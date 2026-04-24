# Yambuck Package Spec (v1)

This document is for developers who want to build valid `.yambuck` packages.

It focuses only on package authoring and validation rules. It does not cover Yambuck app internals, UI architecture, or release operations.

Status markers used in this document:

- `enforced now`: implemented in current validation behavior
- `required by spec (implementation below)`: part of the v1 bar, code uplift still pending
- `planned`: not yet part of the enforced package surface

## What A `.yambuck` File Is

A `.yambuck` file is a zip archive with a required `manifest.json`, an `app/` payload directory, and app assets.

Expected layout:

```text
my-app.yambuck
├── manifest.json
├── app/
│   └── ... app files ...
└── assets/
    ├── icon.png
    └── screenshots/
        └── ... screenshot files ...
```

Important:

- only files under `app/` are installed as app payload
- install/display asset paths must point to files that exist in the archive (`iconPath`, `screenshots`, `licenseFile` when provided)

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
- `entrypoint`
- `iconPath`
- `screenshots` (must contain 1-6 entries)

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

Planned/reserved:

- `releaseNotes`
- `target`
- `targets`
- `runtimeDependencies`
- `architectures`

## Identity Fields

Three identity fields are required:

- `appId`: stable reverse-DNS app identity (example: `com.example.myapp`)
- `appUuid`: immutable app identity UUID
- `packageUuid`: immutable package artifact UUID

Use stable values for `appId` and `appUuid` across releases of the same app. Generate a new `packageUuid` per package build.

## Entrypoint Rules

- `entrypoint` must be a relative path
- absolute paths are invalid
- parent traversal (`..`) is invalid
- the target file must exist after extraction

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
  "entrypoint": "app/example-app",
  "iconPath": "assets/icon.png",
  "screenshots": [
    "assets/screenshots/screen-1.png"
  ],
  "homepageUrl": "https://example.com",
  "supportUrl": "https://example.com/support",
  "license": "MIT",
  "licenseFile": "assets/licenses/LICENSE.txt",
  "requiresLicenseAcceptance": false,
  "trustStatus": "unverified"
}
```

## Preflight Checklist For Package Authors

- archive is named `*.yambuck`
- `manifest.json` exists at archive root
- all required fields are present and non-empty
- all manifest keys are `camelCase`
- `appId`, `appUuid`, `packageUuid` are set correctly
- `entrypoint` is relative, safe, and points to a real file in payload
- icon meets format/size/dimension/decode rules
- screenshots meet count/format/size/dimension/aspect/decode rules
- `licenseFile` text is non-empty when used
- `requiresLicenseAcceptance=true` only when `licenseFile` text is present

## Related Docs

- Full system/product/runtime spec: `docs/SPEC.md`
- Product context and decision baseline: `docs/PRODUCT_CONTEXT.md`
