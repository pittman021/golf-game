// Game state
let scene, camera, renderer;
let physicsEngine, modelManager, cameraController, uiManager;
let ball, terrain, flagPin;
let isShooting = false;
let power = 0;
let powerIncreasing = true;
let isAccuracyPhase = false;  // New state for the accuracy phase
let accuracy = 0;             // Accuracy position (0-1)
let accuracyIncreasing = true; // Direction of accuracy slider
let accuracySpeed = 0.02;      // Speed of accuracy slider
let currentHole = 1;
let currentPar = 4; // Default par for the hole
let currentStrokes = 0;
let gamePaused = false;
let aimAngle = 0; // Point towards the hole (positive X axis)
let trajectoryLine; // Reference to the trajectory preview line
let isAiming = false; // New variable to track aiming state
let lastBallMoving = false;
let aimAngleChanged = false; // Flag to track aim angle changes
let isHoleComplete = false;
let holeTransitionTimeout = null;
let TerrainClass; // Store the Terrain class reference

// Expose key objects to global scope for debugging
function exposeDebugObjects() {
    window.gameObjects = {
        scene,
        camera,
        renderer,
        terrain,
        ball,
        cameraController,
        physicsEngine
    };
    console.log("Debug objects exposed to window.gameObjects");
}

// Load modules asynchronously
async function loadModules() {
    try {
        console.log("Loading modules...");
        
        // Import modules
        const terrainModule = await import('./terrain.js');
        const physicsModule = await import('./physics.js');
        const cameraModule = await import('./camera.js');
        const modelsModule = await import('./models.js');
        const uiModule = await import('./ui.js');
        const holeConfigsModule = await import('./holeConfigs.js');
        
        // Initialize the game after modules are loaded
        init(terrainModule.Terrain, physicsModule.PhysicsEngine, 
             cameraModule.CameraController, modelsModule.ModelManager, 
             uiModule.UIManager, holeConfigsModule.holeConfigs);
    } catch (error) {
        console.error("Error loading modules:", error);
    }
}

// Initialize the game
function init(Terrain, PhysicsEngine, CameraController, ModelManager, UIManager, holeConfigs) {
    // Store Terrain class reference
    TerrainClass = Terrain;
    
    // Store holeConfigs globally
    window.holeConfigs = holeConfigs;
    
    // Setup physics engine first
    physicsEngine = new PhysicsEngine();
    window.physicsEngine = physicsEngine;
    
    // Setup scene
    scene = new THREE.Scene();
    // Make scene global for debugging
    window.debugScene = scene;

    
    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0x8894b0, 0.3);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffdb84, 1.0);
    directionalLight.position.set(-1, 1.2, 0.5);
    directionalLight.castShadow = true;
    
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.bias = -0.0001;
    
    scene.add(directionalLight);

    // Add fill light for softer shadows from opposite direction
    const fillLight = new THREE.DirectionalLight(0xd2e6ff, 0.3);
    fillLight.position.set(1, 0.7, -0.5);
    fillLight.castShadow = false;
    scene.add(fillLight);
    
    // Setup skybox (keeping existing skybox code if available)
    setupSkybox(scene);
    
    // Setup models first
    modelManager = new ModelManager(scene);
    
    // Create and add the terrain using the new Terrain class with first hole config
    terrain = new Terrain(scene, modelManager, holeConfigs[1]);
    // Make terrain global for debugging
    window.debugTerrain = terrain;
    
    scene.add(terrain.mesh);

    // Initialize trajectory line
    const trajectoryGeometry = new THREE.BufferGeometry();
    const trajectoryMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffff00,
        linewidth: 2,
        transparent: true,
        opacity: 0.5
    });
    trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
    scene.add(trajectoryLine);

    // Setup camera
    cameraController = new CameraController(scene);
    camera = cameraController.camera;
    // Make camera global for debugging
    window.debugCamera = camera;
    
    // Initialize the camera controller if it has an initialize method
    if (typeof cameraController.initialize === 'function') {
    
        cameraController.initialize();
    }
    
    // Setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    // Make renderer global for debugging
    window.debugRenderer = renderer;

    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
  
    
    // Add renderer to the container created in index.js
    const container = document.getElementById('app-container') || document.body;
    container.appendChild(renderer.domElement);
    
    // Ensure canvas is visible with proper styling
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '0'; // Behind UI elements

    
    // Create ball
    ball = modelManager.createBall();
    
    // Setup UI
    uiManager = new UIManager();
    uiManager.updateHoleInfo(currentHole, currentPar, currentStrokes);
    
    // Connect physics engine to UI
    uiManager.setPhysicsEngine(physicsEngine);
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Complete initialization
    completeInitialization();
    
    // Start game loop
    animate();
    
    // Expose objects for debugging
    exposeDebugObjects();
}

