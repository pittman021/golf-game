/**
 * Game State Manager
 * Handles saving and loading game state to/from localStorage
 */

// Game state structure
const defaultState = {
    currentHole: 1,
    totalStrokes: 0,
    holeScores: {},
    completedHoles: [],
    lastSaved: Date.now()
};

/**
 * Save the current game state to localStorage
 * @param {Object} state - The game state to save
 */
export function saveGameState(state) {
    try {
        const stateToSave = {
            ...state,
            lastSaved: Date.now()
        };
        localStorage.setItem('golfGameState', JSON.stringify(stateToSave));
        console.log('Game state saved successfully');
    } catch (error) {
        console.error('Error saving game state:', error);
    }
}

/**
 * Load the game state from localStorage
 * @returns {Object|null} The saved game state or null if none exists
 */
export function loadGameState() {
    try {
        const savedState = localStorage.getItem('golfGameState');
        if (savedState) {
            const state = JSON.parse(savedState);
            console.log('Game state loaded successfully');
            return state;
        }
    } catch (error) {
        console.error('Error loading game state:', error);
    }
    return null;
}

/**
 * Save a hole score to the game state
 * @param {number} holeNumber - The hole number
 * @param {number} strokes - The number of strokes
 */
export function saveHoleScore(holeNumber, strokes) {
    const state = loadGameState() || { ...defaultState };
    
    state.holeScores[holeNumber] = strokes;
    state.totalStrokes += strokes;
    
    if (!state.completedHoles.includes(holeNumber)) {
        state.completedHoles.push(holeNumber);
    }
    
    saveGameState(state);
}

/**
 * Clear the saved game state
 */
export function clearGameState() {
    try {
        localStorage.removeItem('golfGameState');
        console.log('Game state cleared successfully');
    } catch (error) {
        console.error('Error clearing game state:', error);
    }
}

/**
 * Get the default game state
 * @returns {Object} The default game state
 */
export function getDefaultState() {
    return { ...defaultState };
} 