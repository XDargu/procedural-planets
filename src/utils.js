class Utils
{
    static GetPointOnPlanet(pointOnUnitsphere)
    {
        let elevation = 0;

        {
            const scale = 0.1;
            const intensity = 0.1;
            const elevationOctave = noise.perlin3(pointOnUnitsphere[0] / scale, pointOnUnitsphere[1] / scale, pointOnUnitsphere[2] / scale);
            elevation += elevationOctave * intensity;
        }

        {
            const scale = 0.5;
            const intensity = 0.5;
            const elevationOctave = noise.perlin3(pointOnUnitsphere[0] / scale, pointOnUnitsphere[1] / scale, pointOnUnitsphere[2] / scale);
            elevation += elevationOctave * intensity;
        }

        const minValue = 0.1;
        elevation = Math.max(0, elevation - 0.1);

        return vec3.scale(pointOnUnitsphere, pointOnUnitsphere, planetSettings.radius + elevation);
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