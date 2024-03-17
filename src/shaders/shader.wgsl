struct VertexInput {
    @location(0) pos: vec2f,
    @location(1) coordinates: vec2f,
}

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) coordinates: vec2f,
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.pos = vec4f(input.pos, 0, 1);
    output.coordinates = input.coordinates;

    return output;
}

// ---------------------------------------------------------------------------

struct FragmentInput {
    @location(0) coordinates: vec2f,
}

fn hsvToRgb(c: vec3f) -> vec3f {
    // TODO: Fix this
    let K = vec4f(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    let p = mix(vec4f(c.bg, K.wz), vec4f(c.gb, K.xy), step(c.b, c.g));
    let q = mix(vec4f(p.xyw, c.r), vec4f(c.r, p.yzx), step(p.x, c.r));

    let d = q.x - min(q.w, q.y);
    let e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

fn convCheck(p: vec2f) -> f32 {
    let iterations: u32 = 50;
    var i: u32 = 0;

    var z0 = vec2f(0, 0);

    while(i < iterations) {
        let z1 = vec2f(z0.x * z0.x - z0.y * z0.y, 2.0 * z0.x * z0.y) + p;

        if (length(z1) > 2) {
            break;
        }

        z0 = z1;
        i++;
    }

    return f32(i) / f32(iterations - 1);
}

@fragment
fn fragmentMain(input: FragmentInput) -> @location(0) vec4f {
    let coord = input.coordinates;

    let c: f32 = convCheck(coord);
    var val: f32 = 0;
    if (c < 0.9999) {
        val = 1.0;
    }

    return vec4f(hsvToRgb(vec3f(1.0 - c, 1.0, val)), c / 20.0);
}