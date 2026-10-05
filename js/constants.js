/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Game Constants
   ═══════════════════════════════════════════════════════════ */

const GAME = {
    // Map dimensions (world units)
    MAP_WIDTH: 4000,
    MAP_HEIGHT: 4000,

    // Grid cell size for spatial hashing
    GRID_CELL: 200,

    // Player defaults
    PLAYER_RADIUS: 14,
    PLAYER_SPEED: 185,        // pixels per second
    PLAYER_MAX_HEALTH: 300,
    PLAYER_MAX_ARMOR: 150,

    // Enemy config
    ENEMY_COUNT: 29,
    ENEMY_RADIUS: 14,
    ENEMY_SPEED: 110,
    ENEMY_DETECT_RANGE: 320,
    ENEMY_ATTACK_RANGE: 280,
    ENEMY_SHOOT_ACCURACY: 0.40,  // radians of random spread added (less accurate enemies)

    // Projectile
    BULLET_RADIUS: 3,

    // Loot
    LOOT_RADIUS: 12,
    LOOT_PICKUP_RANGE: 40,
    LOOT_SPAWN_COUNT: 180,

    // Safe zone phases — each phase defines the delay before shrink, 
    // shrink duration, target radius multiplier, and damage per second
    SAFE_ZONE_PHASES: [
        { delay: 30, shrinkTime: 30, radiusMult: 0.65, dps: 1 },
        { delay: 25, shrinkTime: 25, radiusMult: 0.45, dps: 2 },
        { delay: 20, shrinkTime: 20, radiusMult: 0.28, dps: 4 },
        { delay: 15, shrinkTime: 15, radiusMult: 0.14, dps: 8 },
        { delay: 10, shrinkTime: 10, radiusMult: 0.05, dps: 16 },
    ],

    // Initial safe zone radius
    SAFE_ZONE_INITIAL_RADIUS: 1900,

    // Colors
    COLORS: {
        // Map
        GRASS: '#2d4a2e',
        GRASS_ALT: '#345534',
        ROAD: '#4a4a4a',
        ROAD_LINE: '#6a6a3a',
        BUILDING_WALL: '#5a5a6a',
        BUILDING_FLOOR: '#3a3a42',
        BUILDING_ROOF: '#484858',
        TREE: '#1b6e2a',
        TREE_TRUNK: '#5a3a1a',
        ROCK: '#6a6a72',
        WATER: '#1a3a5a',

        // Entities
        PLAYER: '#00e5ff',
        PLAYER_OUTLINE: '#008fa3',
        ENEMY: '#ff5252',
        ENEMY_OUTLINE: '#b33939',
        DEAD_ENTITY: '#555555',

        // Projectiles
        BULLET: '#ffe082',
        BULLET_TRAIL: 'rgba(255, 224, 130, 0.3)',

        // Loot
        LOOT_COMMON: '#b0bec5',
        LOOT_UNCOMMON: '#66bb6a',
        LOOT_RARE: '#42a5f5',
        LOOT_EPIC: '#ab47bc',

        // Zone
        SAFE_ZONE: 'rgba(0, 150, 255, 0.12)',
        SAFE_ZONE_BORDER: 'rgba(0, 180, 255, 0.6)',
        DANGER_ZONE: 'rgba(255, 40, 40, 0.08)',
        NEXT_ZONE_BORDER: 'rgba(255, 255, 255, 0.25)',

        // HUD
        HUD_BG: 'rgba(10, 14, 23, 0.85)',
        HUD_BORDER: 'rgba(0, 229, 255, 0.2)',
        HEALTH_BAR: '#00e676',
        HEALTH_BAR_LOW: '#ff5252',
        ARMOR_BAR: '#42a5f5',
        AMMO_COLOR: '#ffab00',
    },

    // Item rarity multipliers
    RARITY: {
        COMMON: { name: 'Common', color: '#b0bec5', mult: 1.0 },
        UNCOMMON: { name: 'Uncommon', color: '#66bb6a', mult: 1.15 },
        RARE: { name: 'Rare', color: '#42a5f5', mult: 1.3 },
        EPIC: { name: 'Epic', color: '#ab47bc', mult: 1.5 },
    },
};
