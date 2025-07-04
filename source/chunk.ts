import {vec3, vec3_dist, vec3_t, vec3n_add, vec3n_copy, vec3n_muls} from "@cl/math/vec3.ts";

export const CHUNK_SCALE = 16;
export const CHUNK_VOLUME = CHUNK_SCALE * CHUNK_SCALE * CHUNK_SCALE;

export class chunk_t {
    position: vec3_t;
    blocks: Uint32Array;
};

export function chunk_new(position: vec3_t): chunk_t {
    const chunk = new chunk_t();
    chunk.position = vec3n_copy(position);
    chunk.blocks = new Uint32Array(CHUNK_VOLUME);

    return chunk;
}

// utility
export function get_chunk_position(position: vec3_t): vec3_t {
    return vec3n_muls(position, CHUNK_SCALE);
}

export function get_block_coords(index: number): vec3_t {
    return vec3(
        index % CHUNK_SCALE,
        Math.floor(index / (CHUNK_SCALE * CHUNK_SCALE)),
        Math.floor(index / CHUNK_SCALE) % CHUNK_SCALE
    );
}

export function get_block_position(index: number): vec3_t {
    const out = get_block_coords(index);
    const h = CHUNK_SCALE / 2;

    out[0] += 0.5 - h;
    out[1] += 0.5 - h;
    out[2] += 0.5 - h;

    return out;
}

export function get_block_world_position(position: vec3_t, index: number): vec3_t {
    return vec3n_add(get_chunk_position(position), get_block_position(index));
}

export function chunk_test(chunk: chunk_t): void {
    const r = CHUNK_SCALE / 2;

    for (let i = 0; i < chunk.blocks.length; i++) {
        const block_pos = get_block_position(i);

        const d = vec3_dist(vec3(), block_pos);

        if (d < r) {
            if (block_pos[1] < 0) {
                chunk.blocks[i] = 1;
            } else if (block_pos[1] > 0 && block_pos[1] < 1) {
                chunk.blocks[i] = 2;
            } else {
                chunk.blocks[i] = 0;
            }
        } else {
            chunk.blocks[i] = 0;
        }
    }
}
