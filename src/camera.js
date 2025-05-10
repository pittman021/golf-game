/**
 * Camera Controller Module
 * 
 * This module manages the game's camera system, providing both gameplay and free-roam camera modes.
 * It handles camera positioning, transitions, and effects during gameplay.
 * 
 * Features:
 * - Dynamic camera following during shots
 * - Smooth transitions between positions
 * - Free-roam mode for course exploration
 * - Automatic aiming camera positioning
 * - Shot effect animations
 * - Terrain-aware height adjustment
 */

import * as THREE from 'three';

// Camera states
const CAMERA_STATE = {
    AIMING: 'aiming',
    LAUNCH: 'launch',
    LANDING: 'landing',
    RESET: 'reset'
};

class CameraController {
    /**
     * Creates a new CameraController instance
     * @param {THREE.Scene} scene - The Three.js scene to attach the camera to
     */
    constructor(scene) {
        // Store scene reference for adding visual elements
        this.scene = scene;
        
        // Create a perspective camera with optimized settings for golf gameplay
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    
        // Set initial camera position for first hole
        this.camera.position.set(0, 100, 300);
    
        // Vectors for smooth camera transitions
        this.targetPosition = new THREE.Vector3().copy(this.camera.position);
        this.targetLookAt = new THREE.Vector3(0, 0, 0);
    
        // Shot effect properties for dynamic camera movement during shots
        this.shotEffectActive = false;
        this.shotEffectProgress = 0;
        this.shotEffectDuration = 1.0;
        this.shotEffectStartTime = 0;
        this.shotEffectScale = 2.5;

        // Free roam mode configuration
        this.isFreeRoam = false;
        this.moveSpeed = 20;          // Units per second
        this.rotationSpeed = 0.03;    // Radians per frame
        this.fixedHeight = 20;        // Height above terrain in free roam
        this.courseBounds = {         // Limits for free roam movement
            minX: -300,
            maxX: 300,
            minZ: -150,
            maxZ: 150
        };

        // Camera state management
        this.currentState = CAMERA_STATE.AIMING;
        this.launchTimer = 0;
        this.launchDuration = 2.0; // 2 seconds for launch phase
        this.launchPosition = new THREE.Vector3();
        this.launchLookAt = new THREE.Vector3();
        this.hasShotStarted = false;  // Track if the actual shot has started
        this.launchStartTime = 0;
        
        // Landing phase vectors
        this.landingDirection = new THREE.Vector3();
        this.landingStartPosition = new THREE.Vector3();
    }

    /**
     * Initiates the camera shot effect animation
     * Creates a dynamic camera movement during shots
     */
    startShotEffect() {
        this.shotEffectActive = true;
        this.shotEffectProgress = 0;
        this.shotEffectStartTime = performance.now() / 1000;
    }

    /**
     * Toggles free-roam camera mode
     * In free-roam mode, player can explore the course freely
     */
    toggleFreeRoam() {
        this.isFreeRoam = !this.isFreeRoam;
        if (this.isFreeRoam) {
            // Store current position when entering free roam
            this.freeRoamPosition = this.camera.position.clone();
            this.freeRoamLookAt = this.targetLookAt.clone();
        }
        console.log('Free roam mode:', this.isFreeRoam ? 'enabled' : 'disabled');
    }

    /**
     * Handles camera movement in free-roam mode
     * @param {number} deltaTime - Time since last frame
     */
    handleFreeRoamMovement(deltaTime) {
        if (!this.isFreeRoam) return;

        // Get current direction vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

        // Calculate movement
        const moveDistance = this.moveSpeed * deltaTime;
        const newPosition = this.camera.position.clone();

        // Handle keyboard input
        if (this.keys) {
            if (this.keys.ArrowUp) {
                newPosition.add(forward.multiplyScalar(moveDistance));
            }
            if (this.keys.ArrowDown) {
                newPosition.add(forward.multiplyScalar(-moveDistance));
            }
            if (this.keys.ArrowLeft) {
                // Rotate camera left
                this.camera.rotateY(this.rotationSpeed);
            }
            if (this.keys.ArrowRight) {
                // Rotate camera right
                this.camera.rotateY(-this.rotationSpeed);
            }
        }

        // Clamp position to course bounds
        newPosition.x = Math.max(this.courseBounds.minX, Math.min(this.courseBounds.maxX, newPosition.x));
        newPosition.z = Math.max(this.courseBounds.minZ, Math.min(this.courseBounds.maxZ, newPosition.z));

        // Get terrain height at new position
        if (window.terrain) {
            try {
                const terrainHeight = window.terrain.getHeightAt(newPosition.x, newPosition.z);
                // Ensure camera stays at fixed height above terrain
                newPosition.y = terrainHeight + this.fixedHeight;
            } catch (e) {
                console.warn('Error getting terrain height:', e);
                // If we can't get terrain height, maintain current height
                newPosition.y = this.camera.position.y;
            }
        } else {
            // If terrain is not available, maintain current height
            newPosition.y = this.camera.position.y;
        }

        // Update camera position
        this.camera.position.copy(newPosition);
        this.targetPosition.copy(newPosition);

        // Update look target
        const lookDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.targetLookAt.copy(newPosition).add(lookDirection.multiplyScalar(10));
    }

