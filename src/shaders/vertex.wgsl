struct VertexInput {
    @location(0) position: vec2<f32>,
    @location(1) instancePosition: vec3<f32>,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) fragCoord: vec2<f32>,
    @location(1) gradient: f32,
};

@group(0) @binding(0) var<uniform> zoom: f32;

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    let diameter: f32 = 0.01;

    let scaledPosition = input.position * diameter + input.instancePosition.xy * zoom;

    output.position = vec4<f32>(scaledPosition, 0.0, 1.0);
    output.fragCoord = input.position * 0.5 + 0.5;
    output.gradient = input.instancePosition.z;

    return output;
}
