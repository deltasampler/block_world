import {vec3} from "@cl/math/vec3.ts";
import {chunk_t, CHUNK_VOLUME, CHUNK_SCALE, block_index} from "./world.ts";

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

export function generate_terrain(chunk: chunk_t): void {
    const blocks = chunk.blocks;
    const offset = chunk.position; // vec3 representing the world position of the chunk

    for (let z = 0; z < CHUNK_SCALE; z++) {
        for (let x = 0; x < CHUNK_SCALE; x++) {
            const world_x = offset[0] + x;
            const world_z = offset[2] + z;

            // Lower terrain height to free up vertical space for trees
            const base_height = 4;
            const terrain_variation = 3 * Math.sin(world_x * 0.1) * Math.cos(world_z * 0.1);
            const terrain_height = Math.floor(base_height + terrain_variation);

            for (let y = 0; y < CHUNK_SCALE; y++) {
                const world_y = offset[1] + y;
                const index = block_index(vec3(x, y, z));

                if (world_y > terrain_height) {
                    blocks[index] = 0; // Air
                } else if (world_y === terrain_height) {
                    blocks[index] = 2; // Grass
                } else if (world_y > terrain_height - 3) {
                    blocks[index] = 1; // Stone (surface)
                } else {
                    blocks[index] = 1; // Deep stone
                }
            }

            // Random tree generation
            if (Math.random() < 0.05) {
                const tree_height = 4;
                const tree_base_y = terrain_height + 1;

                // Tree trunk
                for (let t_y = 0; t_y < tree_height; t_y++) {
                    const y = tree_base_y + t_y;
                    if (y >= 0 && y < CHUNK_SCALE) {
                        const index = block_index(vec3(x, y, z));
                        blocks[index] = 3; // Wood
                    }
                }

                // Leaves (simple 3x3x3 cube)
                const leaf_start_y = tree_base_y + tree_height - 2;
                for (let dz = -1; dz <= 1; dz++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = 0; dy <= 2; dy++) {
                            const l_x = x + dx;
                            const l_y = leaf_start_y + dy;
                            const l_z = z + dz;

                            if (
                                l_x >= 0 && l_x < CHUNK_SCALE &&
                                l_y >= 0 && l_y < CHUNK_SCALE &&
                                l_z >= 0 && l_z < CHUNK_SCALE
                            ) {
                                const leaf_index = block_index(vec3(l_x, l_y, l_z));
                                if (blocks[leaf_index] === 0) {
                                    blocks[leaf_index] = 4; // Leaf
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}