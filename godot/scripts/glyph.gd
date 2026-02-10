class_name Glyph
extends RigidBody3D

## A draggable 3D rune glyph that can be placed into sockets.

signal placed(glyph: Glyph, socket: Node3D)

@export var glyph_char: String = ""
@export var is_decoy: bool = false

var is_locked: bool = false
var is_dragging: bool = false
var _original_position: Vector3
var _drag_plane_y: float = 0.0

@onready var label: Label3D = $Label3D
@onready var glow_light: OmniLight3D = $GlowLight
@onready var collision: CollisionShape3D = $CollisionShape3D

# Colors matching the web theme
const COLOR_NORMAL := Color(0.0, 1.0, 0.255)       # #00ff41
const COLOR_DECOY := Color(0.0, 0.8, 0.2, 0.6)     # dimmer green
const COLOR_DRAGGING := Color(0.753, 1.0, 0.933)    # #c0ffee frost-white
const COLOR_LOCKED := Color(0.0, 0.831, 1.0)        # #00d4ff cyan
const COLOR_REJECTED := Color(1.0, 0.2, 0.4)        # red flash


func _ready() -> void:
	_original_position = global_position
	freeze = true  # Start as kinematic (not simulated)
	input_ray_pickable = true

	label.text = glyph_char
	label.font_size = 128
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true

	if is_decoy:
		label.modulate = COLOR_DECOY
		glow_light.light_energy = 0.3
		glow_light.light_color = COLOR_DECOY
	else:
		label.modulate = COLOR_NORMAL
		glow_light.light_energy = 0.6
		glow_light.light_color = COLOR_NORMAL

	# Floating animation
	_start_float_animation()


func _start_float_animation() -> void:
	if is_locked:
		return
	var tween := create_tween().set_loops()
	tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	var offset := randf_range(0.3, 0.6)
	var duration := randf_range(3.0, 5.0)
	tween.tween_property(self, "position:y", position.y + offset, duration)
	tween.tween_property(self, "position:y", position.y - offset, duration)


func start_drag() -> void:
	if is_locked:
		return
	is_dragging = true
	label.modulate = COLOR_DRAGGING
	glow_light.light_energy = 1.5
	glow_light.light_color = COLOR_DRAGGING
	# Kill float tweens
	for child in get_children():
		if child is Tween:
			child.kill()


func end_drag() -> void:
	is_dragging = false
	if not is_locked:
		label.modulate = COLOR_DECOY if is_decoy else COLOR_NORMAL
		glow_light.light_energy = 0.3 if is_decoy else 0.6
		glow_light.light_color = COLOR_DECOY if is_decoy else COLOR_NORMAL
		_start_float_animation()


func lock_to_socket(socket_position: Vector3) -> void:
	is_locked = true
	is_dragging = false
	freeze = true

	# Animate to socket position
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(self, "global_position", socket_position, 0.5)

	# Change to locked colors
	label.modulate = COLOR_LOCKED
	glow_light.light_energy = 2.0
	glow_light.light_color = COLOR_LOCKED

	# Pulse animation for locked state
	var pulse := create_tween().set_loops()
	pulse.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	pulse.tween_property(glow_light, "light_energy", 3.0, 1.25)
	pulse.tween_property(glow_light, "light_energy", 1.5, 1.25)


func reject() -> void:
	# Red flash + shake
	var orig_color := label.modulate
	label.modulate = COLOR_REJECTED
	glow_light.light_color = COLOR_REJECTED

	var tween := create_tween()
	var orig_pos := global_position
	for i in 4:
		var shake_offset := Vector3(randf_range(-0.2, 0.2), 0, randf_range(-0.2, 0.2))
		tween.tween_property(self, "global_position", orig_pos + shake_offset, 0.05)
	tween.tween_property(self, "global_position", orig_pos, 0.05)
	tween.tween_callback(func():
		label.modulate = orig_color
		glow_light.light_color = COLOR_DECOY if is_decoy else COLOR_NORMAL
	)
