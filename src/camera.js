// camera.js - simplified for terrain demo
import * as THREE from 'three';

class CameraController {
    constructor(scene) {
        // Store scene reference
        this.scene = scene;
        
        // Create a perspective camera with sensible defaults
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    
        // Current target for smooth transitions
        this.targetPosition = new THREE.Vector3(0, 100, 300);
        this.targetLookAt = new THREE.Vector3(0, 0, 0);
        
        // Shot effect properties
        this.shotEffectActive = false;
        this.shotEffectProgress = 0;
        this.shotEffectDuration = 1.0;
        this.shotEffectStartTime = 0;
        this.shotEffectScale = 2.5;
        
        // Log camera setup
        console.log('Camera initialized:', {
            position: this.camera.position.clone(),
            lookAt: this.targetLookAt.clone(),
            fov: this.camera.fov,
            aspect: this.camera.aspect,
            near: this.camera.near,
            far: this.camera.far
        });
    }

    initialize() {
        // Create ground grid
        this.createGroundGrid();
        // Create flag pin
        this.createFlagPin();
    }

    createGroundGrid() {
        if (!this.scene) {
            console.error('Scene not initialized');
            return;
        }
        const gridSize = 200;
        const divisions = 20;
        const gridHelper = new THREE.GridHelper(gridSize, divisions);
        gridHelper.position.y = -0.1; // Slightly below ground to prevent z-fighting
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }

    createFlagPin() {
        if (!this.scene) {
            console.error('Scene not initialized');
            return;
        }
        // Create flag pole
        const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        
        // Create flag
        const flagGeometry = new THREE.PlaneGeometry(1, 0.5);
        const flagMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            side: THREE.DoubleSide
        });
        const flag = new THREE.Mesh(flagGeometry, flagMaterial);
        flag.position.set(0.5, 1.5, 0);
        flag.rotation.y = Math.PI / 2;
        
        // Group pole and flag
        const flagPin = new THREE.Group();
        flagPin.add(pole);
        flagPin.add(flag);
        
        // Position at hole
        flagPin.position.set(130, 0, 0);
        this.scene.add(flagPin);
    }

    startShotEffect() {
        this.shotEffectActive = true;
        this.shotEffectProgress = 0;
        this.shotEffectStartTime = performance.now() / 1000;
    }

    update(ballPosition, ballVelocity, aimAngle = Math.PI/2, isShooting = false) {
        if (!ballPosition) return;
        
        // Default camera settings
        const cameraDistance = 6;
        const cameraHeight = 4;
        
        // Only follow the ball if it's moving significantly
        const isBallMoving = ballVelocity && ballVelocity.length() > 0.1;
        
        if (isBallMoving) {
            // When ball is moving, position camera behind the ball in its direction of movement
            const velocityDirection = ballVelocity.clone().normalize();
            
            // Set camera position behind the ball relative to its velocity
            const cameraOffset = new THREE.Vector3(
                -velocityDirection.x * cameraDistance,
                cameraHeight,
                -velocityDirection.z * cameraDistance
            );
            
            // Set target position
            this.targetPosition.copy(ballPosition).add(cameraOffset);
            
            // Set look target ahead of the ball
            this.targetLookAt.copy(ballPosition);
            this.targetLookAt.add(velocityDirection.multiplyScalar(10));
        } else {
            // When aiming, position camera behind the ball based on aim angle
            // For aimAngle = PI/2, camera should be looking along positive X-axis
            const dirX = Math.cos(aimAngle);
            const dirZ = -Math.sin(aimAngle); // Negative to match Three.js coordinate system
            
            // Set target position - position camera behind the ball
            this.targetPosition.set(
                ballPosition.x - dirX * cameraDistance,
                ballPosition.y + cameraHeight,
                ballPosition.z - dirZ * cameraDistance
            );
            
            // Look in the direction of aim - toward where the ball will go
            this.targetLookAt.set(
                ballPosition.x + dirX * 50,
                ballPosition.y - 1, // Look more downward
                ballPosition.z + dirZ * 50
            );
        }
        
        // Smooth camera movement
        this.camera.position.lerp(this.targetPosition, 0.05);
        
        // Create a temporary vector for the current lookAt
        const currentLookAt = new THREE.Vector3();
        currentLookAt.copy(this.camera.position);
        currentLookAt.add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10));
        
        // Smoothly transition the lookAt point
        currentLookAt.lerp(this.targetLookAt, 0.05);
        this.camera.lookAt(currentLookAt);
    }

    resize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
}

// Export at the end of the file
export { CameraController };
