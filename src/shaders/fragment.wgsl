struct FragmentInput {
    @location(0) vUV: vec2<f32>,
    @location(1) vGradient: f32,
};

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    // Length from the center
    let dist = distance(input.vUV, vec2<f32>(0.5));

    // Anti-aliasing
    let edgeWidth: f32 = 0.13;
    let alpha = smoothstep(0.5, 0.5 - edgeWidth, dist);

    let blue = vec3<f32>(0.17255, 0.68627, 0.99608);
    let red = vec3<f32>(1.0, 0.0, 0.0);
    return vec4<f32>(mix(blue, red, input.vGradient), alpha);
}