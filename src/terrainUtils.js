/**
 * Removes bunkers that are too close to the green to avoid visual and terrain overlap.
 * @param {Object} holeConfig - The full hole configuration
 * @param {number} [buffer=2] - Extra padding between bunker and green edge
 */
export function nudgeConflictingBunkers(holeConfig, buffer = 2) {
    const { green, bunkers } = holeConfig;

    holeConfig.bunkers = bunkers.map(bunker => {
        const dx = bunker.x - green.x;
        const dz = bunker.z - green.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = bunker.radius + green.radius + buffer;

        if (dist < minDist) {
            const scale = minDist / dist;
            return {
                ...bunker,
                x: green.x + dx * scale,
                z: green.z + dz * scale
            };
        }

        return bunker;
    });
}


function applyTeeElevation(geometry, teeX) {
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        if (x < teeX + 5 && x > teeX - 5) {
            vertices[i + 1] += 1; // Raise the tee area by 1 unit
        }
    }
    geometry.attributes.position.needsUpdate = true;
}

function applyGreenSlope(geometry, greenX, greenZ) {
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        const distance = Math.sqrt((x - greenX) ** 2 + (z - greenZ) ** 2);
        if (distance < 10) {
            vertices[i + 1] += 0.5 * (10 - distance) / 10; // Create a slope that rises towards the green
        }
    }
    geometry.attributes.position.needsUpdate = true;
}

function applyBunkerMounding(geometry, bunkerCoords) {
    const vertices = geometry.attributes.position.array;
    bunkerCoords.forEach(({ x: bx, z: bz }) => {
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            const distance = Math.sqrt((x - bx) ** 2 + (z - bz) ** 2);
            if (distance < 5) {
                vertices[i + 1] += 0.3 * (5 - distance) / 5; // Create mounding around bunkers
            }
        }
    });
    geometry.attributes.position.needsUpdate = true;
}

function applyGreenHeight(geometry, greenX, greenZ, height) {
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        const distance = Math.sqrt((x - greenX) ** 2 + (z - greenZ) ** 2);
        if (distance < 15) { // Larger radius for the green area
            // Smooth transition to the green height
            const influence = Math.max(0, 1 - distance / 15);
            vertices[i + 1] += 5 * influence; // Use a realistic height (5 units) instead of 20
        }
    }
    geometry.attributes.position.needsUpdate = true;
}

function applyFairwaySlopeToGreen(geometry, greenX, greenZ, startX, slopeHeight) {
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];

        // Check if within the fairway region heading toward green
        if (x >= startX && x <= greenX) {
            const t = (x - startX) / (greenX - startX); // 0 to 1
            vertices[i + 1] += slopeHeight * t; // Gradually raise height
        }
    }
    geometry.attributes.position.needsUpdate = true;
}

/**
 * Applies color attributes to terrain geometry based on golf course zones
 * @param {THREE.BufferGeometry} geometry - The terrain geometry
 * @param {number} greenX - X coordinate of the green center
 * @param {number} greenZ - Z coordinate of the green center
 * @param {number} greenRadius - Radius of the green area
 * @param {number} fairwayWidth - Width of the fairway
 * @param {Array} bunkerCoords - Array of bunker coordinates [{x, z}, ...]
 * @param {number} bunkerRadius - Radius of bunker areas
 */
function applyTerrainColors(geometry, greenX, greenZ, greenRadius = 10, fairwayWidth = 40, bunkerCoords = [], bunkerRadius = 4) {
    // Create color attribute if it doesn't exist
    if (!geometry.attributes.color) {
        // Make sure we're using the Float32Array for color data (important for older THREE versions)
        const colorArray = new Float32Array(geometry.attributes.position.count * 3);
        // Use window.THREE to ensure global scope access
        const colorAttribute = new THREE.BufferAttribute(colorArray, 3);
        
        // Define colors for different terrain types
        const fairwayColor = new THREE.Color(0x57a773); // Light green
        const roughColor = new THREE.Color(0x2d5a27);   // Dark green
        const greenColor = new THREE.Color(0x6bbf59);   // Bright green
        const bunkerColor = new THREE.Color(0xD2B48C);  // Sand color
        
        // Apply colors to vertices based on position
        const vertices = geometry.attributes.position.array;
        
        for (let i = 0; i < geometry.attributes.position.count; i++) {
            const vertexIndex = i * 3;
            const colorIndex = i * 3;
            
            const x = vertices[vertexIndex];
            const z = vertices[vertexIndex + 2];
            
            // Distance to green center
            const distanceToGreen = Math.sqrt((x - greenX) ** 2 + (z - greenZ) ** 2);
            
            let color;
            if (distanceToGreen < greenRadius) {
                // Green area
                color = greenColor;
            } else if (Math.abs(z - greenZ) < fairwayWidth / 2) {
                // Fairway
                color = fairwayColor;
            } else {
                // Rough
                color = roughColor;
            }
            
            // Check if in bunker areas
            if (bunkerCoords && bunkerCoords.length > 0) {
                for (const bunker of bunkerCoords) {
                    const distanceToBunker = Math.sqrt((x - bunker.x) ** 2 + (z - bunker.z) ** 2);
                    if (distanceToBunker < bunkerRadius) {
                        color = bunkerColor;
                        break;
                    }
                }
            }
            
            // For THREE.js, we need to set the color components directly
            colorArray[colorIndex] = color.r;
            colorArray[colorIndex + 1] = color.g;
            colorArray[colorIndex + 2] = color.b;
        }
        
        // Set the color attribute
        geometry.setAttribute('color', colorAttribute);
    }
    
    // Make sure the color attribute is marked as needing update
    if (geometry.attributes.color) {
        geometry.attributes.color.needsUpdate = true;
    }
}

