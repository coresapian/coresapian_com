import SwiftUI
import SwiftGodotKit
import SwiftGodot

struct ContentView: View {
    @State private var godotApp = GodotApp(packFile: "main.pck")
    @State private var isConnected: Bool = false

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
            // Guard against duplicate connections
            guard !isConnected else { return }
            isConnected = true
            GodotSwiftMessenger.shared.puzzleCompleted.connect { [self] in
                print("[iOS] Puzzle completed signal received from Godot")
            }
        }
        .onDisappear {
            // Note: SwiftGodotKit SimpleSignal doesn't have a disconnect API.
            // The guard above prevents duplicate connections on re-appear.
            // For full cleanup, the signal owner (GodotSwiftMessenger) would need
            // to provide a disconnect method or the app lifecycle should handle it.
            isConnected = false
        }
    }
}

#Preview {
    ContentView()
        .preferredColorScheme(.dark)
}
