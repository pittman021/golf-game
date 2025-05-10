import * as THREE from 'three';

class PhysicsEngine {
    constructor() {
        this.gravity = 7.5;
        // Base friction values for different surfaces
        this.friction = {
            fairway: 0.85,    // Base fairway friction
            rough: 0.80,      // Rough friction (unchanged)
            green: 0.95,      // Base green friction
            bunker: 0.65      // Bunker friction (unchanged)
        };
        
        // Velocity thresholds for friction transitions
        this.velocityThresholds = {
            green: {
                high: 15,     // Above this: high friction for approach shots
                low: 5        // Below this: low friction for putting
            },
            fairway: {
                high: 20,     // Above this: normal fairway friction
                low: 8        // Below this: higher friction for short shots
            }
        };
        
        // Friction values for different velocity ranges
        this.velocityBasedFriction = {
            green: {
                high: 0.95,   // High friction for approach shots
                low: 0.98     // Low friction for putting
            },
            fairway: {
                high: 0.85,   // Normal fairway friction
                low: 0.92     // Higher friction for short shots
            }
        };
        this.clubStats = {
            driver: {
                angle: 12,
                multiplier: 2.8    // Adjusted for longer distance
            },
            '5wood': {
                angle: 18,
                multiplier: 2.0    // Adjusted for longer distance
            },
            '7iron': {
                angle: 34,
                multiplier: 1.2    // Remains good
            },
            '9iron': {
                angle: 42,
                multiplier: 0.9    // Remains good
            },
            pitchingWedge: {
                angle: 46,
                multiplier: 0.7    // Remains good
            },
            sandWedge: {
                angle: 56,
                multiplier: 0.6    // No change for now
            },
            putter: {
                angle: 4,
                multiplier: 0.2    // No change for now
            }
        };
        
        this.ball = {
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            rotation: new THREE.Euler(),
            inAir: false,
            onGround: false
        };
        this.hole = {
            position: new THREE.Vector3(250, 0, 0),
            radius: 0.3
        };
        
        // Simplified wind state
        this.wind = {
            speed: 5, // Fixed base speed
            direction: Math.PI / 4, // Fixed direction (45 degrees)
            updateInterval: 2.0, // Update every 2 seconds
            lastUpdate: 0,
            forceScale: 0.1 // Scale down wind force to 10% of its value
        };
        
        // Store reference to terrain
        this.terrain = null;
        
        // Cache for club distances
        this.clubDistancesCache = null;
        this.maxPower = 20; // Store this as a class property
    }

    // Set terrain reference
    setTerrain(terrain) {
        this.terrain = terrain;
     
    }
    
    // Set hole position
    setHolePosition(position) {
        this.hole.position.copy(position);
      
    }

