import * as THREE from 'three';

class Terrain {
    constructor(width = 600, depth = 300, resolution = 128) {
        this.width = width;
        this.depth = depth;
        this.resolution = resolution;

        this.geometry = new THREE.PlaneGeometry(width, depth, resolution, resolution);
        this.geometry.rotateX(-Math.PI / 2); // Make it horizontal

        this.material = new THREE.MeshStandardMaterial({ 
            vertexColors: true,
            flatShading: true,
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.receiveShadow = true;

        this.heightMap = [];  // Store height per vertex
        this.surfaceMap = []; // Store terrain type per vertex

        this.generateTerrain();
    }

    // generateTerrain() {
    //     const pos = this.geometry.attributes.position;
    //     const colors = [];

    //     for (let i = 0; i < pos.count; i++) {
    //         const x = pos.getX(i);
    //         const z = pos.getZ(i);

    //         // Rolling hills
    //         const height = (
    //             Math.sin(x * 0.05) * 2 +
    //             Math.cos(z * 0.05) * 2 +
    //             Math.sin(x * 0.1 + z * 0.1) * 1
    //         );

    //         pos.setY(i, height);
    //         this.heightMap.push(height);

    //         // Assign surface type based on X-axis
    //         let color;
    //         let surface;

    //         if (x >= 210 && x <= 290) {
    //             color = new THREE.Color(0x336633); // green
    //             surface = 'green';
    //         } else if (x >= -250 && x <= 250) {
    //             color = new THREE.Color(0x669966); // fairway
    //             surface = 'fairway';
    //         } else {
    //             color = new THREE.Color(0x996633); // rough
    //             surface = 'rough';
    //         }

    //         colors.push(color.r, color.g, color.b);
    //         this.surfaceMap.push(surface);
    //     }

    //     pos.needsUpdate = true;

    //     this.geometry.setAttribute(
    //         'color',
    //         new THREE.Float32BufferAttribute(colors, 3)
    //     );
    //     this.geometry.computeVertexNormals();
    // }

    // Get height of terrain at a specific (x, z) position
    
    generateTerrain() {
        const pos = this.geometry.attributes.position;
        const colors = [];
    
        // Key locations
        const teeX = -250;
        const greenX = 250;
        const centerZ = 0;
    
        const fairwayWidth = 40;
        const teeBoxSize = 20;
    
        // Define a few bunkers (x, z, radius)
        const bunkers = [
            { x: 240, z: -20, radius: 15 },
            { x: 260, z: 25, radius: 10 }
        ];
    
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
    
            let height;
            let color;
            let surface;
    
            // Bunker check first
            const inBunker = bunkers.some(b => {
                const dx = x - b.x;
                const dz = z - b.z;
                return Math.sqrt(dx * dx + dz * dz) < b.radius;
            });
    
            if (inBunker) {
                height = -1; // Sunken sand trap
                color = new THREE.Color(0xE2C290); // Sand color
                surface = 'bunker';
            }
    
            // Tee box (flat square)
            else if (
                x > teeX - teeBoxSize/2 && x < teeX + teeBoxSize/2 &&
                z > centerZ - teeBoxSize/2 && z < centerZ + teeBoxSize/2
            ) {
                height = 2; // Elevated flat area
                color = new THREE.Color(0x3a5f0b); // Dark green
                surface = 'tee';
            }
    
            // Fairway (strip between tee and green)
            else if (x > teeX && x < greenX && Math.abs(z - centerZ) < fairwayWidth / 2) {
                height = (
                    Math.sin(x * 0.01) * 1 +
                    Math.cos(z * 0.02) * 1
                );
                color = new THREE.Color(0x669966); // Fairway green
                surface = 'fairway';
            }
    
            // Green (flat zone near greenX)
            else if (x > greenX - 20 && x < greenX + 20 && Math.abs(z) < 20) {
                height = 1; // Slightly raised but mostly flat
                color = new THREE.Color(0x336633); // Green
                surface = 'green';
            }
    
            // Rough everywhere else
            else {
                height = (
                    Math.sin(x * 0.05) * 2 +
                    Math.cos(z * 0.05) * 2
                );
                color = new THREE.Color(0x996633); // Brownish rough
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
    }
    
    
    
    getHeightAt(x, z) {
        const halfW = this.width / 2;
        const halfD = this.depth / 2;

        const fx = ((x + halfW) / this.width) * this.resolution;
        const fz = ((z + halfD) / this.depth) * this.resolution;

        const ix = Math.floor(fx);
        const iz = Math.floor(fz);

        const idx = iz * (this.resolution + 1) + ix;

        if (idx >= 0 && idx < this.heightMap.length) {
            return this.heightMap[idx];
        } else {
            return 0;
        }
    }

    // Return surface type at given x/z
    getSurfaceTypeAt(x, z) {
        const halfW = this.width / 2;
        const halfD = this.depth / 2;

        const fx = ((x + halfW) / this.width) * this.resolution;
        const fz = ((z + halfD) / this.depth) * this.resolution;

        const ix = Math.floor(fx);
        const iz = Math.floor(fz);

        const idx = iz * (this.resolution + 1) + ix;

        if (idx >= 0 && idx < this.surfaceMap.length) {
            return this.surfaceMap[idx];
        } else {
            return 'rough'; // fallback
        }
    }
}

export { Terrain };
