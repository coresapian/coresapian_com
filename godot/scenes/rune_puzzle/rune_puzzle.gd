extends Node3D

## Rune Puzzle — drag Elder Futhark glyphs into correct sockets to spell ᚲᛟᚱᛖ.
## On completion, emits puzzle_completed signal after 3 seconds.

signal puzzle_completed

const ANCIENT_WORD: String = "ᚲᛟᚱᛖ"
const ALL_GLYPHS: Array[String] = [
	"ᚨ","ᛒ","ᛞ","ᛇ","ᚠ","ᚷ","ᚺ","ᛁ","ᛃ","ᚲ",
	"ᛚ","ᛗ","ᚾ","ᛈ","ᚱ","ᛊ","ᛏ","ᚢ","ᚹ","ᛉ","ᛋ","ᛦ","ᛪ"
]

const SOCKET_RADIUS: float = 3.0
const GLYPH_SCATTER_RADIUS: float = 6.0
const SNAP_DISTANCE: float = 1.2

var target_glyphs: Array[String] = []
var sockets: Array[Node3D] = []
var glyphs: Array[Node3D] = []
var filled_count: int = 0

var _dragging_glyph: Node3D = null
var _drag_plane := Plane(Vector3.UP, 0.0)
var _camera: Camera3D

@onready var sockets_parent: Node3D = $Sockets
@onready var glyphs_parent: Node3D = $Glyphs
@onready var orrery_heart: MeshInstance3D = $OrreryHeart
@onready var energy_lines: Node3D = $EnergyLines
@onready var camera: Camera3D = $Camera3D


func _ready() -> void:
	_camera = camera
	target_glyphs.assign(ANCIENT_WORD.split(""))

	_create_sockets()
	_create_glyphs()
	_setup_environment()


func _setup_environment() -> void:
	# Subtle camera breathing
	# ASSUMPTION: Nothing else should modify camera.position.y while this tween is active.
	# The tween captures the initial Y value and oscillates around it indefinitely.
	var tween := create_tween().set_loops()
	tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(camera, "position:y", camera.position.y + 0.15, 4.0)
	tween.tween_property(camera, "position:y", camera.position.y - 0.15, 4.0)


func _create_sockets() -> void:
	for idx in target_glyphs.size():
		var angle: float = (float(idx) / float(target_glyphs.size())) * TAU - PI / 2.0
		var x: float = SOCKET_RADIUS * cos(angle)
		var z: float = SOCKET_RADIUS * sin(angle)

		var socket := Node3D.new()
		socket.name = "Socket_%d" % idx
		socket.position = Vector3(x, 0, z)
		socket.set_meta("expected_glyph", target_glyphs[idx])
		socket.set_meta("filled", false)
		sockets_parent.add_child(socket)

		# Visual ring
		var mesh_instance := MeshInstance3D.new()
		var torus := TorusMesh.new()
		torus.inner_radius = 0.4
		torus.outer_radius = 0.6
		mesh_instance.mesh = torus
		var material := StandardMaterial3D.new()
		material.albedo_color = Color(0.0, 1.0, 0.255, 0.3)
		material.emission_enabled = true
		material.emission = Color(0.0, 1.0, 0.255)
		material.emission_energy_multiplier = 0.5
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mesh_instance.material_override = material
		socket.add_child(mesh_instance)
		socket.set_meta("mesh", mesh_instance)
		socket.set_meta("material", material)

		# Placeholder glyph (✧)
		var placeholder := Label3D.new()
		placeholder.text = "✧"
		placeholder.font_size = 96
		placeholder.modulate = Color(0.0, 1.0, 0.255, 0.3)
		placeholder.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		placeholder.position = Vector3(0, 0.2, 0)
		placeholder.name = "Placeholder"
		socket.add_child(placeholder)

		# Area3D for detection
		var area := Area3D.new()
		var col_shape := CollisionShape3D.new()
		var sphere_shape := SphereShape3D.new()
		sphere_shape.radius = SNAP_DISTANCE
		col_shape.shape = sphere_shape
		area.add_child(col_shape)
		socket.add_child(area)
		socket.set_meta("area", area)

		sockets.append(socket)