    /**
     * Calculates maximum distances for each club using a physics-based formula
     * instead of complex simulation.
     * 
     * The formula takes into account:
     * 1. Club's power multiplier - how much energy the club transfers
     * 2. Club's launch angle - lower angles produce more horizontal distance
     * 3. A base distance factor - calibrated for game units
     * 
     * @returns {Object} Map of club names to their maximum distances
     */
    calculateClubDistances() {
        if (this.clubDistancesCache) {
            return this.clubDistancesCache;
        }
        
        const clubs = Object.keys(this.clubStats);
        const distances = {}; // Initialize distances object

        const timeStep = 0.05; // Simulation time step
        const maxSimulationTime = 15; // Max seconds to simulate a shot to prevent infinite loops

        // Constants for initial velocity calculation (must match main.js -> takeShot() for full power)
        const minBaseShotVelocity = 1.0;
        const maxBaseShotVelocity = 60.0;
        const fullPowerValue = 1.0; // Represents 100% power input

        for (const club of clubs) {
            const stats = this.clubStats[club];
            let simulatedDistance = 0;

            // --- Initial Velocity Setup for Full Power (100%) ---
            const calculatedBaseVelocityAtFullPower = minBaseShotVelocity + fullPowerValue * (maxBaseShotVelocity - minBaseShotVelocity);
            // This is the velocity that would be passed to physicsEngine.calculateShot
            const initialVelocityForEngine = calculatedBaseVelocityAtFullPower;
            
            // Replicate the core of calculateShot to get initial velocity vector
            const radAngle = THREE.MathUtils.degToRad(stats.angle);
            const totalVelocityMagnitude = initialVelocityForEngine * stats.multiplier;
            
            const horizontalVelComponent = totalVelocityMagnitude * Math.cos(radAngle);
            const verticalVelComponent = totalVelocityMagnitude * Math.sin(radAngle);
            
            // Simulate shot as if aimed straight along positive X for simplicity in measuring distance
            const velocity = new THREE.Vector3(horizontalVelComponent, verticalVelComponent, 0);
            const position = new THREE.Vector3(0, 0.1, 0); // Start slightly above ground

            // --- Simulation Loop ---
            for (let currentTime = 0; currentTime < maxSimulationTime; currentTime += timeStep) {
                // Apply Gravity
                velocity.y -= this.gravity * timeStep;

                // Apply Air Drag (Consistent with physics.js update())
                const mag = velocity.length();
                if (mag > 0.001) {
                    const DRAG_COEFFICIENT = 0.0002;
                    let dragEffect = 1.0 - (DRAG_COEFFICIENT * mag);
                    if (dragEffect < 0.1) dragEffect = 0.1;
                    velocity.multiplyScalar(dragEffect);
                }

                // Update Position
                position.x += velocity.x * timeStep;
                position.y += velocity.y * timeStep;
                // position.z will remain 0 due to initial velocity aim

                // Check for landing (ball hits ground)
                if (position.y <= 0.0) {
                    // Basic interpolation for slightly more accurate landing spot
                    if (velocity.y !== 0) { // Avoid division by zero if perfectly horizontal at impact
                        const timeToGround = - (position.y - (velocity.y * timeStep)) / velocity.y; // time from previous step to hit ground
                        position.x -= velocity.x * (timeStep - timeToGround); // backtrack x to impact point
                    }
                    simulatedDistance = position.x;
                    break; 
                }
            }
            distances[club] = Math.max(0, simulatedDistance); // Ensure non-negative distance
        }
        
        this.clubDistancesCache = distances;
        return distances;
    }

    /**
     * Precomputes and caches all club distances at initialization
     * to avoid calculating them during gameplay.
     */
    precomputeClubDistances() {
        // Force recalculation by clearing any existing cache
        this.clubDistancesCache = null;
        
        // Calculate and cache distances
        const distances = this.calculateClubDistances();
    }

    // Get terrain height at a specific position
    getTerrainHeightAt(x, z) {
        // Fallback if terrain reference is not set
        if (!this.terrain) {
            console.warn("Terrain not set in physics engine");
            return 0;
        }
        
        // Safety check for invalid coordinates
        if (isNaN(x) || isNaN(z) || Math.abs(x) > 500 || Math.abs(z) > 500) {
            console.warn("Invalid coordinates for terrain height:", x, z);
            return 0;
        }
        
        try {
            // Use the terrain's getHeightAt method
            return this.terrain.getHeightAt(x, z);
        } catch (e) {
            console.error("Error in terrain height finding:", e);
            return 0; // Fallback
        }
    }

    calculateShot(initialVelocity, aimAngle, club) {
        // Log initial state for debugging

        
        // Safety check - if initialVelocity is very small, increase it slightly
        if (initialVelocity < 1) initialVelocity = 1;
        
        // Get club-specific stats
        const clubConfig = this.clubStats[club] || this.clubStats.driver; // Default to driver if club not found
        const radAngle = THREE.MathUtils.degToRad(clubConfig.angle);
        
        // Calculate total velocity based on power and club
        const totalVelocity = initialVelocity * clubConfig.multiplier;
        
        // Calculate velocity components
        const horizontalVelocity = totalVelocity * Math.cos(radAngle); // Horizontal speed based on club angle
        const verticalVelocity = totalVelocity * Math.sin(radAngle);   // Vertical speed based on club angle
        
        // Create a new velocity vector each time instead of modifying existing
        this.ball.velocity = new THREE.Vector3(
            horizontalVelocity * Math.cos(aimAngle), // X component based on aim
            verticalVelocity,                        // Y component from club angle
            horizontalVelocity * -Math.sin(aimAngle)  // Z component based on aim (negative to match Three.js coordinate system)
        );
        
        // ALWAYS force the ball into the air - regardless of previous state
        this.ball.inAir = true;
        this.ball.onGround = false;

        // Add spin effect
        this.ball.spin = 0.1; // Consistent spin rate
        
        // Add tiny upward boost to help when starting from ground
        this.ball.position.y += 0.05;
        
        return true; // Indicate success
    }

