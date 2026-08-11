export const vertexShaderSource = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_pixel_ratio;
uniform vec4 u_rect_a;
uniform vec4 u_rect_b;
uniform vec2 u_radius;
uniform vec4 u_material;
uniform float u_pair;
uniform float u_time;

out vec4 out_color;

float saturate(float value) {
  return clamp(value, 0.0, 1.0);
}

float sd_round_box(vec2 point, vec2 half_size, float radius) {
  vec2 delta = abs(point) - half_size + radius;
  return min(max(delta.x, delta.y), 0.0) + length(max(delta, 0.0)) - radius;
}

float smooth_union(float first, float second, float amount) {
  float safe_amount = max(amount, 0.001);
  float blend = saturate(0.5 + 0.5 * (second - first) / safe_amount);
  return mix(second, first, blend) - safe_amount * blend * (1.0 - blend);
}

float material_field(vec2 point) {
  float first = sd_round_box(point - u_rect_a.xy, u_rect_a.zw, u_radius.x);
  if (u_pair < 0.5) return first;
  float second = sd_round_box(point - u_rect_b.xy, u_rect_b.zw, u_radius.y);
  float union_amount = mix(1.0, 56.0, u_material.x * u_material.y * u_material.z) * u_pixel_ratio;
  return smooth_union(first, second, union_amount);
}

vec2 field_normal(vec2 point) {
  float epsilon = 1.45 * u_pixel_ratio;
  float horizontal = material_field(point + vec2(epsilon, 0.0)) - material_field(point - vec2(epsilon, 0.0));
  float vertical = material_field(point + vec2(0.0, epsilon)) - material_field(point - vec2(0.0, epsilon));
  return normalize(vec2(horizontal, vertical) + vec2(0.0001));
}

void main() {
  vec2 point = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  float field = material_field(point);
  if (field > 34.0 * u_pixel_ratio) discard;

  vec2 normal = field_normal(point);
  float inside_depth = max(0.0, -field);
  float shape_mask = 1.0 - smoothstep(-1.2, 1.2, field / u_pixel_ratio);
  float outer_shadow = (1.0 - smoothstep(3.0, 28.0, field / u_pixel_ratio)) * (1.0 - shape_mask);
  float edge = shape_mask * (1.0 - smoothstep(2.0, 25.0, inside_depth / u_pixel_ratio));
  float fine_rim = 1.0 - smoothstep(0.15, 2.2, abs(field) / u_pixel_ratio);

  // Layer 01 · Background: the DOM surface keeps the live page visible;
  // this transparent shader pass only modulates light over that environment.
  vec3 background_layer = vec3(0.0);

  // Layer 02 · Shape: the rounded signed-distance field defines thickness.
  float shape_layer = shape_mask;

  // Layer 03 · Tint: a restrained neutral fill, strongest near material depth.
  vec3 tint_layer = vec3(0.78, 0.87, 0.91) * shape_layer * (0.012 + edge * 0.026);

  // Layer 04 · Refraction: low-amplitude internal caustics plus stronger rim displacement.
  float inner_wave = sin(point.x * 0.036 + normal.y * 4.0 + u_time * 0.00032)
    * cos(point.y * 0.029 - normal.x * 3.0 - u_time * 0.00022);
  float impact_ripple = u_material.w * u_material.z
    * sin((inside_depth / u_pixel_ratio) * 0.38 - u_time * 0.018)
    * exp(-inside_depth / (38.0 * u_pixel_ratio));
  vec3 refraction_layer = vec3(0.72, 0.91, 0.94)
    * (inner_wave + impact_ripple)
    * shape_layer
    * (0.010 + edge * 0.040 + u_material.w * u_material.z * 0.012);

  // Layer 05 · Highlight: fixed environmental light, never cursor-tracked.
  vec2 light_direction = normalize(vec2(-0.62, -0.78));
  float facing_light = saturate(dot(normal, light_direction));
  float highlight_strength = pow(facing_light, 7.0) * edge + fine_rim * facing_light * 0.44;
  vec3 highlight_layer = vec3(0.96, 0.99, 1.0) * highlight_strength * 0.26;

  // Layer 06 · Dispersion: subtle spectral separation at high-curvature edges only.
  float spectral = fine_rim * (0.22 + 0.78 * abs(normal.x * normal.y));
  vec3 dispersion_layer = vec3(
    max(0.0, normal.x) * spectral,
    (1.0 - abs(normal.x)) * spectral * 0.34,
    max(0.0, -normal.x) * spectral
  ) * 0.12;

  // Layer 07 · Shadow: soft contact shadow outside the optical boundary.
  vec3 shadow_layer = vec3(0.015, 0.055, 0.075) * outer_shadow * 0.48;

  vec3 color = background_layer + tint_layer + refraction_layer + highlight_layer + dispersion_layer;
  color = mix(color, shadow_layer, outer_shadow * 0.72);
  float alpha = saturate(shape_mask * 0.07 + edge * 0.23 + fine_rim * 0.32 + outer_shadow * 0.22);
  out_color = vec4(color, alpha);
}
`;
