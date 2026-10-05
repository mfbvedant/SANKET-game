/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Game Constants
   Central configuration and gameplay balancing values.
   ═══════════════════════════════════════════════════════════ */

const GAME = {

    /* ─────────────────────────────────────────────────────────
       WORLD
       ───────────────────────────────────────────────────────── */

    MAP_WIDTH: 4000,
    MAP_HEIGHT: 4000,

    GRID_CELL: 200,

    WORLD_MIN_X: 0,
    WORLD_MIN_Y: 0,
    WORLD_MAX_X: 4000,
    WORLD_MAX_Y: 4000,


    /* ─────────────────────────────────────────────────────────
       PLAYER
       ───────────────────────────────────────────────────────── */

    PLAYER_RADIUS: 14,
    PLAYER_SPEED: 185,

    PLAYER_MAX_HEALTH: 300,
    PLAYER_MAX_ARMOR: 150,

    PLAYER_ACCELERATION: 900,
    PLAYER_DECELERATION: 1100,

    PLAYER_PICKUP_RANGE: 40,

    PLAYER_INTERACTION_RANGE: 55,

    PLAYER_DAMAGE_FLASH_TIME: 0.15,

    PLAYER_INVULNERABILITY_TIME: 0,


    /* ─────────────────────────────────────────────────────────
       ENEMIES
       ───────────────────────────────────────────────────────── */

    ENEMY_COUNT: 29,

    ENEMY_RADIUS: 14,
    ENEMY_SPEED: 110,

    ENEMY_ACCELERATION: 650,
    ENEMY_DECELERATION: 800,

    ENEMY_DETECT_RANGE: 320,
    ENEMY_ATTACK_RANGE: 280,

    /*
     * Maximum base shooting spread in radians.
     * Lower value = more accurate AI.
     */
    ENEMY_SHOOT_ACCURACY: 0.40,

    ENEMY_INVESTIGATION_TIME: 5,

    ENEMY_MEMORY_TIME: 4,

    ENEMY_PREFERRED_COMBAT_RANGE: 190,

    ENEMY_STRAFE_SPEED: 0.65,

    ENEMY_LOOT_SEARCH_RANGE: 450,

    ENEMY_COVER_SEARCH_RANGE: 180,


    /* ─────────────────────────────────────────────────────────
       PROJECTILES
       ───────────────────────────────────────────────────────── */

    BULLET_RADIUS: 3,

    BULLET_MAX_DISTANCE: 1600,

    BULLET_MAX_LIFETIME: 4,

    MAX_BULLETS: 500,

    BULLET_TRAIL_LENGTH: 16,

    BULLET_GLOW_SIZE: 7,


    /* ─────────────────────────────────────────────────────────
       LOOT
       ───────────────────────────────────────────────────────── */

    LOOT_RADIUS: 12,

    LOOT_PICKUP_RANGE: 40,

    LOOT_SPAWN_COUNT: 180,

    LOOT_INTERACTION_RANGE: 60,

    LOOT_DESPAWN_TIME: 0,

    LOOT_RARE_CHANCE: 0.12,

    LOOT_EPIC_CHANCE: 0.035,


    /* ─────────────────────────────────────────────────────────
       SAFE ZONE
       ───────────────────────────────────────────────────────── */

    SAFE_ZONE_INITIAL_RADIUS: 1900,

    SAFE_ZONE_MIN_RADIUS: 80,

    SAFE_ZONE_PHASES: [
        {
            delay: 30,
            shrinkTime: 30,
            radiusMult: 0.65,
            dps: 1,
        },

        {
            delay: 25,
            shrinkTime: 25,
            radiusMult: 0.45,
            dps: 2,
        },

        {
            delay: 20,
            shrinkTime: 20,
            radiusMult: 0.28,
            dps: 4,
        },

        {
            delay: 15,
            shrinkTime: 15,
            radiusMult: 0.14,
            dps: 8,
        },

        {
            delay: 10,
            shrinkTime: 10,
            radiusMult: 0.05,
            dps: 16,
        },
    ],


    /* ─────────────────────────────────────────────────────────
       COMBAT
       ───────────────────────────────────────────────────────── */

    CRITICAL_HIT_MULTIPLIER: 1.5,

    CRITICAL_HIT_CHANCE: 0.08,

    DAMAGE_NUMBER_DURATION: 0.8,

    HIT_EFFECT_DURATION: 0.25,

    KILL_FEED_DURATION: 4,


    /* ─────────────────────────────────────────────────────────
       CAMERA
       ───────────────────────────────────────────────────────── */

    CAMERA_FOLLOW_SPEED: 8,

    CAMERA_LOOKAHEAD: 80,

    CAMERA_SHAKE_DECAY: 5,

    CAMERA_MAX_SHAKE: 14,


    /* ─────────────────────────────────────────────────────────
       VISUAL EFFECTS
       ───────────────────────────────────────────────────────── */

    MAX_PARTICLES: 700,

    PARTICLE_GRAVITY: 20,

    MUZZLE_FLASH_DURATION: 0.08,

    HIT_FLASH_DURATION: 0.12,

    PICKUP_EFFECT_DURATION: 0.45,

    ELIMINATION_EFFECT_DURATION: 1.2,


    /* ─────────────────────────────────────────────────────────
       AUDIO
       ───────────────────────────────────────────────────────── */

    MASTER_VOLUME: 0.65,

    AUDIO_MAX_DISTANCE: 1000,

    FOOTSTEP_INTERVAL: 0.38,

    ZONE_WARNING_INTERVAL: 1.5,


    /* ─────────────────────────────────────────────────────────
       MINIMAP
       ───────────────────────────────────────────────────────── */

    MINIMAP_SIZE: 190,

    MINIMAP_WORLD_RANGE: 900,

    MINIMAP_ENEMY_RANGE: 420,

    MINIMAP_LOOT_RANGE: 500,


    /* ─────────────────────────────────────────────────────────
       COLORS
       ───────────────────────────────────────────────────────── */

    COLORS: {

        /* Map */
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


        /* Player */
        PLAYER: '#00e5ff',
        PLAYER_OUTLINE: '#008fa3',

        PLAYER_GLOW: 'rgba(0, 229, 255, 0.22)',


        /* Enemy */
        ENEMY: '#ff5252',
        ENEMY_OUTLINE: '#b33939',

        ENEMY_ALERT: '#ffb300',

        DEAD_ENTITY: '#555555',


        /* Projectiles */
        BULLET: '#ffe082',
        BULLET_TRAIL: 'rgba(255, 224, 130, 0.3)',

        BULLET_GLOW: 'rgba(255, 190, 60, 0.45)',


        /* Loot */
        LOOT_COMMON: '#b0bec5',
        LOOT_UNCOMMON: '#66bb6a',
        LOOT_RARE: '#42a5f5',
        LOOT_EPIC: '#ab47bc',


        /* Safe zone */
        SAFE_ZONE: 'rgba(0, 150, 255, 0.12)',
        SAFE_ZONE_BORDER: 'rgba(0, 180, 255, 0.6)',

        DANGER_ZONE: 'rgba(255, 40, 40, 0.08)',

        NEXT_ZONE_BORDER:
            'rgba(255, 255, 255, 0.25)',


        /* HUD */
        HUD_BG: 'rgba(10, 14, 23, 0.85)',

        HUD_BG_DARK:
            'rgba(5, 8, 14, 0.94)',

        HUD_BORDER:
            'rgba(0, 229, 255, 0.2)',

        HUD_TEXT: '#e8f1f5',

        HUD_TEXT_MUTED: '#8da0aa',

        HEALTH_BAR: '#00e676',
        HEALTH_BAR_LOW: '#ff5252',

        ARMOR_BAR: '#42a5f5',

        AMMO_COLOR: '#ffab00',

        WARNING: '#ffb300',

        DANGER: '#ff5252',

        SUCCESS: '#00e676',
    },


    /* ─────────────────────────────────────────────────────────
       ITEM RARITY
       ───────────────────────────────────────────────────────── */

    RARITY: {

        COMMON: {
            name: 'Common',
            color: '#b0bec5',
            mult: 1.0,
        },

        UNCOMMON: {
            name: 'Uncommon',
            color: '#66bb6a',
            mult: 1.15,
        },

        RARE: {
            name: 'Rare',
            color: '#42a5f5',
            mult: 1.30,
        },

        EPIC: {
            name: 'Epic',
            color: '#ab47bc',
            mult: 1.50,
        },
    },


    /* ─────────────────────────────────────────────────────────
       WEAPON RARITY / BALANCE
       ───────────────────────────────────────────────────────── */

    WEAPON_RARITY_MULTIPLIERS: {
        common: 1.0,
        uncommon: 1.15,
        rare: 1.30,
        epic: 1.50,
    },


    /* ─────────────────────────────────────────────────────────
       GAME STATES
       ───────────────────────────────────────────────────────── */

    STATES: {
        MAIN_MENU: 'MAIN_MENU',
        PLAYING: 'PLAYING',
        PAUSED: 'PAUSED',
        ENDING: 'ENDING',
        RESULTS: 'RESULTS',
    },


    /* ─────────────────────────────────────────────────────────
       INPUT
       ───────────────────────────────────────────────────────── */

    KEYS: {
        UP: 'KeyW',
        DOWN: 'KeyS',
        LEFT: 'KeyA',
        RIGHT: 'KeyD',

        RELOAD: 'KeyR',
        INTERACT: 'KeyE',

        SLOT_1: 'Digit1',
        SLOT_2: 'Digit2',
        SLOT_3: 'Digit3',

        SLOT_4: 'Digit4',
        SLOT_5: 'Digit5',

        INVENTORY: 'Tab',
        PAUSE: 'Escape',
    },
};