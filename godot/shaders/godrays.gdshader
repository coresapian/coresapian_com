shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, cull_disabled;

// Screen-space god rays (radial blur from light source)
// Apply to a MeshInstance3D with a full-screen quad

uniform vec2 light_position = vec2(0.5, 0.3); // Screen-space light position
uniform float exposure : hint_range(0.0, 1.0) = 0.3;
uniform float decay : hint_range(0.9, 1.0) = 0.96;
uniform float density : hint_range(0.0, 1.0) = 0.8;
uniform float weight : hint_range(0.0, 1.0) = 0.5;
uniform int num_samples = 60;
uniform vec4 ray_color : source_color = vec4(0.0, 1.0, 0.255, 0.3); // Matrix green

uniform sampler2D depth_texture : hint_depth_texture;
uniform sampler2D screen_texture : hint_screen_texture;

void fragment() {
	vec2 uv = SCREEN_UV;
	vec2 delta_uv = (uv - light_position) * (1.0 / float(num_samples)) * density;

	vec3 color = vec3(0.0);
	float illumination_decay = 1.0;
	vec2 sample_uv = uv;

	for (int i = 0; i < num_samples; i++) {
		sample_uv -= delta_uv;
		vec3 sample_col = texture(screen_texture, sample_uv).rgb;
		float sample_brightness = dot(sample_col, vec3(0.299, 0.587, 0.114));
		sample_col *= illumination_decay * weight * sample_brightness;
		color += sample_col;
		illumination_decay *= decay;
	}

	color *= exposure;
	ALBEDO = color * ray_color.rgb;
	ALPHA = ray_color.a * length(color);
}
