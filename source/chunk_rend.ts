import {gl, gl_link_program} from "@engine/gl.ts";
import {ATTRIB_TYPE, layout_attrib, layout_build_gl, layout_new} from "@engine/layout.ts";
import {cam3_t} from "@cl/camera/cam3.ts";
import {mat4_t} from "@cl/math/mat4.ts";
import {vec3, vec3_t} from "@cl/math/vec3.ts";
import {rgb} from "@cl/math/vec3_color.ts";

const layout = layout_new();
layout_attrib(layout, ATTRIB_TYPE.F32, 3);
layout_attrib(layout, ATTRIB_TYPE.F32, 3);
layout_attrib(layout, ATTRIB_TYPE.F32, 2);

export class chunk_rdata_t {
    vertices: Float32Array;
    indices: Uint32Array;
    index_count: number;
    vao: WebGLVertexArrayObject;
    vbo: WebGLBuffer;
    ibo: WebGLBuffer;
};

export function chunk_rdata_new(): chunk_rdata_t {
    const rdata = new chunk_rdata_t();
    rdata.vertices = new Float32Array(0);
    rdata.indices = new Uint32Array(0);
    rdata.index_count = 0;
    rdata.vao = 0;
    rdata.vbo = 0;
    rdata.ibo = 0;

    return rdata;
}

export function chunk_rdata_build(rdata: chunk_rdata_t, vertices: number[], indices: number[]): void {
    rdata.vertices = new Float32Array(vertices);
    rdata.indices = new Uint32Array(indices);
    rdata.index_count = indices.length;

    rdata.vao = gl.createVertexArray();
    gl.bindVertexArray(rdata.vao);

    rdata.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rdata.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, rdata.vertices, gl.STATIC_DRAW);

    layout_build_gl(layout);

    rdata.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rdata.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, rdata.indices, gl.STATIC_DRAW);
}

export class chunk_rend_t {
    prog: any;
    ligth_dir: vec3_t;
    ligth_color: vec3_t;
};

export function chunk_rend_new(): chunk_rend_t {
    const rend = new chunk_rend_t();

    const prog = rend.prog = {} as any;

    prog.id = gl_link_program({
        [gl.VERTEX_SHADER]: `#version 300 es
            layout(location = 0) in vec3 i_position;
            layout(location = 1) in vec3 i_normal;
            layout(location = 2) in vec2 i_tex_coord;
            out vec3 v_normal;
            out vec2 v_tex_coord;
            uniform mat4 u_projection;
            uniform mat4 u_view;
            uniform mat4 u_model;

            void main() {
                gl_Position = u_projection * u_view * u_model * vec4(i_position, 1.0);
                v_normal = i_normal;
                v_tex_coord = i_tex_coord;
            }
        `,
        [gl.FRAGMENT_SHADER]: `#version 300 es
            precision highp float;
            out vec4 o_frag_color;
            in vec3 v_normal;
            in vec2 v_tex_coord;
            uniform vec3 u_light_dir;
            uniform vec3 u_light_color;

            float uv_border_width(vec2 uv, vec2 size) {
                float left = smoothstep(0.0, size.x, uv.x);
                float right = smoothstep(0.0, size.x, 1.0 - uv.x);
                float bottom = smoothstep(0.0, size.y, 1.0 - uv.y);
                float top = smoothstep(0.0, size.y, uv.y);

                return min(min(left, right), min(top, bottom));
            }

            void main() {
                vec2 uv = v_tex_coord;
                vec3 light_dir = normalize(u_light_dir);

                vec3 inner_color = vec3(0.0, 0.5, 0.5);
                vec3 outer_color = vec3(1.0, 1.0, 1.0);
                float outline = 0.1;
                float size = 1.0;

                float mask = uv_border_width(uv, vec2(outline / size));
                vec3 block_color = mix(outer_color, inner_color, mask);

                float ambient_factor = 0.3;
                vec3 ambient_color = vec3(1.0);
                vec3 ambient = ambient_factor * ambient_color;

                float diffuse_factor = max(0.2, dot(v_normal, light_dir));
                vec3 diffuse = diffuse_factor * u_light_color;

                vec3 color = (ambient + diffuse) * block_color;

                o_frag_color = vec4(color, 1.0);
            }
        `
    })!;

    prog.u_projection = gl.getUniformLocation(prog.id, "u_projection")!;
    prog.u_view = gl.getUniformLocation(prog.id, "u_view")!;
    prog.u_model = gl.getUniformLocation(prog.id, "u_model")!;
    prog.u_light_dir = gl.getUniformLocation(prog.id, "u_light_dir")!;
    prog.u_light_color = gl.getUniformLocation(prog.id, "u_light_color")!;

    rend.ligth_dir = vec3(1.0);
    rend.ligth_color = rgb(255, 255, 255);

    return rend;
}

