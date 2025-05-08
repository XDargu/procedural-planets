class Utils
{
    static GetPointOnPlanet(pointOnUnitsphere)
    {
        return vec3.scale(pointOnUnitsphere, pointOnUnitsphere, planetSettings.radius);
    }
}