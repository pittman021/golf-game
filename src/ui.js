// Import Three.js if not globally available
import * as THREE from 'three';

class UIManager {
    constructor() {
        // Get UI container
        this.uiContainer = document.getElementById('ui-container');
        if (!this.uiContainer) {
            console.warn('UI container not found, creating one');
            this.uiContainer = document.createElement('div');
            this.uiContainer.id = 'ui-container';
            document.body.appendChild(this.uiContainer);
        }

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
            driver: { perfect: 0.3, okay: 0.3, bad: 0.4 },
            iron: { perfect: 0.4, okay: 0.3, bad: 0.3 },
            wedge: { perfect: 0.5, okay: 0.3, bad: 0.2 },
            putter: { perfect: 0.6, okay: 0.3, bad: 0.1 }
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

        // Add hole selector button
        this.holeSelector = document.createElement('div');
        this.holeSelector.id = 'hole-selector';
        this.holeSelector.style.marginTop = '10px';
        this.holeSelector.style.background = 'rgba(0,0,0,0.5)';
        this.holeSelector.style.padding = '10px';
        this.holeSelector.style.borderRadius = '5px';
        this.holeSelector.style.pointerEvents = 'auto';
        this.panel.appendChild(this.holeSelector);

        // Add hole buttons
        const hole1Button = document.createElement('button');
        hole1Button.textContent = 'Hole 1 (Par 3)';
        hole1Button.onclick = () => window.loadHole(1);
        this.holeSelector.appendChild(hole1Button);

        const hole2Button = document.createElement('button');
        hole2Button.textContent = 'Hole 2 (Par 5)';
        hole2Button.onclick = () => window.loadHole(2);
        this.holeSelector.appendChild(hole2Button);

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

        this.setupUI();
    }

    setupUI() {
        this.clubSelector.innerHTML = '';
        ['driver', 'iron', 'wedge', 'putter'].forEach(club => {
            const button = document.createElement('button');
            button.textContent = club.charAt(0).toUpperCase() + club.slice(1);
            button.onclick = () => this.selectClub(club);
            this.clubSelector.appendChild(button);
        });

        this.powerMeter.style.width = '30px';
        this.powerMeter.style.height = '200px';
        this.powerMeter.style.backgroundColor = '#aaaaaa'; // Slightly darker gray
        this.powerMeter.style.position = 'fixed';
        this.powerMeter.style.left = '50px';
        this.powerMeter.style.bottom = '20px';
        this.powerMeter.style.border = '3px solid #000'; // Thicker black border
        this.powerMeter.style.borderRadius = '5px';
        this.powerMeter.style.overflow = 'visible'; // Changed to visible to show indicator outside
        this.powerMeter.style.zIndex = '1000'; // Ensure it's visible above everything
        
        // Create a completely different style of indicator - visible arrow on the right side
        this.idealPowerIndicator = document.createElement('div');
        this.idealPowerIndicator.className = 'ideal-power-indicator';
        
        // Make it a right-pointing triangle
        this.idealPowerIndicator.style.width = '0';
        this.idealPowerIndicator.style.height = '0';
        this.idealPowerIndicator.style.borderTop = '10px solid transparent';
        this.idealPowerIndicator.style.borderBottom = '10px solid transparent';
        this.idealPowerIndicator.style.borderLeft = '15px solid red'; // Red triangle pointing right
        
        this.idealPowerIndicator.style.position = 'absolute';
        this.idealPowerIndicator.style.right = '-18px'; // Position it outside the meter
        this.idealPowerIndicator.style.bottom = '50%'; // Start at middle for testing
        this.idealPowerIndicator.style.marginBottom = '-5px'; // Center it vertically
        this.idealPowerIndicator.style.zIndex = '1001'; // Higher than the meter
        this.powerMeter.appendChild(this.idealPowerIndicator);

        
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
        console.log(`Club changed from ${this.selectedClub} to ${club}`);
        this.selectedClub = club;
        const buttons = this.clubSelector.getElementsByTagName('button');
        for (let button of buttons) {
            button.style.backgroundColor = button.textContent.toLowerCase() === club ? '#4CAF50' : '';
        }
        // Update accuracy zones when club changes
        this.createAccuracyZones();
        
        // Update ideal power indicator for new club
        this.updateIdealPowerIndicator();
        
        // Set the club changed flag to true
        this.clubChanged = true;
    }

    getSelectedClub() {
        return this.selectedClub;
    }

    updateHoleInfo(hole, par, strokes) {
        this.holeInfo.textContent = `Hole: ${hole} | Par: ${par} | Strokes: ${strokes}`;
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
        console.log("Physics engine set in UI Manager:", !!this.physicsEngine);
        console.log("Club distances cached:", this.physicsEngine ? !!this.physicsEngine.clubDistancesCache : false);
    }

