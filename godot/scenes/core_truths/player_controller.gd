extends CharacterBody3D

@export var walk_speed: float = 5.5
@export var sprint_speed: float = 9.0
@export var jump_velocity: float = 4.8
@export var mouse_sensitivity: float = 0.0022
@export var touch_look_sensitivity: float = 0.0045
@export var touch_move_radius: float = 88.0
@export var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
@export var interaction_distance: float = 3.0

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
@onready var interact_ray: RayCast3D = $Head/InteractRay
@onready var crosshair: Label = $HUD/Crosshair
@onready var interact_label: Label = $HUD/InteractLabel
@onready var touch_controls: Control = $HUD/TouchControls
@onready var move_pad: Control = $HUD/TouchControls/MovePad
@onready var move_knob: Control = $HUD/TouchControls/MovePad/MoveKnob
@onready var look_pad: Control = $HUD/TouchControls/LookPad
@onready var jump_button: Button = $HUD/TouchControls/JumpButton
@onready var interact_button: Button = $HUD/TouchControls/InteractButton

var _pitch: float = 0.0
var _touch_controls_enabled: bool = false
var _touch_move_id: int = -1
var _touch_look_id: int = -1
var _touch_move_vector: Vector2 = Vector2.ZERO
var _touch_look_previous: Vector2 = Vector2.ZERO
var _jump_requested: bool = false


func _ready() -> void:
	_ensure_input_map()
	interact_ray.target_position = Vector3(0, 0, -interaction_distance)
	interact_label.visible = false
	_touch_controls_enabled = _should_use_touch_controls()
	touch_controls.visible = _touch_controls_enabled
	crosshair.visible = not _touch_controls_enabled
	if _touch_controls_enabled or _should_defer_mouse_capture():
		Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	else:
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	jump_button.button_down.connect(_on_jump_button_down)
	interact_button.button_down.connect(_on_interact_button_down)
	get_viewport().size_changed.connect(_reset_touch_visuals)
	call_deferred("_reset_touch_visuals")


func _unhandled_input(event: InputEvent) -> void:
	if _touch_controls_enabled:
		if event is InputEventScreenTouch:
			_handle_touch_press(event)
			return
		elif event is InputEventScreenDrag:
			_handle_touch_drag(event)
			return

	if _should_defer_mouse_capture() \
			and event is InputEventMouseButton \
			and event.pressed \
			and event.button_index == MOUSE_BUTTON_LEFT \
			and Input.get_mouse_mode() != Input.MOUSE_MODE_CAPTURED:
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
		return

	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		_apply_look_delta(event.relative, mouse_sensitivity)

	if event.is_action_pressed("ui_cancel"):
		if Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
			Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
		elif not _should_defer_mouse_capture():
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

	if event.is_action_pressed("interact"):
		_try_interact()


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta

	if (_jump_requested or Input.is_action_just_pressed("jump")) and is_on_floor():
		velocity.y = jump_velocity
	_jump_requested = false

	var move_input := Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
	if _touch_controls_enabled and _touch_move_vector != Vector2.ZERO:
		move_input = _touch_move_vector
	var move_dir := (transform.basis * Vector3(move_input.x, 0, move_input.y)).normalized()
	var speed := sprint_speed if Input.is_action_pressed("sprint") else walk_speed

	if move_dir:
		velocity.x = move_dir.x * speed
		velocity.z = move_dir.z * speed
	else:
		velocity.x = move_toward(velocity.x, 0.0, speed)
		velocity.z = move_toward(velocity.z, 0.0, speed)

	move_and_slide()
	_update_interaction_prompt()


func _update_interaction_prompt() -> void:
	interact_ray.force_raycast_update()
	var collider := interact_ray.get_collider()
	if collider and collider is Node and (collider as Node).is_in_group("interactable"):
		interact_label.visible = true
		if collider.has_meta("interact_text"):
			interact_label.text = str(collider.get_meta("interact_text"))
		else:
			interact_label.text = "Press E to interact"
	else:
		interact_label.visible = false


func _try_interact() -> void:
	interact_ray.force_raycast_update()
	var collider := interact_ray.get_collider()
	if collider and collider is Node and (collider as Node).is_in_group("interactable"):
		var node := collider as Node
		print("Interacted with: %s" % node.name)
		if node.has_meta("on_interact_message"):
			interact_label.text = str(node.get_meta("on_interact_message"))
			interact_label.visible = true


func _ensure_input_map() -> void:
	_bind_key("move_forward", KEY_W)
	_bind_key("move_forward", KEY_UP)
	_bind_key("move_backward", KEY_S)
	_bind_key("move_backward", KEY_DOWN)
	_bind_key("move_left", KEY_A)
	_bind_key("move_left", KEY_LEFT)
	_bind_key("move_right", KEY_D)
	_bind_key("move_right", KEY_RIGHT)
	_bind_key("jump", KEY_SPACE)
	_bind_key("sprint", KEY_SHIFT)
	_bind_key("interact", KEY_E)
	_bind_key("interact", KEY_F)


func _bind_key(action: StringName, keycode: Key) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)

	for existing in InputMap.action_get_events(action):
		if existing is InputEventKey and existing.keycode == keycode:
			return

	var event := InputEventKey.new()
	event.keycode = keycode
	InputMap.action_add_event(action, event)


func _should_use_touch_controls() -> bool:
	return OS.has_feature("android") \
		or OS.has_feature("ios") \
		or OS.has_feature("web_android") \
		or OS.has_feature("web_ios")


func _should_defer_mouse_capture() -> bool:
	return OS.has_feature("web") and not _touch_controls_enabled


func _handle_touch_press(event: InputEventScreenTouch) -> void:
	if event.pressed:
		if _touch_move_id == -1 and move_pad.get_global_rect().has_point(event.position):
			_touch_move_id = event.index
			_update_touch_move(event.position)
			return

		if _touch_look_id == -1 and look_pad.get_global_rect().has_point(event.position):
			_touch_look_id = event.index
			_touch_look_previous = event.position
	else:
		if event.index == _touch_move_id:
			_touch_move_id = -1
			_touch_move_vector = Vector2.ZERO
			_reset_touch_visuals()
		elif event.index == _touch_look_id:
			_touch_look_id = -1


func _handle_touch_drag(event: InputEventScreenDrag) -> void:
	if event.index == _touch_move_id:
		_update_touch_move(event.position)
	elif event.index == _touch_look_id:
		var delta := event.position - _touch_look_previous
		_touch_look_previous = event.position
		_apply_look_delta(delta, touch_look_sensitivity)


func _update_touch_move(screen_position: Vector2) -> void:
	var center := move_pad.get_global_rect().get_center()
	var delta := screen_position - center
	if delta.length() > touch_move_radius:
		delta = delta.normalized() * touch_move_radius

	_touch_move_vector = delta / touch_move_radius
	var centered_knob := (move_pad.size - move_knob.size) * 0.5
	move_knob.position = centered_knob + delta


func _reset_touch_visuals() -> void:
	move_knob.position = (move_pad.size - move_knob.size) * 0.5


func _apply_look_delta(delta: Vector2, sensitivity: float) -> void:
	rotate_y(-delta.x * sensitivity)
	_pitch = clampf(_pitch - delta.y * sensitivity, deg_to_rad(-75), deg_to_rad(75))
	head.rotation.x = _pitch


func _on_jump_button_down() -> void:
	_jump_requested = true


func _on_interact_button_down() -> void:
	_try_interact()
