import * as THREE from 'three';
import { nudgeConflictingBunkers } from './terrainUtils';

const baseConfig = {
    width: 600,
    depth: 300,
    resolution: 165
};

export const hole1Config = {
    ...baseConfig,
    holeNumber: 1,
    par: 5,
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
nudgeConflictingBunkers(hole1Config);

export const hole2Config = {
    ...baseConfig,
    holeNumber: 2,
    par: 4,
    tee: { x: -180, z: 0, elevation: 5 },
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
        { x: 160, z: 60, radius: 20 },
        { x: 230, z: 140, radius: 10 },
        { x: 270, z: 100, radius: 10 }
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
nudgeConflictingBunkers(hole2Config);

export const hole3Config = {
    ...baseConfig,
    holeNumber: 3,
    par: 3,
    tee: { x: 0, z: 0, elevation: 5 },
    green: { x: 90, z: 40, radius: 14, elevation: 2 },
    fairway: {
        width: 30,
        path: [
            { x: 0, z: 0 },
            { x: 90, z: 40 }
        ]
    },
    bunkers: [
        { x: 85, z: 30, radius: 8 },
        { x: 95, z: 45, radius: 6 }
    ],
    trees: {
        count: 2,
        scatterAround: 'manual',
        positions: [
            { x: 40, z: 20 },
            { x: 50, z: -10 }
        ]
    }
};
nudgeConflictingBunkers(hole3Config);

export const hole4Config = {
    ...baseConfig,
    holeNumber: 4,
    par: 5,
    tee: { x: -300, z: 0, elevation: 10 },
    green: { x: 300, z: -50, radius: 18, elevation: 2 },
    fairway: {
        width: 70,
        path: [
            { x: -300, z: 0 },
            { x: 0, z: 60 },
            { x: 300, z: -50 }
        ]
    },
    bunkers: [
        { x: 0, z: 50, radius: 15 },
        { x: 280, z: -40, radius: 10 },
        { x: 310, z: -60, radius: 10 }
    ],
    trees: {
        count: 2,
        scatterAround: 'manual',
        positions: [
            { x: -150, z: 30 },
            { x: 150, z: 70 }
        ]
    }
};
nudgeConflictingBunkers(hole4Config);

export const hole5Config = {
    ...baseConfig,
    holeNumber: 5,
    par: 4,
    tee: { x: -200, z: 50, elevation: 2 },
    green: { x: 200, z: 120, radius: 16, elevation: 6 },
    fairway: {
        width: 50,
        path: [
            { x: -200, z: 50 },
            { x: 0, z: 90 },
            { x: 200, z: 120 }
        ]
    },
    bunkers: [
        { x: 180, z: 110, radius: 12 }
    ],
    trees: {
        count: 3,
        scatterAround: 'manual',
        positions: [
            { x: -100, z: 60 },
            { x: 100, z: 100 },
            { x: 120, z: 80 }
        ]
    }
};
nudgeConflictingBunkers(hole5Config);

export const hole6Config = {
    ...baseConfig,
    holeNumber: 6,
    par: 4,
    tee: { x: -250, z: 0, elevation: 6 },
    green: { x: 250, z: 80, radius: 18, elevation: 1 },
    fairway: {
        width: 60,
        path: [
            { x: -250, z: 0 },
            { x: 100, z: 40 },
            { x: 250, z: 80 }
        ]
    },
    bunkers: [
        { x: 230, z: 75, radius: 10 },
        { x: 150, z: 60, radius: 10 }
    ],
    trees: {
        count: 3,
        scatterAround: 'manual',
        positions: [
            { x: -100, z: 20 },
            { x: 0, z: 30 },
            { x: 150, z: 50 }
        ]
    }
};
nudgeConflictingBunkers(hole6Config);

export const hole7Config = {
    ...baseConfig,
    holeNumber: 7,
    par: 3,
    tee: { x: 0, z: 0, elevation: 3 },
    green: { x: 120, z: -30, radius: 14, elevation: 0 },
    fairway: {
        width: 28,
        path: [
            { x: 0, z: 0 },
            { x: 120, z: -30 }
        ]
    },
    bunkers: [
        { x: 115, z: -25, radius: 7 },
        { x: 125, z: -35, radius: 7 }
    ],
    trees: {
        count: 1,
        scatterAround: 'manual',
        positions: [
            { x: 60, z: -10 }
        ]
    }
};
nudgeConflictingBunkers(hole7Config);

export const hole8Config = {
    ...baseConfig,
    holeNumber: 8,
    par: 5,
    tee: { x: -350, z: 50, elevation: 12 },
    green: { x: 300, z: 100, radius: 18, elevation: 3 },
    fairway: {
        width: 65,
        path: [
            { x: -350, z: 50 },
            { x: -100, z: 90 },
            { x: 150, z: 70 },
            { x: 300, z: 100 }
        ]
    },
    bunkers: [
        { x: -80, z: 85, radius: 12 },
        { x: 290, z: 90, radius: 10 }
    ],
    trees: {
        count: 2,
        scatterAround: 'manual',
        positions: [
            { x: -300, z: 60 },
            { x: 200, z: 85 }
        ]
    }
};
nudgeConflictingBunkers(hole8Config);

export const hole9Config = {
    ...baseConfig,
    holeNumber: 9,
    par: 4,
    tee: { x: -200, z: -30, elevation: 2 },
    green: { x: 220, z: 10, radius: 16, elevation: 5 },
    fairway: {
        width: 55,
        path: [
            { x: -200, z: -30 },
            { x: 0, z: -10 },
            { x: 220, z: 10 }
        ]
    },
    bunkers: [
        { x: 210, z: 5, radius: 10 }
    ],
    trees: {
        count: 2,
        scatterAround: 'manual',
        positions: [
            { x: -120, z: -20 },
            { x: 80, z: 0 }
        ]
    }
};
nudgeConflictingBunkers(hole9Config);

export const holeConfigs = {
    1: hole1Config,
    2: hole2Config,
    3: hole3Config,
    4: hole4Config,
    5: hole5Config,
    6: hole6Config,
    7: hole7Config,
    8: hole8Config,
    9: hole9Config
};
