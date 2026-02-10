extends Node

## Main entry point — loads the rune puzzle as the first scene.
## Handles scene transitions with a fade effect.

@onready var fade_rect: ColorRect = $FadeOverlay


func _ready() -> void:
	# Start faded to black, then reveal
	fade_rect.color = Color(0, 0, 0, 1)
	var tween := create_tween()
	tween.tween_property(fade_rect, "color:a", 0.0, 1.0)