// Start loading modules when the page loads
window.addEventListener('load', loadModules);

// Export loadModules for direct calling from index.js
export { loadModules };

// Setup skybox function (extracted from SceneManager)
function setupSkybox(scene) {
    // Create gradient skybox
    const skyGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x0055cc) },
            bottomColor: { value: new THREE.Color(0xffeedd) }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), 0.6), 0.0)), 1.0);
            }
        `,
        side: THREE.BackSide
    });
    
    const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skybox);
}

// Second part of initialization
function completeInitialization() {
    console.log("Completing initialization...");
    
    // Connect physics engine to the terrain
    physicsEngine.setTerrain(terrain);
    console.log("Physics engine connected to terrain");
    
    // Load the first hole
    loadHole(1);
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Start game loop
    animate();
    
    // Expose objects for debugging
    exposeDebugObjects();
}

// Add new function to load a hole
function loadHole(holeNumber) {
    // Clear any existing transition timeout
    if (holeTransitionTimeout) {
        clearTimeout(holeTransitionTimeout);
        holeTransitionTimeout = null;
    }

    // Get the hole configuration
    const holeConfig = holeConfigs[holeNumber];
    if (!holeConfig) {
        console.error(`Hole ${holeNumber} configuration not found`);
        return;
    }

    // Update game state
    currentHole = holeNumber;
    currentPar = holeConfig.par;
    currentStrokes = 0;
    isHoleComplete = false;

    // Remove existing terrain and objects
    if (terrain) {
        scene.remove(terrain.mesh);
    }
    if (flagPin) {
        scene.remove(flagPin);
    }
    if (ball) {
        scene.remove(ball);
    }

    // Create new terrain with hole configuration
    terrain = new TerrainClass(scene, modelManager, holeConfig);
    scene.add(terrain.mesh);

    // Define tee and hole positions from config
    const tee = new THREE.Vector3(
        holeConfig.tee.x,
        terrain.getHeightAt(holeConfig.tee.x, holeConfig.tee.z) + 0.5,
        holeConfig.tee.z
    );
    const hole = new THREE.Vector3(
        holeConfig.green.x,
        terrain.getHeightAt(holeConfig.green.x, holeConfig.green.z),
        holeConfig.green.z
    );

    // Create the hole in the terrain
    terrain.createHole(hole.x, hole.z);

    // Set initial aimAngle to point toward the hole
    aimAngle = Math.atan2(hole.z - tee.z, hole.x - tee.x);

    // Calculate initial camera position behind the ball
    const cameraOffset = new THREE.Vector3(-8, 8, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), aimAngle);
    camera.position.copy(tee).add(cameraOffset);
    cameraController.targetPosition.copy(camera.position);

    // Set camera look target toward the hole
    camera.lookAt(hole.x, hole.y + 0.5, hole.z);
    cameraController.targetLookAt.set(hole.x, hole.y + 0.5, hole.z);

    // Create new ball and position it on the tee
    ball = modelManager.createBall();
    ball.position.copy(tee);
    scene.add(ball);

    // Create flag pin at hole position
    flagPin = modelManager.createFlagPin(
        hole.x,
        hole.z,
        terrain.getHeightAt.bind(terrain)
    );

    // Update physics engine
    physicsEngine.setTerrain(terrain);
    physicsEngine.setHolePosition(hole);
    physicsEngine.ball.position.copy(ball.position);
    physicsEngine.ball.velocity.set(0, 0, 0);
    physicsEngine.ball.inAir = false;
    physicsEngine.ball.onGround = true;

    // Initialize or update trajectory line
    if (!trajectoryLine) {
        const trajectoryGeometry = new THREE.BufferGeometry();
        const trajectoryMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffff00,
            linewidth: 2,
            transparent: true,
            opacity: 0.5
        });
        trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
        scene.add(trajectoryLine);
    }

    // Update UI
    uiManager.updateHoleInfo(currentHole, currentPar, currentStrokes);

    // Start aiming
    isAiming = true;
    updateTrajectory();
}

// Expose loadHole to window for UI access
window.loadHole = loadHole;

// Game loop
let frameCount = 0;
function animate() {
    // Request next frame immediately
    requestAnimationFrame(animate);
    
    try {
        if (gamePaused) return;
        
        // Check if essential objects exist
        if (!scene || !camera || !renderer) {
            console.error('Missing critical component:', {
                scene: !!scene,
                camera: !!camera,
                renderer: !!renderer
            });
            return;
        }
        
        // Update physics
        if (physicsEngine) {
            physicsEngine.update(1/60);
            checkBallInHole();
        }
        
        // Auto-aim when ball stops
        updateAiming();
        
        // Update ball position - ensure proper syncing
        if (ball && physicsEngine && physicsEngine.ball) {
            ball.position.copy(physicsEngine.ball.position);
            
            // Check if ball has stopped moving to update ideal power indicator
            const ballIsMoving = physicsEngine.ball.velocity.lengthSq() > 0.01;
            
            // If ball just stopped, update the indicator
            if (lastBallMoving && !ballIsMoving) {
                console.log('Ball stopped moving, updating ideal power indicator');
                uiManager.updateIdealPowerIndicator();
            }
            
            // Store state for next frame
            lastBallMoving = ballIsMoving;
            
            // Update UI if available
            if (uiManager) {
                // Update distance to hole
                if (physicsEngine.hole) {
                    uiManager.updateDistance(ball.position, physicsEngine.hole.position);
                    
                    // Remove the continuous update of the ideal power indicator
                    // uiManager.updateIdealPowerIndicator(); - This was causing excessive calculations
                }
                
                // Update wind UI
                if (physicsEngine.wind) {
                    uiManager.updateWind(physicsEngine.wind.speed, physicsEngine.wind.direction);
                    
                    // Animate flag based on wind if flag exists
                    if (flagPin && flagPin.userData.animateFlag) {
                        flagPin.userData.animateFlag(physicsEngine.wind.direction, physicsEngine.wind.speed);
                    }
                }
            }
            
            // Update trajectory preview
            if (isAiming && trajectoryLine) {
                // Only update trajectory when club or aim angle changes
                // not power changes since we use fixed power now
                if (uiManager.clubChanged || aimAngleChanged) {
                    updateTrajectory();
                    // Reset change flags
                    uiManager.clubChanged = false;
                    aimAngleChanged = false;
                }
                // Always ensure trajectory is visible when aiming
                trajectoryLine.visible = true;
            } else if (trajectoryLine) {
                // Hide trajectory when not aiming
                trajectoryLine.visible = false;
            }
        }
        
        // Check for hole completion
        if (physicsEngine && physicsEngine.isBallInHole()) {
            handleHoleCompletion();
        }
        
        // Update camera
        if (ball && cameraController) {
            cameraController.update(ball.position, physicsEngine ? physicsEngine.ball.velocity : null, aimAngle, isShooting);
        }
        
        // Update power meter if shooting
        if (isShooting && uiManager) {
            updatePowerMeter();
        }
        
        // Update accuracy bar if in accuracy phase
        if (isAccuracyPhase && uiManager) {
            updateAccuracyBar();
        }
        
        // Render scene - make sure this is being called!
        if (scene && camera && renderer) {
            // Clear the renderer with the sky blue color
            renderer.setClearColor(0x87CEEB, 1);
            renderer.clear();
            
            // Render the scene
            renderer.render(scene, camera);
            
            // Debug info every 60 frames
            if (frameCount % 60 === 0) {
              
            }
            frameCount++;
        }
    } catch (e) {
        console.error('Error in animation loop:', e);
    }
}

// Event handlers
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    if (event.key === ' ') {
        if (!isShooting && !isAccuracyPhase) {
            // Start power phase
            isShooting = true;
            power = 0;
            powerIncreasing = true;
            // Hide trajectory when entering power phase
            isAiming = false;
            if (trajectoryLine) {
                trajectoryLine.visible = false;
            }
        } else if (isAccuracyPhase) {
            // Stop accuracy phase and take shot
            isAccuracyPhase = false;
            uiManager.hideAccuracyBar();
            takeShot();
        }
    } else if (event.key === 'ArrowLeft') {
        aimAngle += 0.1; // Rotate aim counterclockwise
        isAiming = true; // Start aiming when adjusting angle
        aimAngleChanged = true; // Flag that aim angle changed
    } else if (event.key === 'ArrowRight') {
        aimAngle -= 0.1; // Rotate aim clockwise
        isAiming = true; // Start aiming when adjusting angle
        aimAngleChanged = true; // Flag that aim angle changed
    } else if (event.key === 'Shift') {
        // Optional: add explicit aiming mode with shift key
        isAiming = true;
    }
}

function onKeyUp(event) {
    if (event.key === ' ' && isShooting) {
        // End power phase, start accuracy phase
        isShooting = false;
        isAccuracyPhase = true;
        accuracy = 0;
        accuracyIncreasing = true;
        uiManager.showAccuracyBar();
    } else if (event.key === 'Shift') {
        // Optional: stop aiming mode when shift is released
        isAiming = false;
    }
}

function updatePowerMeter() {
    if (powerIncreasing) {
        power += 0.015; // Increase power
        if (power >= 1.0) {
            power = 1.0;
            powerIncreasing = false;
        }
    } else {
        power -= 0.015; // Decrease power
        if (power <= 0) {
            power = 0;
            powerIncreasing = true;
        }
    }
    
    // No need to track power changes for trajectory since we use fixed power now
    
    // Update UI power meter
    uiManager.updatePowerMeter(power);
}

function updateAccuracyBar() {
    // Move the accuracy slider back and forth
    if (accuracyIncreasing) {
        accuracy += accuracySpeed;
        if (accuracy >= 1) {
            accuracy = 1;
            accuracyIncreasing = false;
        }
    } else {
        accuracy -= accuracySpeed;
        if (accuracy <= 0) {
            accuracy = 0;
            accuracyIncreasing = true;
        }
    }
    uiManager.updateAccuracyBar(accuracy);
}

function takeShot() {
    // Don't allow shots if the game is paused
    if (gamePaused) return;
    
    // Reset aiming state and hide trajectory line
    isAiming = false;
    if (trajectoryLine) {
        trajectoryLine.visible = false;
    }
    
    const club = uiManager.getSelectedClub() || 'driver'; // Default to driver if no club selected
    const velocity = power * 20; // Base velocity scaling adjusted for realistic ball movement
    
    // Get accuracy result
    const accuracyResult = uiManager.getAccuracyResult(accuracy);
    
    // Apply accuracy effects to the shot
    let accuracyMultiplier = 1.0;
    let randomAngleOffset = 0;
    
    if (accuracyResult === 'perfect') {
        // Perfect shot - no modifications
        accuracyMultiplier = 1.0;
        randomAngleOffset = 0;
    } else if (accuracyResult === 'okay') {
        // Okay shot - slight reduction in power and small random angle
        accuracyMultiplier = 0.9;
        randomAngleOffset = (Math.random() - 0.5) * 0.2; // +/- 0.1 radians
    } else {
        // Bad shot - significant reduction and large random angle
        accuracyMultiplier = 0.7;
        randomAngleOffset = (Math.random() - 0.5) * 0.5; // +/- 0.25 radians
    }
    
    // Apply modifications
    const adjustedVelocity = velocity * accuracyMultiplier;
    const adjustedAimAngle = aimAngle + randomAngleOffset;
    
    currentStrokes++; // Increment stroke count
    uiManager.updateHoleInfo(currentHole, currentPar, currentStrokes);
    
    
    // Always force the ball into a clean state before taking a shot
    physicsEngine.ball.onGround = true;
    physicsEngine.ball.inAir = false;
    
    // Get current terrain height at ball position for accurate shot
    const terrainHeight = physicsEngine.getTerrainHeightAt(
        physicsEngine.ball.position.x, 
        physicsEngine.ball.position.z
    );
    
    // Position ball exactly on terrain with a slight offset
    physicsEngine.ball.position.y = terrainHeight + 0.1;
    
    // Make sure visual ball matches physics ball
    ball.position.copy(physicsEngine.ball.position);
    
    // Now calculate the shot
    const shotSuccess = physicsEngine.calculateShot(adjustedVelocity, adjustedAimAngle, club);
    
    // Reset power meter after shot
    power = 0;
    uiManager.updatePowerMeter(power);
    
    // Play sound effect - commented out as we don't have the audio files yet
    /*
    const audio = new Audio('sounds/golf_hit.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Sound play error:", e));
    */
}

function handleHoleCompletion() {
    
    gamePaused = true;
    
    // Remove ball from scene
    scene.remove(ball);
    
    // Show completion message
    setTimeout(() => {
        alert(`Hole ${currentHole} completed in ${currentStrokes} strokes!`);
        
        // Reset for next hole
        currentHole++;
        currentStrokes = 0;
        // Reset aim angle to point toward the hole
        aimAngle = 0;
        // Optionally update par for new hole here
        uiManager.updateHoleInfo(currentHole, currentPar, currentStrokes);
        gamePaused = false;
        
        // Create a new ball and set it at the new tee position
        resetBall();
    }, 1000);
    
    // Make sure aiming is reset at hole completion
    isAiming = false;
    if (trajectoryLine) {
        trajectoryLine.visible = false;
    }
}

function predictTrajectory(power, aimAngle, club) {
    if (power <= 0.05) power = 0.05; // Ensure minimum power for prediction
    
    const points = [];
    const timeStep = 0.1;
    // Make totalTime adaptive based on power and club multiplier
    const clubConfig = physicsEngine.clubStats[club] || physicsEngine.clubStats.driver;
    const adaptiveTotalTime = Math.max(4.0, power * clubConfig.multiplier * 1.5);
    const steps = Math.ceil(adaptiveTotalTime / timeStep);
    
    // Get club-specific stats
    const radAngle = THREE.MathUtils.degToRad(clubConfig.angle);
    
    // Calculate initial velocity components
    const initialVelocity = power * 25;
    const totalVelocity = initialVelocity * clubConfig.multiplier;
    
    // Calculate velocity components
    const horizontalVelocity = totalVelocity * Math.cos(radAngle);
    const verticalVelocity = totalVelocity * Math.sin(radAngle);
    
    // Apply aim direction to horizontal components
    const velocity = new THREE.Vector3(
        horizontalVelocity * Math.cos(aimAngle),
        verticalVelocity,
        horizontalVelocity * -Math.sin(aimAngle)
    );
    
    // Start from current ball position
    const position = ball.position.clone();
    points.push(position.clone());
    
    let inAir = true;
    let onGround = false;
    let groundContactPoint = null;
    
    // Simplified trajectory simulation
    for (let i = 0; i < steps; i++) {
        if (inAir) {
            // Apply gravity
            velocity.y -= physicsEngine.gravity * timeStep;
            
            // Move ball
            const nextPos = position.clone();
            nextPos.add(velocity.clone().multiplyScalar(timeStep));
            
            // Get simplified terrain height
            let terrainHeight = 0;
            try {
                terrainHeight = physicsEngine.getTerrainHeightAt(nextPos.x, nextPos.z);
            } catch (e) {
                console.warn("Error getting terrain height in trajectory prediction");
            }
            
            // Check for collision
            if (nextPos.y <= terrainHeight) {
                nextPos.y = terrainHeight;
                velocity.y *= -0.3;
                
                // Store first ground contact point
                if (!groundContactPoint) {
                    groundContactPoint = nextPos.clone();
                }
                
                if (Math.abs(velocity.y) < 1) {
                    inAir = false;
                    onGround = true;
                }
            }
            
            position.copy(nextPos);
        } else if (onGround) {
            // Simple ground movement with friction
            const friction = 0.15;
            velocity.multiplyScalar(1 - friction);
            
            if (velocity.length() < 0.2) break;
            
            // Move ball
            position.add(velocity.clone().multiplyScalar(timeStep));
            
            // Update height to follow terrain
            try {
                position.y = physicsEngine.getTerrainHeightAt(position.x, position.z);
            } catch (e) {
                // Keep current height if there's an error
            }
        }
        
        points.push(position.clone());
    }
    
    // If simulation ended with ball still in the air, add a final point on the ground
    if (inAir && !groundContactPoint) {
        // Project the ball's final position down to the terrain
        const finalPos = position.clone();
        try {
            const terrainHeight = physicsEngine.getTerrainHeightAt(finalPos.x, finalPos.z);
            finalPos.y = terrainHeight;
            points.push(finalPos);
        } catch (e) {
            console.warn("Error projecting trajectory end point to terrain");
        }
    }
    
    return points;
}

// New function to update trajectory line
function updateTrajectory() {
    try {
        // Safety check - ensure all components are available
        if (!trajectoryLine || !ball || !physicsEngine || !uiManager) {
            console.warn('Cannot update trajectory line: required components not initialized');
            return;
        }
        
        // Use fixed power value for trajectory prediction instead of current power
        const fixedPower = 0.7; // 70% power - consistent value for trajectory display
        
        // Only generate new trajectory points if needed
        const trajectoryPoints = predictTrajectory(fixedPower, aimAngle, uiManager.getSelectedClub());
        
        // Don't update geometry if points array is empty or invalid
        if (!trajectoryPoints || trajectoryPoints.length < 2) {
            console.warn('Invalid trajectory points generated');
            return;
        }
        
        // Create a new positions array with exact size needed
        const positions = new Float32Array(trajectoryPoints.length * 3);
        
        // Optimize point conversion loop
        for (let i = 0, j = 0; i < trajectoryPoints.length; i++, j += 3) {
            const point = trajectoryPoints[i];
            positions[j] = point.x;
            positions[j + 1] = point.y;
            positions[j + 2] = point.z;
        }
        
        // Update line geometry efficiently
        trajectoryLine.geometry.dispose(); // Clean up old geometry
        trajectoryLine.geometry = new THREE.BufferGeometry();
        trajectoryLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trajectoryLine.computeLineDistances();
        trajectoryLine.visible = true;
    } catch (e) {
        console.error('Error updating trajectory:', e);
    }
}

function updateAiming() {
    // Start aiming automatically when the ball stops
    if (physicsEngine && ball && 
        !isShooting && 
        !isAccuracyPhase && 
        physicsEngine.ball.velocity && 
        physicsEngine.ball.velocity.length() < 0.1) {
        
        if (!isAiming) {
            console.log("Ball stopped, entering aiming mode");
            isAiming = true;
            // Immediately make trajectory visible and update it
            if (trajectoryLine) {
                trajectoryLine.visible = true;
            }
            // Only update trajectory when aiming state changes
            updateTrajectory();
        }
    }
}

function resetBall() {
    // Create a new ball
    ball = modelManager.createBall();
    
    // Create a new tee position
    const teePos = new THREE.Vector3(-250, terrain.getHeightAt(-250, 0) + 0.5, 0);
    
    // Position ball on the tee
    ball.position.copy(teePos);
    
    // Position camera behind the ball looking toward the hole
    const cameraOffset = new THREE.Vector3(-8, 8, 0);
    cameraController.targetPosition.copy(teePos).add(cameraOffset);
    cameraController.targetLookAt.set(250, terrain.getHeightAt(250, 0) + 0.5, 0);
    
    // Reset physics state completely
    physicsEngine.ball.position.copy(ball.position);
    physicsEngine.ball.velocity.set(0, 0, 0);
    physicsEngine.ball.inAir = false;
    physicsEngine.ball.onGround = true;
    
    console.log("Ball reset to:", ball.position);
    
    // Start aiming after ball is reset
    isAiming = true;
    updateTrajectory();
}

// Modify the ball-in-hole check in the physics update
function checkBallInHole() {
    if (!isHoleComplete && physicsEngine.ball && terrain) {
        const holeConfig = holeConfigs[currentHole];
        const hole = new THREE.Vector3(holeConfig.green.x, 0, holeConfig.green.z);
        const ballPos = physicsEngine.ball.position;
        
        const dx = ballPos.x - hole.x;
        const dz = ballPos.z - hole.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 0.5 && Math.abs(ballPos.y - terrain.getHeightAt(hole.x, hole.z)) < 0.5) {
            isHoleComplete = true;
            console.log(`Hole ${currentHole} completed in ${currentStrokes} strokes`);
            
            // Wait 2 seconds before loading next hole
            holeTransitionTimeout = setTimeout(() => {
                if (currentHole < Object.keys(holeConfigs).length) {
                    loadHole(currentHole + 1);
                } else {
                    // Game complete - show final score
                    uiManager.showGameComplete(currentStrokes);
                }
            }, 2000);
        }
    }
}