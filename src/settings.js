// Global planet generation settings

class NoiseSettings
{
    constructor(scale, intensity, offset, elevation)
    {
        this.scale = scale;
        this.intensity = intensity;
        this.offset = offset;
        this.elevation = elevation;
    }
}

class ShapeProvider
{
    constructor()
    {
        this.noiseSettings = [];

        this.noiseSettings.push(new NoiseSettings(1.28, 1.27, 1.06, 0.6));
        this.noiseSettings.push(new NoiseSettings(0.3, 0.11, 0, 0.47));
        this.noiseSettings.push(new NoiseSettings(0.08, 0.03, 0, 0.47));
    }
}

let colorSettings = {
    planetColor: [1.0, 1.0, 1.0, 1.0],
}

let planetSettings = {
    radius: 1,
    resolution: 50,
    shapeProvider: new ShapeProvider(),
}

let debugSettings = {
    showWireframe: false,
    debugFaces: false,
    spherity: 1.0,
}

function OnParamsChanged()
{
    planetSettings.radius = document.getElementById("planet-radius").valueAsNumber;
    planetSettings.resolution = document.getElementById("planet-resolution").valueAsNumber;
    
    colorSettings.planetColor = Utils.hexToRgba01(document.getElementById("planet-color").value);

    debugSettings.showWireframe = document.getElementById("debug-wireframe").checked;
    debugSettings.debugFaces = document.getElementById("debug-faces").checked;
    debugSettings.spherity = document.getElementById("debug-spherity").valueAsNumber;

    OnSettingsChanged();
}