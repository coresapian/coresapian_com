import SwiftUI
import SwiftGodotKit

@main
struct CoreSapianApp: App {
    init() {
        // Register the Godot singleton as early as possible.
        // This callback fires during Godot's setup; we wait for the .scene level
        // so the engine is fully ready before registering our bridge.
        initHookCb = { level in
            guard level == .scene else { return }
            register(type: GodotSwiftMessenger.self)
            Engine.registerSingleton(
                name: "GodotSwiftMessenger",
                instance: GodotSwiftMessenger.shared
            )
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .ignoresSafeArea()
                .preferredColorScheme(.dark)
                .statusBarHidden()
        }
    }
}
