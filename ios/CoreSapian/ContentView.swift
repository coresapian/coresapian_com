import SwiftUI
import SwiftGodotKit
import SwiftGodot

struct ContentView: View {
    @State private var godotApp = GodotApp(packFile: "main.pck")

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
            GodotSwiftMessenger.shared.puzzleCompleted.connect {
                print("[iOS] Puzzle completed signal received from Godot")
            }
        }
    }
}

#Preview {
    ContentView()
        .preferredColorScheme(.dark)
}