    updatePowerMeter(power) {
        console.log("Updating power meter with power:", power);
        
        const bar = this.powerMeter.querySelector('.power-bar') || document.createElement('div');
        bar.className = 'power-bar';
        bar.style.width = '100%';
        bar.style.height = `${power * 100}%`;
        bar.style.backgroundColor = `hsl(${power * 120}, 100%, 50%)`;
        bar.style.position = 'absolute';
        bar.style.left = '0';
        bar.style.bottom = '0';
        bar.style.transition = 'height 0.1s ease-out';
        
        if (!this.powerMeter.contains(bar)) {
            console.log("Adding power bar to power meter");
            this.powerMeter.appendChild(bar);
        }
        
        // Debug power bar state
        console.log("Power bar updated:", {
            height: bar.style.height,
            backgroundColor: bar.style.backgroundColor,
            inDOM: this.powerMeter.contains(bar)
        });
        
        // Don't update the power indicator here, it should only update when club changes or ball stops
    }
    
    updateIdealPowerIndicator() {
        // Only update if we have a physics engine reference
        if (!this.physicsEngine) {
            console.log("Physics engine not available for power indicator");
            return;
        }
        
        if (!this.idealPowerIndicator) {
            console.log("Ideal power indicator element not found");
            return;
        }
        
        // Log when the indicator is updated and why
        console.log(`Updating ideal power indicator for ${this.selectedClub}`);
        
        const club = this.selectedClub;
        try {
            // Get ideal power to hole with current club
            const idealPower = this.physicsEngine.getIdealPowerToHole(club);
            
            // Ensure idealPower is a valid number
            if (isNaN(idealPower) || idealPower <= 0) {
                console.error("Invalid ideal power calculated:", idealPower);
                return;
            }
            
            // Convert to 0-1 range for display
            const normalizedPower = idealPower / this.physicsEngine.maxPower;
            console.log(`Normalized power: ${(normalizedPower * 100).toFixed(0)}% of max`);
            
            // Check if we're using full power (meaning the hole is potentially out of range)
            const isMaxPower = normalizedPower >= 0.99;
            
            // Position the indicator
            const bottomPosition = `${normalizedPower * 100}%`;
            this.idealPowerIndicator.style.bottom = bottomPosition;
            
            // Update triangle color based on whether hole is in range
            const color = isMaxPower ? '#ff6666' : '#00ff00'; // Red or bright green
            this.idealPowerIndicator.style.borderLeftColor = color;
            
            // Add a label to make it super obvious
            if (!this.indicatorLabel) {
                this.indicatorLabel = document.createElement('div');
                this.indicatorLabel.style.position = 'absolute';
                this.indicatorLabel.style.right = '-60px';
                this.indicatorLabel.style.width = '40px';
                this.indicatorLabel.style.textAlign = 'left';
                this.indicatorLabel.style.fontWeight = 'bold';
                this.indicatorLabel.style.fontSize = '12px';
                this.indicatorLabel.style.color = '#ffffff';
                this.indicatorLabel.style.textShadow = '1px 1px 2px #000';
                this.indicatorLabel.style.zIndex = '1001';
                this.powerMeter.appendChild(this.indicatorLabel);
            }
            
            // Update label text and position
            this.indicatorLabel.textContent = isMaxPower ? 'MAX' : 'IDEAL';
            this.indicatorLabel.style.bottom = bottomPosition;
            this.indicatorLabel.style.marginBottom = '-6px'; // Center it vertically
            
            console.log(`Indicator updated to position: ${bottomPosition} (${(normalizedPower * 100).toFixed(0)}%), color: ${color}`);
        } catch (error) {
            console.error("Error updating ideal power indicator:", error);
        }
    }
    
    showAccuracyBar() {
        // Add entrance animation
        this.accuracyBar.style.display = 'block';
        this.accuracyBar.style.animation = 'scaleIn 0.3s ease-out';
        
        // Reset slider position
        this.accuracySlider.style.left = '0';
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

    showGameComplete(totalStrokes) {
        this.gameCompleteModal.innerHTML = `
            <h2>Game Complete!</h2>
            <p>Total Score: ${totalStrokes} strokes</p>
            <button onclick="window.location.reload()">Play Again</button>
        `;
        this.gameCompleteModal.style.display = 'block';
    }
}

// Add CSS animation for accuracy bar and power indicator
const style = document.createElement('style');
style.textContent = `
@keyframes scaleIn {
    0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
    100% { transform: translateX(-50%) scale(1); opacity: 1; }
}
`;
document.head.appendChild(style);

export { UIManager };
