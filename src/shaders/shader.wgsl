struct VertexInput {
    @location(0) pos: vec2f,
    @builtin(instance_index) instance: u32,
}

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) cell: vec2f,
}

@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cellState: array<u32>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    let i = f32(input.instance);
    let cell = vec2f(i % grid.x, floor(i / grid.x));
    let scale = f32(cellState[input.instance]);
    let cellOffset = cell / grid * 2;
    let gridPos = (scale * input.pos + 1) / grid - 1 + cellOffset;

    output.pos = vec4f(gridPos, 0, 1);
    output.cell = cell / grid;
    return output;
}

// ------------------------------------------------------------------------

struct FragInput {
    @location(0) cell: vec2f,
}

@fragment
fn fragmentMain(input: FragInput) -> @location(0) vec4f {
    return vec4f(input.cell, 1 - input.cell.x, 1);
}