export function chunk_rend_render(rend: chunk_rend_t, rdata: chunk_rdata_t, cam: cam3_t, model: mat4_t): void {
    gl.useProgram(rend.prog.id);
    gl.uniformMatrix4fv(rend.prog.u_projection, false, cam.projection);
    gl.uniformMatrix4fv(rend.prog.u_view, false, cam.view);
    gl.uniformMatrix4fv(rend.prog.u_model, false, model);
    gl.uniform3fv(rend.prog.u_light_dir, rend.ligth_dir);
    gl.uniform3fv(rend.prog.u_light_color, rend.ligth_color);

    gl.bindVertexArray(rdata.vao);
    gl.drawElements(gl.TRIANGLES, rdata.index_count, gl.UNSIGNED_INT, 0);
}

export function add_left_face(center: vec3_t, size: number, vertices: number[], indices: number[]): void {
    const [cx, cy, cz] = center;
    const s = size * 0.5;

    const base = vertices.length / 8;

    vertices.push(
        cx - s, cy - s, cz - s, -1, 0, 0, 0, 0,
        cx - s, cy - s, cz + s, -1, 0, 0, 1, 0,
        cx - s, cy + s, cz + s, -1, 0, 0, 1, 1,
        cx - s, cy + s, cz - s, -1, 0, 0, 0, 1
    );

    indices.push(
        base + 0, base + 1, base + 2, base + 0, base + 2, base + 3
    );
}

export function add_right_face(center: vec3_t, size: number, vertices: number[], indices: number[]): void {
    const [cx, cy, cz] = center;
    const s = size * 0.5;

    const base = vertices.length / 8;

    vertices.push(
        cx + s, cy - s, cz + s, 1, 0, 0, 0, 0,
        cx + s, cy - s, cz - s, 1, 0, 0, 1, 0,
        cx + s, cy + s, cz - s, 1, 0, 0, 1, 1,
        cx + s, cy + s, cz + s, 1, 0, 0, 0, 1
    );

    indices.push(
        base + 0, base + 1, base + 2, base + 0, base + 2, base + 3
    );
}

export function add_down_face(center: vec3_t, size: number, vertices: number[], indices: number[]): void {
    const [cx, cy, cz] = center;
    const s = size * 0.5;

    const base = vertices.length / 8;

    vertices.push(
        cx - s, cy - s, cz + s, 0, -1, 0, 0, 0,
        cx - s, cy - s, cz - s, 0, -1, 0, 1, 0,
        cx + s, cy - s, cz - s, 0, -1, 0, 1, 1,
        cx + s, cy - s, cz + s, 0, -1, 0, 0, 1
    );

    indices.push(
        base + 0, base + 1, base + 2, base + 0, base + 2, base + 3
    );
}

export function add_up_face(center: vec3_t, size: number, vertices: number[], indices: number[]): void {
    const [cx, cy, cz] = center;
    const s = size * 0.5;

    const base = vertices.length / 8;

    vertices.push(
        cx - s, cy + s, cz - s, 0, 1, 0, 0, 0,
        cx - s, cy + s, cz + s, 0, 1, 0, 1, 0,
        cx + s, cy + s, cz + s, 0, 1, 0, 1, 1,
        cx + s, cy + s, cz - s, 0, 1, 0, 0, 1
    );

    indices.push(
        base + 0, base + 1, base + 2, base + 0, base + 2, base + 3
    );
}

export function add_back_face(center: vec3_t, size: number, vertices: number[], indices: number[]): void {
    const [cx, cy, cz] = center;
    const s = size * 0.5;

    const base = vertices.length / 8;

    vertices.push(
        cx - s, cy - s, cz + s, 0, 0, 1, 0, 0,
        cx + s, cy - s, cz + s, 0, 0, 1, 1, 0,
        cx + s, cy + s, cz + s, 0, 0, 1, 1, 1,
        cx - s, cy + s, cz + s, 0, 0, 1, 0, 1
    );

    indices.push(
        base + 0, base + 1, base + 2, base + 0, base + 2, base + 3
    );
}

export function add_front_face(center: vec3_t, size: number, vertices: number[], indices: number[]): void {
    const [cx, cy, cz] = center;
    const s = size * 0.5;

    const base = vertices.length / 8;

    vertices.push(
        cx + s, cy - s, cz - s, 0, 0, 1, 0, 0,
        cx - s, cy - s, cz - s, 0, 0, 1, 1, 0,
        cx - s, cy + s, cz - s, 0, 0, 1, 1, 1,
        cx + s, cy + s, cz - s, 0, 0, 1, 0, 1
    );

    indices.push(
        base + 0, base + 1, base + 2, base + 0, base + 2, base + 3
    );
}