    /**
     * Updates camera position and orientation based on game state
     * @param {THREE.Vector3} ballPosition - Current position of the golf ball
     * @param {THREE.Vector3} ballVelocity - Current velocity of the golf ball
     * @param {number} aimAngle - Current aiming angle in radians
     * @param {boolean} isShooting - Whether a shot is in progress
     */
    update(ballPosition, ballVelocity, aimAngle = Math.PI/2, isShooting = false) {
        if (this.isFreeRoam) {
            this.handleFreeRoamMovement(1/60);
            return;
        }

        if (!ballPosition) return;

        // Determine if ball is moving significantly
        const isBallMoving = ballVelocity && ballVelocity.length() > 0.1;
        const isBallSlow = ballVelocity && ballVelocity.length() < 0.5;

        // State machine for camera behavior
        switch (this.currentState) {
            case CAMERA_STATE.AIMING:
                if (isShooting && !this.hasShotStarted) {
                    // Store current camera position and look-at for launch phase
                    this.launchPosition.copy(this.camera.position);
                    // Get actual camera direction
                    const direction = new THREE.Vector3();
                    this.camera.getWorldDirection(direction);
                    this.launchLookAt.copy(this.camera.position.clone().add(direction.multiplyScalar(50)));
                    this.hasShotStarted = true;
                } else if (this.hasShotStarted && ballVelocity.length() > 2) {
                    this.currentState = CAMERA_STATE.LAUNCH;
                    this.launchTimer = 0;
                    this.launchStartTime = performance.now();
                }
                this.handleAimingCamera(ballPosition, aimAngle);
                break;

            case CAMERA_STATE.LAUNCH:
                this.launchTimer += 1/60; // Assuming 60fps
                // Keep camera at launch position and direction
                this.targetPosition.copy(this.launchPosition);
                this.targetLookAt.copy(this.launchLookAt);
                
                // Only transition to landing phase after minimum duration
                if (this.launchTimer >= this.launchDuration) {
                    this.currentState = CAMERA_STATE.LANDING;
                    // Store the landing direction when transitioning
                    if (ballVelocity) {
                        this.landingDirection.copy(ballVelocity).normalize();
                        this.landingStartPosition.copy(ballPosition);
                    }
                }
                break;

            case CAMERA_STATE.LANDING:
                if (!isBallMoving) {
                    this.currentState = CAMERA_STATE.RESET;
                    this.hasShotStarted = false;  // Reset shot state
                }
                this.handleLandingCamera(ballPosition);
                break;

            case CAMERA_STATE.RESET:
                this.currentState = CAMERA_STATE.AIMING;
                break;
        }

        // Smooth camera movement using lerp
        this.camera.position.lerp(this.targetPosition, 0.05);
        
        // Smooth look-at transition
        const currentLookAt = new THREE.Vector3();
        currentLookAt.copy(this.camera.position);
        currentLookAt.add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10));
        currentLookAt.lerp(this.targetLookAt, 0.05);
        this.camera.lookAt(currentLookAt);
    }

    /**
     * Handles window resize events
     * @param {number} width - New window width
     * @param {number} height - New window height
     */
    resize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    handleAimingCamera(ballPosition, aimAngle) {
        const cameraDistance = 6;  // Distance behind the ball
        const cameraHeight = 4;    // Height above the ball
        
        // Calculate camera position based on aim angle
        const dirX = Math.cos(aimAngle);
        const dirZ = -Math.sin(aimAngle);
        
        // Position camera behind the ball based on aim angle
        this.targetPosition.set(
            ballPosition.x - dirX * cameraDistance,
            ballPosition.y + cameraHeight,
            ballPosition.z - dirZ * cameraDistance
        );
        
        // Look in the direction of aim
        this.targetLookAt.set(
            ballPosition.x + dirX * 50,
            ballPosition.y - 1,
            ballPosition.z + dirZ * 50
        );
    }

    handleLandingCamera(ballPosition) {
        const cameraDistance = 8;  // Slightly further back
        const cameraHeight = 12;   // Higher up for better view
        
        // Use the stored landing direction instead of current velocity
        this.targetPosition.set(
            ballPosition.x - this.landingDirection.x * cameraDistance,
            ballPosition.y + cameraHeight,
            ballPosition.z - this.landingDirection.z * cameraDistance
        );
        
        // Look down at the ball
        this.targetLookAt.copy(ballPosition);
        this.targetLookAt.y -= 2; // Look slightly below the ball to see bounce
    }
}

// Export the CameraController class
export { CameraController };
