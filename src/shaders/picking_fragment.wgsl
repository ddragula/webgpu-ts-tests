struct FragmentInput {
    @location(0) @interpolate(flat) fragID: u32,
};

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    let id = input.fragID;

    let r = f32((id & 0xFF0000u) >> 16u) / 255.0;
    let g = f32((id & 0x00FF00u) >> 8u) / 255.0;
    let b = f32(id & 0x0000FFu) / 255.0;

    return vec4<f32>(r, g, b, 1.0);
}
