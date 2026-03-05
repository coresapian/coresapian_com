import SwiftGodot

/// Singleton bridge between iOS (SwiftUI) and Godot.
/// Registered as "GodotSwiftMessenger" in the Godot Engine so GDScript can access it.
///
/// Signals:
/// - puzzleCompleted: fired by Godot when the rune puzzle is solved
/// - sceneTransition: fired by iOS if we want to tell Godot to change scenes
@Godot
class GodotSwiftMessenger: Object {
    public static let shared = GodotSwiftMessenger()

    /// Emitted by Godot when the rune puzzle is completed
    /// Note: Recent SwiftGodotKit versions use `SimpleSignal` for parameterless signals.
    /// If using an older version, change this back to `Signal`.
    @Signal var puzzleCompleted: SimpleSignal

    /// Emitted by iOS to request a scene change in Godot
    @Signal var sceneTransition: SignalWithArguments<String>
}
