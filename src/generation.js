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

const faceColors = [
    [1.0, 1.0, 1.0, 1.0], // Front face: white
    [1.0, 0.0, 0.0, 1.0], // Back face: red
    [0.0, 1.0, 0.0, 1.0], // Top face: green
    [0.0, 0.0, 1.0, 1.0], // Bottom face: blue
    [1.0, 1.0, 0.0, 1.0], // Right face: yellow
    [1.0, 0.0, 1.0, 1.0], // Left face: purple
];

noise.seed(Math.random());
OnParamsChanged();
Render();

function createPlanet(gl, rotation)
{
    for (let i=0; i<directions.length; ++i)
    {
        const direction = directions[i];

        const color = debugSettings.debugFaces ? faceColors[i] : colorSettings.planetColor;
        let terrainFace = new TerrainFace(planetSettings.resolution, direction);
        terrainFace.constructMesh(gl, color);

        renderContext.meshes.push(new MeshInstance(terrainFace.mesh, [0, 0, -4], vec3.clone(rotation), [1, 1, 1]));
    }
}

function OnSettingsChanged()
{
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl");

    const rotation = renderContext.meshes.length > 0 ? renderContext.meshes[0].rotation : [0, 0, 0];
    renderContext.meshes = [];
    createPlanet(gl, rotation);
}

function Render() {
    // Vertex shader program
    const vsSource = `
    attribute highp vec4 aVertexPosition;
    attribute highp vec4 aVertexColor;
    attribute highp vec3 aVertexNormal;

    uniform mat3 uNormalMatrix;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying highp vec4 vColor;
    varying highp vec3 vNormal;
    varying highp float vHeight;
    varying highp vec3 vWorldPos;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

      vNormal = normalize(uNormalMatrix * aVertexNormal);
      vColor = aVertexColor;
      vHeight = length(aVertexPosition.xyz); // distance from center = height
      vWorldPos = (uModelViewMatrix * aVertexPosition).xyz; // in world space
    }
  `;

    const fsSource = `
    precision highp float;

    varying highp vec3 vNormal;
    varying lowp vec4 vColor;
    varying highp float vHeight;
    varying highp vec3 vWorldPos;

    // uniform to tweak water level
    uniform float uWaterLevel; // e.g., 1.0 = radius at which water starts
    uniform vec3 uCameraPos;   // camera in world space

    void main() {

        // --------- Lighting setup ----------
        vec3 ambientLight = vec3(0.01);
        vec3 directionalLightColor = vec3(1.0);
        vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

        vec3 N = normalize(vNormal);

        float lambert = max(dot(N, directionalVector), 0.0);
        vec3 diffuse = directionalLightColor * lambert;

        // Specular (Phong)
        vec3 L = directionalVector;
        vec3 V = normalize(uCameraPos - vWorldPos); // from surface to camera
        float fresnel = pow(1.0 - dot(N, V), 3.0);
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 16.0);
        vec3 specular = vec3(spec) * 0.2;

        vec3 lighting = ambientLight + diffuse + specular;

        // --------- Water effect ----------
        vec3 terrainColor = vColor.xyz;
        vec3 waterColor = vec3(0.0, 0.3, 0.5);

        // Smooth transition between water and land
        float t = smoothstep(uWaterLevel - 0.01, uWaterLevel, vHeight);
        vec3 baseColor = mix(waterColor, terrainColor, t);

        // Add water Fresnel-like shine
        if(vHeight < uWaterLevel) {
            baseColor += vec3(0.1, 0.15, 0.2) * fresnel; // subtle reflective highlight
        }

        // --------- Atmosphere ----------
        float atmosphere = pow(1.0 - dot(N, V), 3.0);
        vec3 atmosphereColor = vec3(0.4, 0.6, 1.0);
        baseColor = mix(baseColor, atmosphereColor, atmosphere * 0.5);

        // --------- Combine with lighting ----------
        vec3 finalColor = baseColor * lighting;

        // Gamma correction
        finalColor = pow(finalColor, vec3(1.0 / 2.2));

        gl_FragColor = vec4(finalColor, 1.0);
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
            vertexNormal: gl.getAttribLocation(shaderProgram, "aVertexNormal"),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
            normalMatrix: gl.getUniformLocation(shaderProgram, "uNormalMatrix"),

            waterLevel: gl.getUniformLocation(shaderProgram, "uWaterLevel"),
            cameraPos: gl.getUniformLocation(shaderProgram, "uCameraPos"),
            
        },
    };

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.
    
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
            renderContext.meshes[i].rotation[0] += renderContext.deltaTime * 0.1 * 0.2;
            renderContext.meshes[i].rotation[1] += renderContext.deltaTime * 0.2 * 0.2;
            renderContext.meshes[i].rotation[2] += renderContext.deltaTime * 0.1 * 0.2;
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

function initNoiseUI()
{
    const noiseList = document.getElementById("noise-list");
    const addButton = document.getElementById("add-noise");

    let createSlider = (section, name, value, onchange) => {

        let input = document.createElement("input");
        input.type = "range";
        input.min = 0;
        input.max = 3;
        input.step = 0.01;
        input.value = value;

        let label = document.createElement("span");
        label.textContent = name;

        section.append(input, label);

        input.oninput = onchange;
    }

    let addNoiseOption = (noiseSetting) => {
        let section = document.createElement("div");
        section.className = "settings-section";

        createSlider(section, "Scale", noiseSetting.scale, (e) => { noiseSetting.scale = e.target.valueAsNumber; OnParamsChanged(); });
        createSlider(section, "Intensity", noiseSetting.intensity, (e) => { noiseSetting.intensity = e.target.valueAsNumber; OnParamsChanged(); });
        createSlider(section, "Offset", noiseSetting.offset, (e) => { noiseSetting.offset = e.target.valueAsNumber; OnParamsChanged(); });

        let deleteBtn = document.createElement("button");
        deleteBtn.innerText = "Remove";

        deleteBtn.onclick = () => {
            const index = planetSettings.shapeProvider.noiseSettings.indexOf(noiseSetting);
            if (index > -1)
            {
                planetSettings.shapeProvider.noiseSettings.splice(index, 1);
                console.log(planetSettings.shapeProvider.noiseSettings);
            }

            noiseList.removeChild(section);

            OnParamsChanged();
        }

        section.append(deleteBtn);
        noiseList.append(section);
    }

    addButton.onclick = () =>
    {
        planetSettings.shapeProvider.noiseSettings.push(new NoiseSettings(0.2, 0.2, 0));
        addNoiseOption(planetSettings.shapeProvider.noiseSettings[planetSettings.shapeProvider.noiseSettings.length - 1]);
        OnParamsChanged();
    };

    for (let noiseSetting of planetSettings.shapeProvider.noiseSettings)
    {
        addNoiseOption(noiseSetting);
    }
}

initNoiseUI();