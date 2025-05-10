import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

class VisualEffects {
    constructor(scene) {
        this.scene = scene;
        this.trailPoints = []; // Stores all points for the current shot's arc
        this.maxTrailPoints = 200; // Max points for a single arc (safety cap)
        this.trailGeometry = null;
        this.trailLine = null;
        this.landingMarkers = [];
        // this.trailColors is no longer initialized here, but in update/reset
        this.initializeTrail();
    }

    initializeTrail() {
        this.trailGeometry = new LineGeometry();
        // Initialize with empty data, but enough buffer for maxTrailPoints
        this.trailGeometry.setPositions(new Float32Array(this.maxTrailPoints * 3));
        this.trailGeometry.setColors(new Float32Array(this.maxTrailPoints * 3));

        this.trailMaterial = new LineMaterial({
            // color: 0x3399ff, // Base color, vertexColors will override
            linewidth: 3, // Let's start with 0.1, can be adjusted
            transparent: true,
            opacity: 0.9,    // Overall opacity
            vertexColors: true,
            dashed: false,
            depthTest: true,
            polygonOffset: true,
            polygonOffsetFactor: -0.1,
            polygonOffsetUnits: 1.0
        });
        this.trailMaterial.resolution.set(window.innerWidth, window.innerHeight);

        this.trailLine = new Line2(this.trailGeometry, this.trailMaterial);
        this.trailLine.computeLineDistances();
        this.scene.add(this.trailLine);
        this.trailLine.visible = false;
    }

    // Called when a new shot begins or hole changes
    resetTrail() {
        this.trailPoints = [];
        if (this.trailLine) {
            this.trailLine.visible = false;
            // Clear out old geometry data by setting empty (or zeroed) buffers
            const emptyPositions = new Float32Array(this.maxTrailPoints * 3);
            const emptyColors = new Float32Array(this.maxTrailPoints * 3);
            this.trailGeometry.setPositions(emptyPositions);
            this.trailGeometry.setColors(emptyColors);
            this.trailLine.computeLineDistances(); // Important after geometry change
            
            // Force a complete reset of the trail line
            this.trailLine.geometry.dispose();
            this.trailGeometry = new LineGeometry();
            this.trailGeometry.setPositions(new Float32Array(this.maxTrailPoints * 3));
            this.trailGeometry.setColors(new Float32Array(this.maxTrailPoints * 3));
            this.trailLine.geometry = this.trailGeometry;
            this.trailLine.computeLineDistances();
        }
    }

    // Main update loop called every frame
    update(ballPosition, ballVelocity) {
        const isBallMoving = ballVelocity && ballVelocity.lengthSq() > 0.01; // Use lengthSq for performance

        if (isBallMoving) {
            if (this.trailPoints.length < this.maxTrailPoints) {
                this.trailPoints.push(ballPosition.clone());
            }

            if (this.trailPoints.length > 1) { // Need at least 2 points for a line
                const currentArcPositions = new Float32Array(this.maxTrailPoints * 3);
                const currentArcColors = new Float32Array(this.maxTrailPoints * 3);
                
                const numActualPoints = this.trailPoints.length;

                for (let i = 0; i < numActualPoints; i++) {
                    const point = this.trailPoints[i];
                    currentArcPositions[i * 3] = point.x;
                    currentArcPositions[i * 3 + 1] = point.y;
                    currentArcPositions[i * 3 + 2] = point.z;

                    // Color fade: Start (e.g., brighter/more opaque blue) to End (e.g., dimmer/less opaque blue)
                    const progress = i / (numActualPoints -1); // 0 at start, 1 at end

                    // Example: Fade from a slightly brighter blue to a darker/more transparent blue
                    // Start Color (more opaque, slightly lighter blue)
                    const r_start = 0.3, g_start = 0.6, b_start = 1.0;
                    // End Color (less opaque or darker blue)
                    const r_end = 0.1, g_end = 0.3, b_end = 0.7;

                    currentArcColors[i * 3]     = r_start * (1 - progress) + r_end * progress;
                    currentArcColors[i * 3 + 1] = g_start * (1 - progress) + g_end * progress;
                    currentArcColors[i * 3 + 2] = b_start * (1 - progress) + b_end * progress;
                }

                // Fill remaining buffer with last point's data if fewer than maxTrailPoints
                // This is a common practice to ensure the buffer is fully populated for LineGeometry
                for (let i = numActualPoints; i < this.maxTrailPoints; i++) {
                    if (numActualPoints > 0) {
                         currentArcPositions[i*3] = this.trailPoints[numActualPoints-1].x;
                         currentArcPositions[i*3+1] = this.trailPoints[numActualPoints-1].y;
                         currentArcPositions[i*3+2] = this.trailPoints[numActualPoints-1].z;
                         currentArcColors[i*3]   = currentArcColors[(numActualPoints-1)*3];
                         currentArcColors[i*3+1] = currentArcColors[(numActualPoints-1)*3+1];
                         currentArcColors[i*3+2] = currentArcColors[(numActualPoints-1)*3+2];
                    } else { // Should not happen if length > 1 check is there
                         currentArcPositions[i*3] = currentArcPositions[i*3+1] = currentArcPositions[i*3+2] = 0;
                         currentArcColors[i*3] = currentArcColors[i*3+1] = currentArcColors[i*3+2] = 0;
                    }
                }


                this.trailGeometry.setPositions(currentArcPositions);
                this.trailGeometry.setColors(currentArcColors);
                this.trailLine.computeLineDistances(); // Crucial for Line2
                this.trailMaterial.needsUpdate = true; // May not be needed if geometry changes, but safe
                this.trailLine.visible = true;
            }
        } else {
            // Ball has stopped
            // No need for landing marker logic anymore
        }
    }

    // showLandingMarker(position) {
    //     // Create ring geometry
    //     const ringGeometry = new THREE.RingGeometry(0.5, 1.2, 32);
    //     const ringMaterial = new THREE.MeshBasicMaterial({
    //         color: 0xff0000,
    //         side: THREE.DoubleSide,
    //         transparent: true,
    //         opacity: 0.8
    //     });

    //     // Create ring mesh
    //     const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    //     ring.rotation.x = -Math.PI / 2;
    //     ring.position.set(position.x, position.y + 0.05, position.z);
    //     this.scene.add(ring);

    //     // Store reference to marker
    //     this.landingMarkers.push({
    //         mesh: ring,
    //         createdAt: performance.now()
    //     });

    //     // Fade out and remove after 2 seconds
    //     setTimeout(() => {
    //         const fadeOutDuration = 1500; // 1.5 seconds
    //         const startTime = performance.now();
    //         const startOpacity = ringMaterial.opacity;

    //         const fadeOut = () => {
    //             const elapsed = performance.now() - startTime;
    //             const progress = Math.min(elapsed / fadeOutDuration, 1);
    //             ringMaterial.opacity = startOpacity * (1 - progress);

    //             if (progress < 1) {
    //                 requestAnimationFrame(fadeOut);
    //             } else {
    //                 this.scene.remove(ring);
    //                 this.landingMarkers = this.landingMarkers.filter(marker => marker.mesh !== ring);
    //             }
    //         };

    //         requestAnimationFrame(fadeOut);
    //     }, 1000);
    // }
}

export { VisualEffects }; 