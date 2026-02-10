# Code Review & Fix Spec — Godot + iOS Port

## Critical Issues (will crash or fail to load)

### C1. `main.tscn` — ColorRect under Node (not Control) parent
**File:** `godot/scenes/main.tscn:11`
**Problem:** `FadeOverlay` is a `ColorRect` (a Control node) parented to `Main` (a plain `Node`). Control nodes need a Control or CanvasLayer parent for anchors/layout to work. The overlay will either not render or have zero size.
**Fix:** Wrap `FadeOverlay` in a `CanvasLayer` so it renders as a 2D overlay on top of the 3D scene. Or change `Main` to a `Control` node — but since it instances a Node3D child, a CanvasLayer is the correct approach.

### C2. `rune_puzzle.tscn` — `load_steps` count is wrong
**File:** `godot/scenes/rune_puzzle/rune_puzzle.tscn:1`
**Problem:** `load_steps=6` but there are 7 sub/ext resources: 2 ext_resources + 5 sub_resources (sky_mat, sky, env, heart_mesh, heart_mat). Godot may warn or error on mismatch.
**Fix:** Change to `load_steps=8` (resources + 1).

### C3. `rune_puzzle.tscn` — Shader ext_resource loaded but never used
**File:** `godot/scenes/rune_puzzle/rune_puzzle.tscn:4`
**Problem:** `matrix_rain.gdshader` is declared as ext_resource id="2" but no node in the scene references it. This means the matrix rain effect is completely absent from the puzzle.
**Fix:** Either add a full-screen `ColorRect` in a `CanvasLayer` with a `ShaderMaterial` using this shader, or remove the unused ext_resource and implement matrix rain via GPUParticles3D instead.

### C4. `_move_glyph` — resonance check crashes when drag moves off all sockets
**File:** `godot/scenes/rune_puzzle/rune_puzzle.gd:239`
**Problem:** `_dragging_glyph.global_position` is accessed after the null-guard at line 227, but the resonance loop at line 236 also accesses it. If `_move_glyph` is called from `_unhandled_input` during the same frame that `_drop_glyph` sets `_dragging_glyph = null`, there's a race. More critically, if the raycast in `_move_glyph` returns `null` for `hit` (line 231-232), the glyph doesn't move but the resonance check still runs — this is fine, not a crash. **Actual issue**: if `intersects_ray` returns `null` (camera looking away from plane), the glyph freezes in place but the function continues, which is just odd behavior.
**Fix:** Return early if `hit` is null.

### C5. `project.godot` — `window/size/mode=2` is fullscreen, breaks desktop testing
**File:** `godot/project.godot:22`
**Problem:** `mode=2` is `MODE_FULLSCREEN`. This forces fullscreen when running in the Godot editor on desktop, making it hard to test. Should be `0` (windowed) for development, since the iOS embed handles fullscreen natively.
**Fix:** Change to `window/size/mode=0`.

### C6. Scene transition from puzzle breaks `main.tscn` structure
**File:** `godot/scenes/rune_puzzle/rune_puzzle.gd:375`
**Problem:** `change_scene_to_file` replaces the entire scene tree. Since `RunePuzzle` is a child of `Main`, calling this from the puzzle replaces `Main` and its `FadeOverlay` entirely. There's no fade-to-black transition on scene change — it just hard-cuts.
**Fix:** The transition should be managed by `main.gd`, not the puzzle. The puzzle should emit a signal, and `main.gd` should handle the fade-out → scene change → fade-in sequence. Or use an autoload scene manager.

---

## High Issues (wrong behavior, visible bugs)

### H1. Camera breathing tween drifts over time
**File:** `godot/scenes/rune_puzzle/rune_puzzle.gd:46-49`
**Problem:** The looping tween goes to `position.y + 0.15` then `position.y - 0.15`. But `position.y` is captured at tween creation time, so it tweens between two absolute values. After one full cycle it's correct, but if anything else modifies camera.y during the tween, it'll snap. This is fine in isolation but fragile.
**Fix:** Minor — acceptable as-is, but document the assumption.

