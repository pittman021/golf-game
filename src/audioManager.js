class AudioManager {
    constructor() {
        console.log('Initializing AudioManager...');
        // Initialize audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext state:', this.audioContext.state);
        
        // Store audio buffers
        this.sounds = {
            driver: null,
            iron: null,
            putter: null
        };
        
        // Track if audio is initialized
        this.isInitialized = false;
        
        // Volume level (0-1)
        this.volume = 0.5;
        
        // Preload all sounds
        this.preloadSounds();
    }
    
    async preloadSounds() {
        console.log('Starting sound preload...');
        try {
            // Load all sound files
            const [driverBuffer, ironBuffer, putterBuffer] = await Promise.all([
                this.loadSound('sounds/driver.mp3'),
                this.loadSound('sounds/iron.mp3'),
                this.loadSound('sounds/putter.mp3')
            ]);
            
            // Store the buffers
            this.sounds.driver = driverBuffer;
            this.sounds.iron = ironBuffer;
            this.sounds.putter = putterBuffer;
            
            this.isInitialized = true;
            console.log('All sounds preloaded successfully:', {
                driver: !!driverBuffer,
                iron: !!ironBuffer,
                putter: !!putterBuffer
            });
        } catch (error) {
            console.error('Error preloading sounds:', error);
        }
    }
    
    async loadSound(url) {
        console.log(`Loading sound: ${url}`);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log(`Successfully loaded sound: ${url}`);
            return buffer;
        } catch (error) {
            console.error(`Error loading sound ${url}:`, error);
            return null;
        }
    }
    
    playSound(clubType) {
        console.log(`Attempting to play sound for club: ${clubType}`);
        console.log('AudioContext state:', this.audioContext.state);
        console.log('Is initialized:', this.isInitialized);
        
        // Don't play if not initialized or no user interaction yet
        if (!this.isInitialized) {
            console.log('Audio not initialized yet');
            return;
        }
        
        if (this.audioContext.state === 'suspended') {
            console.log('Audio context is suspended, attempting to resume...');
            this.resumeAudio();
            return;
        }
        
        // Get the appropriate sound buffer
        const buffer = this.sounds[clubType];
        if (!buffer) {
            console.warn(`No sound found for club type: ${clubType}`);
            return;
        }
        
        try {
            // Create a new source
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.volume;
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Play the sound
            source.start(0);
            console.log(`Successfully started playing sound for ${clubType}`);
        } catch (error) {
            console.error(`Error playing sound for ${clubType}:`, error);
        }
    }
    
    // Method to resume audio context (call this on first user interaction)
    resumeAudio() {
        console.log('Attempting to resume audio context...');
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('Audio context resumed successfully');
            }).catch(error => {
                console.error('Error resuming audio context:', error);
            });
        }
    }
    
    // Method to set volume (0-1)
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        console.log(`Volume set to: ${this.volume}`);
    }
}

export { AudioManager }; 