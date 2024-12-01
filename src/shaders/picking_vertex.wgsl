struct VertexInput {
    @location(0) position: vec2<f32>,
    @location(1) instancePosition: vec2<f32>,
    @builtin(instance_index) instanceIndex: u32,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) @interpolate(flat) fragID: u32,
};

@group(0) @binding(0) var<uniform> zoom: f32;

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    let diameter: f32 = 0.015;

    let scaledPosition = input.position * diameter + input.instancePosition * zoom;

    output.position = vec4<f32>(scaledPosition, 0.0, 1.0);

    output.fragID = input.instanceIndex + 1u;

    return output;
}
