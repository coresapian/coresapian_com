extends Node

@onready var fade_rect: ColorRect = $FadeCanvasLayer/FadeOverlay


func _ready() -> void:
	fade_rect.color = Color(0, 0, 0, 1)
	var tween := create_tween()
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
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
	if CORE_TRUTHS_SCENE == null:
		push_error("Core truths scene is missing and could not be loaded.")
		_show_error_message("Failed to load the next chapter. Please restart the app.")
		return
	var new_scene := CORE_TRUTHS_SCENE.instantiate()
	add_child(new_scene)
	current_scene = new_scene

	# Connect if the new scene also has puzzle_completed (for future extensibility)
	if current_scene.has_signal("puzzle_completed"):
		current_scene.puzzle_completed.connect(_on_puzzle_completed)

	# Fade in
	var fade_in := create_tween()
	fade_in.tween_property(fade_rect, "color:a", 0.0, 1.0)


func _show_error_message(message: String) -> void:
	# Create error label if scene fails to load
	var error_label := Label.new()
	error_label.text = message
	error_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	error_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	error_label.add_theme_font_size_override("font_size", 24)
	error_label.add_theme_color_override("font_color", Color(1.0, 0.2, 0.3))
	error_label.add_theme_color_override("font_outline_color", Color(0, 0, 0))
	error_label.add_theme_constant_override("outline_size", 4)
	error_label.anchors_preset = Control.PRESET_FULL_RECT
	error_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	$FadeCanvasLayer.add_child(error_label)

	# Fade back in to show error
	var fade_in := create_tween()
	fade_in.tween_property(fade_rect, "color:a", 0.0, 1.0)
=======
	tween.tween_property(fade_rect, "color:a", 0.0, 1.2)
>>>>>>> theirs
=======
	tween.tween_property(fade_rect, "color:a", 0.0, 1.2)
>>>>>>> theirs
=======
	tween.tween_property(fade_rect, "color:a", 0.0, 1.2)
>>>>>>> theirs
