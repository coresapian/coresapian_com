# CoreSapian iOS App

This directory contains the Swift source files for the iOS version of CoreSapian. Since there is no `.xcodeproj` file included, you must create the Xcode project manually.

## Requirements

- Xcode 15.0+
- iOS 16.0+ deployment target
- MetalFX framework (included with iOS SDK)

## Xcode Project Setup

### 1. Create New Xcode Project

1. Open Xcode
2. **File > New > Project...**
3. Select **iOS > App**
4. Configure the project:
   - Product Name: `CoreSapian`
   - Bundle Identifier: `com.coresapian.app`
   - Interface: **SwiftUI**
   - Language: **Swift**
5. Save the project in this `ios/` directory

### 2. Add Swift Source Files

Add the following files from `CoreSapian/` to your Xcode target:

- `CoreSapianApp.swift`
- `ContentView.swift`
- `GodotSwiftMessenger.swift`

### 3. Add SwiftGodotKit Package Dependency

1. **File > Add Package Dependencies...**
2. Enter the repository URL:
   ```
   https://github.com/nicosupangcat/SwiftGodotKit
   ```
3. Select the appropriate version/branch and add to your target

### 4. Add Godot Pack File

1. Generate `main.pck` by running `export_to_ios.sh` from the Godot project
2. Drag `main.pck` into your Xcode project
3. Ensure it is added to the app target (check "Copy items if needed")

### 5. Configure Build Settings

1. Select your project in the Navigator
2. Select your target
3. Go to **Build Settings**
4. Search for "Other Linker Flags"
5. Add the following flag:
   ```
   -lswiftGodot
   ```

### 6. Set Deployment Target

1. In **Build Settings**, set **iOS Deployment Target** to `16.0` or higher
2. The MetalFX framework is automatically available on iOS 16.0+

## Building

Once configured, build and run the project on a physical iOS device or simulator (iOS 16.0+).

## Troubleshooting

- **Missing SwiftGodot symbols**: Ensure the `-lswiftGodot` linker flag is added
- **main.pck not found**: Verify the pack file is included in the target's "Copy Bundle Resources" build phase
- **MetalFX errors**: Requires iOS 16.0+ and a compatible device/simulator