    updateWind(currentTime) {
        // Update wind direction & speed periodically
        if (currentTime - this.wind.lastUpdate > this.wind.updateInterval) {
            this.wind.direction += (Math.random() - 0.5) * Math.PI / 8; // Change direction slightly
            // Clamp the wind speed between 5 and 20
            this.wind.speed = Math.max(5, Math.min(20, this.wind.speed + (Math.random() - 0.5) * 5));
            this.wind.lastUpdate = currentTime;
        }
    }

    getWindForce() {
        // Wind force is in X-Z plane
        return new THREE.Vector3(
            Math.cos(this.wind.direction) * this.wind.speed * this.wind.forceScale,
            0,
            Math.sin(this.wind.direction) * this.wind.speed * this.wind.forceScale
        );
    }

    update(deltaTime) {
        const currentTime = performance.now() / 1000;
        const velocitySq = this.ball.velocity.lengthSq();
        
        // Skip all physics if ball is barely moving
        if (velocitySq < 0.0001) {
            this.ball.velocity.set(0, 0, 0);
            return;
        }
        
        // Only update wind if ball is moving significantly
        if (velocitySq > 0.1) {
            this.updateWind(currentTime);
        }

        // Safety check: if ball is neither in air nor on ground but has velocity, set it to in air
        if (!this.ball.inAir && !this.ball.onGround && velocitySq > 0) {
            this.ball.inAir = true;
        }

        if (this.ball.inAir) {
            // Apply gravity
            this.ball.velocity.y -= this.gravity * deltaTime;
            
            // Simplified Air Resistance (Drag)
            const velocityMagnitude = this.ball.velocity.length();
            const DRAG_COEFFICIENT = 0.0002; // Tunable coefficient for drag
            let dragEffect = 1.0 - (DRAG_COEFFICIENT * velocityMagnitude);

            // Clamp dragEffect to prevent extreme slowing or reversal at very high/low velocities
            if (dragEffect < 0.1) { // Minimum factor, ball retains 10% velocity
                dragEffect = 0.1;
            } else if (dragEffect > 1.0) { // Should not happen with positive coeff and velocity
                dragEffect = 1.0;
            }
            
            this.ball.velocity.multiplyScalar(dragEffect);
            
            // Only apply wind if ball is moving fast enough
            if (velocitySq > 0.1) {
                const windForce = this.getWindForce();
                this.ball.velocity.x += windForce.x * deltaTime;
                this.ball.velocity.z += windForce.z * deltaTime;
            }
            
            // Update position
            this.ball.position.x += this.ball.velocity.x * deltaTime;
            this.ball.position.y += this.ball.velocity.y * deltaTime;
            this.ball.position.z += this.ball.velocity.z * deltaTime;
            
            // Check terrain collision only if ball is close to ground
            if (this.ball.position.y < 5) { // Only check if ball is within 5 units of ground
                const terrainHeight = this.getTerrainHeightAt(this.ball.position.x, this.ball.position.z);
                if (this.ball.position.y < terrainHeight) {
                    this.handleTerrainCollision(terrainHeight);
                }
            }
        } else if (this.ball.onGround) {
            // Only update if there's meaningful velocity
            if (velocitySq > 0.01) {
                // Update position based on velocity
                this.ball.position.x += this.ball.velocity.x * deltaTime;
                this.ball.position.z += this.ball.velocity.z * deltaTime;
                
                // Only update terrain height if ball has moved significantly
                const terrainHeight = this.getTerrainHeightAt(this.ball.position.x, this.ball.position.z);
                this.ball.position.y = terrainHeight;
                
                // Apply friction
                const friction = this.getTerrainFriction(this.ball.position);
                this.ball.velocity.x *= friction;
                this.ball.velocity.z *= friction;
                
                // If ball has almost stopped, set velocity to zero
                if (this.ball.velocity.lengthSq() < 0.01) {
                    this.ball.velocity.set(0, 0, 0);
                }
            }
        }

        // Only check hole suction when ball is close to hole and moving slowly
        const holeDistance = Math.sqrt(
            Math.pow(this.ball.position.x - this.hole.position.x, 2) +
            Math.pow(this.ball.position.z - this.hole.position.z, 2)
        );

        if (holeDistance < this.hole.radius * 2 && velocitySq < 0.16) { // 0.4^2 = 0.16
            const pullVector = new THREE.Vector3().subVectors(this.hole.position, this.ball.position);
            pullVector.y = 0; // Only pull horizontally
            pullVector.normalize().multiplyScalar(0.02); // gentle pull
            this.ball.velocity.add(pullVector);
        }
    }

