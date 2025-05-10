// Game state
let scene, camera, renderer;
let physicsEngine, modelManager, cameraController, uiManager, visualEffects, audioManager;
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

// Keyboard state tracking
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Import state management functions
import { saveGameState, loadGameState, saveHoleScore, clearGameState, getDefaultState } from './stateManager.js';
import { VisualEffects } from './visualEffects.js';
import { AudioManager } from './audioManager.js';

// Load modules asynchronously
async function loadModules() {
    try {        
    
        // Import modules
        const [terrainModule, physicsModule, cameraModule, modelsModule, uiModule, holeConfigsModule] = await Promise.all([
            import('./terrain.js'),
            import('./physics.js'),
            import('./camera.js'),
            import('./models.js'),
            import('./ui.js'),
            import('./holeConfigs.js')
        ]);
        
        console.log("Modules loaded:", {
            terrain: terrainModule,
            physics: physicsModule,
            camera: cameraModule,
            models: modelsModule,
            ui: uiModule,
            holeConfigs: holeConfigsModule
        });
        
        // Initialize the game after modules are loaded
        init(terrainModule, physicsModule, cameraModule, modelsModule, uiModule, holeConfigsModule);
    } catch (error) {
        console.error("Error loading modules:", error);
        console.error("Error details:", {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    }
}

// Initialize the game
function init(terrainModule, physicsModule, cameraModule, modelsModule, uiModule, holeConfigsModule) {
    // Store Terrain class reference (named export)
    TerrainClass = terrainModule.Terrain;
    
    // Store holeConfigs globally and expose to window
    window.holeConfigs = holeConfigsModule.holeConfigs;
    
    // Initialize audio manager
    audioManager = new AudioManager();
    
    // Add event listeners for audio initialization
    document.addEventListener('click', () => {
        if (audioManager) {
            console.log('User interaction detected, resuming audio...');
            audioManager.resumeAudio();
        }
    });
    
    // Also try to resume audio on key press
    document.addEventListener('keydown', () => {
        if (audioManager) {
            console.log('Key press detected, resuming audio...');
            audioManager.resumeAudio();
        }
    });
    
    // Load saved state if exists
    const savedState = loadGameState();
    if (savedState) {
        currentHole = savedState.currentHole;
        currentStrokes = savedState.totalStrokes;
    }
    
    // Setup physics engine first (named export)
    physicsEngine = new physicsModule.PhysicsEngine();
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
    
    // Setup skybox
    setupSkybox(scene);
    
    // Setup models first (named export)
    modelManager = new modelsModule.ModelManager(scene);
    
    // Create and add the terrain using the new Terrain class with first hole config
    terrain = new TerrainClass(scene, modelManager, holeConfigsModule[`hole${currentHole}Config`]);
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

    // Setup camera (named export)
    cameraController = new cameraModule.CameraController(scene);
    camera = cameraController.camera;
    // Make camera global for debugging
    window.debugCamera = camera;
    
    // Initialize the camera controller
    if (typeof cameraController.initialize === 'function') {
        cameraController.initialize();
    }
    
    // Ensure camera controller is fully initialized before proceeding
    if (!cameraController || !cameraController.targetPosition || !cameraController.targetLookAt) {
        console.error("Camera controller not properly initialized");
        return;
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
    
    // Setup UI (named export)
    uiManager = new uiModule.UIManager();
    uiManager.updateHoleInfo(currentHole, currentPar, currentStrokes);
    
    // Connect physics engine to UI
    uiManager.setPhysicsEngine(physicsEngine);
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Initialize visual effects
    visualEffects = new VisualEffects(scene);
    
    // Complete initialization
    completeInitialization();
    
    // Start game loop
    animate();
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
            topColor: { value: new THREE.Color(0x4682b4) },     // Steel Blue
            bottomColor: { value: new THREE.Color(0xadd8e6) }   // Light Blue
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

    // Connect physics engine to the terrain
    physicsEngine.setTerrain(terrain);

    // Initialize camera position and look target
    const initialPosition = new THREE.Vector3(0, 100, 300);
    const initialLookAt = new THREE.Vector3(0, 0, 0);
    
    camera.position.copy(initialPosition);
    cameraController.targetPosition.copy(initialPosition);
    camera.lookAt(initialLookAt);
    cameraController.targetLookAt.copy(initialLookAt);
    
    // Load the first hole
    loadHole(1);
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Start game loop
    animate();
}

// Add new function to load a hole
function loadHole(holeNumber) {
    // Clear any existing transition timeout
    if (holeTransitionTimeout) {
        clearTimeout(holeTransitionTimeout);
        holeTransitionTimeout = null;
    }

    if (visualEffects) {
        visualEffects.resetTrail();
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
    isShooting = false;
    isAccuracyPhase = false;
    power = 0;
    powerIncreasing = true;

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

    // Set camera position and look target
    camera.position.copy(tee).add(cameraOffset);
    cameraController.targetPosition.copy(camera.position);
    camera.lookAt(hole.x, hole.y + 0.5, hole.z);
    cameraController.targetLookAt.set(hole.x, hole.y + 0.5, hole.z);

    // Create new ball and position it on the tee
    ball = modelManager.createBall();
    ball.position.copy(tee);
    scene.add(ball);

    // Initialize ball userData for shot tracking
    if (!ball.userData) {
        ball.userData = {};
    }
    ball.userData.lastShotStart = ball.position.clone();

    // Create flag pin at hole position
    flagPin = modelManager.createFlagPin(
        hole.x,
        hole.z,
        terrain.getHeightAt.bind(terrain)
    );

    // Update physics engine with new terrain and reset ball state
    physicsEngine.setTerrain(terrain);
    physicsEngine.setHolePosition(hole);
    
    // Completely reset physics ball state
    physicsEngine.ball.position.copy(tee);
    physicsEngine.ball.velocity.set(0, 0, 0);
    physicsEngine.ball.inAir = false;
    physicsEngine.ball.onGround = true;
    
    // Initialize physics ball userData
    if (!physicsEngine.ball.userData) {
        physicsEngine.ball.userData = {};
    }
    physicsEngine.ball.userData.lastShotStart = physicsEngine.ball.position.clone();
    
    // Ensure visual ball matches physics ball
    ball.position.copy(physicsEngine.ball.position);
    ball.rotation.copy(physicsEngine.ball.rotation);

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
    uiManager.updatePowerMeter(0); // Reset power meter
    uiManager.forceUpdateIdealPower(); // Update ideal power indicator for new hole

    // Start aiming
    isAiming = true;
    updateTrajectory();
    
    // Ensure game is not paused
    gamePaused = false;
}

// Expose loadHole to window for UI access
window.loadHole = loadHole;

// Game loop
let frameCount = 0;
function animate() {
    const start = performance.now();
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
        
        // Only update physics if ball is moving with a slightly higher threshold
        if (physicsEngine && physicsEngine.ball) {
            const isBallMoving = physicsEngine.ball.velocity.lengthSq() > 0.02;
            if (isBallMoving) {
                physicsEngine.update(1/60);
                checkBallInHole();
            } else if (physicsEngine.ball.velocity.lengthSq() > 0) {
                physicsEngine.ball.velocity.set(0, 0, 0);
            }
        }
        
        // Auto-aim when ball stops
        updateAiming();
        
        // Update ball position - ensure proper syncing
        if (ball && physicsEngine && physicsEngine.ball) {
            ball.position.copy(physicsEngine.ball.position);
            
            // Check if ball has stopped moving
            const ballIsMoving = physicsEngine.ball.velocity.lengthSq() > 0.01;
            
            // If ball just stopped, show shot feedback
            if (lastBallMoving && !ballIsMoving) {
                // Calculate shot distance
                const startPos = physicsEngine.ball.userData.lastShotStart || physicsEngine.ball.position;
                const endPos = physicsEngine.ball.position;
                const dx = endPos.x - startPos.x;
                const dz = endPos.z - startPos.z;
                const shotDistance = Math.sqrt(dx * dx + dz * dz);
                
                // Get accuracy result from the last shot
                const accuracy = uiManager.getAccuracyResult(uiManager.lastAccuracy);
                
                // Show shot feedback
                uiManager.showShotFeedback(accuracy, shotDistance);
                
                // Store current position as start for next shot
                physicsEngine.ball.userData.lastShotStart = physicsEngine.ball.position.clone();
            }
            
            // Store state for next frame
            lastBallMoving = ballIsMoving;
            
            // Update UI if available
            if (uiManager) {
                // Update distance to hole
                if (physicsEngine.hole) {
                    uiManager.updateDistance(ball.position, physicsEngine.hole.position);
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
                if (uiManager.clubChanged || aimAngleChanged) {
                    updateTrajectory();
                    // Reset change flags
                    uiManager.clubChanged = false;
                    aimAngleChanged = false;
                }
                trajectoryLine.visible = true;
            } else if (trajectoryLine) {
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
        
        // Update visual effects
        if (physicsEngine && physicsEngine.ball) {
            visualEffects.update(physicsEngine.ball.position, physicsEngine.ball.velocity);
        }
        
        // Render scene
        if (scene && camera && renderer) {
            renderer.setClearColor(0x87CEEB, 1);
            renderer.clear();
            renderer.render(scene, camera);
            frameCount++;
        }
        
        // Save state every 30 seconds
        if (frameCount % 1800 === 0) {
            const currentState = loadGameState() || { ...defaultState };
            const state = {
                ...currentState,
                currentHole,
                totalStrokes: currentStrokes,
                lastSaved: Date.now()
            };
            saveGameState(state);
        }
    } catch (e) {
        console.error('Error in animation loop:', e);
    }

    const duration = performance.now() - start;
    if (duration > 16) {
        console.warn(`Frame took ${duration.toFixed(2)}ms`);
    }
}

// Event handlers
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (visualEffects && visualEffects.trailMaterial) {
        visualEffects.trailMaterial.resolution.set(window.innerWidth, window.innerHeight);
    }
}

function onKeyDown(event) {
    // Update keyboard state
    if (event.key in keys) {
        keys[event.key] = true;
    }

    if (event.key === 'c' || event.key === 'C') {
        // Only allow free roam before taking a shot
        if (!isShooting && !isAccuracyPhase) {
            cameraController.keys = keys; // Pass keyboard state to camera controller
            cameraController.toggleFreeRoam();
            // Hide trajectory when entering free roam
            if (trajectoryLine) {
                trajectoryLine.visible = false;
            }
        }
    } else if (event.key === ' ') {
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
    } else if (event.key === 'ArrowLeft' && !cameraController.isFreeRoam) {
        aimAngle += 0.05; // Rotate aim counterclockwise
        isAiming = true; // Start aiming when adjusting angle
        aimAngleChanged = true; // Flag that aim angle changed
    } else if (event.key === 'ArrowRight' && !cameraController.isFreeRoam) {
        aimAngle -= 0.05; // Rotate aim clockwise
        isAiming = true; // Start aiming when adjusting angle
        aimAngleChanged = true; // Flag that aim angle changed
    } else if (event.key === 'Shift') {
        // Optional: add explicit aiming mode with shift key
        isAiming = true;
    } else if (event.key === 'r' || event.key === 'R') {
        if (event.shiftKey) {
            // Shift + R to restart entire game
            if (confirm('Are you sure you want to restart the entire game?')) {
                restartGame();
            }
        }
    }

    // Add scorecard shortcut
    if (event.key.toLowerCase() === 's') {
        uiManager.toggleScorecard();
    }
}

function onKeyUp(event) {
    // Update keyboard state
    if (event.key in keys) {
        keys[event.key] = false;
    }

    // Handle spacebar for power meter
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
        power += 0.015;
        if (power >= 1.0) {
            power = 1.0;
            powerIncreasing = false;
        }
    } else {
        power -= 0.015;
        if (power <= 0) {
            power = 0;
            powerIncreasing = true;
        }
    }
    
    // Update UI power meter - only update the power bar, not the ideal indicator
    if (uiManager) {
        uiManager.updatePowerMeter(power);
    }
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

    if (visualEffects) {
        visualEffects.resetTrail(); // Reset trail before a new shot
    }
    
    // Reset aiming state and hide trajectory line
    isAiming = false;
    if (trajectoryLine) {
        trajectoryLine.visible = false;
    }

    const club = uiManager.getSelectedClub() || 'dr'; // Default to driver if no club selected

    // Calculate base shot velocity based on power (0-1 from power meter)
    const minBaseShotVelocity = 1.0; // Drastically reduced for better power meter proportionality
    const maxBaseShotVelocity = 60.0; // Max speed before club multipliers/accuracy
    // power is a global variable ranging from 0 to 1, set by updatePowerMeter
    const calculatedBaseVelocity = minBaseShotVelocity + power * (maxBaseShotVelocity - minBaseShotVelocity);
    
    // Get accuracy result
    const accuracyResult = uiManager.getAccuracyResult(accuracy); // accuracy is global, 0-1
    
    // Store accuracy for shot feedback
    uiManager.lastAccuracy = accuracy;
    
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
    
    // Apply accuracy modifications to determine the final initial velocity for the physics engine
    const finalInitialVelocity = calculatedBaseVelocity * accuracyMultiplier;
    const adjustedAimAngle = aimAngle + randomAngleOffset; // aimAngle is global
    
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
    
    // Now calculate the shot using the final initial velocity
    const shotSuccess = physicsEngine.calculateShot(finalInitialVelocity, adjustedAimAngle, club);
    
    // Reset power meter after shot
    power = 0;
    uiManager.updatePowerMeter(power);
    
    // Play appropriate sound effect based on club type
    if (audioManager) {
        // Map club types to sound types
        let soundType;
        if (club === 'putter') {
            soundType = 'putter';
        } else if (club === 'driver' || club === '5wood') {
            soundType = 'driver';
        } else {
            soundType = 'iron';
        }
        console.log('Playing sound for shot:', { club, soundType });
        audioManager.playSound(soundType);
    }

    isShooting = false; // Ensure isShooting is false after the shot is taken
}

function handleHoleCompletion() {
    gamePaused = true;
    
    // Save hole score and get updated state
    saveHoleScore(currentHole, currentStrokes);
    const state = loadGameState(); // Get the latest state after saving
    
    // Remove ball from scene
    scene.remove(ball);
    
    // Show completion message with score relative to par
    const scoreRelativeToPar = currentStrokes - currentPar;
    const scoreText = scoreRelativeToPar > 0 ? `+${scoreRelativeToPar}` : 
                     scoreRelativeToPar < 0 ? scoreRelativeToPar : 'E';
    
    setTimeout(() => {
        alert(`Hole ${currentHole} completed in ${currentStrokes} strokes (${scoreText})`);
        
        // Check if there are more holes
        if (currentHole < Object.keys(holeConfigs).length) {
            // Move to next hole
            currentHole++;
            currentStrokes = 0;
            // Reset aim angle to point toward the hole
            aimAngle = 0;
            // Update UI for new hole
            uiManager.updateHoleInfo(currentHole, currentPar, currentStrokes);
            gamePaused = false;
            
            // Load the next hole
            loadHole(currentHole);
        } else {
            // Game complete - show final score
            const totalStrokes = state.totalStrokes;
            const totalPar = Object.values(holeConfigs).reduce((sum, config) => sum + config.par, 0);
            const finalScoreRelativeToPar = totalStrokes - totalPar;
            const finalScoreText = finalScoreRelativeToPar > 0 ? `+${finalScoreRelativeToPar}` : 
                                 finalScoreRelativeToPar < 0 ? finalScoreRelativeToPar : 'E';
            
            uiManager.showGameComplete(totalStrokes, finalScoreText);
        }
    }, 1000);
    
    // Make sure aiming is reset at hole completion
    isAiming = false;
    if (trajectoryLine) {
        trajectoryLine.visible = false;
    }
}

function predictTrajectory(inputPower, aimAngle, club) {
    // Ensure minimum power for prediction, but allow 0 for realistic low power shots if desired by design
    // For now, let's keep a small minimum to avoid issues if inputPower is exactly 0 and minBase is 0.
    const powerForPrediction = Math.max(0.01, inputPower); 

    const points = [];
    const timeStep = 0.1;
    
    const clubConfig = physicsEngine.clubStats[club] || physicsEngine.clubStats.driver;

    // --- Consistent Initial Velocity Calculation (Matches takeShot) ---
    const minBaseShotVelocity = 1.0; // Must match takeShot
    const maxBaseShotVelocity = 60.0; // Must match takeShot
    const calculatedBaseVelocity = minBaseShotVelocity + powerForPrediction * (maxBaseShotVelocity - minBaseShotVelocity);
    // For trajectory prediction, we assume perfect accuracy, so accuracyMultiplier is 1.0
    const finalInitialVelocityForPhysics = calculatedBaseVelocity; // This is what physics.calculateShot expects

    // Now, let physicsEngine.calculateShot give us the initial THREE.Vector3 velocity
    // To do this without actually *taking* a shot or altering the main physicsEngine.ball state,
    // we need a temporary ball object or to replicate the core of calculateShot here.
    // For simplicity and consistency, let's replicate the core velocity calculation part of calculateShot:
    const radAngle = THREE.MathUtils.degToRad(clubConfig.angle);
    const totalVelocityMagnitude = finalInitialVelocityForPhysics * clubConfig.multiplier;

    const horizontalVelocity = totalVelocityMagnitude * Math.cos(radAngle);
    const verticalVelocity = totalVelocityMagnitude * Math.sin(radAngle);
    
    const velocity = new THREE.Vector3(
        horizontalVelocity * Math.cos(aimAngle),
        verticalVelocity,
        horizontalVelocity * -Math.sin(aimAngle)
    );
    // --- End of Consistent Initial Velocity Calculation ---

    const adaptiveTotalTime = Math.max(4.0, powerForPrediction * clubConfig.multiplier * 1.5); // This can be tuned
    const steps = Math.ceil(adaptiveTotalTime / timeStep);

    const position = ball.position.clone(); // Start from current actual ball position
    points.push(position.clone());
    
    let inAir = true;
    let groundContactPoint = null; // Keep this for now
    const DRAG_COEFFICIENT = 0.0002; // Must match physics.js

    for (let i = 0; i < steps; i++) {
        if (inAir) {
            // Apply gravity (Consistent with physics.js)
            velocity.y -= physicsEngine.gravity * timeStep;

            // Apply Air Drag (Consistent with physics.js)
            const magnitude = velocity.length();
            if (magnitude > 0.001) { // Avoid issues if velocity is zero
                let dragEffect = 1.0 - (DRAG_COEFFICIENT * magnitude);
                if (dragEffect < 0.1) dragEffect = 0.1;
                // No need for 'else if (dragEffect > 1.0)' as COEFFICIENT is positive
                velocity.multiplyScalar(dragEffect);
            }
            
            // Move ball
            const nextPos = position.clone();
            nextPos.add(velocity.clone().multiplyScalar(timeStep));
            
            let terrainHeight = 0;
            try {
                terrainHeight = physicsEngine.getTerrainHeightAt(nextPos.x, nextPos.z);
            } catch (e) {
                console.warn("Error getting terrain height in trajectory prediction", e);
            }
            
            if (nextPos.y <= terrainHeight) {
                nextPos.y = terrainHeight;
                velocity.y *= -0.3; // Simplified bounce for prediction
                
                if (!groundContactPoint) {
                    groundContactPoint = nextPos.clone();
                }
                
                if (Math.abs(velocity.y) < 1) { // If bounce is small, consider it stopped in air phase
                    inAir = false;
                    // No onGround = true here, as the loop might continue with ground logic if we add it
                }
            }
            position.copy(nextPos);
        } else {
            // Current predictTrajectory doesn't have sophisticated ground roll prediction.
            // For now, if it's not inAir, we stop adding points or break.
            // This part can be expanded later if accurate ground roll prediction is needed.
            break; 
        }
        
        points.push(position.clone());
        if (points.length > 500) break; // Safety break for very long trajectories
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

        // Only update trajectory if we're in aiming mode and the line is visible
        if (!isAiming || !trajectoryLine.visible) {
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
            isAiming = true;
            // Immediately make trajectory visible and update it
            if (trajectoryLine) {
                trajectoryLine.visible = true;
            }
            // Update ideal power indicator when starting to aim
            if (uiManager) {
                uiManager.forceUpdateIdealPower();
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

// Add restart functions
function restartCurrentHole() {
    // Save current hole score before restarting
    saveHoleScore(currentHole, currentStrokes);

    if (visualEffects) {
        visualEffects.resetTrail();
    }
    
    // Reset hole-specific state
    currentStrokes = 0;
    isHoleComplete = false;
    isAiming = false;
    isShooting = false;
    isAccuracyPhase = false;
    
    // Reload current hole
    loadHole(currentHole);
    
    // Update UI
    uiManager.updateHoleInfo(currentHole, currentPar, currentStrokes);
}

function restartGame() {
    // Clear saved game state
    clearGameState();

    if (visualEffects) {
        visualEffects.resetTrail();
    }
    
    // Reset all game state
    currentHole = 1;
    currentStrokes = 0;
    isHoleComplete = false;
    isAiming = false;
    isShooting = false;
    isAccuracyPhase = false;
    
    // Reload first hole
    loadHole(1);
    
    // Update UI
    uiManager.updateHoleInfo(currentHole, currentPar, currentStrokes);
}

// Expose restart functions to window for UI access
window.restartCurrentHole = restartCurrentHole;
window.restartGame = restartGame;