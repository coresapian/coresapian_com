extends Node3D

## Core Truths Book — scrollable 3D book carousel with 6 core truths about AI.
## Includes Konami code easter egg.

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

var current_page: int = 0
var is_animating: bool = false
var _swipe_cooldown: float = 0.0

# Konami code tracking
const KONAMI_SEQUENCE: Array[String] = [
	"ui_up", "ui_up", "ui_down", "ui_down",
	"ui_left", "ui_right", "ui_left", "ui_right",
	"B", "A"
]
var konami_index: int = 0
var konami_activated: bool = false

@onready var camera: Camera3D = $Camera3D
@onready var pages_parent: Node3D = $Pages
@onready var left_arrow: Button = $UI/LeftArrow
@onready var right_arrow: Button = $UI/RightArrow
@onready var page_indicator: Label = $UI/PageIndicator

var page_nodes: Array[Node3D] = []

# Colors
const COLOR_GREEN := Color(0.0, 1.0, 0.255)
const COLOR_CYAN := Color(0.0, 0.831, 1.0)
const COLOR_VOID := Color(0.012, 0.012, 0.031)


func _ready() -> void:
	_create_pages()
	_update_navigation()

	left_arrow.pressed.connect(_on_prev_page)
	right_arrow.pressed.connect(_on_next_page)


func _create_pages() -> void:
	for idx in TRUTHS.size():
		var truth: Dictionary = TRUTHS[idx]
		var page := Node3D.new()
		page.name = "Page_%d" % idx
		page.position = Vector3(idx * 8.0, 0, 0)
		pages_parent.add_child(page)

		# Title label
		var title_label := Label3D.new()
		title_label.text = truth["title"]
		title_label.font_size = 96 if idx == 0 else 72
		title_label.modulate = COLOR_GREEN if idx == 0 else COLOR_CYAN
		title_label.billboard = BaseMaterial3D.BILLBOARD_DISABLED
		title_label.position = Vector3(0, 2.0, 0)
		title_label.name = "Title"
		page.add_child(title_label)

		# Body label
		var body_label := Label3D.new()
		body_label.text = truth["body"]
		body_label.font_size = 48
		body_label.modulate = COLOR_GREEN
		body_label.billboard = BaseMaterial3D.BILLBOARD_DISABLED
		body_label.position = Vector3(0, 0, 0)
		body_label.width = 6.0  # World units; camera at z=6, fov=50 -> visible width ~5.6 units
		body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		body_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		body_label.name = "Body"
		page.add_child(body_label)

		# Point light for each page
		var light := OmniLight3D.new()
		light.light_color = COLOR_GREEN
		light.light_energy = 0.8
		light.omni_range = 5.0
		light.position = Vector3(0, 3, 2)
		page.add_child(light)

		page_nodes.append(page)

	# Start with text hidden, animate in
	_animate_page_entrance(0)


func _animate_page_entrance(page_idx: int) -> void:
	if page_idx < 0 or page_idx >= page_nodes.size():
		return

	var page := page_nodes[page_idx]
	var title: Label3D = page.get_node("Title")
	var body: Label3D = page.get_node("Body")

	# Fade in title
	title.modulate.a = 0.0
	var title_tween := create_tween()
	title_tween.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	title_tween.tween_property(title, "modulate:a", 1.0, 0.8)

	# Fade in body with delay
	body.modulate.a = 0.0
	var body_tween := create_tween()
	body_tween.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	body_tween.tween_interval(0.4)
	body_tween.tween_property(body, "modulate:a", 1.0, 1.0)


func _on_next_page() -> void:
	if is_animating or current_page >= TRUTHS.size() - 1:
		return
	current_page += 1
	_animate_to_page(current_page)


func _on_prev_page() -> void:
	if is_animating or current_page <= 0:
		return
	current_page -= 1
	_animate_to_page(current_page)


func _animate_to_page(page_idx: int) -> void:
	is_animating = true
	var target_x: float = page_idx * 8.0
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(camera, "position:x", target_x, 0.8)
	tween.tween_callback(func():
		is_animating = false
		_animate_page_entrance(page_idx)
		_update_navigation()
	)


func _update_navigation() -> void:
	left_arrow.visible = current_page > 0
	right_arrow.visible = current_page < TRUTHS.size() - 1
	page_indicator.text = "%d / %d" % [current_page + 1, TRUTHS.size()]