    handleTerrainCollision(terrainHeight) {
        // Set ball position to terrain height
        this.ball.position.y = terrainHeight;
        
        // Calculate bounce with surface-specific factors
        const surfaceType = this.terrain.getSurfaceTypeAt(this.ball.position.x, this.ball.position.z);
        let bounceFactor;
        
        // Get incoming velocity magnitude
        const incomingVelocity = this.ball.velocity.length();
        
        switch (surfaceType) {
            case 'green':
                // On green, only bounce if incoming velocity is very high
                if (incomingVelocity > 15) {
                    bounceFactor = 0.1; // Very minimal bounce
                } else {
                    bounceFactor = 0.05; // Almost no bounce
                }
                break;
            case 'fairway':
                bounceFactor = 0.3; // Moderate bounce on fairway
                break;
            case 'rough':
                bounceFactor = 0.4; // More bounce in rough
                break;
            case 'bunker':
                // In bunker, minimal bounce and velocity-based stopping
                if (incomingVelocity > 20) {
                    bounceFactor = 0.15; // Very minimal bounce for high velocity shots
                } else {
                    bounceFactor = 0.05; // Almost no bounce for normal shots
                }
                // Immediately reduce horizontal velocity significantly
                this.ball.velocity.x *= 0.5;
                this.ball.velocity.z *= 0.5;
                break;
            default:
                bounceFactor = 0.3;
        }
        
        // Apply bounce
        this.ball.velocity.y *= -bounceFactor;
        
        // Apply friction to horizontal velocity using the constructor's friction values
        const friction = this.friction[surfaceType] || this.friction.fairway;
        this.ball.velocity.x *= friction;
        this.ball.velocity.z *= friction;
        
        // If ball has very little vertical velocity, consider it on ground
        if (Math.abs(this.ball.velocity.y) < 1) {
            this.ball.velocity.y = 0;
            this.ball.inAir = false;
            this.ball.onGround = true;
        }
    }

    getTerrainFriction(position) {
        if (!this.terrain) return this.friction.fairway;
        
        const surfaceType = this.terrain.getSurfaceTypeAt(position.x, position.z);
        const velocity = this.ball.velocity.length();
        
        // Only apply velocity-based friction to green and fairway
        if (surfaceType === 'green' || surfaceType === 'fairway') {
            const thresholds = this.velocityThresholds[surfaceType];
            const frictionValues = this.velocityBasedFriction[surfaceType];
            
            // If velocity is above high threshold, use high friction
            if (velocity > thresholds.high) {
                return frictionValues.high;
            }
            // If velocity is below low threshold, use low friction
            else if (velocity < thresholds.low) {
                return frictionValues.low;
            }
            // In between thresholds, interpolate friction
            else {
                const t = (velocity - thresholds.low) / (thresholds.high - thresholds.low);
                return frictionValues.low + (frictionValues.high - frictionValues.low) * t;
            }
        }
        
        // For other surfaces, use their base friction values
        return this.friction[surfaceType] || this.friction.fairway;
    }

