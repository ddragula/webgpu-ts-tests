struct VertexInput {
    @location(0) pos: vec3f
}

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) value: f32,
    @location(1) valExtremes: vec2f
}

@group(0) @binding(0) var<uniform> extremesUniform: vec4f;
@group(0) @binding(1) var<uniform> valueExtremesUniform: vec2f;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let pos = input.pos;

    let xMin = extremesUniform[0];
    let xMax = extremesUniform[1];
    let yMin = extremesUniform[2];
    let yMax = extremesUniform[3];

    output.pos = vec4f(
        (pos.x - xMin) / (xMax - xMin) * 2.0 - 1.0,
        (pos.y - yMin) / (yMax - yMin) * 2.0 - 1.0,
        0,
        1
    );

    output.value = pos.z;

    output.valExtremes = valueExtremesUniform;

    return output;
}

// ---------------------------------------------------------------------------

struct FragmentInput {
    @location(0) value: f32,
    @location(1) valExtremes: vec2f
}

@fragment
fn fragmentMain(input: FragmentInput) -> @location(0) vec4f {
    let val = input.value;

    let contourInterval: f32 = 10.0;
    let lineWidth: f32 = 0.5;

    let contour: f32 = fract(val / contourInterval);
    let isLine: f32 = step(contour, lineWidth / contourInterval);

    let minHeight: f32 = input.valExtremes.x;
    let maxHeight: f32 = input.valExtremes.y;
    let normalizedHeight: f32 = (val - minHeight) / (maxHeight - minHeight);
    let color: vec3<f32> = vec3(normalizedHeight, normalizedHeight, 1.0 - normalizedHeight);

    return vec4f(color, 1);
}
