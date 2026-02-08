function drawMeshInstance(gl, programInfo, meshInstance, viewMatrix)
{
    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelMatrix = mat4.create();

    // Now move the drawing position a bit to where we want to
    // start drawing the square.
    mat4.translate(
        modelMatrix, // destination matrix
        modelMatrix, // matrix to translate
        meshInstance.position,
    ); // amount to translate

    // rotation from quaternion
    const rotMatrix = mat4.create();
    mat4.fromQuat(rotMatrix, meshInstance.orientation);
    mat4.multiply(modelMatrix, modelMatrix, rotMatrix);

    mat4.scale(
        modelMatrix, // destination matrix
        modelMatrix, // matrix to scale
        meshInstance.scale, // amount to scale
    );

    const modelViewMatrix = mat4.create();
    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

    const normalMatrix = mat3.create();
    mat3.fromMat4(normalMatrix, modelViewMatrix); // extract upper-left 3x3
    mat3.invert(normalMatrix, normalMatrix);      // invert
    mat3.transpose(normalMatrix, normalMatrix);   // transpose

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix,
    );

    gl.uniformMatrix3fv(
        programInfo.uniformLocations.normalMatrix,
        false,
        normalMatrix,
      );

    {
        const vertexCount = meshInstance.mesh.indices.length;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        const elementType = debugSettings.showWireframe ? gl.LINES : gl.TRIANGLES;
        gl.drawElements(elementType, vertexCount, type, offset);
    }
}

function drawScene(gl, programInfo, meshes, elapsedTime) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    const fieldOfView = (45 * Math.PI) / 180; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    const viewMatrix = mat4.create();
    mat4.lookAt(
        viewMatrix,
        renderContext.camera.position,
        renderContext.camera.target,
        renderContext.camera.up
    );

    // note: glMatrix always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    const drawMeshes = (meshes) =>
    {
        for (let meshInstance of meshes)
        {
            // Tell WebGL how to pull out the positions from the position
            // buffer into the vertexPosition attribute.
            setPositionAttribute(gl, meshInstance.mesh.buffers, programInfo);
            setColorAttribute(gl, meshInstance.mesh.buffers, programInfo);
            setNormalAttribute(gl, meshInstance.mesh.buffers, programInfo);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshInstance.mesh.buffers.indices);

            // Tell WebGL to use our program when drawing
            gl.useProgram(programInfo.program);

            // Set the shader uniforms
            gl.uniformMatrix4fv(
                programInfo.uniformLocations.projectionMatrix,
                false,
                projectionMatrix,
            );

            gl.uniform1f(programInfo.uniformLocations.clouds, meshInstance.type == "clouds" ? 1 : 0);
            gl.uniform1f(programInfo.uniformLocations.time, elapsedTime);
            gl.uniform1f(programInfo.uniformLocations.waterLevel, planetSettings.radius + 0.01);
            gl.uniform3f(programInfo.uniformLocations.cameraPos,
                renderContext.camera.position[0],
                renderContext.camera.position[1],
                renderContext.camera.position[2]
            );

            drawMeshInstance(gl, programInfo, meshInstance, viewMatrix);
        }
    }

    // Sort based in transparency
    const opaque = meshes.filter((m) => m.type == "planet" );
    const transparent = meshes.filter((m) => m.type == "clouds" );

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    drawMeshes(opaque);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    drawMeshes(transparent);
    gl.depthMask(true);
}

// Tell WebGL how to pull out the positions from the position
// buffer into the vertexPosition attribute.
function setPositionAttribute(gl, buffers, programInfo) {
    const numComponents = 3; // pull out 2 values per iteration
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

// Tell WebGL how to pull out the colors from the color buffer
// into the vertexColor attribute.
function setColorAttribute(gl, buffers, programInfo) {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
}

function setNormalAttribute(gl, buffers, programInfo) {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexNormal,
        numComponents,
        type,
        normalize,
        stride,
        offset,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
}