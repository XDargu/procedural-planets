let renderContext = {
    meshes: [],
    deltaTime: 0,
    elapsedTime: 0,
}

const directions = [
    [0, 1, 0], // Up
    [0, -1, 0], // Down
    [-1, 0, 0], // Left
    [1, 0, 0], // Right
    [0, 0, -1], // Forward
    [0, 0, 1], // Backward
];

Render();

function createPlanet(gl)
{
    const faceColors = [
        [1.0, 1.0, 1.0, 1.0], // Front face: white
        [1.0, 0.0, 0.0, 1.0], // Back face: red
        [0.0, 1.0, 0.0, 1.0], // Top face: green
        [0.0, 0.0, 1.0, 1.0], // Bottom face: blue
        [1.0, 1.0, 0.0, 1.0], // Right face: yellow
        [1.0, 0.0, 1.0, 1.0], // Left face: purple
    ];

    for (let i=0; i<directions.length; ++i)
    {
        const direction = directions[i];

        const color = debugSettings.debugFaces ? faceColors[i] : colorSettings.planetColor;
        let terrainFace = new TerrainFace(planetSettings.resolution, direction);
        terrainFace.constructMesh(gl, color);

        renderContext.meshes.push(new MeshInstance(terrainFace.mesh, [0, 0, -4], [0, 0, 0], [1, 1, 1]));
    }
}

function OnSettingsChanged()
{
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl");

    renderContext.meshes = [];
    createPlanet(gl);
}

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
    createPlanet(gl);

    // Draw the scene
    let then = 0;

    // Draw the scene repeatedly
    function render(now)
    {
        now *= 0.001; // convert to seconds
        renderContext.deltaTime = now - then;
        then = now;
        renderContext.elapsedTime += renderContext.deltaTime;

        drawScene(gl, programInfo, renderContext.meshes);

        for (let i=0; i<directions.length; ++i)
        {
            renderContext.meshes[i].rotation[0] += renderContext.deltaTime * 0.1;
            renderContext.meshes[i].rotation[1] += renderContext.deltaTime * 0.2;
            renderContext.meshes[i].rotation[2] += renderContext.deltaTime * 0.1;
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