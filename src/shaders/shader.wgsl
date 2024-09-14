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

@group(0) @binding(2) var<storage> colorStops: array<vec4<f32>>;
@group(0) @binding(3) var<uniform> colorStopsCount: u32;

fn getColor(value: f32) -> vec3<f32> {
    let stopCount = colorStopsCount;

    if (stopCount == 0u) {
        return vec3<f32>(1.0, 1.0, 1.0);
    }

    for (var i: u32 = 0u; i < stopCount - 1u; i = i + 1u) {
        if (value < colorStops[i + 1u].x) {
            let t = (value - colorStops[i].x) / (colorStops[i + 1u].x - colorStops[i].x);
            return mix(colorStops[i].yzw, colorStops[i + 1u].yzw, t);
        }
    }
    return colorStops[stopCount - 1u].yzw;
}

@fragment
fn fragmentMain(input: FragmentInput) -> @location(0) vec4f {
    let val = input.value;

    let minHeight: f32 = input.valExtremes.x;
    let maxHeight: f32 = input.valExtremes.y;
    let normVal: f32 = (val - minHeight) / (maxHeight - minHeight);

    let color = getColor(normVal);

    return vec4(color, 1.0);
}
