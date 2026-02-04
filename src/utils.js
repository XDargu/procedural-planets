

class Utils
{
    static GetPointOnPlanet(pointOnUnitsphere)
    {
        let elevation = 0;

        for (let noiseSetting of planetSettings.shapeProvider.noiseSettings)
        {
            const scale = noiseSetting.scale;
            const offset = noiseSetting.offset;

            if (scale > 0)
            {
                const elevationOctave = noise.perlin3(
                    (pointOnUnitsphere[0] + offset) / scale,
                    (pointOnUnitsphere[1] + offset) / scale,
                    (pointOnUnitsphere[2] + offset) / scale);

                elevation += elevationOctave * noiseSetting.intensity;
            }
        }

        const minValue = 0.1;
        elevation = Math.max(0, elevation - minValue);

        return vec3.scale(pointOnUnitsphere, pointOnUnitsphere, planetSettings.radius + elevation);
    }

    static GetColorOnPlanet(pointOnPlanet, color)
    {
        if (debugSettings.debugFaces)
            return color;

        //if (vec3.length(pointOnPlanet) < planetSettings.radius + 0.01)
            //return Utils.hexToRgba01("#2d58d7");

        return color;
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