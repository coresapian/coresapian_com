extends Node

## Minimal scene host with fade-in/fade-out support for the temple experience.

@export var fade_in_duration: float = 1.2
@export var fade_out_duration: float = 0.8

@onready var fade_rect: ColorRect = $FadeCanvasLayer/FadeOverlay
@onready var current_scene: Node = $CoreTruths


func _ready() -> void:
	fade_rect.color = Color(0, 0, 0, 1)
	var fade_in := create_tween()
	fade_in.tween_property(fade_rect, "color:a", 0.0, fade_in_duration)

	if current_scene and current_scene.has_signal("experience_completed"):
		current_scene.experience_completed.connect(_on_experience_completed)


func _on_experience_completed() -> void:
	var fade_out := create_tween()
	fade_out.tween_property(fade_rect, "color:a", 1.0, fade_out_duration)