### H2. Glyph float tween doesn't return to original Y
**File:** `godot/scenes/rune_puzzle/rune_puzzle.gd:164-172`
**Problem:** The looping tween goes: `base_y → base_y + offset → base_y - offset → base_y + offset → ...`. The first keyframe starts from wherever the glyph currently is (could be anywhere if `_start_glyph_float` is called after a drag). The loop oscillates between `+offset` and `-offset`, but the glyph was at `base_y` initially, not at `base_y + offset`. So the first half of the first loop will tween from current pos to `base_y + offset`, which could be a jump.
**Fix:** Add an initial `tween_property` to `base_y` first, or set glyph position to `base_y` before starting.

### H3. Konami code shake uses `randf_range` at tween build time, not per-loop
**File:** `godot/scenes/core_truths/core_truths.gd:222-228`
**Problem:** `randf_range(-0.1, 0.1)` is evaluated once when the tween is built. The `.set_loops(10)` repeats the same 4 pre-computed shake offsets 10 times — so it's a repeating pattern, not random per-loop. This looks mechanical rather than organic.
**Fix:** Use a `_process` or timer-based shake instead of a pre-built tween, or accept the repeating pattern.

### H4. `_drop_glyph` — rejection doesn't `break` after rejecting
**File:** `godot/scenes/rune_puzzle/rune_puzzle.gd:307-309`
**Problem:** When a wrong glyph is near a socket, `_reject_glyph` is called but the loop continues checking other sockets. The same glyph could be rejected by multiple sockets in one drop, causing overlapping shake animations.
**Fix:** Add `break` after `_reject_glyph(glyph)`.

