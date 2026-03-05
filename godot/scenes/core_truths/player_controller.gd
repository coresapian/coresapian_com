extends CharacterBody3D

@export var walk_speed: float = 5.5
@export var sprint_speed: float = 9.0
@export var jump_velocity: float = 4.8
@export var mouse_sensitivity: float = 0.0022
@export var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
@export var interaction_distance: float = 3.0

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
@onready var interact_ray: RayCast3D = $Head/InteractRay
@onready var interact_label: Label = $HUD/InteractLabel

var _pitch: float = 0.0


func _ready() -> void:
	_ensure_input_map()
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	interact_ray.target_position = Vector3(0, 0, -interaction_distance)
	interact_label.visible = false


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * mouse_sensitivity)
		_pitch = clamp(_pitch - event.relative.y * mouse_sensitivity, deg_to_rad(-75), deg_to_rad(75))
		head.rotation.x = _pitch

	if event.is_action_pressed("ui_cancel"):
		if Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
			Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
		else:
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

	if event.is_action_pressed("interact"):
		_try_interact()


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta

	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = jump_velocity

	var move_input := Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
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
