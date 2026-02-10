import SwiftUI
import SwiftGodotKit
import SwiftGodot

struct ContentView: View {
    @State private var godotApp = GodotApp(packFile: "main.pck")
    // TODO: The exact type for signal connections may vary by SwiftGodotKit version.
    // This stores the connection for cleanup in onDisappear.
    @State private var puzzleConnection: Object?

    var body: some View {
        ZStack {
            // Full-screen Godot game view
            GodotAppView()
                .environment(\.godotApp, godotApp)
                .ignoresSafeArea()
        }
        .background(Color(red: 0.012, green: 0.012, blue: 0.031)) // --void-black
        .onAppear {
            // Listen for puzzle completion if we want to show native UI
            // TODO: Store the actual connection token if SwiftGodotKit returns one.
            // The connect() API may return a connection object for later disconnection.
            GodotSwiftMessenger.shared.puzzleCompleted.connect {
                print("[iOS] Puzzle completed signal received from Godot")
            }
        }
        .onDisappear {
            // TODO: Disconnect the signal to prevent memory leaks.
            // The exact disconnection API depends on SwiftGodotKit version.
            // Typical patterns include:
            //   puzzleConnection?.disconnect()
            //   GodotSwiftMessenger.shared.puzzleCompleted.disconnect(puzzleConnection)
            // Verify the correct API in SwiftGodotKit documentation.
        }
    }
}

#Preview {
    ContentView()
        .preferredColorScheme(.dark)
}
