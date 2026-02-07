class MeshInstance
{
    constructor(mesh, position, orientation, scale)
    {
        this.mesh = mesh;
        this.position = position;
        this.orientation = orientation; // quat
        this.scale = scale;
    }
}