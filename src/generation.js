let renderContext = {
    meshes: [],
    deltaTime: 0,
    elapsedTime: 0,
    camera: {
        position: [0, 0, 0],
        target:   [0, 0, -5],
        up:       [0, 1, 0],
    }
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

function zoomCamera(amount) {
    const cam = renderContext.camera;

    // compute vector from camera to target
    const forward = vec3.create();
    vec3.subtract(forward, cam.target, cam.position);

    const dist = vec3.length(forward);
    if (dist < 0.001) return; // too close, skip
    
    vec3.normalize(forward, forward);

    // move camera along forward, but clamp distance
    const minDist = 4.0;
    const maxDist = 10.0;

    let newDist = dist - amount; // subtract because forward points target - cam
    newDist = Math.min(Math.max(newDist, minDist), maxDist);

    // new camera position = target - forward * newDist
    vec3.scale(forward, forward, newDist);
    vec3.subtract(cam.position, cam.target, forward);
}

function createPlanet(gl, orientation)
{
    for (let i=0; i<directions.length; ++i)
    {
        const direction = directions[i];

        const color = debugSettings.debugFaces ? faceColors[i] : colorSettings.planetColor;
        let terrainFace = new TerrainFace(planetSettings.resolution, direction);
        terrainFace.constructMesh(gl, color);

        renderContext.meshes.push(new MeshInstance(terrainFace.mesh, [0, 0, -4], quat.clone(orientation), [1, 1, 1]));
    }
}

function OnSettingsChanged()
{
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl");

    const orientation = renderContext.meshes.length > 0 ? renderContext.meshes[0].orientation : quat.create();
    renderContext.meshes = [];
    createPlanet(gl, orientation);
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
    varying highp vec3 vLocalPos;
    varying highp vec3 vWorldPos;

    void main(void) {


      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

      vNormal = normalize(uNormalMatrix * aVertexNormal);
      vColor = aVertexColor;
      vHeight = length(aVertexPosition.xyz); // distance from center = height
      vLocalPos = aVertexPosition.xyz;
      vWorldPos = (uModelViewMatrix * aVertexPosition).xyz; // in world space
    }
  `;

    const fsSource = `
    precision highp float;

    varying highp vec3 vNormal;
    varying lowp vec4 vColor;
    varying highp float vHeight;
    varying highp vec3 vWorldPos;
    varying highp vec3 vLocalPos;

    // uniforms
    uniform float uWaterLevel;    // e.g., 0.95
    uniform vec3 uCameraPos;      // camera position in world space
    uniform float uTime;          // time in seconds for animation

    // --- Simplex noise functions for terrain/waves/clouds ---
    // GLSL Simplex Noise 3D
    // Author: Ian McEwan, Ashima Arts
    // https://github.com/ashima/webgl-noise

    vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
    }

    vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
    }

    float snoise(vec3 v) { 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    // Permutations
    i = mod289(i); 
    vec4 p = permute( permute( permute( 
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients
    float n_ = 1.0/7.0; // N=7
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // mod 7*7

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );  

    vec4 x = x_ *ns.x + ns.y;
    vec4 y = y_ *ns.x + ns.y;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    // Normalise gradients
    vec4 norm = taylorInvSqrt( vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)) );
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix contributions
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {

        // ---- Lighting ----
        vec3 N = normalize(vNormal);
        vec3 L = normalize(vec3(0.85, 0.8, 0.75)); // directional light
        vec3 V = normalize(uCameraPos - vWorldPos);
        vec3 H = normalize(L + V);

        // Phong lighting
        float lambert = max(dot(N, L), 0.0);
        vec3 diffuse = vec3(1.0) * lambert;
        float spec = pow(max(dot(N, H), 0.0), 32.0);
        vec3 specular = vec3(spec) * 0.2;

        // --- Terrain Noise (FBM) ---
        float terrainNoise = 0.0;
        float amp = 2.5;
        float freq = 2.0;
        for(int i=0;i<5;i++){
            terrainNoise += snoise(vLocalPos*freq)*amp;
            freq *= 2.0;
            amp *= 0.5;
        }

        // Continental shaping
        float continentMask = snoise(vLocalPos*0.5)*0.5 + 0.5;
        terrainNoise *= continentMask;

        float height = vHeight + terrainNoise*0.1;
        vec3 planetNormal = normalize(vLocalPos);
        float latitude = abs(planetNormal.y);

        // --- Terrain color by elevation ---
        vec3 baseTerrainColor = vColor.xyz;

        vec3 deepColor = vec3(0.1,0.2,0.05);
        vec3 midColor  = vec3(0.2,0.3,0.1);
        vec3 highColor = vec3(0.5,0.5,0.5);
        vec3 snowColor = vec3(1.0,1.0,1.0);


        baseTerrainColor = mix(baseTerrainColor, baseTerrainColor*0.6, smoothstep(uWaterLevel+0.01,uWaterLevel+0.09,height));
        baseTerrainColor = mix(baseTerrainColor, vec3(1.0), smoothstep(uWaterLevel+0.1,uWaterLevel+0.2,height)); // optional snow caps

        // start cooling after mid-latitudes
        float polarFactor = smoothstep(0.7, 0.85, latitude);

        vec3 coldTint = vec3(0.75, 0.85, 1.1);   // bluish cold tone
        vec3 polarTerrain = baseTerrainColor + coldTint;

        // blend based on latitude
        baseTerrainColor = mix(baseTerrainColor, polarTerrain, polarFactor * 0.7);

        // deserts
        float desertFactor = 1.0 - smoothstep(0.2, 0.4, latitude);
        float desertMask = clamp(snoise(vLocalPos*1.5)*1.5 + 0.5, 0.0, 1.0);

        vec3 desertTerrain = vec3(0.7, 0.6, 0.1);
        baseTerrainColor = mix(baseTerrainColor, desertTerrain, desertFactor * desertMask * 2.0);
        //baseTerrainColor = vec3(desertMask);

        // ---- Water ----
        vec3 waterColor = vec3(0.0, 0.3, 0.5);

        // Smooth land/water transition
        float t = smoothstep(uWaterLevel - 0.01, uWaterLevel, vHeight);
        vec3 baseColor = mix(waterColor, baseTerrainColor, t);

        // --- Layered water waves (local space) ---
        vec3 flowDir = normalize(vec3(1.0,0.0,0.5));
        float wave1 = snoise(vLocalPos*20.0 + flowDir*uTime*0.3) * 8.2;
        float wave2 = snoise(vLocalPos*50.0 - flowDir*uTime*0.5) * 4.1;
        float wave3 = snoise(vLocalPos*100.0 + flowDir*uTime*1.2) * 1.05;
        vec3 waterNormal = normalize(N + vec3(0.0, wave1 + wave2 + wave3, 0.0));

        // --- Fresnel + specular reflection ---
        if(vHeight < uWaterLevel){
            float fresnel = pow(1.0 - dot(waterNormal,V),3.0);
            float specWater = pow(max(dot(waterNormal,H),0.0),64.0);
            vec3 specularWater = vec3(specWater)*0.5;
            baseColor += specularWater*fresnel;

            // approximate sky reflection
            vec3 reflectedColor = mix(waterColor, vec3(0.4,0.6,1.0), fresnel);
            baseColor = mix(baseColor, reflectedColor, fresnel*0.2);
        }

        if(vHeight > uWaterLevel - 0.005)
        {
            // Beaches
            float beach = clamp(snoise(vLocalPos*1.0 + 100.3) * 8.0, 0.0, 1.0);

            if(vHeight < uWaterLevel + 0.005) {
                baseColor = mix(baseColor, vec3(0.7, 0.6, 0.1), beach);
            }

            //gl_FragColor = vec4(vec3(beach), 1.0);
        }

        // Snow
        float wave = snoise(vLocalPos * 10.0 + uTime * 0.15) * 0.8;
        vec3 waveNormal = normalize(N + vec3(0.0, wave, 0.0));
        if(vHeight > (uWaterLevel + 0.05)) {
            float fresnel = pow(1.0 - dot(waveNormal, V), 3.0);
            //baseColor = mix(baseColor, vec3(1.0, 1.0, 1.0), 0.5);
        }

        // ---- Atmosphere / rim ----
        float rim = clamp(1.0 - dot(N, V), 0.0, 1.0);
        rim = pow(rim, 2.0); // adjust softness
        vec3 rimColor = vec3(0.4, 0.6, 1.0);
        baseColor = mix(baseColor, rimColor, rim * 0.75);

        // ---- Combine with lighting ----
        vec3 lighting = vec3(0.05) + diffuse + specular; // ambient + diffuse + spec
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
            time: gl.getUniformLocation(shaderProgram, "uTime"),
            
        },
    };

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.
    
    // Draw the scene
    let extraRotationX = 0;
    let extraRotationY = 0;
    let then = 0;

    // Draw the scene repeatedly
    function render(now)
    {
        now *= 0.001; // convert to seconds
        renderContext.deltaTime = now - then;
        then = now;
        renderContext.elapsedTime += renderContext.deltaTime;

        drawScene(gl, programInfo, renderContext.meshes, renderContext.elapsedTime);

        for (let i=0; i<directions.length; ++i)
        {
            let orientation = renderContext.meshes[i].orientation;

            const spin = quat.create();
            quat.setAxisAngle(spin, [0,1,0], renderContext.deltaTime * 0.1);
            quat.multiply(orientation, spin, orientation);

            const rotX = quat.create();
            const rotY = quat.create();

            quat.setAxisAngle(rotX, [1,0,0], extraRotationY);
            quat.setAxisAngle(rotY, [0,1,0], extraRotationX);

            const drag = quat.create();
            quat.multiply(drag, rotY, rotX);

            // Drag in world space
            quat.multiply(orientation, drag, orientation);

            quat.normalize(orientation, orientation);
        }

        extraRotationX = 0;
        extraRotationY = 0;
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    let pressed = false;
    canvas.onmousedown = () => { pressed = true; }
    canvas.onmouseup = () => { pressed = false; }
    canvas.onmousemove = (e) => {
        if (pressed)
        {
            extraRotationX += e.movementX * 0.005;
            extraRotationY += e.movementY * 0.005;
        }
    }
    canvas.addEventListener("wheel", (event) => {
        event.preventDefault(); // prevent scrolling the page
        const zoomAmount = event.deltaY * 0.002;
        zoomCamera(zoomAmount);
    });
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
        createSlider(section, "Elevation", noiseSetting.elevation, (e) => { noiseSetting.elevation = e.target.valueAsNumber; OnParamsChanged(); });

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
        planetSettings.shapeProvider.noiseSettings.push(new NoiseSettings(0.2, 0.2, 0, 0.2));
        addNoiseOption(planetSettings.shapeProvider.noiseSettings[planetSettings.shapeProvider.noiseSettings.length - 1]);
        OnParamsChanged();
    };

    for (let noiseSetting of planetSettings.shapeProvider.noiseSettings)
    {
        addNoiseOption(noiseSetting);
    }
}


function AdaptCanvas()
{
    const canvas = document.getElementById("canvas");
    const grid = document.body;
    grid.classList.remove("portrait");
    
    const height = document.documentElement.clientHeight;
    const width = document.documentElement.clientWidth;
    if (width > height)
    {
        // Landscape
        canvas.width = width / 2 - 25;
        canvas.height = width / 2 - 25;
    }
    else
    {
        // Portrait
        canvas.width = width - 25;
        canvas.height = width - 25;
        grid.classList.add("portrait");
    }
}

AdaptCanvas();

noise.seed(Math.random());

// Randomize params
//document.getElementById("planet-color").value = `#${Math.floor(Math.random()*16777215).toString(16)}`

OnParamsChanged();
Render();

initNoiseUI();