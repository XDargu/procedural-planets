class Utils
{
    static GetPointOnPlanet(pointOnUnitsphere)
    {
        return vec3.scale(pointOnUnitsphere, pointOnUnitsphere, planetSettings.radius);
    }

    static rgbToHex(color)
    {
        return "#" + componentToHex(color[0]) + componentToHex(color[1]) + componentToHex(color[2]);
    }

    static hexToRgba01(hex)
    {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
            1.0
        ] : [0,0,0,0];
    }
}