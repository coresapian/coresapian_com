extends CharacterBody3D

@export var walk_speed: float = 4.5
@export var sprint_speed: float = 7.5
@export var jump_velocity: float = 4.6
@export var mouse_sensitivity: float = 0.002
@export var interaction_distance: float = 4.0

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
@onready var interact_ray: RayCast3D = $Head/Camera3D/InteractRay
@onready var interaction_prompt: Label = $"../UI/InteractionPrompt"

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var look_pitch: float = 0.0

func _ready() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * mouse_sensitivity)
		look_pitch = clamp(look_pitch - event.relative.y * mouse_sensitivity, -1.3, 1.3)
		head.rotation.x = look_pitch

	if event.is_action_pressed("ui_cancel"):
		if Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
			Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
		else:
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta

	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = jump_velocity

	var speed := walk_speed
	if Input.is_action_pressed("sprint"):
		speed = sprint_speed

	var move_input := Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
	var move_direction := (transform.basis * Vector3(move_input.x, 0, move_input.y)).normalized()

	if move_direction:
		velocity.x = move_direction.x * speed
		velocity.z = move_direction.z * speed
	else:
		velocity.x = move_toward(velocity.x, 0.0, speed)
		velocity.z = move_toward(velocity.z, 0.0, speed)

	move_and_slide()
	_update_interactions()

func _update_interactions() -> void:
	interact_ray.target_position = Vector3(0, 0, -interaction_distance)
	interact_ray.force_raycast_update()

	if interact_ray.is_colliding():
		var collider := interact_ray.get_collider()
		if collider and collider.has_method("get_interaction_text"):
			interaction_prompt.text = "%s [E]" % collider.get_interaction_text()
			interaction_prompt.visible = true
			if Input.is_action_just_pressed("interact"):
				collider.interact()
			return

	interaction_prompt.visible = false
