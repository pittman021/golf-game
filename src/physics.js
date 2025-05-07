import * as THREE from 'three';

class PhysicsEngine {
    constructor() {
        this.gravity = 10;
        this.friction = {
            fairway: 80,
            rough: 75,
            green: 1.0
        };
        this.clubStats = {
            driver: {
                angle: 15,
                multiplier: 3.5
            },
            iron: {
                angle: 35,
                multiplier: 2.1
            },
            wedge: {
                angle: 55,
                multiplier: 0.8
            },
            putter: {
                angle: 5,
                multiplier: 0.5
            }
        };
        this.ball = {
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            inAir: false,
            onGround: false
        };
        this.hole = {
            position: new THREE.Vector3(250, 0, 0),
            radius: 0.3
        };
        
        // Simplified wind state
        this.wind = {
            speed: 10, // Fixed base speed
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
        // Return cached results if available for performance
        if (this.clubDistancesCache) {
            return this.clubDistancesCache;
        }
        
        console.log("Calculating club distances using formula...");
        const distances = {};
        const clubs = Object.keys(this.clubStats);
        
        // Base distance factor - calibrated to produce realistic distances in game units
        // Adjust this value to scale all clubs' distances proportionally
        const baseFactor = 70;
        
        for (const club of clubs) {
            const stats = this.clubStats[club];
            
            // Convert angle to radians for trigonometric functions
            const angleRadians = THREE.MathUtils.degToRad(stats.angle);
            
            // Horizontal factor: Lower angles send more energy horizontally (cos 0° = 1, cos 90° = 0)
            const horizontalFactor = Math.cos(angleRadians);
            
            // Final distance formula: club power × base scale × horizontal component
            distances[club] = Math.round(stats.multiplier * baseFactor * horizontalFactor);
            
            console.log(`${club}: distance = ${distances[club]} units (multiplier: ${stats.multiplier}, angle: ${stats.angle}°)`);
        }
        
        // Store results in cache for future use
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
        
        // Log results for debugging
        console.log("Club distances calculated:", distances);
        console.log("Relative distances:", {
            "driver/iron": (distances.driver / distances.iron).toFixed(1),
            "iron/wedge": (distances.iron / distances.wedge).toFixed(1),
            "wedge/putter": (distances.wedge / distances.putter).toFixed(1)
        });
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
        this.updateWind(currentTime);

        // Safety check: if ball is neither in air nor on ground but has velocity, set it to in air
        if (!this.ball.inAir && !this.ball.onGround && this.ball.velocity.length() > 0) {
            console.log("Ball state corrected: setting to in-air");
            this.ball.inAir = true;
        }

        if (this.ball.inAir) {
            // Apply gravity
            this.ball.velocity.y -= this.gravity * deltaTime;
            
            // Apply wind
            const windForce = this.getWindForce();
            this.ball.velocity.x += windForce.x * deltaTime;
            this.ball.velocity.z += windForce.z * deltaTime;
            
            // Update position
            this.ball.position.x += this.ball.velocity.x * deltaTime;
            this.ball.position.y += this.ball.velocity.y * deltaTime;
            this.ball.position.z += this.ball.velocity.z * deltaTime;
            
            // Check terrain collision
            const terrainHeight = this.getTerrainHeightAt(this.ball.position.x, this.ball.position.z);
            
            // If ball would go below terrain, handle collision
            if (this.ball.position.y < terrainHeight) {
                this.handleTerrainCollision(terrainHeight);
            }
        } else if (this.ball.onGround) {
            // Only update if there's meaningful velocity
            if (this.ball.velocity.length() > 0.01) {
                // Update position based on velocity
                this.ball.position.x += this.ball.velocity.x * deltaTime;
                this.ball.position.z += this.ball.velocity.z * deltaTime;
                
                // Keep ball on terrain
                const terrainHeight = this.getTerrainHeightAt(this.ball.position.x, this.ball.position.z);
                this.ball.position.y = terrainHeight;
                
                // Apply friction
                const friction = this.getTerrainFriction(this.ball.position);
                this.ball.velocity.x *= friction;
                this.ball.velocity.z *= friction;
                
                // If ball has almost stopped, set velocity to zero
                if (this.ball.velocity.length() < 0.01) {
                    this.ball.velocity.set(0, 0, 0);
                }
            }
        }

        // Add hole suction effect when the ball is close to the hole
        const holeDistance = Math.sqrt(
            Math.pow(this.ball.position.x - this.hole.position.x, 2) +
            Math.pow(this.ball.position.z - this.hole.position.z, 2)
        );

        if (holeDistance < this.hole.radius * 2 && this.ball.velocity.length() < 0.4) {
            const pullVector = new THREE.Vector3().subVectors(this.hole.position, this.ball.position);
            pullVector.y = 0; // Only pull horizontally
            pullVector.normalize().multiplyScalar(0.02); // gentle pull
            this.ball.velocity.add(pullVector);
        }
    }

    handleTerrainCollision(terrainHeight) {
        // Set ball position to terrain height
        this.ball.position.y = terrainHeight;
        
        // Calculate bounce
        const bounceFactor = 0.3; // Reduced bounce for more realistic behavior
        this.ball.velocity.y *= -bounceFactor;
        
        // Apply friction to horizontal velocity
        const friction = this.getTerrainFriction(this.ball.position);
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
        if (!this.terrain) return 0.95; // Default friction if terrain not set
        
        const surfaceType = this.terrain.getSurfaceTypeAt(position.x, position.z);
        
        switch (surfaceType) {
            case 'green':
                return 0.99; // Very little friction on green
            case 'fairway':
                return 0.95; // Moderate friction on fairway
            case 'rough':
                return 0.90; // More friction in rough
            case 'bunker':
                return 0.85; // Most friction in bunker
            default:
                return 0.95; // Default friction
        }
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
        // Ensure club distances are calculated
        if (!this.clubDistancesCache) {
            this.calculateClubDistances();
        }
        
        // Get the maximum distance this club can hit at full power
        const maxDistance = this.clubDistancesCache[club];
        
        // Handle missing club data
        if (!maxDistance) {
            console.warn(`Club ${club} not found in distance data, using fallback`);
            return this.maxPower / 2; // Default to 50% power as fallback
        }
        
        // Calculate power as a proportion of distance
        // If targetDistance > maxDistance, cap at maxPower (full power)
        const ratio = targetDistance / maxDistance;
        const idealPower = Math.min(this.maxPower, ratio * this.maxPower);
        
        return idealPower;
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
        
        // Calculate ideal power for this distance and club
        const idealPower = this.getIdealPowerForDistance(distance, club);
        
        // Log information when calculated (not every frame)
        console.log(`Club: ${club}, Distance to hole: ${distance.toFixed(1)}, Ideal power: ${(idealPower/this.maxPower*100).toFixed(0)}%`);
        
        return idealPower;
    }
}

// Export at the end of the file
export { PhysicsEngine };
