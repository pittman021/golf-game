// Import Three.js if not globally available
import * as THREE from 'three';

class UIManager {
    constructor() {
        // Get UI container
        this.uiContainer = document.getElementById('ui-container');
        if (!this.uiContainer) {
            this.uiContainer = document.createElement('div');
            this.uiContainer.id = 'ui-container';
            document.body.appendChild(this.uiContainer);
        }

        // Create shot feedback panel
        this.shotFeedbackPanel = document.createElement('div');
        this.shotFeedbackPanel.id = 'shot-feedback-panel';
        this.shotFeedbackPanel.style.position = 'fixed';
        this.shotFeedbackPanel.style.top = '20px';
        this.shotFeedbackPanel.style.right = '20px';
        this.shotFeedbackPanel.style.transform = 'none'; // Remove center transform
        this.shotFeedbackPanel.style.background = 'rgba(0,0,0,0.8)';
        this.shotFeedbackPanel.style.padding = '20px';
        this.shotFeedbackPanel.style.borderRadius = '10px';
        this.shotFeedbackPanel.style.color = 'white';
        this.shotFeedbackPanel.style.fontFamily = 'Arial, sans-serif';
        this.shotFeedbackPanel.style.fontWeight = 'bold';
        this.shotFeedbackPanel.style.textAlign = 'center';
        this.shotFeedbackPanel.style.zIndex = '1000';
        this.shotFeedbackPanel.style.opacity = '0';
        this.shotFeedbackPanel.style.transition = 'opacity 0.3s ease-in-out';
        this.shotFeedbackPanel.style.pointerEvents = 'none';
        this.uiContainer.appendChild(this.shotFeedbackPanel);

        // Create main info panel
        this.panel = document.createElement('div');
        this.panel.id = 'game-info-panel';
        this.panel.style.position = 'absolute';
        this.panel.style.top = '20px';
        this.panel.style.left = '20px';
        this.panel.style.background = 'rgba(0,0,0,0.5)';
        this.panel.style.padding = '20px 18px 18px 18px';
        this.panel.style.borderRadius = '10px';
        this.panel.style.color = 'white';
        this.panel.style.fontFamily = 'Arial, sans-serif';
        this.panel.style.zIndex = '1000';
        this.panel.style.display = 'flex';
        this.panel.style.flexDirection = 'column';
        this.panel.style.gap = '12px';
        this.uiContainer.appendChild(this.panel);

        // Hole info
        this.holeInfo = document.createElement('div');
        this.holeInfo.id = 'hole-info';
        this.panel.appendChild(this.holeInfo);

        // Distance info
        this.distanceInfo = document.createElement('div');
        this.distanceInfo.id = 'distance-info';
        this.panel.appendChild(this.distanceInfo);

        // Wind info
        this.windInfo = document.createElement('div');
        this.windInfo.id = 'wind-info';
        this.windInfo.style.display = 'flex';
        this.windInfo.style.alignItems = 'center';
        this.panel.appendChild(this.windInfo);

        this.windSpeedDisplay = document.createElement('div');
        this.windSpeedDisplay.style.marginRight = '10px';
        this.windInfo.appendChild(this.windSpeedDisplay);

        this.windArrow = document.createElement('div');
        this.windArrow.style.width = '20px';
        this.windArrow.style.height = '20px';
        this.windArrow.style.border = '2px solid white';
        this.windArrow.style.borderRadius = '50%';
        this.windArrow.style.position = 'relative';
        this.windInfo.appendChild(this.windArrow);

        this.arrowPointer = document.createElement('div');
        this.arrowPointer.style.width = '0';
        this.arrowPointer.style.height = '0';
        this.arrowPointer.style.borderLeft = '5px solid transparent';
        this.arrowPointer.style.borderRight = '5px solid transparent';
        this.arrowPointer.style.borderBottom = '10px solid white';
        this.arrowPointer.style.position = 'absolute';
        this.arrowPointer.style.top = '50%';
        this.arrowPointer.style.left = '50%';
        this.arrowPointer.style.transformOrigin = 'center';
        this.arrowPointer.style.transform = 'translate(-50%, -50%)';
        this.windArrow.appendChild(this.arrowPointer);

        // Club selector
        this.clubSelector = document.createElement('div');
        this.clubSelector.id = 'club-selector';
        this.clubSelector.style.marginTop = '10px';
        this.clubSelector.style.background = 'rgba(0,0,0,0.5)';
        this.clubSelector.style.padding = '10px';
        this.clubSelector.style.borderRadius = '5px';
        this.clubSelector.style.pointerEvents = 'auto';
        this.panel.appendChild(this.clubSelector);

        // Club-specific accuracy profiles
        this.clubAccuracyProfiles = {
            driver: { perfect: 0.3, okay: 0.3, bad: 0.4 },      // Hardest to hit perfectly
            '5wood': { perfect: 0.35, okay: 0.3, bad: 0.35 },   // Slightly easier than driver
            '7iron': { perfect: 0.4, okay: 0.3, bad: 0.3 },     // Mid-range iron
            '9iron': { perfect: 0.45, okay: 0.3, bad: 0.25 },   // Higher loft, more forgiving
            pitchingWedge: { perfect: 0.5, okay: 0.3, bad: 0.2 }, // Very forgiving
            sandWedge: { perfect: 0.5, okay: 0.3, bad: 0.2 },   // Similar to pitching wedge
            putter: { perfect: 0.6, okay: 0.3, bad: 0.1 }       // Most forgiving
        };
        
        // Store reference to terrain
        this.terrain = null;
        
        // Create power meter if it doesn't exist
        this.powerMeter = document.getElementById('power-meter');
        if (!this.powerMeter) {
            this.powerMeter = document.createElement('div');
            this.powerMeter.id = 'power-meter';
            this.uiContainer.appendChild(this.powerMeter);
        }
        
        // Create accuracy bar
        this.accuracyBar = document.createElement('div');
        this.accuracyBar.id = 'accuracy-bar';
        this.uiContainer.appendChild(this.accuracyBar);
        
        this.selectedClub = 'driver';
        
        // Reference to physics engine for ideal power calculation
        this.physicsEngine = null;

        // Add flag to track club changes
        this.clubChanged = false;

        // Add flag to track if ideal power indicator needs update
        this.idealPowerNeedsUpdate = true;

        // Add hole selector button
        this.holeSelector = document.createElement('div');
        this.holeSelector.id = 'hole-selector';
        this.holeSelector.style.marginTop = '10px';
        this.holeSelector.style.background = 'rgba(0,0,0,0.5)';
        this.holeSelector.style.padding = '10px';
        this.holeSelector.style.borderRadius = '5px';
        this.holeSelector.style.pointerEvents = 'auto';
        this.panel.appendChild(this.holeSelector);

        // Create hole selection buttons dynamically
        this.createHoleButtons();

        // Add game complete modal
        this.gameCompleteModal = document.createElement('div');
        this.gameCompleteModal.id = 'game-complete-modal';
        this.gameCompleteModal.style.display = 'none';
        this.gameCompleteModal.style.position = 'fixed';
        this.gameCompleteModal.style.top = '50%';
        this.gameCompleteModal.style.left = '50%';
        this.gameCompleteModal.style.transform = 'translate(-50%, -50%)';
        this.gameCompleteModal.style.background = 'rgba(0,0,0,0.9)';
        this.gameCompleteModal.style.padding = '20px';
        this.gameCompleteModal.style.borderRadius = '10px';
        this.gameCompleteModal.style.color = 'white';
        this.gameCompleteModal.style.textAlign = 'center';
        this.gameCompleteModal.style.zIndex = '1000';
        document.body.appendChild(this.gameCompleteModal);

        // Add restart menu
        this.addRestartMenu();

        // Add scorecard button and modal
        this.addScorecardButton();
        this.createScorecardModal();

        this.setupUI();
        
        // Select driver by default and update UI
        this.selectClub('driver');
    }

