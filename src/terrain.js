/**
 * Terrain Class
 * 
 * This class handles the generation and management of the golf course terrain.
 * It creates a 3D mesh representing the golf course with different surface types:
 * - Tee box: Flat elevated area where players start
 * - Fairway: Main playing area with gentle terrain
 * - Green: Flat area around the hole
 * - Bunkers: Depressed sandy areas
 * - Rough: Natural terrain with more dramatic elevation changes
 * 
 * The terrain is generated based on hole configurations that specify:
 * - Course dimensions and resolution
 * - Positions of key features (tee, green, bunkers)
 * - Fairway path and width
 * - Tree positions
 * 
 * The class also handles:
 * - Height map generation for ball physics
 * - Surface type mapping for friction calculations
 * - Hole creation and depression
 * - Tree placement and scattering
 */

import * as THREE from 'three';

class Terrain {
    /**
     * Creates a new Terrain instance
     * @param {THREE.Scene} scene - The Three.js scene to add the terrain to
     * @param {ModelManager} modelManager - Manager for creating course objects
     * @param {Object} holeConfig - Configuration for the current hole
     */
    constructor(scene, modelManager, holeConfig) {
        if (!scene) throw new Error('Scene is required for Terrain');
        this.scene = scene;
        this.modelManager = modelManager;
        this.holeConfig = holeConfig;
        this.width = holeConfig.width;
        this.depth = holeConfig.depth;
        this.resolution = holeConfig.resolution;

        this.geometry = new THREE.PlaneGeometry(this.width, this.depth, this.resolution, this.resolution);
        this.geometry.rotateX(-Math.PI / 2);

        this.material = new THREE.MeshStandardMaterial({ 
            vertexColors: true,
            flatShading: true,
            roughness: 0.8,
            metalness: 0.1,
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;

        // Initialize empty arrays for heightMap and surfaceMap
        this.heightMap = [];
        this.surfaceMap = [];

        this.generateTerrain();
    }

    /**
     * Generates the terrain mesh based on the hole configuration
     * Creates different surface types and applies appropriate heights and colors
     */
    generateTerrain() {
        const pos = this.geometry.attributes.position;
        const colors = [];

        const { tee, green, fairway, bunkers, trees } = this.holeConfig;
        const teeBoxSize = 20;

        // Reset heightMap and surfaceMap
        this.heightMap = [];
        this.surfaceMap = [];

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);

            let height;
            let color;
            let surface;

            const dxGreen = x - green.x;
            const dzGreen = z - green.z;
            const distToGreen = Math.sqrt(dxGreen * dxGreen + dzGreen * dzGreen);

            // Calculate raw height based on noise for rough terrain
            const rawHeight = 
                Math.sin(x * 0.05) * 3 +
                Math.cos(z * 0.05) * 3 +
                Math.sin(x * 0.1 + z * 0.1) * 2;

            // Calculate raw height for fairway using less dramatic terrain
            const fairwayRawHeight = 
                Math.sin(x * 0.01) * 2 +
                Math.cos(z * 0.02) * 1.5;

            // Check if point is in bunker
            const inBunker = bunkers.some(b => {
                const dx = x - b.x;
                const dz = z - b.z;
                return Math.sqrt(dx * dx + dz * dz) < b.radius;
            });

            if (inBunker) {
                height = -1;
                color = new THREE.Color(0xE6C995);
                surface = 'bunker';
            } else if (distToGreen < green.radius) {
                // Green transition
                const greenTransitionWidth = 4;
                if (distToGreen > green.radius - greenTransitionWidth) {
                    const t = this.smoothstep(0, 1, (green.radius - distToGreen) / greenTransitionWidth);
                    height = green.elevation - (green.elevation - t) * 0.3;
                } else {
                    height = green.elevation;
                }
                const checker = ((Math.floor(x * 2) + Math.floor(z * 2)) % 2 === 0);
                color = new THREE.Color(checker ? '#8eff8e' : '#77dd77');
                surface = 'green';
            } else if (
                x > tee.x - teeBoxSize / 2 && x < tee.x + teeBoxSize / 2 &&
                z > tee.z - teeBoxSize / 2 && z < tee.z + teeBoxSize / 2
            ) {
                height = tee.elevation;
                color = new THREE.Color('#328a58');
                surface = 'tee';
            } else if (this.isNearPath(x, z, fairway.path, fairway.width)) {
                // Inside fairway or transitional area
                const distFromPath = this.getDistanceFromPath(x, z, fairway.path);
                const fairwayFlatWidth = fairway.width * 0.4;
                
                if (distFromPath < fairwayFlatWidth) {
                    height = fairwayRawHeight * 0.3;
                } else {
                    const t = (distFromPath - fairwayFlatWidth) / (fairway.width/2 - fairwayFlatWidth);
                    const ease = this.smoothstep(0, 1, t);
                    height = fairwayRawHeight * 0.3 * (1 - ease) + rawHeight * ease;
                }
                color = new THREE.Color('#5cb762');
                surface = 'fairway';
            } else {
                height = rawHeight;
                color = new THREE.Color('#2a4e30');
                surface = 'rough';
            }

            pos.setY(i, height);
            this.heightMap.push(height);
            this.surfaceMap.push(surface);
            colors.push(color.r, color.g, color.b);
        }

        pos.needsUpdate = true;

        this.geometry.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(colors, 3)
        );
        this.geometry.computeVertexNormals();

