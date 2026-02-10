#!/bin/bash
# Export Godot project as PCK file for iOS integration.
# Usage: ./export_to_ios.sh
#
# Prerequisites:
#   - Godot 4.4+ accessible via `godot` or at /Users/core/Downloads/Godot.app
#   - iOS export preset configured in export_presets.cfg

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GODOT_BIN="${GODOT_BIN:-/Users/core/Downloads/Godot.app/Contents/MacOS/Godot}"
IOS_DIR="$SCRIPT_DIR/../ios"
PCK_OUTPUT="$IOS_DIR/main.pck"

echo "Exporting Godot project to PCK..."
"$GODOT_BIN" --headless --path "$SCRIPT_DIR" --export-pack "iOS" "$PCK_OUTPUT"

if [ $? -eq 0 ]; then
    echo "Success! PCK exported to: $PCK_OUTPUT"
    echo "Add main.pck to your Xcode target if not already added."
else
    echo "Export failed. Make sure Godot export templates are installed."
    echo "Open Godot > Editor > Manage Export Templates > Download"
    exit 1
fi
