export type vec3 = [number, number, number];

/**
 * Linearly interpolates between two vectors.
 */
export function mix(vec1: vec3, vec2: vec3, a: number): vec3 {
    return [
        vec1[0] * (1 - a) + vec2[0] * a,
        vec1[1] * (1 - a) + vec2[1] * a,
        vec1[2] * (1 - a) + vec2[2] * a,
    ];
}
