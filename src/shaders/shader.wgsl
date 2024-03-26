struct VertexInput {
    @location(0) pos: vec2f,
    @location(1) axisExtremesIDs: vec2f,
}

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) coord: vec2f,
}

@group(0) @binding(0) var<uniform> extremesUniform: vec4f;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.pos = vec4f(input.pos, 0, 1);

    let extrIDs = vec2u(input.axisExtremesIDs);
    output.coord = vec2f(
        extremesUniform[extrIDs.x],
        extremesUniform[extrIDs.y]
    );

    return output;
}

// ---------------------------------------------------------------------------

struct FragmentInput {
    @location(0) coord: vec2f,
}

fn hue2rgb(p: f32, q: f32, t: f32) -> f32 {
    var nt: f32 = t;

    if (nt < 0) {
        nt += 1.0;
    }
    if (nt > 1) {
        nt -= 1.0;
    }

    if (nt < 1.0 / 6.0) {
        return p + (q - p) * 6.0 * nt;
    }
    if (nt < 1.0 / 2.0) {
        return q;
    }
    if (nt < 2.0 / 3.0) {
        return p + (q - p) * (2.0 / 3.0 - nt) * 6.0;
    }

    return p;
}

fn hsl2rgb(h: f32, s: f32, l: f32) -> vec3f {
    var rgb: vec3f;

    if (s == 0) {
        rgb = vec3f(l, l, l);
    } else {
        var q: f32;
        if (l < 0.5) {
            q = l * (1.0 + s);
        } else {
            q = l + s - l * s;
        }

        let p = 2.0 * l - q;

        rgb.r = hue2rgb(p, q, h + 1.0 / 3.0);
        rgb.g = hue2rgb(p, q, h);
        rgb.b = hue2rgb(p, q, h - 1.0 / 3.0);
    }

    return rgb;
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
    let c: f32 = convCheck(input.coord);
    var val: f32 = 0;
    if (c < 0.999) {
        val = 0.5;
    }

    return vec4f(hsl2rgb(1.0 - c, 1.0, val), 1);
}