    setupUI() {
        this.clubSelector.innerHTML = '';
        ['driver', '5wood', '7iron', '9iron', 'pitchingWedge', 'sandWedge', 'putter'].forEach(club => {
            const button = document.createElement('button');
            // Format club name for display
            let displayName = club;
            if (club === 'driver') displayName = 'DR';
            if (club === '5wood') displayName = '5W';
            if (club === '7iron') displayName = '7I';
            if (club === '9iron') displayName = '9I';
            if (club === 'pitchingWedge') displayName = 'PW';
            if (club === 'sandWedge') displayName = 'SW';
            if (club === 'putter') displayName = 'P';
            
            button.textContent = displayName;
            // Store the actual club name as a data attribute
            button.setAttribute('data-club', club);
            button.onclick = () => this.selectClub(club);
            this.clubSelector.appendChild(button);
        });

        // Setup power meter with more visible styling
        this.powerMeter.style.width = '30px';
        this.powerMeter.style.height = '200px';
        this.powerMeter.style.backgroundColor = '#333333'; // Darker background for better contrast
        this.powerMeter.style.position = 'fixed';
        this.powerMeter.style.left = '50px';
        this.powerMeter.style.bottom = '20px';
        this.powerMeter.style.border = '3px solid #666'; // More visible border
        this.powerMeter.style.borderRadius = '5px';
        this.powerMeter.style.overflow = 'visible'; // Changed to visible to show the indicator
        this.powerMeter.style.zIndex = '1000';
        this.powerMeter.style.willChange = 'transform';
        
        // Create ideal power indicator with more visible styling
        this.idealPowerIndicator = document.createElement('div');
        this.idealPowerIndicator.className = 'ideal-power-indicator';
        
        // Make it a right-pointing triangle with larger size
        this.idealPowerIndicator.style.width = '0';
        this.idealPowerIndicator.style.height = '0';
        this.idealPowerIndicator.style.borderTop = '12px solid transparent';
        this.idealPowerIndicator.style.borderBottom = '12px solid transparent';
        this.idealPowerIndicator.style.borderLeft = '20px solid #ff0000'; // Brighter red
        
        this.idealPowerIndicator.style.position = 'absolute';
        this.idealPowerIndicator.style.right = '-22px';
        this.idealPowerIndicator.style.bottom = '50%';
        this.idealPowerIndicator.style.marginBottom = '-12px';
        this.idealPowerIndicator.style.zIndex = '1001';
        this.idealPowerIndicator.style.filter = 'drop-shadow(0 0 2px rgba(0,0,0,0.5))'; // Add shadow for visibility
        this.powerMeter.appendChild(this.idealPowerIndicator);

        // Create label for the indicator
        this.indicatorLabel = document.createElement('div');
        this.indicatorLabel.style.position = 'absolute';
        this.indicatorLabel.style.right = '-70px';
        this.indicatorLabel.style.width = '50px';
        this.indicatorLabel.style.textAlign = 'left';
        this.indicatorLabel.style.fontWeight = 'bold';
        this.indicatorLabel.style.fontSize = '14px';
        this.indicatorLabel.style.color = '#ffffff';
        this.indicatorLabel.style.textShadow = '1px 1px 2px #000';
        this.indicatorLabel.style.zIndex = '1001';
        this.indicatorLabel.textContent = 'IDEAL';
        this.powerMeter.appendChild(this.indicatorLabel);

        // Setup accuracy bar
        this.accuracyBar.style.width = '200px';
        this.accuracyBar.style.height = '30px';
        this.accuracyBar.style.backgroundColor = '#ddd';
        this.accuracyBar.style.position = 'fixed';
        this.accuracyBar.style.left = '50%';
        this.accuracyBar.style.bottom = '20px';
        this.accuracyBar.style.transform = 'translateX(-50%)';
        this.accuracyBar.style.border = '2px solid #333';
        this.accuracyBar.style.borderRadius = '5px';
        this.accuracyBar.style.overflow = 'hidden';
        this.accuracyBar.style.display = 'none';
        
        // Create accuracy bar zones
        this.createAccuracyZones();
        
        // Create accuracy slider
        this.accuracySlider = document.createElement('div');
        this.accuracySlider.className = 'accuracy-slider';
        this.accuracySlider.style.width = '8px';
        this.accuracySlider.style.height = '100%';
        this.accuracySlider.style.backgroundColor = 'white';
        this.accuracySlider.style.position = 'absolute';
        this.accuracySlider.style.top = '0';
        this.accuracySlider.style.left = '0';
        this.accuracySlider.style.zIndex = '2';
        this.accuracyBar.appendChild(this.accuracySlider);
    }
    
