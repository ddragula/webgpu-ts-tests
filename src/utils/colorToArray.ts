/**
 * Convert a hex color to an array of RGBA values
 *
 * @param color - The hex color to convert
 * @returns The RGBA values as an array
 */
export default function colorToArray(color: string): [number, number, number] {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    return [r, g, b];
}
