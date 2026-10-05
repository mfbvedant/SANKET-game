/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Loot System
   Ground loot, rarity, location-based spawning,
   pickup effects and dropped equipment.
   ═══════════════════════════════════════════════════════════ */

const LootSystem = {
    items: [],

    // ─────────────────────────────────────────────────────────
    // RESET
    // ─────────────────────────────────────────────────────────

    reset() {
        this.items = [];
    },

    // ─────────────────────────────────────────────────────────
    // INITIAL LOOT
    // ─────────────────────────────────────────────────────────

    spawnInitialLoot() {
        this.items = [];

        const points =
            MapSystem.lootSpawnPoints.slice();

        // Shuffle spawn points
        for (
            let i = points.length - 1;
            i > 0;
            i--
        ) {
            const j =
                Utils.randInt(0, i);

            [points[i], points[j]] =
                [points[j], points[i]];
        }

        const count =
            Math.min(
                GAME.LOOT_SPAWN_COUNT,
                points.length
            );

        for (
            let i = 0;
            i < count;
            i++
        ) {
            const point =
                points[i];

            const item =
                this._generateRandomLoot(
                    point.x,
                    point.y,
                    point.indoor
                );

            if (item) {
                this.items.push(item);
            }
        }
    },

    // ─────────────────────────────────────────────────────────
    // GENERATE LOOT
    // ─────────────────────────────────────────────────────────

    _generateRandomLoot(
        x,
        y,
        indoor = false
    ) {
        const roll =
            Math.random();

        // Indoor loot has a slightly higher
        // chance of valuable items.
        let weaponChance =
            indoor ? 0.34 : 0.28;

        let healthChance =
            indoor ? 0.24 : 0.22;

        let ammoChance =
            indoor ? 0.28 : 0.30;

        if (
            roll <
            weaponChance
        ) {
            return this._createWeaponLoot(
                x,
                y,
                indoor
            );
        }

        if (
            roll <
            weaponChance +
            ammoChance
        ) {
            return this._createAmmoLoot(
                x,
                y,
                indoor
            );
        }

        if (
            roll <
            weaponChance +
            ammoChance +
            healthChance
        ) {
            return this._createHealthLoot(
                x,
                y,
                indoor
            );
        }

        return this._createArmorLoot(
            x,
            y,
            indoor
        );
    },

    // ─────────────────────────────────────────────────────────
    // WEAPON LOOT
    // ─────────────────────────────────────────────────────────

    _createWeaponLoot(
        x,
        y,
        indoor
    ) {
        const weaponKeys =
            Object.keys(
                WEAPON_DEFS
            );

        if (
            weaponKeys.length === 0
        ) {
            return null;
        }

        const weaponKey =
            Utils.randomPick(
                weaponKeys
            );

        const rarity =
            this._rollRarity(
                indoor
            );

        const definition =
            WEAPON_DEFS[
            weaponKey
            ];

        return {
            id: Utils.uid(),

            x,
            y,

            type: 'weapon',

            weaponKey,

            rarity,

            name:
                definition.name,

            color:
                this._rarityColor(
                    rarity
                ),

            picked: false,

            indoor: !!indoor,

            spawnTime: Date.now(),

            rotation:
                Utils.randFloat(
                    -0.12,
                    0.12
                ),
        };
    },

    // ─────────────────────────────────────────────────────────
    // AMMO LOOT
    // ─────────────────────────────────────────────────────────

    _createAmmoLoot(
        x,
        y,
        indoor
    ) {
        const ammoTypes = [
            'light',
            'medium',
            'heavy',
        ];

        const ammoType =
            Utils.randomPick(
                ammoTypes
            );

        const baseAmount =
            indoor
                ? Utils.randInt(20, 50)
                : Utils.randInt(15, 40);

        return {
            id: Utils.uid(),

            x,
            y,

            type: 'ammo',

            ammoType,

            amount: baseAmount,

            rarity: 'COMMON',

            name:
                `${this._formatAmmoName(
                    ammoType
                )} Ammo (${baseAmount})`,

            color:
                GAME.COLORS.AMMO_COLOR,

            picked: false,

            indoor: !!indoor,

            spawnTime: Date.now(),

            rotation:
                Utils.randFloat(
                    -0.1,
                    0.1
                ),
        };
    },

    // ─────────────────────────────────────────────────────────
    // HEALTH LOOT
    // ─────────────────────────────────────────────────────────

    _createHealthLoot(
        x,
        y,
        indoor
    ) {
        const rarity =
            this._rollRarity(
                indoor
            );

        const healAmount =
            this._getConsumableAmount(
                rarity,
                25,
                50,
                75
            );

        return {
            id: Utils.uid(),

            x,
            y,

            type: 'health',

            healAmount,

            rarity,

            name:
                `Med Kit (+${healAmount})`,

            color:
                GAME.COLORS.HEALTH_BAR,

            picked: false,

            indoor: !!indoor,

            spawnTime: Date.now(),

            rotation:
                Utils.randFloat(
                    -0.1,
                    0.1
                ),
        };
    },

    // ─────────────────────────────────────────────────────────
    // ARMOR LOOT
    // ─────────────────────────────────────────────────────────

    _createArmorLoot(
        x,
        y,
        indoor
    ) {
        const rarity =
            this._rollRarity(
                indoor
            );

        const armorAmount =
            this._getConsumableAmount(
                rarity,
                25,
                50,
                75
            );

        return {
            id: Utils.uid(),

            x,
            y,

            type: 'armor',

            armorAmount,

            rarity,

            name:
                `Armor Plate (+${armorAmount})`,

            color:
                GAME.COLORS.ARMOR_BAR,

            picked: false,

            indoor: !!indoor,

            spawnTime: Date.now(),

            rotation:
                Utils.randFloat(
                    -0.1,
                    0.1
                ),
        };
    },

    // ─────────────────────────────────────────────────────────
    // RARITY
    // ─────────────────────────────────────────────────────────

    _rollRarity(indoor = false) {
        const r =
            Math.random();

        // Slightly better loot indoors
        if (indoor) {
            if (r < 0.07) {
                return 'EPIC';
            }

            if (r < 0.24) {
                return 'RARE';
            }

            if (r < 0.52) {
                return 'UNCOMMON';
            }

            return 'COMMON';
        }

        if (r < 0.05) {
            return 'EPIC';
        }

        if (r < 0.18) {
            return 'RARE';
        }

        if (r < 0.42) {
            return 'UNCOMMON';
        }

        return 'COMMON';
    },

    _rarityColor(rarity) {
        if (
            GAME.RARITY &&
            GAME.RARITY[rarity]
        ) {
            return GAME.RARITY[
                rarity
            ].color;
        }

        return '#00e5ff';
    },

    _getConsumableAmount(
        rarity,
        common,
        rare,
        epic
    ) {
        if (
            rarity === 'EPIC'
        ) {
            return epic;
        }

        if (
            rarity === 'RARE'
        ) {
            return rare;
        }

        if (
            rarity === 'UNCOMMON'
        ) {
            return Math.round(
                (common + rare) /
                2
            );
        }

        return common;
    },

    // ─────────────────────────────────────────────────────────
    // AMMO NAME
    // ─────────────────────────────────────────────────────────

    _formatAmmoName(type) {
        return (
            type.charAt(0)
                .toUpperCase() +
            type.slice(1)
        );
    },

    // ─────────────────────────────────────────────────────────
    // FIND NEAREST LOOT
    // ─────────────────────────────────────────────────────────

    findNearestPickup(
        x,
        y,
        range =
            GAME.LOOT_PICKUP_RANGE
    ) {
        let nearest = null;

        let nearestDist =
            range;

        for (
            const item of
            this.items
        ) {
            if (
                item.picked
            ) {
                continue;
            }

            const distance =
                Utils.distance(
                    x,
                    y,
                    item.x,
                    item.y
                );

            if (
                distance <
                nearestDist
            ) {
                nearestDist =
                    distance;

                nearest = item;
            }
        }

        return nearest;
    },

    // ─────────────────────────────────────────────────────────
    // GET LOOT NEAR PLAYER
    // ─────────────────────────────────────────────────────────

    getNearbyLoot(
        x,
        y,
        range = 100
    ) {
        const result = [];

        for (
            const item of
            this.items
        ) {
            if (
                item.picked
            ) {
                continue;
            }

            if (
                Utils.distance(
                    x,
                    y,
                    item.x,
                    item.y
                ) <= range
            ) {
                result.push(item);
            }
        }

        return result;
    },

    // ─────────────────────────────────────────────────────────
    // PICK UP
    // ─────────────────────────────────────────────────────────

    pickUp(itemId) {
        const item =
            this.items.find(
                entry =>
                    entry.id ===
                    itemId
            );

        if (!item) {
            return null;
        }

        if (item.picked) {
            return item;
        }

        item.picked = true;

        if (
            typeof AudioSystem !==
            'undefined'
        ) {
            AudioSystem.playPickup();
        }

        if (
            typeof VFXSystem !==
            'undefined'
        ) {
            VFXSystem.spawnPickupEffect(
                item.x,
                item.y,
                item.color
            );
        }

        return item;
    },

    // ─────────────────────────────────────────────────────────
    // DROP WEAPON
    // ─────────────────────────────────────────────────────────

    dropWeapon(
        weaponKey,
        rarity,
        x,
        y
    ) {
        if (
            !WEAPON_DEFS[
            weaponKey
            ]
        ) {
            return null;
        }

        const safeRarity =
            GAME.RARITY &&
                GAME.RARITY[rarity]
                ? rarity
                : 'COMMON';

        const item = {
            id: Utils.uid(),

            x,
            y,

            type: 'weapon',

            weaponKey,

            rarity:
                safeRarity,

            name:
                WEAPON_DEFS[
                    weaponKey
                ].name,

            color:
                this._rarityColor(
                    safeRarity
                ),

            picked: false,

            indoor: false,

            dropped: true,

            spawnTime: Date.now(),

            rotation:
                Utils.randFloat(
                    -0.15,
                    0.15
                ),
        };

        this.items.push(
            item
        );

        return item;
    },

    // ─────────────────────────────────────────────────────────
    // CLEANUP
    // ─────────────────────────────────────────────────────────

    cleanupPickedItems() {
        // Keep picked items briefly so systems that
        // reference them don't break immediately.
        this.items =
            this.items.filter(
                item =>
                    !item.picked ||
                    Date.now() -
                    (item.pickupTime ||
                        Date.now()) <
                    1000
            );
    },

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────

    render(ctx) {
        for (
            const item of
            this.items
        ) {
            if (
                item.picked
            ) {
                continue;
            }

            const time =
                Date.now();

            const pulse =
                0.82 +
                Math.sin(
                    time * 0.003 +
                    item.x *
                    0.01
                ) *
                0.18;

            const color =
                item.color ||
                '#00e5ff';

            // ───────────────────────────────────────────────
            // GLOW
            // ───────────────────────────────────────────────

            ctx.save();

            ctx.globalAlpha =
                0.22;

            ctx.beginPath();

            ctx.arc(
                item.x,
                item.y,
                (GAME.LOOT_RADIUS +
                    8) *
                pulse,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                color;

            ctx.fill();

            ctx.restore();

            // ───────────────────────────────────────────────
            // BACKGROUND
            // ───────────────────────────────────────────────

            ctx.beginPath();

            ctx.arc(
                item.x,
                item.y,
                GAME.LOOT_RADIUS,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                'rgba(10, 14, 23, 0.88)';

            ctx.strokeStyle =
                color;

            ctx.lineWidth =
                item.rarity ===
                    'EPIC'
                    ? 3
                    : 2;

            ctx.fill();

            ctx.stroke();

            // ───────────────────────────────────────────────
            // ICON
            // ───────────────────────────────────────────────

            let drawn = false;

            if (
                item.type ===
                'weapon' &&
                item.weaponKey
            ) {
                const weaponDef =
                    WEAPON_DEFS[
                    item.weaponKey
                    ];

                drawn =
                    AssetManager.drawWeaponIcon(
                        ctx,
                        weaponDef
                            ? weaponDef.type
                            : 'pistol',
                        item.x,
                        item.y,
                        24,
                        14
                    );
            } else {
                drawn =
                    AssetManager.drawLootIcon(
                        ctx,
                        item.type,
                        item.ammoType,
                        item.x,
                        item.y,
                        16
                    );
            }

            // ───────────────────────────────────────────────
            // FALLBACK ICON
            // ───────────────────────────────────────────────

            if (!drawn) {
                ctx.fillStyle =
                    color;

                ctx.font =
                    'bold 10px Inter';

                ctx.textAlign =
                    'center';

                ctx.textBaseline =
                    'middle';

                let symbol = '◆';

                if (
                    item.type ===
                    'weapon'
                ) {
                    symbol = '⚔';
                } else if (
                    item.type ===
                    'ammo'
                ) {
                    symbol = '•';
                } else if (
                    item.type ===
                    'health'
                ) {
                    symbol = '+';
                }

                ctx.fillText(
                    symbol,
                    item.x,
                    item.y
                );
            }

            // ───────────────────────────────────────────────
            // EPIC / RARE INDICATOR
            // ───────────────────────────────────────────────

            if (
                item.rarity ===
                'EPIC' ||
                item.rarity ===
                'RARE'
            ) {
                ctx.save();

                ctx.globalAlpha =
                    0.6 +
                    Math.sin(
                        time * 0.005
                    ) *
                    0.25;

                ctx.beginPath();

                ctx.arc(
                    item.x,
                    item.y,
                    GAME.LOOT_RADIUS +
                    5,
                    0,
                    Math.PI * 2
                );

                ctx.strokeStyle =
                    color;

                ctx.lineWidth = 1;

                ctx.stroke();

                ctx.restore();
            }
        }
    },
};