/**
 * Creates a visual representation of the terrain height profile as a line in the scene
 * @param {THREE.Scene} scene - The THREE.js scene to add the visual profile to
 * @param {THREE.BufferGeometry} terrainGeometry - The terrain geometry to visualize
 * @param {number} z - The z-coordinate for the visualization line
 * @param {number} sampleInterval - How many points to sample along x-axis
 * @param {number} heightScale - Scale factor for height visualization (helps exaggerate small differences)
 */
function createTerrainHeightVisualizer(scene, terrainGeometry, z = 0, sampleInterval = 10, heightScale = 1) {
    // Extract information about the terrain
    const vertices = terrainGeometry.attributes.position.array;
    
    // Find the x-range of the terrain
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }
    
    console.log("Terrain X range:", minX, "to", maxX);
    console.log("Terrain Y range:", minY, "to", maxY);
    
    // Sample points across the X-axis at the given Z value
    const numSamples = Math.max(10, Math.floor((maxX - minX) / sampleInterval));
    
    // Create a lookup of closest vertices
    const sampledPoints = [];
    
    for (let i = 0; i <= numSamples; i++) {
        const x = minX + (maxX - minX) * (i / numSamples);
        
        // Find the closest vertex to this (x, z) point
        let closestDist = Infinity;
        let closestY = 0;
        
        for (let j = 0; j < vertices.length; j += 3) {
            const vx = vertices[j];
            const vy = vertices[j + 1];
            const vz = vertices[j + 2];
            
            // Only consider vertices near our desired z coordinate
            if (Math.abs(vz - z) < 5) {
                const dist = Math.abs(vx - x);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestY = vy;
                }
            }
        }
        
        // Store this sampled point
        sampledPoints.push({ x, y: closestY, z });
    }
    
    // Create a visible line to show the height profile
    const lineGeometry = new THREE.BufferGeometry();
    const linePoints = [];
    
    sampledPoints.forEach(point => {
        // The visualization line will be offset in Z to be visible
        linePoints.push(
            point.x, 
            point.y * heightScale, // Scale height for better visibility
            point.z + 25 // Offset in Z direction to be visible
        );
    });
    
    // Create the buffer attribute for position
    lineGeometry.setAttribute(
        'position', 
        new THREE.Float32BufferAttribute(linePoints, 3)
    );
    
    // Create line material - bright red and wide for visibility
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 2 // Note: Line width beyond 1.0 only works in some browsers
    });
    
    // Create the line and add to scene
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    
    // Return the line object so it can be removed later if needed
    return line;
}

/**
 * Utility function to verify if terrain elevation is correctly translated to world coordinates
 * @param {THREE.Mesh} terrain - The terrain mesh
 * @param {THREE.Scene} scene - The scene containing the terrain
 */
function verifyTerrainToWorldMapping(terrain, scene) {
    if (!terrain || !terrain.geometry) {
        console.error("Invalid terrain for verification");
        return;
    }
    
    // Create test points at different heights in local coordinates
    const testPoints = [
        { name: "Origin", local: new THREE.Vector3(0, 0, 0) },
        { name: "Raised Point", local: new THREE.Vector3(0, 5, 0) },
        { name: "Green", local: new THREE.Vector3(250, 5, 0) },
        { name: "Tee", local: new THREE.Vector3(-250, 1, 0) }
    ];
    
    console.log("===== TERRAIN-TO-WORLD COORDINATE MAPPING =====");
    console.log("Terrain position:", terrain.position.x, terrain.position.y, terrain.position.z);
    console.log("Terrain rotation (radians):", terrain.rotation.x, terrain.rotation.y, terrain.rotation.z);
    console.log("Terrain rotation.x in degrees:", (terrain.rotation.x * 180 / Math.PI).toFixed(2));
    
    // Map each test point from local to world coordinates
    testPoints.forEach(point => {
        // Clone the point to avoid modifying the original
        const localPoint = point.local.clone();
        
        // Apply the terrain's matrix to transform to world coordinates
        const worldPoint = localPoint.clone().applyMatrix4(terrain.matrixWorld);
        
        console.log(`${point.name}: Local(${localPoint.x.toFixed(2)}, ${localPoint.y.toFixed(2)}, ${localPoint.z.toFixed(2)}) → World(${worldPoint.x.toFixed(2)}, ${worldPoint.y.toFixed(2)}, ${worldPoint.z.toFixed(2)})`);
    });
}

// Ensure utility functions are available globally
window.applyTeeElevation = applyTeeElevation;
window.applyGreenSlope = applyGreenSlope;
window.applyBunkerMounding = applyBunkerMounding;
window.applyGreenHeight = applyGreenHeight;
window.applyFairwaySlopeToGreen = applyFairwaySlopeToGreen;
window.applyTerrainColors = applyTerrainColors;
window.createTerrainHeightVisualizer = createTerrainHeightVisualizer;
window.verifyTerrainToWorldMapping = verifyTerrainToWorldMapping; 
window.nudgeConflictingBunkers = nudgeConflictingBunkers