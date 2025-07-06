import {vec3} from "@cl/math/vec3.ts";
import {chunk_t, CHUNK_VOLUME, CHUNK_SCALE, block_index, chunk_position, block_position, block_world_position} from "./world.ts";
import { create_permutation, fbm_3d } from "./noise.ts";

// Deterministic pseudo-random function based on 3D coordinates
function hash(x: number, y: number, z: number): number {
    let h = x * 374761393 + y * 668265263 + z * 73856093;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

// Linear interpolation
function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
}

// Smoothstep function for smooth interpolation
function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

// Value noise in 3D
export function value_noise_3d(x: number, y: number, z: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const z1 = z0 + 1;

    const fx = x - x0;
    const fy = y - y0;
    const fz = z - z0;

    const u = fade(fx);
    const v = fade(fy);
    const w = fade(fz);

    // Get values at cube corners
    const c000 = hash(x0, y0, z0);
    const c001 = hash(x0, y0, z1);
    const c010 = hash(x0, y1, z0);
    const c011 = hash(x0, y1, z1);
    const c100 = hash(x1, y0, z0);
    const c101 = hash(x1, y0, z1);
    const c110 = hash(x1, y1, z0);
    const c111 = hash(x1, y1, z1);

    // Interpolate along x
    const x00 = lerp(c000, c100, u);
    const x01 = lerp(c001, c101, u);
    const x10 = lerp(c010, c110, u);
    const x11 = lerp(c011, c111, u);

    // Interpolate along y
    const y0_ = lerp(x00, x10, v);
    const y1_ = lerp(x01, x11, v);

    // Interpolate along z
    return lerp(y0_, y1_, w);
}

// Example: Generate height for voxel terrain using 2D slice
export function get_voxel_height(x: number, z: number): number {
    const scale = 0.1;
    const height = value_noise_3d(x * scale, 0, z * scale);
    const max_height = 32;

    return Math.floor(height * max_height);
}

export function generate_solid(chunk: chunk_t): void {
    const blocks = chunk.blocks;

    for (let i = 0; i < CHUNK_VOLUME; i += 1) {
        blocks[i] = 1;
    }
}

export function generate_random(chunk: chunk_t): void {
    const blocks = chunk.blocks;

    for (let i = 0; i < CHUNK_VOLUME; i += 1) {
        blocks[i] = Math.random() < 0.5 ? 0 : 1;
    }
}

export function generate_frame(chunk: chunk_t): void {
    const blocks = chunk.blocks;

    for (let z = 0; z < CHUNK_SCALE; z++) {
        for (let y = 0; y < CHUNK_SCALE; y++) {
            for (let x = 0; x < CHUNK_SCALE; x++) {
                const index = block_index(vec3(x, y, z));

                const is_outer_x = x < 2 || x >= CHUNK_SCALE - 2;
                const is_outer_y = y < 2 || y >= CHUNK_SCALE - 2;
                const is_outer_z = z < 2 || z >= CHUNK_SCALE - 2;

                const edge_count =
                    (is_outer_x ? 1 : 0) +
                    (is_outer_y ? 1 : 0) +
                    (is_outer_z ? 1 : 0);

                blocks[index] = edge_count >= 2 ? 1 : 0;
            }
        }
    }
}

const perm = create_permutation(1337);

const WATER_LEVEL = 0;
const BASE_HEIGHT = 16;
const HEIGHT_VARIATION = 32;

export function generate_terrain(chunk: chunk_t): void {
    const blocks = chunk.blocks;
    const chunk_pos = chunk_position(chunk.position);

    for (let i = 0; i < blocks.length; i++) {
        const local_pos = block_position(i);
        const world_pos = block_world_position(chunk_pos, local_pos);

        const x = world_pos[0];
        const y = world_pos[1];
        const z = world_pos[2];

        // Generate terrain height using fbm
        const terrain_height = Math.floor(
            fbm_3d(x * 0.01, 0, z * 0.01, perm, 5, 0.5, 2) * HEIGHT_VARIATION + BASE_HEIGHT
        );

        // Above terrain
        if (y > terrain_height) {
            blocks[i] = y <= WATER_LEVEL ? 14 : 0; // water below water level, else air
            continue;
        }

        // Base layer
        if (y === 0) {
            blocks[i] = 1; // bedrock
            continue;
        }

        // Stone below deep layers
        if (y < terrain_height - 4) {
            blocks[i] = 3; // stone
        }
        // Dirt filler
        else if (y < terrain_height) {
            blocks[i] = 8; // dirt
        }
        // Surface block
        else if (y === terrain_height) {
            if (terrain_height <= WATER_LEVEL + 1) {
                blocks[i] = 6; // muddy shore (dirt)
            } else {
                blocks[i] = 7; // dirt with grass
            }
        }
    }
}