    createAccuracyZones() {
        // Clear any existing zones
        const existingZones = this.accuracyBar.querySelectorAll('.accuracy-zone');
        existingZones.forEach(zone => zone.remove());
        
        // Get profile for current club
        const profile = this.clubAccuracyProfiles[this.selectedClub] || this.clubAccuracyProfiles.driver;
        
        // Calculate zones based on profile
        // Structure: [left-bad, left-okay, perfect, right-okay, right-bad]
        const halfBad = profile.bad / 2;
        const halfOkay = profile.okay / 2;
        const zoneWidths = [halfBad, halfOkay, profile.perfect, halfOkay, halfBad];
        const zoneColors = ['#FF4444', '#FFAA00', '#44FF44', '#FFAA00', '#FF4444']; // Colors for each zone
        
        let position = 0;
        for (let i = 0; i < zoneWidths.length; i++) {
            const zone = document.createElement('div');
            zone.className = 'accuracy-zone';
            zone.style.width = `${zoneWidths[i] * 100}%`;
            zone.style.height = '100%';
            zone.style.backgroundColor = zoneColors[i];
            zone.style.position = 'absolute';
            zone.style.top = '0';
            zone.style.left = `${position * 100}%`;
            this.accuracyBar.appendChild(zone);
            
            position += zoneWidths[i];
        }
    }

