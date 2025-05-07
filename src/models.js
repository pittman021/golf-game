import * as THREE from 'three';

class ModelManager {
    constructor(scene) {
        this.scene = scene;
    }

    createBall() {

        const geometry = new THREE.SphereGeometry(0.12, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0.1,
            emissive: 0x333333,
            emissiveIntensity: 0.2
        });
       
        const ball = new THREE.Mesh(geometry, material);
    
        this.scene.add(ball);
       
        this.ball = ball;
        return ball;
    }

    createTree() {
        // Trunk height ~2.5m, leaves height ~2m
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2.5, 8);
        const leavesGeometry = new THREE.ConeGeometry(1, 2, 8);
        
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        
        leaves.position.y = 2;
        
        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(leaves);
        
        this.scene.add(tree);
        return tree;
    }

    createGolfer() {
        // Golfer height ~1.7m
        const bodyGeometry = new THREE.BoxGeometry(0.5, 1.2, 0.3); // Torso
        const headGeometry = new THREE.SphereGeometry(0.15, 16, 16); // Head
        
        const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        const body = new THREE.Mesh(bodyGeometry, material);
        const head = new THREE.Mesh(headGeometry, material);
        
        head.position.y = 1.35; // Adjusted for new body height
        
        const golfer = new THREE.Group();
        golfer.add(body);
        golfer.add(head);
        
        this.scene.add(golfer);
        return golfer;
    }

    createFlagPin(x = 0, z = 0, getHeightAt = () => 0) {
        const y = getHeightAt(x, z);
        
        // Create the pole - making it taller (from 2 to 3 units)
        const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(0, 1.5, 0); // 1.5 is half the height
        
        // Create the flag with cloth-like material - making it larger
        const flagGeometry = new THREE.PlaneGeometry(0.8, 0.5, 5, 5); // More segments for animation
        const flagMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0.1
        });
        const flag = new THREE.Mesh(flagGeometry, flagMaterial);
        
        // Position the flag at the top of the pole (adjusted for taller pole)
        flag.position.set(0.4, 2.6, 0); 
        flag.rotation.y = Math.PI / 2;
        
        // Store original vertices for flag animation
        flag.userData.originalVertices = [];
        const positionAttribute = flag.geometry.getAttribute('position');
        for (let i = 0; i < positionAttribute.count; i++) {
            flag.userData.originalVertices.push(new THREE.Vector3(
                positionAttribute.getX(i),
                positionAttribute.getY(i),
                positionAttribute.getZ(i)
            ));
        }
        
        // Animation function for the flag
        flag.userData.animate = function(windDirection, windSpeed) {
            const time = Date.now() * 0.001;
            const positionAttribute = this.geometry.getAttribute('position');
            
            // Apply wind effect to vertices
            for (let i = 0; i < positionAttribute.count; i++) {
                const vertex = this.userData.originalVertices[i];
                
                // Only animate vertices that are part of the flag (not the edges attached to the pole)
                if (vertex.x > 0.01) {
                    // Create wind effect based on position in the flag
                    const waveX = Math.sin(time * 2 + vertex.y * 3) * 0.01 * windSpeed * (vertex.x / 0.8);
                    const waveZ = Math.cos(time * 3 + vertex.x * 2) * 0.01 * windSpeed * (vertex.x / 0.8);
                    
                    // Update position with wind influence
                    positionAttribute.setX(i, vertex.x + waveX);
                    positionAttribute.setY(i, vertex.y);
                    positionAttribute.setZ(i, vertex.z + waveZ);
                }
            }
            
            positionAttribute.needsUpdate = true;
            this.geometry.computeVertexNormals();
        };
    
        // Create visible hole mesh - using a flat disc instead of a cylinder
        const holeGeometry = new THREE.CircleGeometry(0.3, 24);
        const holeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: true
        });
        const holeMesh = new THREE.Mesh(holeGeometry, holeMaterial);
        holeMesh.rotation.x = -Math.PI / 2; // face upward
        holeMesh.position.set(0, 0.01, 0); // Slightly above ground level
        holeMesh.renderOrder = 2; // Higher renderOrder to ensure it renders on top
        
        // Add a contrasting ring around the hole
        const holeRingGeometry = new THREE.RingGeometry(0.3, 0.45, 32);
        const holeRingMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            side: THREE.DoubleSide,
            depthWrite: false,
            transparent: true,
            opacity: 0.9
        });
        const holeRing = new THREE.Mesh(holeRingGeometry, holeRingMaterial);
        holeRing.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        holeRing.position.set(0, 0.012, 0); // Slightly above the hole disc
        holeRing.renderOrder = 3; // Higher render order
        
        // Group everything together
        const flagGroup = new THREE.Group();
        flagGroup.add(pole);
        flagGroup.add(flag);
        flagGroup.add(holeMesh);
        flagGroup.add(holeRing);
        
        // Position the entire group
        flagGroup.position.set(x, y, z);
        
        // Store animation reference
        flagGroup.userData.animateFlag = function(windDirection, windSpeed) {
            // Find the flag in the group and animate it
            if (this.children && Array.isArray(this.children)) {
                this.children.forEach(child => {
                    if (child.userData && child.userData.animate) {
                        child.userData.animate(windDirection, windSpeed);
                    }
                });
            }
        };
    
        this.scene.add(flagGroup);
        return flagGroup;
    }
    
    getBall() {
        return this.ball;
    }
}

export { ModelManager }; 