### H5. `_reject_glyph` doesn't set `placed = true`, so glyph gets reset twice
**File:** `godot/scenes/rune_puzzle/rune_puzzle.gd:307-319`
**Problem:** After rejection, `placed` is still `false`, so the code at line 311-319 also runs, resetting colors and restarting the float animation — which conflicts with the ongoing shake tween from `_reject_glyph`.
**Fix:** Either set `placed = true` after rejection (even though it's not "placed"), or use a `var handled` flag, or restructure the loop.

### H6. Energy line `albedo_color.a` tween doesn't work with emission-only material
**File:** `godot/scenes/rune_puzzle/rune_puzzle.gd:349-361`
**Problem:** The material has `shading_mode = UNSHADED` and `emission_enabled = true`. Tweening `albedo_color:a` from 0→0.85 affects albedo alpha, but since the material doesn't have `transparency` set to `ALPHA`, the alpha channel is ignored. The line will appear instantly at full opacity.
**Fix:** Set `mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA` on the energy line material.

### H7. `scripts/glyph.gd` — 122 lines of completely unused dead code
**File:** `godot/scripts/glyph.gd` (entire file)
**Problem:** This `Glyph` class is never instantiated or referenced. `rune_puzzle.gd` builds glyphs programmatically with `RigidBody3D.new()` and uses metadata instead of this class. The file has no callers.
**Fix:** Delete `scripts/glyph.gd` entirely, or refactor `rune_puzzle.gd` to use it.

### H8. `glyph_scene` variable declared but never assigned
**File:** `godot/scenes/rune_puzzle/rune_puzzle.gd:26`
**Problem:** `var glyph_scene: PackedScene` is declared but never set. It's dead code.
**Fix:** Remove the variable.

---

## Medium Issues (performance, code quality)

### M1. 23 OmniLight3D nodes + 7 page lights + 1 heart light + 1 directional = 32 dynamic lights
**File:** `godot/scenes/rune_puzzle/rune_puzzle.gd:149-155`
**Problem:** The Mobile renderer has limited dynamic light support. 32 OmniLight3D nodes will cause significant performance issues on iOS. Mobile renderer typically handles 8-16 dynamic lights before framerate drops.
**Fix:** Options: (a) Remove per-glyph lights and use emissive materials only (bloom will pick up the emission). (b) Limit lights to the 4 target glyphs only. (c) Use `light_bake_mode = LIGHT_BAKE_DISABLED` and reduce range.

### M2. `_move_glyph` iterates all sockets every frame during drag
**File:** `godot/scenes/rune_puzzle/rune_puzzle.gd:236-247`
**Problem:** Only 4 sockets, so this is fine. But it resets ALL unfilled sockets' materials every frame, even ones far away. Minor inefficiency.
**Fix:** Low priority — only 4 sockets. Could optimize by only updating nearby sockets.

### M3. `core_truths.gd` — `Label3D.width = 600.0` in world units is enormous
**File:** `godot/scenes/core_truths/core_truths.gd:96`
**Problem:** `width = 600.0` is 600 world units. With `font_size = 48`, this means text will never wrap — it'll be a single line stretching far beyond the camera view. Label3D width is in world units, not pixels.
**Fix:** Set `width` to something like `6.0` or `8.0` (world units matching the camera's view at distance 6).

### M4. `core_truths.gd` — swipe detection too sensitive / no debounce
**File:** `godot/scenes/core_truths/core_truths.gd:173-177`
**Problem:** `InputEventScreenDrag.velocity.x` fires continuously during a swipe. A single swipe gesture can generate many drag events exceeding the 500 threshold, potentially triggering multiple page changes.
**Fix:** Add a cooldown or check `is_animating` more robustly. The `is_animating` guard helps but there's a frame gap between the swipe and `is_animating = true` in `_animate_to_page`.

### M5. `core_truths.tscn` — UI buttons have no styling, will be default Godot gray
**File:** `godot/scenes/core_truths/core_truths.tscn:46-68`
**Problem:** The `<` and `>` buttons use default Godot theme (gray rectangles). They won't match the matrix/cyberpunk aesthetic at all.
**Fix:** Add a custom `Theme` resource or `StyleBoxFlat` overrides with green/cyan colors.

### M6. Konami code impossible on iOS (no keyboard)
**File:** `godot/scenes/core_truths/core_truths.gd:180`
**Problem:** The Konami code requires `InputEventKey` events, which won't occur on iOS (no physical keyboard by default).
**Fix:** Add a touch-based sequence detection as an alternative (e.g., tap zones for directional inputs), or accept this is a keyboard-only easter egg.

---

## Low Issues (cleanup, portability)

### L1. `export_to_ios.sh` hardcodes `/Users/core/Downloads/Godot.app`
**File:** `godot/export_to_ios.sh:10`
**Fix:** Try `which godot` first, fall back to common paths.

### L2. No `.xcodeproj` — iOS Swift files can't be built
**File:** `ios/` directory
**Problem:** There's no Xcode project file. The 3 Swift files exist but aren't buildable without creating a project in Xcode.
**Fix:** Document that the Xcode project must be created manually in Xcode (File > New > Project > iOS App), then add the Swift files, SwiftGodotKit package, linker flag, and MetalFX.

### L3. `GodotSwiftMessenger.swift` — `Signal` type may need to be `SimpleSignal`
**File:** `ios/CoreSapian/GodotSwiftMessenger.swift:14`
**Problem:** Recent SwiftGodotKit versions use `SimpleSignal` for parameterless signals, not `Signal`.
**Fix:** Verify against the installed SwiftGodotKit version and update if needed.

### L4. `ContentView.swift` — signal connection without cleanup
**File:** `ios/CoreSapian/ContentView.swift:18-20`
**Fix:** Store the connection token and disconnect in `onDisappear`.

### L5. `project.godot` — version mismatch in features
**File:** `godot/project.godot:15`
**Problem:** `config/features=PackedStringArray("4.4", "Mobile")` but Godot 4.6 is installed. Godot will offer to upgrade the project on open, which is fine, but the declared version should match.
**Fix:** Change to `"4.6"`.

---

## Summary

| Severity | Count | Key themes |
|----------|-------|------------|
| Critical | 6 | Scene structure, missing shader wiring, broken transitions |
| High | 8 | Dead code, animation bugs, missing transparency, logic errors |
| Medium | 6 | Performance (32 lights on mobile), Label3D sizing, no UI theme |
| Low | 5 | Missing Xcode project, portability, Swift API version |

**Total: 25 issues**