func _create_glyphs() -> void:
	var shuffled := ALL_GLYPHS.duplicate()
	shuffled.shuffle()

	for idx in shuffled.size():
		var glyph_char: String = shuffled[idx]
		var is_target: bool = glyph_char in target_glyphs
		var is_decoy: bool = not is_target

		# Scatter position in a ring around the center
		var angle: float = (float(idx) / float(shuffled.size())) * TAU + randf_range(-0.3, 0.3)
		var radius: float = GLYPH_SCATTER_RADIUS + randf_range(-1.5, 1.5)
		var x: float = radius * cos(angle)
		var z: float = radius * sin(angle)

		var glyph_node := RigidBody3D.new()
		glyph_node.name = "Glyph_%s_%d" % [glyph_char, idx]
		glyph_node.position = Vector3(x, randf_range(-0.3, 0.3), z)
		glyph_node.freeze = true
		glyph_node.input_ray_pickable = true
		glyph_node.set_meta("glyph_char", glyph_char)
		glyph_node.set_meta("is_decoy", is_decoy)
		glyph_node.set_meta("is_locked", false)

		# Collision shape
		var col := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = Vector3(0.8, 0.8, 0.2)
		col.shape = box
		glyph_node.add_child(col)

		# Label3D for the rune character
		var label := Label3D.new()
		label.text = glyph_char
		label.font_size = 128
		label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		label.no_depth_test = true
		if is_decoy:
			label.modulate = Color(0.0, 0.8, 0.2, 0.6)
		else:
			label.modulate = Color(0.0, 1.0, 0.255)
		label.name = "Label"
		glyph_node.add_child(label)

		# NOTE: Per-glyph OmniLight3D removed for mobile performance.
		# The emissive materials + bloom in the environment provide sufficient glow.
		# Lights are only kept on the 4 target sockets and the heart.

		glyphs_parent.add_child(glyph_node)
		glyphs.append(glyph_node)

		# Floating animation
		_start_glyph_float(glyph_node)


func _start_glyph_float(glyph: Node3D) -> void:
	var base_y: float = glyph.get_meta("base_y", glyph.position.y)
	glyph.set_meta("base_y", base_y)
	var offset := randf_range(0.2, 0.5)
	var duration := randf_range(3.0, 6.0)
	# Settle to base_y first (handles restart after drag), then loop symmetrically
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(glyph, "position:y", base_y, 0.3)
	tween.tween_callback(func():
		var loop := create_tween().set_loops()
		loop.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		loop.tween_property(glyph, "position:y", base_y + offset, duration)
		loop.tween_property(glyph, "position:y", base_y - offset, duration)
		glyph.set_meta("float_tween", loop)
	)
	glyph.set_meta("float_tween", tween)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_try_pick_glyph(event.position)
			else:
				_drop_glyph()

	elif event is InputEventMouseMotion:
		if _dragging_glyph:
			_move_glyph(event.position)

	elif event is InputEventScreenTouch:
		if event.pressed:
			_try_pick_glyph(event.position)
		else:
			_drop_glyph()

	elif event is InputEventScreenDrag:
		if _dragging_glyph:
			_move_glyph(event.position)


func _try_pick_glyph(screen_pos: Vector2) -> void:
	var from := _camera.project_ray_origin(screen_pos)
	var dir := _camera.project_ray_normal(screen_pos)

	# Raycast to find glyph
	var space := get_world_3d().direct_space_state
	var query := PhysicsRayQueryParameters3D.create(from, from + dir * 100.0)
	var result := space.intersect_ray(query)

	if result and result.collider is RigidBody3D:
		var glyph := result.collider as RigidBody3D
		if glyph.get_meta("is_locked", false):
			return
		_dragging_glyph = glyph

		# Stop float
		var float_tween = glyph.get_meta("float_tween", null)
		if float_tween and float_tween is Tween:
			float_tween.kill()

		# Visual feedback
		var label: Label3D = glyph.get_node("Label")
		label.modulate = Color(0.753, 1.0, 0.933)  # frost-white


func _move_glyph(screen_pos: Vector2) -> void:
	if not _dragging_glyph:
		return
	var from := _camera.project_ray_origin(screen_pos)
	var dir := _camera.project_ray_normal(screen_pos)
	var hit = _drag_plane.intersects_ray(from, dir)
	if not hit:
		# Ray doesn't intersect the drag plane; glyph would freeze, so bail out early.
		return
	_dragging_glyph.global_position = hit

	# Check for resonating sockets (only 4 sockets, so per-frame iteration is acceptable)
	for socket in sockets:
		if socket.get_meta("filled", false):
			continue
		var dist := _dragging_glyph.global_position.distance_to(socket.global_position)
		var is_correct: bool = socket.get_meta("expected_glyph") == _dragging_glyph.get_meta("glyph_char")
		var mat: StandardMaterial3D = socket.get_meta("material")
		if dist < SNAP_DISTANCE and is_correct:
			mat.emission_energy_multiplier = 2.0
			mat.albedo_color = Color(0.0, 1.0, 0.255, 0.6)
		else:
			mat.emission_energy_multiplier = 0.5
			mat.albedo_color = Color(0.0, 1.0, 0.255, 0.3)