    selectClub(club) {
        this.selectedClub = club;
        const buttons = this.clubSelector.getElementsByTagName('button');
        for (let button of buttons) {
            const buttonClub = button.getAttribute('data-club');
            button.style.backgroundColor = buttonClub === club ? '#4CAF50' : '';
        }
        // Update accuracy zones when club changes
        this.createAccuracyZones();
        
        // Update ideal power indicator when club changes
        this.idealPowerNeedsUpdate = true;
        this.updateIdealPowerIndicator();
        
        // Set the club changed flag to true
        this.clubChanged = true;
    }

    getSelectedClub() {
        return this.selectedClub;
    }

    updateHoleInfo(hole, par, strokes) {
        this.holeInfo.textContent = `Hole: ${hole} | Par: ${par} | Strokes: ${strokes}`;
        // Update scorecard if it's visible
        if (this.scorecardModal.style.display === 'block') {
            this.updateScorecard();
        }
    }

    updateDistance(ballPosition, holePosition) {
        const dx = ballPosition.x - holePosition.x;
        const dz = ballPosition.z - holePosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        this.distanceInfo.textContent = `Distance to pin: ${Math.round(distance)} yards`;
    }

    updateWind(speed, direction) {
        const now = performance.now() / 1000;
        if (now - (this.lastWindUpdate || 0) < 2) return;
        this.lastWindUpdate = now;

        this.windSpeedDisplay.textContent = `Wind: ${Math.round(speed)} mph`;
        const deg = THREE.MathUtils.radToDeg(direction);
        this.arrowPointer.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
        this.arrowPointer.style.borderBottomColor = speed > 7.5 ? '#ff4444' : '#44ff44';
    }

    // Set physics engine reference
    setPhysicsEngine(physicsEngine) {
        this.physicsEngine = physicsEngine;
        // Update ideal power indicator when physics engine is set
        this.updateIdealPowerIndicator();
    }
    updatePowerMeter(power) {
        // Store the power for shot feedback
        this.lastPower = power;
        
        let bar = this.powerMeter.querySelector('.power-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'power-bar power-bar-fill';
            bar.style.width = '100%';
            bar.style.height = '100%';
            bar.style.backgroundColor = 'lime';
            bar.style.position = 'absolute';
            bar.style.left = '0';
            bar.style.bottom = '0';
            bar.style.transformOrigin = 'bottom';
            bar.style.transform = 'scaleY(0)';
            // Remove transition for smoother updates
            bar.style.willChange = 'transform';
            this.powerMeter.appendChild(bar);
        }
    
        // Set color based on power
        bar.style.backgroundColor = `hsl(${power * 120}, 100%, 50%)`;
    
        // Use transform for better performance, without transition
        bar.style.transform = `translate3d(0, 0, 0) scaleY(${power})`;
    }
    