        // Add trees based on configuration
        if (trees && trees.positions) {
            trees.positions.forEach(pos => {
                this.addTree(pos.x, pos.z);
            });
        }
    }

    /**
     * Creates a depression in the terrain for the golf hole
     * @param {number} x - X coordinate of the hole
     * @param {number} z - Z coordinate of the hole
     */
    createHole(x, z) {
        // Create actual hole depression in the terrain
        const holeRadius = 0.3;  // Standard golf hole radius
        const holeDepth = 0.5;   // Moderate depth
        const outerRadius = 0.5; // Radius for the lip of the hole
        
        // Modify terrain vertices around the hole position
        const vertices = this.geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const vertexX = vertices[i];
            const vertexZ = vertices[i + 2];
            
            // Calculate distance from hole center
            const distance = Math.sqrt((vertexX - x) ** 2 + (vertexZ - z) ** 2);
            
            // If vertex is within hole radius, lower it
            if (distance < holeRadius) {
                vertices[i + 1] -= holeDepth; // Lower the vertex by hole depth
                
                // Find the index in heightMap for this vertex and update it
                const vertexIndex = i / 3;
                if (vertexIndex < this.heightMap.length) {
                    this.heightMap[vertexIndex] -= holeDepth;
                }
            }
            // Create a sharper transition at the lip of the hole
            else if (distance < outerRadius) {
                const t = (distance - holeRadius) / (outerRadius - holeRadius);
                // Use a cubic ease-out curve for sharper edge
                const edgeFactor = 1 - t * t * (3 - 2 * t);
                const depression = holeDepth * edgeFactor; // Full transition for sharper edge
                
                vertices[i + 1] -= depression;
                
                // Update heightMap
                const vertexIndex = i / 3;
                if (vertexIndex < this.heightMap.length) {
                    this.heightMap[vertexIndex] -= depression;
                }
            }
        }
        
        // Update the geometry
        this.geometry.computeVertexNormals();
        this.geometry.attributes.position.needsUpdate = true;
    }

    /**
     * Gets the height of the terrain at a specific (x, z) position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {number} The height at the specified position
     */
    getHeightAt(x, z) {
        const halfW = this.width / 2;
        const halfD = this.depth / 2;
        
        // Check if position is outside terrain bounds
        if (x < -halfW || x > halfW || z < -halfD || z > halfD) {
            return 0;
        }
        
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor(((x + halfW) / this.width) * this.resolution);
        const gridZ = Math.floor(((z + halfD) / this.depth) * this.resolution);
        
        // Calculate fractional part for interpolation
        const fracX = ((x + halfW) / this.width) * this.resolution - gridX;
        const fracZ = ((z + halfD) / this.depth) * this.resolution - gridZ;
        
        // Get indices for the four surrounding vertices
        const rowWidth = this.resolution + 1;
        
        // Indices of the four corners
        const idx00 = gridZ * rowWidth + gridX;                 // Bottom-left
        const idx10 = gridZ * rowWidth + Math.min(gridX + 1, this.resolution);  // Bottom-right
        const idx01 = Math.min(gridZ + 1, this.resolution) * rowWidth + gridX;  // Top-left
        const idx11 = Math.min(gridZ + 1, this.resolution) * rowWidth + Math.min(gridX + 1, this.resolution); // Top-right
        
        // Safely get heights (with bounds checking)
        const h00 = idx00 >= 0 && idx00 < this.heightMap.length ? this.heightMap[idx00] : 0;
        const h10 = idx10 >= 0 && idx10 < this.heightMap.length ? this.heightMap[idx10] : 0;
        const h01 = idx01 >= 0 && idx01 < this.heightMap.length ? this.heightMap[idx01] : 0;
        const h11 = idx11 >= 0 && idx11 < this.heightMap.length ? this.heightMap[idx11] : 0;
        
        // Bilinear interpolation
        const h0 = h00 * (1 - fracX) + h10 * fracX;
        const h1 = h01 * (1 - fracX) + h11 * fracX;
        return h0 * (1 - fracZ) + h1 * fracZ;
    }

    /**
     * Gets the surface type at a specific (x, z) position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {string} The surface type ('tee', 'fairway', 'green', 'bunker', or 'rough')
     */
    getSurfaceTypeAt(x, z) {
        const halfW = this.width / 2;
        const halfD = this.depth / 2;
        
        // Check if position is outside terrain bounds
        if (x < -halfW || x > halfW || z < -halfD || z > halfD) {
            return 'rough';
        }
        
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor(((x + halfW) / this.width) * this.resolution);
        const gridZ = Math.floor(((z + halfD) / this.depth) * this.resolution);
        
        // Get index for the nearest vertex
        const rowWidth = this.resolution + 1;
        const idx = gridZ * rowWidth + gridX;
        
        if (idx >= 0 && idx < this.surfaceMap.length) {
            return this.surfaceMap[idx];
        } else {
            return 'rough';
        }
    }

    /**
     * Public method to create the golf hole
     * @param {number} x - X coordinate of the hole
     * @param {number} z - Z coordinate of the hole
     */
    createGolfHole(x, z) {
        this.createHole(x, z);
    }

    /**
     * Checks if a point is near a path defined by waypoints
     * @param {number} x - X coordinate to check
     * @param {number} z - Z coordinate to check
     * @param {Array} path - Array of waypoints defining the path
     * @param {number} width - Width of the path
     * @returns {boolean} True if the point is near the path
     */
    isNearPath(x, z, path, width) {
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            
            // Calculate distance from point to line segment
            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const length = Math.sqrt(dx * dx + dz * dz);
            
            if (length === 0) continue;
            
            const t = Math.max(0, Math.min(1, ((x - p1.x) * dx + (z - p1.z) * dz) / (length * length)));
            const projX = p1.x + t * dx;
            const projZ = p1.z + t * dz;
            
            const dist = Math.sqrt((x - projX) * (x - projX) + (z - projZ) * (z - projZ));
            if (dist < width / 2) return true;
        }
        return false;
    }

    /**
     * Calculates the distance from a point to a path
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @param {Array} path - Array of waypoints defining the path
     * @returns {number} The minimum distance to the path
     */
    getDistanceFromPath(x, z, path) {
        let minDist = Infinity;
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            
            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const length = Math.sqrt(dx * dx + dz * dz);
            
            if (length === 0) continue;
            
            const t = Math.max(0, Math.min(1, ((x - p1.x) * dx + (z - p1.z) * dz) / (length * length)));
            const projX = p1.x + t * dx;
            const projZ = p1.z + t * dz;
            
            const dist = Math.sqrt((x - projX) * (x - projX) + (z - projZ) * (z - projZ));
            minDist = Math.min(minDist, dist);
        }
        return minDist;
    }

    /**
     * Smoothstep function for terrain transitions
     * @param {number} edge0 - Lower edge
     * @param {number} edge1 - Upper edge
     * @param {number} x - Input value
     * @returns {number} Smoothly interpolated value
     */
    smoothstep(edge0, edge1, x) {
        // Clamp x to 0..1 range
        x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        // Evaluate polynomial
        return x * x * (3 - 2 * x);
    }

    /**
     * Adds a tree to the terrain at the specified position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     */
    addTree(x, z) {
        if (!this.scene) return;
        const y = this.getHeightAt(x, z);
        const tree = this.createTree();
        tree.position.set(x, y, z);
        this.scene.add(tree);
    }

    createTree() {
        const trunkGeometry = new THREE.CylinderGeometry(0.8, 1.2, 6, 8);
        const leavesGeometry = new THREE.ConeGeometry(3.5, 7, 8);

        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.0,
        });
        const leavesMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228B22,
            roughness: 0.7,
            metalness: 0.0,
        });

        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.castShadow = true;
        leaves.receiveShadow = true;

        leaves.position.y = 6;

        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(leaves);

        return tree;
    }
}

export { Terrain };
