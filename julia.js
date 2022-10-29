"use strict";

let gl,
    clickX,
    clickY,
    vertices,
    mouseDown,
    escapeMax,
    itterationDepth = 150,
    viewProjectionMatrix;

const camera = {
        x: 0.0,
        y: 0.0,
        rotation: 0,
        zoom: 1.0,
    },
    projection = [1, 0, 0, 0, -1, 0, 0, 0, 1];

window.onload = () => {
    let canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");

    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    vertices = [
        vec2(-1.0, 1.0),
        vec2(1.0, 1.0),
        vec2(1.0, -1.0),
        vec2(-1.0, -1.0),
    ];

    render();

    const getClipSpaceMousePosition = (e) => {
        // get canvas relative css position
        const rect = canvas.getBoundingClientRect(),
            cssX = e.clientX - rect.left,
            cssY = e.clientY - rect.top;

        // get normalized 0 to 1 position across and down canvas
        const normalizedX = cssX / canvas.clientWidth,
            normalizedY = cssY / canvas.clientHeight;

        // convert to clip space
        const clipX = normalizedX * 2 - 1,
            clipY = normalizedY * -2 + 1;

        return [clipX, clipY];
    };

    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const [clipX, clipY] = getClipSpaceMousePosition(e);

        const [preZoomX, preZoomY] = transformPoint(
            flatten(inverse3(viewProjectionMatrix)),
            [clipX, clipY]
        );

        const newZoom = camera.zoom * Math.pow(2, e.deltaY * -0.01);
        camera.zoom = Math.max(0.02, Math.min(100000000, newZoom));

        updateViewProjection();

        const [postZoomX, postZoomY] = transformPoint(
            flatten(inverse3(viewProjectionMatrix)),
            [clipX, clipY]
        );

        camera.x += preZoomX - postZoomX;
        camera.y += preZoomY - postZoomY;

        render();
    });

    canvas.addEventListener("mousedown", (e) => (mouseDown = true));

    canvas.addEventListener("mouseup", (e) => (mouseDown = false));

    canvas.addEventListener("mousemove", (e) => {
        if (mouseDown) {
            const rect = canvas.getBoundingClientRect();
            e.preventDefault();

            clickX = (2 * (e.clientX - rect.left)) / canvas.width - 1;
            clickY = (2 * (rect.top - e.clientY)) / canvas.height + 1;
            render();
        }
    });
};

const render = () => {
    let program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    escapeMax = gl.getUniformLocation(program, "nt");
    gl.uniform1i(escapeMax, itterationDepth);

    let matrix = gl.getUniformLocation(program, "matrix");
    gl.uniformMatrix3fv(matrix, false, [1, 0, 0, 0, 1, 0, 0, 0, 1]);

    let c_x = gl.getUniformLocation(program, "c_x");
    gl.uniform1f(c_x, clickX);

    let c_y = gl.getUniformLocation(program, "c_y");
    gl.uniform1f(c_y, clickY);

    let c_zoom = gl.getUniformLocation(program, "c_zoom");
    gl.uniform1f(c_zoom, camera.zoom);

    let cam_x = gl.getUniformLocation(program, "cam_x");
    gl.uniform1f(cam_x, camera.x);

    let cam_y = gl.getUniformLocation(program, "cam_y");
    gl.uniform1f(cam_y, camera.y);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);

    updateViewProjection();
};

const transformPoint = (m, v) => {
    const v0 = v[0],
        v1 = v[1],
        d = v0 * m[2] + v1 * m[5] + m[8];

    return [
        (v0 * m[0] + v1 * m[3] + m[6]) / d,
        (v0 * m[1] + v1 * m[4] + m[7]) / d,
    ];
};

const updateViewProjection = () => {
    const projectionMat = mat3(projection),
        cameraMat = makeCameraMatrix();
    let viewMat = inverse3(cameraMat);

    viewProjectionMatrix = mult(projectionMat, viewMat);
};

const makeCameraMatrix = () => {
    const zoomScale = 1 / camera.zoom;
    let cameraMat = mat3(1, 0, 0, 0, 1, 0, 0, 0, 1);

    cameraMat = mult(cameraMat, translate(camera.x, camera.y));
    cameraMat = mult(cameraMat, rotate(camera.rotation, vec3(0, 0, 1), 3));

    return mult(cameraMat, scale(zoomScale, zoomScale));
};