    updateIdealPowerIndicator() {
        // Only update if needed and we have required components
        if (!this.idealPowerNeedsUpdate || !this.physicsEngine || !this.idealPowerIndicator) {
            return;
        }
        
        const club = this.selectedClub;
        try {
            // Get ideal power to hole with current club
            let idealPower = this.physicsEngine.getIdealPowerToHole(club);
            
            // Ensure idealPower is a valid number and clamp it
            if (isNaN(idealPower)) {
                console.error("Invalid ideal power calculated (NaN):", idealPower);
                idealPower = 0;
            }
            idealPower = Math.min(1, Math.max(0, idealPower));
            
            // Check if we're on the green
            const isOnGreen = this.physicsEngine.terrain && 
                this.physicsEngine.terrain.getSurfaceTypeAt(
                    this.physicsEngine.ball.position.x, 
                    this.physicsEngine.ball.position.z
                ) === 'green';
            const isPutter = club === 'putter';
            
            // Position the indicator
            const bottomPosition = `${idealPower * 100}%`;
            this.idealPowerIndicator.style.bottom = bottomPosition;
            
            // Update triangle color based on whether hole is in range and if putting
            let color;
            if (isOnGreen && isPutter) {
                color = '#00ffff'; // Cyan for putting
            } else {
                color = idealPower >= 0.99 ? '#ff6666' : '#00ff00'; // Red or bright green
            }
            this.idealPowerIndicator.style.borderLeftColor = color;
            
            // Update label text and position
            if (isOnGreen && isPutter) {
                this.indicatorLabel.textContent = 'PUTT';
            } else {
                this.indicatorLabel.textContent = idealPower >= 0.99 ? 'MAX' : 'IDEAL';
            }
            this.indicatorLabel.style.bottom = bottomPosition;
            this.indicatorLabel.style.marginBottom = '-7px';
            
            // Mark as updated
            this.idealPowerNeedsUpdate = false;
            
        } catch (error) {
            console.error("Error updating ideal power indicator:", error);
        }
    }
    
    showAccuracyBar() {
        // Return early if already visible
        if (this.accuracyBar.style.display === 'block') {
            return;
        }

        // Set display to block
        this.accuracyBar.style.display = 'block';
        
        // Remove animation class if it exists
        this.accuracyBar.classList.remove('accuracy-bar-enter');
        
        // Force reflow
        void this.accuracyBar.offsetWidth;
        
        // Add animation class
        this.accuracyBar.classList.add('accuracy-bar-enter');
    }
    
    hideAccuracyBar() {
        this.accuracyBar.style.display = 'none';
    }
    
    updateAccuracyBar(position) {
        // Update the slider position (0-1 range)
        this.accuracySlider.style.left = `${position * 100}%`;
    }
    
    getAccuracyResult(position) {
        // Get profile for current club
        const profile = this.clubAccuracyProfiles[this.selectedClub] || this.clubAccuracyProfiles.driver;
        
        // Calculate boundaries based on profile
        const badLeftEnd = profile.bad / 2;
        const okayLeftEnd = badLeftEnd + (profile.okay / 2);
        const perfectStart = okayLeftEnd;
        const perfectEnd = perfectStart + profile.perfect;
        const okayRightEnd = perfectEnd + (profile.okay / 2);
        
        // Determine what zone the slider is in based on club-specific boundaries
        if (position >= perfectStart && position <= perfectEnd) {
            return 'perfect'; // Green zone
        } else if ((position >= badLeftEnd && position < perfectStart) || 
                  (position > perfectEnd && position <= okayRightEnd)) {
            return 'okay'; // Yellow zone
        } else {
            return 'bad'; // Red zone
        }
    }

    showGameComplete(totalStrokes, scoreRelativeToPar) {
        this.gameCompleteModal.innerHTML = `
            <h2>Game Complete!</h2>
            <p>Total Score: ${totalStrokes} strokes</p>
            <p>Score vs Par: ${scoreRelativeToPar}</p>
            <button onclick="window.location.reload()">Play Again</button>
        `;
        this.gameCompleteModal.style.display = 'block';
    }

