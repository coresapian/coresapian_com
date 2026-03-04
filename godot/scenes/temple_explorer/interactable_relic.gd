extends StaticBody3D

@export var interaction_text: String = "Inspect relic"
@export_multiline var relic_message: String = "The temple hums with ancient energy."

@onready var status_label: Label = $"../../UI/StatusMessage"

func get_interaction_text() -> String:
	return interaction_text

func interact() -> void:
	status_label.text = relic_message
	status_label.visible = true
	var tween := create_tween()
	tween.tween_interval(2.8)
	tween.tween_callback(func() -> void:
		status_label.visible = false
	)
