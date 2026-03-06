extends Node3D

signal experience_completed

const TRUTHS: Array[Dictionary] = [
	{
		"title": "coRE truths",
		"body": "Axioms for the age of directed intelligence.\nA framework for understanding the human-AI paradigm shift."
	},
	{
		"title": "Truth I",
		"body": "AI can perform near-universal cognitive tasks.\nHumans evolve from task execution to intent direction."
	},
	{
		"title": "Truth II",
		"body": "A single human commands unprecedented cognitive leverage.\nSkillful execution of direction is the new measure of impact."
	},
	{
		"title": "Truth III",
		"body": "Computational power is infinite.\nHuman bandwidth is the scarce resource."
	},
	{
		"title": "Truth IV",
		"body": "Problem decomposition and prompt composition\nis the keystone of effective AI guidance."
	},
	{
		"title": "Truth V",
		"body": "In infinite creation,\ncuration becomes the highest form of creativity."
	},
	{
		"title": "Truth VI",
		"body": "Alignment is a function of informational clarity.\nAGI pursuit is inseparable from foundational understanding of reality."
	},
]

const ORBIT_HEIGHT: float = 2.2
const ORBIT_SPEED: float = 0.35
const ORBITS_BEFORE_FADE: float = 3.0
const FADE_DURATION: float = 2.5
const TABLET_WIDTH: float = 2.6
const TABLET_GAP: float = 1.0

@onready var player: CharacterBody3D = $Player
@onready var tablet_ring: Node3D = $TabletRing
@onready var altar: Node3D = $TempleInteraction/AltarMarker
@onready var temple_light: OmniLight3D = $TempleInteraction/TempleLight

var _pulse_time: float = 0.0
var _orbit_accumulator: float = 0.0
var _fade_timer: float = 0.0
var _fading_out: bool = false
var _completion_emitted: bool = false

var _tablets: Array[Dictionary] = []


func _ready() -> void:
	_create_truth_tablets()


func _process(delta: float) -> void:
	_pulse_time += delta
	altar.position.y = 1.4 + sin(_pulse_time * 2.0) * 0.08
	temple_light.light_energy = 1.6 + sin(_pulse_time * 3.0) * 0.3

	if not player:
		return

	tablet_ring.global_position = player.global_position + Vector3(0, ORBIT_HEIGHT, 0)

	var step := ORBIT_SPEED * delta
	tablet_ring.rotate_y(step)

	if not _fading_out:
		_orbit_accumulator += abs(step)
		if _orbit_accumulator >= TAU * ORBITS_BEFORE_FADE:
			_fading_out = true
	else:
		_fade_timer += delta
		var fade_alpha := clampf(1.0 - (_fade_timer / FADE_DURATION), 0.0, 1.0)
		_apply_tablet_alpha(fade_alpha)
		if fade_alpha <= 0.0 and not _completion_emitted:
			_completion_emitted = true
			experience_completed.emit()

	for tablet_data in _tablets:
		var pivot: Node3D = tablet_data["pivot"]
		var root: Node3D = tablet_data["root"]
		var title: Label3D = tablet_data["title"]
		var body: Label3D = tablet_data["body"]
		var aura: MeshInstance3D = tablet_data["aura"]
		var light: OmniLight3D = tablet_data["light"]
		var phase: float = tablet_data["phase"]

		pivot.position.y = sin(_pulse_time * 1.7 + phase) * 0.22
		root.rotation.y += delta * 0.08
		aura.scale = Vector3.ONE * (1.0 + sin(_pulse_time * 3.5 + phase) * 0.04)
		title.modulate = Color(1.0, 0.55, 0.2, title.modulate.a)
		body.modulate = Color(1.0, 0.48, 0.14, body.modulate.a)
		light.light_energy = (2.0 + sin(_pulse_time * 4.0 + phase) * 0.35) * body.modulate.a


