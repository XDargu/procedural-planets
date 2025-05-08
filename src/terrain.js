class TerrainFace
{
    constructor(resolution, localUp)
    {
        this.resolution = resolution;
        this.localUp = localUp;
        this.axisA = [localUp[1], localUp[2], localUp[0]];
        this.mesh = null;
        this.axisB = vec3.create();

        vec3.cross(this.axisB, localUp, this.axisA);
    }

    constructMesh(gl, color)
    {
        let positions = new Array(this.resolution * this.resolution * 3);
        let indices = new Array( (this.resolution - 1) * (this.resolution - 1) * 6);        
        let colors = new Array( (this.resolution - 1) * (this.resolution - 1) * 6);

        let posIndex = 0;
        let triIndex = 0;
        let colorIndex = 0;

        for (let y=0; y<this.resolution; ++y)
        {
            for (let x=0; x<this.resolution; ++x)
            {
                const i = x + y * this.resolution;

                const percent = [x / (this.resolution - 1), y / (this.resolution - 1)];

                const displX = (percent[0] - 0.5) * 2;
                const displY = (percent[1] - 0.5) * 2;

                const pointOnUnitCube = 
                [
                    this.localUp[0] + displX * this.axisA[0] + displY * this.axisB[0],
                    this.localUp[1] + displX * this.axisA[1] + displY * this.axisB[1],
                    this.localUp[2] + displX * this.axisA[2] + displY * this.axisB[2],
                ];

                const pointOnUnitSphere = vec3.normalize(vec3.create(), pointOnUnitCube);
                const pointOnPlanet = Utils.GetPointOnPlanet(pointOnUnitSphere);
                const colorOnPlanet = Utils.GetColorOnPlanet(pointOnPlanet, color);

                positions[posIndex] = pointOnPlanet[0];
                positions[posIndex + 1] = pointOnPlanet[1];
                positions[posIndex + 2] = pointOnPlanet[2];

                colors[colorIndex] = colorOnPlanet[0];
                colors[colorIndex + 1] = colorOnPlanet[1];
                colors[colorIndex + 2] = colorOnPlanet[2];
                colors[colorIndex + 3] = colorOnPlanet[3];

                colorIndex += 4;

                posIndex += 3;

                if (x != this.resolution - 1 && y != this.resolution - 1)
                {
                    indices[triIndex] = i;
                    indices[triIndex + 1] = i + this.resolution + 1;
                    indices[triIndex + 2] = i + this.resolution;

                    indices[triIndex + 3] = i;
                    indices[triIndex + 4] = i + 1;
                    indices[triIndex + 5] = i + this.resolution + 1;

                    triIndex += 6;
                }
            }
        }

        this.mesh = new Mesh(gl, positions, indices, colors);
    }
}