    addRestartMenu() {
        const restartMenu = document.createElement('div');
        restartMenu.id = 'restart-menu';
        restartMenu.style.marginTop = '10px';
        restartMenu.style.background = 'rgba(0,0,0,0.5)';
        restartMenu.style.padding = '10px';
        restartMenu.style.borderRadius = '5px';
        restartMenu.style.pointerEvents = 'auto';
        this.panel.appendChild(restartMenu);

        // Restart current hole button
        const restartHoleBtn = document.createElement('button');
        restartHoleBtn.textContent = 'Restart Hole (R)';
        restartHoleBtn.style.marginRight = '10px';
        restartHoleBtn.onclick = () => {
            if (confirm('Are you sure you want to restart this hole?')) {
                window.restartCurrentHole();
            }
        };
        restartMenu.appendChild(restartHoleBtn);

        // Restart game button
        const restartGameBtn = document.createElement('button');
        restartGameBtn.textContent = 'Restart Game ';
        restartGameBtn.onclick = () => {
            if (confirm('Are you sure you want to restart the entire game?')) {
                window.restartGame();
            }
        };
        restartMenu.appendChild(restartGameBtn);
    }

    createHoleButtons() {
        // Clear existing buttons
        this.holeSelector.innerHTML = '';
        
        // Add "Hole" label
        const label = document.createElement('div');
        label.textContent = 'Hole';
        label.style.marginBottom = '5px';
        label.style.fontWeight = 'bold';
        this.holeSelector.appendChild(label);
        
        // Create container for buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexWrap = 'wrap';
        buttonContainer.style.gap = '5px';
        buttonContainer.style.maxWidth = '120px'; // This will force wrapping after 3 buttons
        this.holeSelector.appendChild(buttonContainer);
        
        // Get all hole configurations from the window object
        const holeConfigs = window.holeConfigs || {};
        
        // Create a button for each hole
        Object.keys(holeConfigs).forEach(holeNumber => {
            const config = holeConfigs[holeNumber];
            const button = document.createElement('button');
            button.textContent = holeNumber; // Just show the number
            button.style.width = '30px';
            button.style.height = '30px';
            button.style.padding = '0';
            button.style.fontSize = '14px';
            button.style.fontWeight = 'bold';
            button.style.cursor = 'pointer';
            button.style.backgroundColor = '#4CAF50';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.title = `Hole ${holeNumber} (Par ${config.par})`; // Show full info on hover
            button.onclick = () => window.loadHole(parseInt(holeNumber));
            buttonContainer.appendChild(button);
        });
    }

    addScorecardButton() {
        const scorecardBtn = document.createElement('button');
        scorecardBtn.textContent = 'Scorecard (S)';
        scorecardBtn.style.marginRight = '10px';
        scorecardBtn.onclick = () => this.toggleScorecard();
        this.panel.appendChild(scorecardBtn);
    }

    createScorecardModal() {
        this.scorecardModal = document.createElement('div');
        this.scorecardModal.id = 'scorecard-modal';
        this.scorecardModal.style.display = 'none';
        this.scorecardModal.style.position = 'fixed';
        this.scorecardModal.style.top = '50%';
        this.scorecardModal.style.left = '50%';
        this.scorecardModal.style.transform = 'translate(-50%, -50%)';
        this.scorecardModal.style.background = 'rgba(0,0,0,0.9)';
        this.scorecardModal.style.padding = '20px';
        this.scorecardModal.style.borderRadius = '10px';
        this.scorecardModal.style.color = 'white';
        this.scorecardModal.style.zIndex = '1000';
        this.scorecardModal.style.minWidth = '300px';
        document.body.appendChild(this.scorecardModal);
    }

    toggleScorecard() {
        if (this.scorecardModal.style.display === 'none') {
            this.updateScorecard();
        } else {
            this.scorecardModal.style.display = 'none';
        }
    }

