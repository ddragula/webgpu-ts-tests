struct VertexInput {
    @location(0) pos: vec2f,
    @location(1) color: vec3f,
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) color: vec3f,
};

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.pos = vec4f(input.pos, 0, 1);
    output.color = input.color;
    return output;
}

// ------------------------------------------------------------------------

@fragment
fn fragmentMain(@location(0) color: vec3f) -> @location(0) vec4f {
    return vec4f(color, 1);
}