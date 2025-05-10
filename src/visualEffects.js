import * as THREE from 'three';

class VisualEffects {
    constructor(scene) {
        this.scene = scene;
        this.trailPoints = [];
        this.maxTrailPoints = 60;
        this.trailGeometry = null;
        this.trailLine = null;
        this.landingMarkers = [];
        this.initializeTrail();
    }

    initializeTrail() {
        // Create trail geometry
        this.trailGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxTrailPoints * 3);
        this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Create trail material with glow effect
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8,
            linewidth: 2
        });

        // Create the trail line
        this.trailLine = new THREE.Line(this.trailGeometry, trailMaterial);
        this.scene.add(this.trailLine);
        this.trailLine.visible = false;
    }

    updateTrail(ballPosition) {
        if (!this.trailLine) return;

        // Add new position to trail points
        this.trailPoints.unshift(ballPosition.clone());
        
        // Keep only the last maxTrailPoints positions
        if (this.trailPoints.length > this.maxTrailPoints) {
            this.trailPoints.pop();
        }

        // Update geometry
        const positions = this.trailGeometry.attributes.position.array;
        for (let i = 0; i < this.trailPoints.length; i++) {
            const point = this.trailPoints[i];
            positions[i * 3] = point.x;
            positions[i * 3 + 1] = point.y;
            positions[i * 3 + 2] = point.z;
        }
        this.trailGeometry.attributes.position.needsUpdate = true;
    }

    showLandingMarker(position) {
        // Create ring geometry
        const ringGeometry = new THREE.RingGeometry(0.5, 1.2, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });

        // Create ring mesh
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(position.x, position.y + 0.05, position.z);
        this.scene.add(ring);

        // Store reference to marker
        this.landingMarkers.push({
            mesh: ring,
            createdAt: performance.now()
        });

        // Fade out and remove after 2 seconds
        setTimeout(() => {
            const fadeOutDuration = 1500; // 1.5 seconds
            const startTime = performance.now();
            const startOpacity = ringMaterial.opacity;

            const fadeOut = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / fadeOutDuration, 1);
                ringMaterial.opacity = startOpacity * (1 - progress);

                if (progress < 1) {
                    requestAnimationFrame(fadeOut);
                } else {
                    this.scene.remove(ring);
                    this.landingMarkers = this.landingMarkers.filter(marker => marker.mesh !== ring);
                }
            };

            requestAnimationFrame(fadeOut);
        }, 1000);
    }

    resetTrail() {
        this.trailPoints = [];
        if (this.trailLine) {
            this.trailLine.visible = false;
        }
    }

    update(ballPosition, ballVelocity) {
        const isBallMoving = ballVelocity && ballVelocity.length() > 0.1;

        if (isBallMoving) {
            this.trailLine.visible = true;
            this.updateTrail(ballPosition);
        } else if (this.trailLine.visible) {
            // Ball just stopped, show landing marker
            this.showLandingMarker(ballPosition);
            this.resetTrail();
        }
    }
}

export { VisualEffects }; 