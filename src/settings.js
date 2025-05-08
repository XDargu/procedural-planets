// Global planet generation settings

let colorSettings = {
    planetColor: [1.0, 1.0, 1.0, 1.0],
}

let planetSettings = {
    radius: 1,
    resolution: 50,
}

let debugSettings = {
    showWireframe: false,
    debugFaces: false,
}

function OnParamsChanged()
{
    planetSettings.radius = document.getElementById("planet-radius").valueAsNumber;
    planetSettings.resolution = document.getElementById("planet-resolution").valueAsNumber;
    
    colorSettings.planetColor = Utils.hexToRgba01(document.getElementById("planet-color").value);

    debugSettings.showWireframe = document.getElementById("debug-wireframe").checked;
    debugSettings.debugFaces = document.getElementById("debug-faces").checked;

    OnSettingsChanged();
}