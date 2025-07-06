import {create_canvas} from "@engine/canvas.ts";
import {gl_init} from "@engine/gl.ts";
import {chunk_rdata_gen, chunk_rdata_new, chunk_rdata_t, chunk_rend_new, chunk_rend_render} from "./chunk_rend.ts";
import {cam3_compute_proj, cam3_compute_view, cam3_fru, cam3_move_forward, cam3_move_right, cam3_new, cam3_pan, cam3_tilt} from "@cl/camera/cam3.ts";
import {mat4} from "@cl/math/mat4.ts";
import {io_init, io_kb_key_down, io_key_down, io_m_move, kb_event_t, m_event_t} from "@engine/io.ts";
import {vec3} from "@cl/math/vec3.ts";
import {chunk_hash, chunk_position_from_world, chunk_t, world_load_chunk, world_new} from "./world.ts";
import {generate_terrain} from "./generation.ts";

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

let tbo = 0;

get_image_pixel_data(atlas_image).then((pixel_info) => {
    tbo = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tbo);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pixel_info.width, pixel_info.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel_info.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
});

const world = world_new();

const chunk_rdatas: {[key: string]: chunk_rdata_t} = {};

function push_chunk_rdata(chunk: chunk_t) {
    const hash = chunk_hash(chunk.position);

    if (chunk_rdatas[hash]) {
        return chunk_rdatas[hash];
    }

    const chunk_rdata = chunk_rdata_new();
    chunk_rdata_gen(chunk_rdata, chunk);

    chunk_rdatas[hash] = chunk_rdata;

    return chunk_rdata;
}

for (const key in world.chunks) {
    const chunk = world.chunks[key];
    push_chunk_rdata(chunk);
}

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

    const load_range = 1;

    const center_chunk_pos = chunk_position_from_world(camera.position);

    for (let dx = -load_range; dx <= load_range; dx++) {
        for (let dy = -load_range; dy <= load_range; dy++) {
            for (let dz = -load_range; dz <= load_range; dz++) {
                const neighbor_pos = vec3(
                    center_chunk_pos[0] + dx,
                    center_chunk_pos[1] + dy,
                    center_chunk_pos[2] + dz
                );

                const chunk = world_load_chunk(world, neighbor_pos);

                if (!chunk.is_loaded) {
                    generate_terrain(chunk);
                    push_chunk_rdata(chunk);
                    chunk.is_loaded = true;
                }
            }
        }
    }
}

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

function render(): void {
    gl.viewport(0, 0, canvas_el.width, canvas_el.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (const key in chunk_rdatas) {
        const chunk_rdata = chunk_rdatas[key];

        chunk_rend_render(chunk_rend, chunk_rdata, camera, model);
    }
}

function loop(): void {
    update();
    render();

    requestAnimationFrame(loop);
}

loop();
