class MeshInstance
{
    constructor(mesh, position, orientation, scale, type)
    {
        this.mesh = mesh;
        this.position = position;
        this.orientation = orientation; // quat
        this.scale = scale;
        this.type = type;
    }
}