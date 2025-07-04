import {create_canvas} from "@engine/canvas.ts";
import {gl_init} from "@engine/gl.ts";
import {add_back_face, add_down_face, add_front_face, add_left_face, add_right_face, add_up_face, chunk_rdata_build, chunk_rdata_new, chunk_rend_new, chunk_rend_render, model_rdata_texture} from "./chunk_rend.ts";
import {cam3_compute_proj, cam3_compute_view, cam3_fru, cam3_move_forward, cam3_move_right, cam3_new, cam3_pan, cam3_tilt} from "@cl/camera/cam3.ts";
import {mat4} from "@cl/math/mat4.ts";
import {io_init, io_kb_key_down, io_key_down, io_m_move, kb_event_t, m_event_t} from "@engine/io.ts";
import {get_block_world_position, chunk_new, CHUNK_VOLUME, chunk_test, CHUNK_SCALE, get_block_coords} from "./chunk.ts";
import { vec3, vec3_t } from "@cl/math/vec3.ts";

import atlas_image from "./atlas.png" ;

function load_image(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

async function get_image_pixel_data(url: string): Promise<ImagePixelData> {
    const image = await load_image(url);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('could_not_get_canvas_context');
    }

    ctx.drawImage(image, 0, 0);
    const image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return {
        width: canvas.width,
        height: canvas.height,
        data: image_data.data,
    };
}

io_init();

const canvas_el = create_canvas(document.body);
const gl = gl_init(canvas_el);

const model = mat4(1.0);
const camera = cam3_new();

const chunk_rend = chunk_rend_new();
const chunk_rdata = chunk_rdata_new();

get_image_pixel_data(atlas_image).then((pixel_info) => {
    model_rdata_texture(chunk_rdata, pixel_info.width, pixel_info.height, pixel_info.data, false)
});

const chunk = chunk_new(vec3());
chunk_test(chunk);

const vertices: number[] = [];
const indices: number[] = [];

function coords_to_index(x: number, y: number, z: number): number {
    return x + z * CHUNK_SCALE + y * CHUNK_SCALE * CHUNK_SCALE;
}

function is_block_visible(x: number, y: number, z: number): boolean {
    if (x < 0 || y < 0 || z < 0 || x >= CHUNK_SCALE || y >= CHUNK_SCALE || z >= CHUNK_SCALE) {
        return true;
    }

    return !chunk.blocks[coords_to_index(x, y, z)];
}

for (let i = 0; i < chunk.blocks.length; i += 1) {
    const block = chunk.blocks[i];

    if (!block) continue;

    const [x, y, z] = get_block_coords(i);
    const center = get_block_world_position(chunk.position, i);
    const size = 1.0;

    if (is_block_visible(x - 1, y, z)) add_left_face(center, size, vertices, indices, block - 1);
    if (is_block_visible(x + 1, y, z)) add_right_face(center, size, vertices, indices, block - 1);
    if (is_block_visible(x, y - 1, z)) add_down_face(center, size, vertices, indices, block - 1);
    if (is_block_visible(x, y + 1, z)) add_up_face(center, size, vertices, indices, block - 1);
    if (is_block_visible(x, y, z + 1)) add_back_face(center, size, vertices, indices, block - 1);
    if (is_block_visible(x, y, z - 1)) add_front_face(center, size, vertices, indices, block - 1);
}

chunk_rdata_build(chunk_rdata, vertices, indices);

io_m_move(function(event: m_event_t): void {
    if (document.pointerLockElement === canvas_el) {
        cam3_pan(camera, event.xd);
        cam3_tilt(camera, event.yd);
    }
});

io_kb_key_down(function(event: kb_event_t): void {
    if (event.code === "Backquote") {
        if (document.pointerLockElement === canvas_el) {
            document.exitPointerLock();
        } else {
            canvas_el.requestPointerLock();
        }
    }
});

function update(): void {
    if (document.pointerLockElement === canvas_el) {
        if (io_key_down("KeyA")) {
            cam3_move_right(camera, -1.0);
        }

        if (io_key_down("KeyD")) {
            cam3_move_right(camera, 1.0);
        }

        if (io_key_down("KeyS")) {
            cam3_move_forward(camera, -1.0);
        }

        if (io_key_down("KeyW")) {
            cam3_move_forward(camera, 1.0);
        }
    }

    cam3_fru(camera);
    cam3_compute_proj(camera, canvas_el.width, canvas_el.height);
    cam3_compute_view(camera);
}

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

function render(): void {
    gl.viewport(0, 0, canvas_el.width, canvas_el.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    chunk_rend_render(chunk_rend, chunk_rdata, camera, model);
}

function loop(): void {
    update();
    render();

    requestAnimationFrame(loop);
}

loop();
