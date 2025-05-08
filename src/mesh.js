class Mesh
{
    constructor(gl, positions, indices, colors)
    {
        this.positions = positions;
        this.indices = indices;
        this.colors = colors;
        this.normals = [];
        this.calculateNormals();

        this.buffers = initBuffers(gl, this);
    }

    calculateNormals()
    {
        let tempNormals = new Array(this.positions.length / 3);
        for (let i = 0; i < tempNormals.length; i++)
        {
            tempNormals[i] = [0, 0, 0];
        }

        for (let i = 0; i < this.indices.length; i += 3)
        {
            const i0 = this.indices[i];
            const i1 = this.indices[i + 1];
            const i2 = this.indices[i + 2];

            const v0 = this.positions.slice(i0 * 3, i0 * 3 + 3);
            const v1 = this.positions.slice(i1 * 3, i1 * 3 + 3);
            const v2 = this.positions.slice(i2 * 3, i2 * 3 + 3);

            const vector1 = vec3.subtract(vec3.create(), v1, v0);
            const vector2 = vec3.subtract(vec3.create(), v2, v0);

            const faceNormal = vec3.cross(vec3.create(), vector1, vector2);
            vec3.normalize(faceNormal, faceNormal);

            vec3.add(tempNormals[i0], tempNormals[i0], faceNormal);
            vec3.add(tempNormals[i1], tempNormals[i1], faceNormal);
            vec3.add(tempNormals[i2], tempNormals[i2], faceNormal);
        }

        for (let i = 0; i < tempNormals.length; i++)
        {
            vec3.normalize(tempNormals[i], tempNormals[i]);
        }

        this.normals = new Array(this.positions.length);
        for (let i = 0; i < tempNormals.length; i++)
        {
            const n = tempNormals[i];
            this.normals[i * 3] = n[0];
            this.normals[i * 3 + 1] = n[1];
            this.normals[i * 3 + 2] = n[2];
        }
    }
}


function MakeCube(gl)
{
    const positions = [
        // Front face
        -1.0, -1.0, 1.0,   1.0, -1.0, 1.0,   1.0, 1.0, 1.0,   -1.0, 1.0, 1.0,

        // Back face
        -1.0, -1.0, -1.0,   -1.0, 1.0, -1.0,   1.0, 1.0, -1.0,   1.0, -1.0, -1.0,

        // Top face
        -1.0, 1.0, -1.0,   -1.0, 1.0, 1.0,   1.0, 1.0, 1.0,   1.0, 1.0, -1.0,

        // Bottom face
        -1.0, -1.0, -1.0,   1.0, -1.0, -1.0,   1.0, -1.0, 1.0,   -1.0, -1.0, 1.0,

        // Right face
        1.0, -1.0, -1.0,   1.0, 1.0, -1.0,   1.0, 1.0, 1.0,   1.0, -1.0, 1.0,

        // Left face
        -1.0, -1.0, -1.0,   -1.0, -1.0, 1.0,   -1.0, 1.0, 1.0,   -1.0, 1.0, -1.0,
    ];

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.

    const indices = [
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // back
        8, 9, 10, 8, 10, 11,   // top
        12, 13, 14, 12, 14, 15,   // bottom
        16, 17, 18, 16, 18, 19,   // right
        20, 21, 22, 20, 22, 23,   // left
    ];

    const faceColors = [
        [1.0, 1.0, 1.0, 1.0], // Front face: white
        [1.0, 0.0, 0.0, 1.0], // Back face: red
        [0.0, 1.0, 0.0, 1.0], // Top face: green
        [0.0, 0.0, 1.0, 1.0], // Bottom face: blue
        [1.0, 1.0, 0.0, 1.0], // Right face: yellow
        [1.0, 0.0, 1.0, 1.0], // Left face: purple
    ];

    // Convert the array of colors into a table for all the vertices.

    let colors = [];

    for (let j = 0; j < faceColors.length; ++j)
    {
        const c = faceColors[j];
        // Repeat each color four times for the four vertices of the face
        colors = colors.concat(c, c, c, c);
    }

    return new Mesh(gl, positions, indices, colors);
}