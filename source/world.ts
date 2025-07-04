import {vec3, vec3_t, vec3n_copy, vec3n_muls} from "@cl/math/vec3.ts";

export const BLOCK_SCALE = 1;
export const BLOCK_SCALE_HALF = BLOCK_SCALE / 2;

export const CHUNK_SCALE = 16;
export const CHUNK_SCALE_HALF = CHUNK_SCALE / 2;
export const CHUNK_VOLUME = CHUNK_SCALE * CHUNK_SCALE * CHUNK_SCALE;

export const WORLD_SCALE = 2;

export const CHUNK_BLOCK_OFFSET = CHUNK_SCALE_HALF + BLOCK_SCALE_HALF;

export function block_position(index: number): vec3_t {
    return vec3(
        index % CHUNK_SCALE,
        Math.floor(index / (CHUNK_SCALE * CHUNK_SCALE)),
        Math.floor(index / CHUNK_SCALE) % CHUNK_SCALE
    );
}

export function block_index(position: vec3_t): number {
    return position[0] + position[1] * (CHUNK_SCALE * CHUNK_SCALE) + position[2] * CHUNK_SCALE;
}

export function block_world_position(chunk_position: vec3_t, block_position: vec3_t): vec3_t {
    return vec3(
        chunk_position[0] + block_position[0] - CHUNK_BLOCK_OFFSET,
        chunk_position[1] + block_position[1] - CHUNK_BLOCK_OFFSET,
        chunk_position[2] + block_position[2] - CHUNK_BLOCK_OFFSET
    );
}

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

export function chunk_position(position: vec3_t): vec3_t {
    return vec3n_muls(position, CHUNK_SCALE);
}

export function chunk_hash(position: vec3_t): string {
    return `${position[0]}_${position[1]}_${position[2]}}`;
}

export class world_t {
    chunks: {[key: string]: chunk_t};
};

export function world_new(): world_t {
    const world = new world_t();
    world.chunks = {};

    return world;
}

export function world_get_chunk(world: world_t, position: vec3_t): chunk_t|null {
    return world.chunks[chunk_hash(position)];
}

export function world_load_chunk(world: world_t, position: vec3_t): chunk_t {
    const loaded_chunk = world_get_chunk(world, position);

    if (loaded_chunk) {
        return loaded_chunk;
    }

    const chunk = chunk_new(position);

    world.chunks[chunk_hash(position)] = chunk;

    return chunk;
}

export function world_unload_chunk(world: world_t, position: vec3_t): void {
    const hash = chunk_hash(position);

    if (!world.chunks[hash]) {
        return;
    }

    delete world.chunks[hash];
}