func _process(delta: float) -> void:
	if _swipe_cooldown > 0.0:
		_swipe_cooldown -= delta


func _unhandled_input(event: InputEvent) -> void:
	# Swipe detection with cooldown to prevent multiple triggers per gesture
	if event is InputEventScreenDrag:
		if _swipe_cooldown <= 0.0 and not is_animating:
			if event.velocity.x < -500:
				_swipe_cooldown = 0.3
				_on_next_page()
			elif event.velocity.x > 500:
				_swipe_cooldown = 0.3
				_on_prev_page()

	# Touch fallback for Konami code:
	# tap top/bottom/left/right screen regions for directions,
	# and bottom-left / bottom-right corners for B / A.
	if event is InputEventScreenTouch and event.pressed:
		var touch_token := _touch_token_for_konami(event.position)
		if touch_token != "":
			_check_konami_token(touch_token)

	# Keyboard Konami code detection for desktop testing
	if event is InputEventKey and event.pressed and not event.echo:
		_check_konami_key(event)


func _touch_token_for_konami(screen_pos: Vector2) -> String:
	var viewport_size := get_viewport().get_visible_rect().size
	if viewport_size.x <= 0.0 or viewport_size.y <= 0.0:
		return ""

	var nx := screen_pos.x / viewport_size.x
	var ny := screen_pos.y / viewport_size.y

	# B and A touch zones take precedence over directional zones.
	if ny > 0.78 and nx < 0.35:
		return "B"
	if ny > 0.78 and nx > 0.65:
		return "A"

	if ny < 0.30:
		return "ui_up"
	if ny > 0.70:
		return "ui_down"
	if nx < 0.30:
		return "ui_left"
	if nx > 0.70:
		return "ui_right"

	return ""


func _check_konami_key(event: InputEventKey) -> void:
	var token := ""
	if event.keycode == KEY_B:
		token = "B"
	elif event.keycode == KEY_A:
		token = "A"
	elif event.is_action_pressed("ui_up"):
		token = "ui_up"
	elif event.is_action_pressed("ui_down"):
		token = "ui_down"
	elif event.is_action_pressed("ui_left"):
		token = "ui_left"
	elif event.is_action_pressed("ui_right"):
		token = "ui_right"

	if token != "":
		_check_konami_token(token)


func _check_konami_token(token: String) -> void:
	var expected: String = KONAMI_SEQUENCE[konami_index]
	var matched := false

	if expected == "B" and token == "B":
		matched = true
	elif expected == "A" and token == "A":
		matched = true
	elif expected != "B" and expected != "A" and token == expected:
		matched = true

	if matched:
		konami_index += 1
		if konami_index >= KONAMI_SEQUENCE.size():
			konami_index = 0
			if not konami_activated:
				_activate_konami()
	else:
		konami_index = 0


func _activate_konami() -> void:
	konami_activated = true
	print("[KONAMI] Easter egg activated!")

	# Rainbow cycle all page titles
	for page in page_nodes:
		var title: Label3D = page.get_node("Title")
		var rainbow_tween := create_tween().set_loops()
		rainbow_tween.set_trans(Tween.TRANS_LINEAR)
		rainbow_tween.tween_property(title, "modulate", Color.RED, 0.5)
		rainbow_tween.tween_property(title, "modulate", Color.ORANGE, 0.5)
		rainbow_tween.tween_property(title, "modulate", Color.YELLOW, 0.5)
		rainbow_tween.tween_property(title, "modulate", Color.GREEN, 0.5)
		rainbow_tween.tween_property(title, "modulate", Color.CYAN, 0.5)
		rainbow_tween.tween_property(title, "modulate", Color.BLUE, 0.5)
		rainbow_tween.tween_property(title, "modulate", Color.MAGENTA, 0.5)

	# Camera shake with per-step random offsets generated at runtime.
	var cam_base_x := camera.position.x
	var shake_tween := create_tween()
	for i in 40:
		shake_tween.tween_callback(func():
			camera.position.x = cam_base_x + randf_range(-0.1, 0.1)
		)
		shake_tween.tween_interval(0.03)
	shake_tween.tween_callback(func():
		camera.position.x = cam_base_x
	)
