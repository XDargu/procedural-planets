let deltaTime = 0;
let elapsedTime = 0;

Render();

function Render() {
    // Vertex shader program
    const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColor = aVertexColor;
    }
  `;

    const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
  `;

    const canvas = document.getElementById("canvas");

    const gl = canvas.getContext("webgl");

    // Only continue if WebGL is available and working
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.",);
        return;
    }

    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    // Look up which attributes our shader program is using
    // for aVertexPosition, aVertexColor and also
    // look up uniform locations.
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
            vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        },
    };

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.
    const cube = MakeCube(gl);

    let meshes = [
        //new MeshInstance(cube, [0, 0, -6], [0, 1, 0], [0.1, 0.1, 0.1]),
    ];

    const directions = [
        [0, 1, 0], // Up
        [0, -1, 0], // Down
        [-1, 0, 0], // Left
        [1, 0, 0], // Right
        [0, 0, -1], // Forward
        [0, 0, 1], // Backward
    ];

    const faceColors = [
        [1.0, 1.0, 1.0, 1.0], // Front face: white
        [1.0, 0.0, 0.0, 1.0], // Back face: red
        [0.0, 1.0, 0.0, 1.0], // Top face: green
        [0.0, 0.0, 1.0, 1.0], // Bottom face: blue
        [1.0, 1.0, 0.0, 1.0], // Right face: yellow
        [1.0, 0.0, 1.0, 1.0], // Left face: purple
    ];

    const resolution = 50;

    for (let i=0; i<directions.length; ++i)
    {
        const direction = directions[i];
        const color = faceColors[i];
        let terrainFace = new TerrainFace(resolution, direction);
        terrainFace.constructMesh(gl, color);

        meshes.push(new MeshInstance(terrainFace.mesh, [0, 0, -4], [0, 0, 0], [1, 1, 1]));
    }

    // Draw the scene
    let then = 0;

    console.log(meshes)

    // Draw the scene repeatedly
    function render(now)
    {
        now *= 0.001; // convert to seconds
        deltaTime = now - then;
        then = now;
        elapsedTime += deltaTime;

        drawScene(gl, programInfo, meshes);

        for (let i=0; i<directions.length; ++i)
        {
            meshes[i].rotation[0] += deltaTime * 0.3;
            meshes[i].rotation[1] += deltaTime * 0.7;
            meshes[i].rotation[2] += deltaTime * 0.4;
        }

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert(
            `Unable to initialize the shader program: ${gl.getProgramInfoLog(
                shaderProgram,
            )}`,
        );
        return null;
    }

    return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object

    gl.shaderSource(shader, source);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(
            `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
        );
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}