    updateScorecard() {
        // Get state from localStorage
        let state;
        try {
            const savedState = localStorage.getItem('golfGameState');
            state = savedState ? JSON.parse(savedState) : { holeScores: {}, completedHoles: [] };
            console.log('Loaded game state for scorecard:', state); // Debug log
        } catch (error) {
            console.error('Error loading game state:', error);
            state = { holeScores: {}, completedHoles: [] };
        }
        
        const holeConfigs = window.holeConfigs || {};
        
        let totalStrokes = 0;
        let totalPar = 0;
        let html = '<h2>Scorecard</h2>';
        html += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
        html += '<tr><th>Hole</th><th>Par</th><th>Score</th><th>+/-</th></tr>';
        
        // Add rows for each hole
        Object.keys(holeConfigs).forEach(holeNumber => {
            const config = holeConfigs[holeNumber];
            const score = state.holeScores[holeNumber] || '-';
            const par = config.par;
            const relativeScore = score === '-' ? '-' : score - par;
            const relativeScoreText = relativeScore === '-' ? '-' : 
                                    relativeScore > 0 ? `+${relativeScore}` : 
                                    relativeScore < 0 ? relativeScore : 'E';
            
            if (score !== '-') {
                totalStrokes += score;
                totalPar += par;
            }
            
            // Highlight current hole
            const isCurrentHole = parseInt(holeNumber) === window.currentHole;
            const rowStyle = isCurrentHole ? 'background-color: rgba(255, 255, 0, 0.2);' : '';
            
            html += `<tr style="border-bottom: 1px solid #444; ${rowStyle}">
                <td style="padding: 5px;">${holeNumber}</td>
                <td style="padding: 5px;">${par}</td>
               <td style="padding: 5px;">${score}</td>
                <td style="padding: 5px;">${relativeScoreText}</td>
            </tr>`;
        });
        
        // Add total row
        const totalRelative = totalStrokes - totalPar;
        const totalRelativeText = totalRelative > 0 ? `+${totalRelative}` : 
                                totalRelative < 0 ? totalRelative : 'E';
        
        html += `<tr style="border-top: 2px solid #666; font-weight: bold;">
            <td style="padding: 5px;">Total</td>
            <td style="padding: 5px;">${totalPar}</td>
            <td style="padding: 5px;">${totalStrokes}</td>
            <td style="padding: 5px;">${totalRelativeText}</td>
        </tr>`;
        
        html += '</table>';
        html += '<button onclick="document.getElementById(\'scorecard-modal\').style.display=\'none\'" style="margin-top: 15px;">Close</button>';
        
        this.scorecardModal.innerHTML = html;
        this.scorecardModal.style.display = 'block'; // Ensure modal is visible
    }

    showShotFeedback(accuracy, distance) {
        // Get the ideal power for the current club and distance
        const idealPower = this.physicsEngine.getIdealPowerToHole(this.selectedClub);
        const actualPower = this.lastPower || 0; // Store power when taking shot
        
        // Calculate power rating (how close to ideal power)
        const powerDiff = Math.abs(actualPower - idealPower);
        let powerRating;
        if (powerDiff <= 0.1) {
            powerRating = 'perfect';
        } else if (powerDiff <= 0.2) {
            powerRating = 'okay';
        } else {
            powerRating = 'bad';
        }
        
        // Combine accuracy and power ratings
        let finalRating;
        if (accuracy === 'perfect' && powerRating === 'perfect') {
            finalRating = 'Perfect Shot!';
        } else if ((accuracy === 'perfect' && powerRating === 'okay') || 
                  (accuracy === 'okay' && powerRating === 'perfect')) {
            finalRating = 'Great Shot!';
        } else if (accuracy === 'okay' && powerRating === 'okay') {
            finalRating = 'Good Shot';
        } else if (accuracy === 'bad' || powerRating === 'bad') {
            finalRating = 'Missed';
        } else {
            finalRating = 'Shot Complete';
        }

        // Update panel content
        this.shotFeedbackPanel.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">${finalRating}</div>
            <div style="font-size: 18px;">Distance: ${Math.round(distance)} yards</div>
        `;

        // Show panel
        this.shotFeedbackPanel.style.opacity = '1';

        // Hide panel after 2 seconds
        setTimeout(() => {
            this.shotFeedbackPanel.style.opacity = '0';
        }, 2000);
    }

    // Add method to force update of ideal power indicator
    forceUpdateIdealPower() {
        this.idealPowerNeedsUpdate = true;
        this.updateIdealPowerIndicator();
    }
}

// Add CSS animation for accuracy bar and power indicator
const style = document.createElement('style');
style.textContent = `
@keyframes scaleIn {
    0% { transform: translate3d(-50%, 0, 0) scale3d(0.5, 1, 1); opacity: 0; }
    100% { transform: translate3d(-50%, 0, 0) scale3d(1, 1, 1); opacity: 1; }
}

#accuracy-bar {
    will-change: transform, opacity;
    transform: translate3d(-50%, 0, 0);
    backface-visibility: hidden;
    perspective: 1000px;
}

.accuracy-bar-enter {
    animation: scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
`;
document.head.appendChild(style);

export { UIManager };