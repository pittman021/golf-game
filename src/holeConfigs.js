/**
 * Golf Course Hole Configurations
 * 
 * This module defines the configuration for each golf hole in the game.
 * Each hole configuration includes:
 * - Dimensions (width, depth, resolution)
 * - Hole number and par
 * - Tee position and elevation
 * - Green position, radius, and elevation
 * - Fairway path and width
 * - Bunker positions and sizes
 * - Tree positions and distribution
 * 
 * The configurations are used by the Terrain class to generate the 3D course layout
 * and by the game logic to set up hole-specific gameplay elements.
 */

import * as THREE from 'three';

// Base configuration for all holes
const baseConfig = {
    width: 600,    // Course width in units
    depth: 300,    // Course depth in units
    resolution: 128 // Terrain mesh resolution
};

/**
 * Hole 1 Configuration - Par 3 Straight Hole
 * A straightforward par 3 hole with:
 * - Straight fairway from tee to green
 * - Two bunkers protecting the green
 * - Elevated tee position
 * - Flat green area
 */
export const hole1Config = {
    ...baseConfig,
    holeNumber: 1,
    par: 3,
    tee: { x: -250, z: 0, elevation: 2 },
    green: { x: 250, z: 0, radius: 18, elevation: 1 },
    fairway: {
        width: 70,
        path: [
            { x: -250, z: 0 },
            { x: 250, z: 0 }
        ]
    },
    bunkers: [
        { x: 240, z: -20, radius: 15 },
        { x: 260, z: 25, radius: 10 }
    ],
    trees: {
        count: 30,
        scatterAround: 'rough',
        positions: [
            { x: -200, z: -70 },
            { x: -200, z: 70 },
            { x: 260, z: -25 },
            { x: 270, z: 20 }
        ]
    }
};

/**
 * Hole 2 Configuration - Par 5 Dogleg Right
 * A challenging par 5 hole featuring:
 * - Dogleg right fairway design
 * - Multiple bunkers including a large one at the dogleg
 * - Elevated tee position
 * - Strategically placed trees
 * - Complex approach to the green
 */
export const hole2Config = {
    ...baseConfig,
    holeNumber: 2,
    par: 5,
    tee: { x: -250, z: 0, elevation: 5 },
    green: { x: 250, z: 120, radius: 18, elevation: 1 },
    fairway: {
        width: 70,
        path: [
            { x: -250, z: 0 },
            { x: 150, z: 50 },
            { x: 250, z: 120 }
        ]
    },
    bunkers: [
        { x: 160, z: 60, radius: 20 }, // Large bunker at dogleg corner
        { x: 240, z: 130, radius: 12 }, // Small bunker near green
        { x: 260, z: 110, radius: 12 }  // Small bunker near green
    ],
    trees: {
        count: 40,
        scatterAround: 'rough',
        positions: [
            { x: -200, z: -70 },
            { x: -200, z: 70 },
            { x: 0, z: -80 },
            { x: 0, z: 80 },
            { x: 150, z: -60 },
            { x: 150, z: 60 },
            { x: 250, z: -40 },
            { x: 250, z: 40 }
        ]
    }
};

// Export all hole configurations
export const holeConfigs = {
    1: hole1Config,
    2: hole2Config
}; 