func _create_truth_tablets() -> void:
	for child in tablet_ring.get_children():
		child.queue_free()
	_tablets.clear()

	var truth_count := TRUTHS.size()
	if truth_count == 0:
		return

	var min_radius := ((TABLET_WIDTH + TABLET_GAP) * float(truth_count)) / TAU
	var orbit_radius := maxf(8.0, min_radius)

	for idx in range(truth_count):
		var angle := (TAU / float(truth_count)) * idx
		var phase := angle

		var pivot := Node3D.new()
		pivot.name = "TabletPivot_%d" % idx
		tablet_ring.add_child(pivot)

		var root := Node3D.new()
		root.name = "Tablet_%d" % idx
		root.position = Vector3(cos(angle) * orbit_radius, 0, sin(angle) * orbit_radius)
		root.look_at_from_position(root.position, Vector3.ZERO, Vector3.UP)
		pivot.add_child(root)

		var mesh := MeshInstance3D.new()
		mesh.name = "Stone"
		var tablet_mesh := BoxMesh.new()
		tablet_mesh.size = Vector3(TABLET_WIDTH, 1.7, 0.3)
		mesh.mesh = tablet_mesh
		mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		root.add_child(mesh)

		var stone_mat := StandardMaterial3D.new()
		stone_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		stone_mat.albedo_color = Color(0.22, 0.19, 0.16, 1.0)
		stone_mat.metallic = 0.05
		stone_mat.roughness = 0.85
		mesh.material_override = stone_mat

		var aura := MeshInstance3D.new()
		aura.name = "Aura"
		var aura_mesh := SphereMesh.new()
		aura_mesh.radius = 1.45
		aura_mesh.height = 2.9
		aura.mesh = aura_mesh
		aura.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var aura_mat := StandardMaterial3D.new()
		aura_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		aura_mat.albedo_color = Color(1.0, 0.34, 0.06, 0.18)
		aura_mat.emission_enabled = true
		aura_mat.emission = Color(1.0, 0.28, 0.05, 1.0)
		aura_mat.emission_energy_multiplier = 1.1
		aura_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		aura.material_override = aura_mat
		root.add_child(aura)

		var glow := OmniLight3D.new()
		glow.name = "Glow"
		glow.light_color = Color(1.0, 0.42, 0.08)
		glow.light_energy = 2.0
		glow.omni_range = 4.5
		glow.shadow_enabled = false
		root.add_child(glow)

		var truth := TRUTHS[idx]
		var title := Label3D.new()
		title.name = "Title"
		title.text = truth["title"]
		title.font_size = 48
		title.position = Vector3(0, 0.45, 0.2)
		title.modulate = Color(1.0, 0.6, 0.2, 1.0)
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		title.width = 2.2
		title.no_depth_test = false
		root.add_child(title)

		var body := Label3D.new()
		body.name = "Body"
		body.text = truth["body"]
		body.font_size = 24
		body.position = Vector3(0, -0.3, 0.2)
		body.modulate = Color(1.0, 0.48, 0.14, 1.0)
		body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		body.width = 2.2
		body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		body.no_depth_test = false
		root.add_child(body)

		_tablets.append({
			"pivot": pivot,
			"root": root,
			"stone_mat": stone_mat,
			"aura": aura,
			"aura_mat": aura_mat,
			"title": title,
			"body": body,
			"light": glow,
			"phase": phase,
		})


func _apply_tablet_alpha(alpha: float) -> void:
	for tablet_data in _tablets:
		var stone_mat: StandardMaterial3D = tablet_data["stone_mat"]
		var aura_mat: StandardMaterial3D = tablet_data["aura_mat"]
		var title: Label3D = tablet_data["title"]
		var body: Label3D = tablet_data["body"]
		var light: OmniLight3D = tablet_data["light"]
		var phase: float = tablet_data["phase"]

		stone_mat.albedo_color.a = alpha
		aura_mat.albedo_color.a = 0.18 * alpha
		title.modulate.a = alpha
		body.modulate.a = alpha
		light.light_energy = (2.0 + sin(_pulse_time * 4.0 + phase) * 0.35) * alpha
