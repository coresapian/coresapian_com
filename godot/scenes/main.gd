extends Node

## Main entry point — loads the rune puzzle as the first scene.
## Handles scene transitions with a fade effect.

const CORE_TRUTHS_SCENE := "res://scenes/core_truths/core_truths.tscn"

@onready var fade_rect: ColorRect = $FadeCanvasLayer/FadeOverlay
@onready var current_scene: Node = $RunePuzzle


func _ready() -> void:
	# Connect to the puzzle's completion signal
	if current_scene and current_scene.has_signal("puzzle_completed"):
		current_scene.puzzle_completed.connect(_on_puzzle_completed)

	# Start faded to black, then reveal
	fade_rect.color = Color(0, 0, 0, 1)
	var tween := create_tween()
	tween.tween_property(fade_rect, "color:a", 0.0, 1.0)


func _on_puzzle_completed() -> void:
	# Fade to black
	var tween := create_tween()
	tween.tween_property(fade_rect, "color:a", 1.0, 0.8)
	await tween.finished

	# Remove old scene
	if current_scene:
		current_scene.queue_free()
		current_scene = null

	# Load and add new scene
	var new_scene := load(CORE_TRUTHS_SCENE).instantiate()
	add_child(new_scene)
	current_scene = new_scene

	# Connect if the new scene also has puzzle_completed (for future extensibility)
	if current_scene.has_signal("puzzle_completed"):
		current_scene.puzzle_completed.connect(_on_puzzle_completed)

	# Fade in
	var fade_in := create_tween()
	fade_in.tween_property(fade_rect, "color:a", 0.0, 1.0)
