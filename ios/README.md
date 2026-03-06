# CoreSapian iOS App

This directory contains the native iOS wrapper for CoreSapian. The repo now includes a real Xcode project plus an `xcodegen` spec so the app can be opened directly in Xcode or regenerated from source.

## Requirements

- Xcode 16.0+ with iOS 17 SDK support
- Godot 4.6+ available on `PATH`, in `/Applications`, or in `~/Downloads`
- Godot 4.6 export templates installed
- A physical iPhone or iPad for runtime testing

The current `SwiftGodotKit` release only supports **iOS 17+** and **real devices**. The iOS simulator is not supported by the embedded Godot runtime.

## What Is Included

- `CoreSapian.xcodeproj` — checked-in Xcode project
- `project.yml` — the XcodeGen source of truth for the project
- `CoreSapian/*.swift` — the SwiftUI app wrapper and Godot bridge
- `CoreSapian/Assets.xcassets` — app icon asset catalog
- `../godot/export_to_ios.sh` — exports the latest Godot project to `ios/main.pck`

## Opening The App

1. Open [CoreSapian.xcodeproj](/Users/core/Documents/GitHub/coresapian_com/ios/CoreSapian.xcodeproj) in Xcode.
2. Select the `CoreSapian` target.
3. Set your Apple development team under **Signing & Capabilities**.
4. Choose a connected iPhone or iPad as the run destination.
5. Build and run.

The build automatically runs `../godot/export_to_ios.sh`, generates `ios/main.pck`, and copies it into the app bundle as `main.pck`.

## Regenerating The Project

If you change [project.yml](/Users/core/Documents/GitHub/coresapian_com/ios/project.yml), regenerate the Xcode project:

```bash
cd ios
xcodegen generate
```

## Package Dependencies

The project is wired to the current upstream packages:

- `https://github.com/migueldeicaza/SwiftGodotKit` pinned to a known-good `main` revision
- `https://github.com/migueldeicaza/SwiftGodot` pinned to the `v0.75.0` revision that matches it

Xcode resolves these automatically the first time the project is opened or built.

## Build Notes

- The app is configured as landscape-only on iPhone and iPad.
- `main.pck` is generated during each build so the native app stays in sync with the Godot project.
- The generated `ios/main.pck` file is intentionally ignored in git.

## Building

You can also validate the app from the command line:

```bash
xcodebuild -project ios/CoreSapian.xcodeproj -scheme CoreSapian -resolvePackageDependencies
xcodebuild -project ios/CoreSapian.xcodeproj -scheme CoreSapian -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO build
```

## Troubleshooting

- **`godot` not found during build**: Install Godot 4.6 and ensure it is on `PATH`, or set `GODOT_BIN`.
- **Export templates missing**: Open Godot and install export templates, or run the repo helper script that installs web templates and then install the iOS templates through Godot's UI if needed.
- **Package resolution errors**: In Xcode, use **File > Packages > Reset Package Caches** and rebuild.
- **App will not run in simulator**: Use a physical iPhone or iPad. The embedded Godot iOS runtime does not support the simulator.
