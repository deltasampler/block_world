import {create_canvas} from "@engine/canvas.ts";
import {gl_init} from "@engine/gl.ts";
import {add_back_face, add_down_face, add_front_face, add_left_face, add_right_face, add_up_face, chunk_rdata_build, chunk_rdata_new, chunk_rend_new, chunk_rend_render} from "./chunk_rend.ts";
import {cam3_compute_proj, cam3_compute_view, cam3_fru, cam3_move_forward, cam3_move_right, cam3_new, cam3_pan, cam3_tilt} from "@cl/camera/cam3.ts";
import {mat4} from "@cl/math/mat4.ts";
import {io_init, io_kb_key_down, io_key_down, io_m_move, kb_event_t, m_event_t} from "@engine/io.ts";
import {get_block_world_position, chunk_new, CHUNK_VOLUME, chunk_test, CHUNK_SCALE} from "./chunk.ts";
import { vec3, vec3_t } from "@cl/math/vec3.ts";

io_init();

const canvas_el = create_canvas(document.body);
const gl = gl_init(canvas_el);

const model = mat4(1.0);
const camera = cam3_new();

const chunk_rend = chunk_rend_new();
const chunk_rdata = chunk_rdata_new();

const chunk = chunk_new(vec3());
chunk_test(chunk);

const vertices: number[] = [];
const indices: number[] = [];

function index_to_coords(index: number): vec3_t {
    return vec3(
        index % CHUNK_SCALE,
        Math.floor(index / CHUNK_SCALE) % CHUNK_SCALE,
        Math.floor(index / (CHUNK_SCALE * CHUNK_SCALE))
    );
}

function coords_to_index(x: number, y: number, z: number): number {
    return x + z * CHUNK_SCALE + y * CHUNK_SCALE * CHUNK_SCALE;
}

function is_block_visible(x: number, y: number, z: number): boolean {
    if (x < 0 || y < 0 || z < 0 || x >= CHUNK_SCALE || y >= CHUNK_SCALE || z >= CHUNK_SCALE) {
        return true;
    }

    return !chunk.blocks[coords_to_index(x, y, z)];
}

for (let i = 0; i < CHUNK_VOLUME; i += 1) {
    const block = chunk.blocks[i];

    if (!block) continue;

    const [x, y, z] = index_to_coords(i);
    const center = get_block_world_position(chunk.position, i);
    const size = 1.0;

    if (is_block_visible(x - 1, y, z)) add_left_face(center, size, vertices, indices);
    if (is_block_visible(x + 1, y, z)) add_right_face(center, size, vertices, indices);
    if (is_block_visible(x, y - 1, z)) add_down_face(center, size, vertices, indices);
    if (is_block_visible(x, y + 1, z)) add_up_face(center, size, vertices, indices);
    if (is_block_visible(x, y, z + 1)) add_back_face(center, size, vertices, indices);
    if (is_block_visible(x, y, z - 1)) add_front_face(center, size, vertices, indices);
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
// gl.enable(gl.CULL_FACE);

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
