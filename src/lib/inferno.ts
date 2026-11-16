// matplotlib's "inferno" colormap, sampled at a few stops. Shared by the hero
// network (canvas colours) and the 3D lab (three.js colours).
const STOPS: [number, [number, number, number]][] = [
    [0, [0, 0, 4]],
    [0.25, [66, 10, 104]],
    [0.5, [147, 38, 103]],
    [0.68, [221, 81, 58]],
    [0.85, [252, 165, 10]],
    [1, [252, 255, 164]],
];

/** RGB in 0..255 for t in 0..1 */
export function infernoRGB(t: number): [number, number, number] {
    const v = Math.min(1, Math.max(0, t));
    let i = 0;
    while (i < STOPS.length - 2 && v > STOPS[i + 1][0]) i++;
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    const k = (v - t0) / (t1 - t0);
    return [0, 1, 2].map((j) => Math.round(c0[j] + (c1[j] - c0[j]) * k)) as [number, number, number];
}

export function inferno(t: number, alpha = 1): string {
    const [r, g, b] = infernoRGB(t);
    return `rgba(${r},${g},${b},${alpha})`;
}
