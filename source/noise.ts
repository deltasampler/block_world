const grad3: [number, number, number][] = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

function dot(g: [number, number, number], x: number, y: number, z: number): number {
    return g[0] * x + g[1] * y + g[2] * z;
}

export function create_permutation(seed: number): number[] {
    const p: number[] = Array.from({ length: 256 }, (_, i) => i);

    let rng_seed = seed;
    const rng = (): number => {
        const x = Math.sin(rng_seed++) * 10000;
        return x - Math.floor(x);
    };

    for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }

    return p.concat(p);
}

export function simplex_noise_3d(
    x: number,
    y: number,
    z: number,
    perm: number[]
): number {
    const F3 = 1 / 3;
    const G3 = 1 / 6;

    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);

    const t = (i + j + k) * G3;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const z0 = z - (k - t);

    let i1, j1, k1;
    let i2, j2, k2;

    if (x0 >= y0) {
        if (y0 >= z0) {
            [i1, j1, k1] = [1, 0, 0];
            [i2, j2, k2] = [1, 1, 0];
        } else if (x0 >= z0) {
            [i1, j1, k1] = [1, 0, 0];
            [i2, j2, k2] = [1, 0, 1];
        } else {
            [i1, j1, k1] = [0, 0, 1];
            [i2, j2, k2] = [1, 0, 1];
        }
    } else {
        if (y0 < z0) {
            [i1, j1, k1] = [0, 0, 1];
            [i2, j2, k2] = [0, 1, 1];
        } else if (x0 < z0) {
            [i1, j1, k1] = [0, 1, 0];
            [i2, j2, k2] = [0, 1, 1];
        } else {
            [i1, j1, k1] = [0, 1, 0];
            [i2, j2, k2] = [1, 1, 0];
        }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;

    const x2 = x0 - i2 + 2 * G3;
    const y2 = y0 - j2 + 2 * G3;
    const z2 = z0 - k2 + 2 * G3;

    const x3 = x0 - 1 + 3 * G3;
    const y3 = y0 - 1 + 3 * G3;
    const z3 = z0 - 1 + 3 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    const gi0 = perm[ii + perm[jj + perm[kk]]] % 12;
    const gi1 = perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12;
    const gi2 = perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12;
    const gi3 = perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12;

    function corner_contrib(x: number, y: number, z: number, gi: number): number {
        let t = 0.6 - x * x - y * y - z * z;
        if (t < 0) return 0;
        t *= t;
        return t * t * dot(grad3[gi], x, y, z);
    }

    const n0 = corner_contrib(x0, y0, z0, gi0);
    const n1 = corner_contrib(x1, y1, z1, gi1);
    const n2 = corner_contrib(x2, y2, z2, gi2);
    const n3 = corner_contrib(x3, y3, z3, gi3);

    return 32 * (n0 + n1 + n2 + n3);
}

export function fbm_3d(
    x: number,
    y: number,
    z: number,
    perm: number[],
    octaves: number = 4,
    persistence: number = 0.5,
    lacunarity: number = 2
): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let max_amplitude = 0;

    for (let i = 0; i < octaves; i++) {
        total += simplex_noise_3d(x * frequency, y * frequency, z * frequency, perm) * amplitude;
        max_amplitude += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }

    return total / max_amplitude;
}