func _drop_glyph() -> void:
	if not _dragging_glyph:
		return

	var glyph := _dragging_glyph
	var glyph_char: String = glyph.get_meta("glyph_char")
	var placed := false

	for socket in sockets:
		if socket.get_meta("filled", false):
			continue
		var dist := glyph.global_position.distance_to(socket.global_position)
		var expected: String = socket.get_meta("expected_glyph")

		# Reset socket visuals
		var mat: StandardMaterial3D = socket.get_meta("material")
		mat.emission_energy_multiplier = 0.5
		mat.albedo_color = Color(0.0, 1.0, 0.255, 0.3)

		if dist < SNAP_DISTANCE and glyph_char == expected:
			# Correct placement!
			socket.set_meta("filled", true)
			glyph.set_meta("is_locked", true)
			placed = true
			filled_count += 1

			# Animate to socket
			var tween := create_tween()
			tween.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
			tween.tween_property(glyph, "global_position", socket.global_position, 0.4)

			# Lock visuals
			var label: Label3D = glyph.get_node("Label")
			label.modulate = Color(0.0, 0.831, 1.0)  # cyan

			# Hide placeholder
			var placeholder: Label3D = socket.get_node("Placeholder")
			placeholder.modulate.a = 0.0

			# Draw energy line to heart
			_draw_energy_line(socket.global_position)

			# Check win condition
			if filled_count >= target_glyphs.size():
				_on_puzzle_complete()

			break

		elif dist < SNAP_DISTANCE and glyph_char != expected:
			# Wrong glyph — reject
			_reject_glyph(glyph)
			placed = true  # Mark as handled to prevent conflicting float tween restart
			break

	if not placed:
		# Return to normal state
		var is_decoy: bool = glyph.get_meta("is_decoy", false)
		var label: Label3D = glyph.get_node("Label")
		label.modulate = Color(0.0, 0.8, 0.2, 0.6) if is_decoy else Color(0.0, 1.0, 0.255)
		_start_glyph_float(glyph)

	_dragging_glyph = null


func _reject_glyph(glyph: Node3D) -> void:
	var label: Label3D = glyph.get_node("Label")
	var is_decoy: bool = glyph.get_meta("is_decoy", false)
	var rest_color := Color(0.0, 0.8, 0.2, 0.6) if is_decoy else Color(0.0, 1.0, 0.255)
	label.modulate = Color(1.0, 0.2, 0.4)

	var tween := create_tween()
	var orig_pos := glyph.global_position
	for i in 4:
		var shake := Vector3(randf_range(-0.15, 0.15), 0, randf_range(-0.15, 0.15))
		tween.tween_property(glyph, "global_position", orig_pos + shake, 0.04)
	tween.tween_property(glyph, "global_position", orig_pos, 0.04)
	tween.tween_callback(func():
		label.modulate = rest_color
		_start_glyph_float(glyph)
	)


func _draw_energy_line(socket_pos: Vector3) -> void:
	var heart_pos := orrery_heart.global_position
	var line := MeshInstance3D.new()
	var immediate := ImmediateMesh.new()

	immediate.surface_begin(Mesh.PRIMITIVE_LINES)
	immediate.surface_add_vertex(heart_pos)
	immediate.surface_add_vertex(socket_pos)
	immediate.surface_end()

	line.mesh = immediate
	var mat := StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(0.0, 1.0, 0.255)
	mat.emission_enabled = true
	mat.emission = Color(0.0, 1.0, 0.255)
	mat.emission_energy_multiplier = 2.0
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	line.material_override = mat
	energy_lines.add_child(line)

	# Animate line appearing (alpha is now respected with TRANSPARENCY_ALPHA)
	mat.albedo_color.a = 0.0
	var tween := create_tween()
	tween.tween_property(mat, "albedo_color:a", 0.85, 0.5)


func _on_puzzle_complete() -> void:
	print("[PUZZLE] All glyphs placed — awakening!")

	# Activate heart glow
	var heart_mat: StandardMaterial3D = orrery_heart.get_active_material(0)
	if heart_mat:
		var tween := create_tween()
		tween.tween_property(heart_mat, "emission_energy_multiplier", 5.0, 1.5)

	# Wait 3 seconds, then signal completion (Main handles fade-out and scene change)
	await get_tree().create_timer(3.0).timeout
	puzzle_completed.emit()