    isBallInHole() {
        if (!this.ball || !this.hole) return false;
        
        const dx = this.ball.position.x - this.hole.position.x;
        const dz = this.ball.position.z - this.hole.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        // Check if ball is near hole and moving slowly
        return dist < this.hole.radius && 
               this.ball.velocity.length() < 0.5 &&
               Math.abs(this.ball.position.y - this.hole.position.y) < 0.5;
    }
    

    /**
     * Calculates the ideal power needed to reach a specific distance with a given club.
     * Uses a simple proportion: if max power reaches max distance, what power reaches target distance?
     * 
     * @param {number} targetDistance - Distance to target in game units
     * @param {string} club - Club name (driver, iron, wedge, putter)
     * @returns {number} Power value from 0 to maxPower
     */
    getIdealPowerForDistance(targetDistance, club) {
        if (!this.clubDistancesCache) {
            this.calculateClubDistances(); // Ensure distances are calculated
        }
        
        const maxDistance = this.clubDistancesCache[club];
        
        if (!maxDistance || maxDistance <= 0.1) { // Handle cases where maxDistance is zero or very small
            // console.warn(`Club ${club} has no effective max distance (${maxDistance}), suggesting 0 power.`);
            return 0.0; 
        }
        
        let idealPowerRatio = targetDistance / maxDistance;

        // Clamp the ratio to be between 0.0 and 1.0
        // This idealPowerRatio is now directly the value (0-1) for the main power system
        idealPowerRatio = Math.max(0.0, Math.min(1.0, idealPowerRatio));
        
        return idealPowerRatio;
    }
    
    /**
     * Calculates horizontal distance from current ball position to hole
     * @returns {number} Distance in game units
     */
    getDistanceToHole() {
        // Safety check for undefined positions
        if (!this.ball || !this.hole) {
            return 100; // Default distance
        }
        
        // Calculate straight-line horizontal distance (ignoring height differences)
        const horizontalDistance = Math.sqrt(
            Math.pow(this.ball.position.x - this.hole.position.x, 2) +
            Math.pow(this.ball.position.z - this.hole.position.z, 2)
        );
        
        // Ensure distance is never zero or negative to avoid division by zero
        return Math.max(0.1, horizontalDistance);
    }
    
    /**
     * Calculates the ideal power needed to reach the hole with the current club
     * 
     * @param {string} club - The club to use (driver, iron, wedge, putter)
     * @returns {number} The ideal power setting from 0 to maxPower
     */
    getIdealPowerToHole(club) {

        // Get current distance to hole
        const distance = this.getDistanceToHole();
        
        // Check if we're on the green and using putter
        const isOnGreen = this.terrain && 
                         this.terrain.getSurfaceTypeAt(this.ball.position.x, this.ball.position.z) === 'green';
        const isPutter = club === 'putter';
        
        // Special handling for putting on green
        if (isOnGreen && isPutter) {
            // For putting, power is more sensitive and max distance is shorter.
            // The main getIdealPowerForDistance will use the (now accurately simulated) short putter max distance.
            // We might still want a different scaling for putter feel if the linear ratio isn't good.
            // For now, let's use the standard calculation, which should be much better.
            const idealPutterPower = this.getIdealPowerForDistance(distance, club);
            // console.log(`Putter to hole: dist ${distance.toFixed(1)}, ideal power (0-1): ${idealPutterPower.toFixed(2)}`);
            return idealPutterPower;
        }
        
        // Normal power calculation for other shots
        const idealPower = this.getIdealPowerForDistance(distance, club);
        
        // The idealPower is now 0-1. The console log in UI or main might need adjustment if it expects a different scale.
        // console.log(`Club: ${club}, Distance to hole: ${distance.toFixed(1)}, Ideal power (0-1): ${idealPower.toFixed(2)}`);
        
        return idealPower;
    }
}

// Export at the end of the file
export { PhysicsEngine };