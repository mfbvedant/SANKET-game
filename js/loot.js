/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Loot System
   Ground loot, rarity, location-aware spawning,
   pickup interactions, dropped equipment and visual feedback.
   ═══════════════════════════════════════════════════════════ */

const LootSystem = {

    items: [],

    /* ---------------------------------------------------------
       PICKUP EVENT
       Used by the player animation / HUD layer.
       --------------------------------------------------------- */

    lastPickupEvent: null,

    PICKUP_ANIMATION_TIME: 450,


    /* =========================================================
       RESET
       ========================================================= */

    reset() {

        this.items = [];

        this.lastPickupEvent = null;
    },


    /* =========================================================
       INITIAL LOOT
       ========================================================= */

    spawnInitialLoot() {

        this.items = [];

        this.lastPickupEvent = null;

        if (
            typeof MapSystem === 'undefined' ||
            !Array.isArray(MapSystem.lootSpawnPoints)
        ) {
            console.warn(
                'LootSystem: MapSystem loot spawn points unavailable.'
            );

            return;
        }


        const points =
            MapSystem.lootSpawnPoints.slice();


        // Shuffle spawn points so every match
        // has a different loot distribution.
        for (
            let i = points.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Utils.randInt(0, i);

            [
                points[i],
                points[j]
            ] = [
                points[j],
                points[i]
            ];
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


            if (
                !point ||
                typeof point.x !== 'number' ||
                typeof point.y !== 'number'
            ) {
                continue;
            }


            const item =
                this._generateRandomLoot(
                    point.x,
                    point.y,
                    !!point.indoor
                );


            if (item) {
                this.items.push(item);
            }
        }
    },


    /* =========================================================
       RANDOM LOOT GENERATION
       ========================================================= */

    _generateRandomLoot(
        x,
        y,
        indoor = false
    ) {

        const roll =
            Math.random();


        /*
         * Indoor areas:
         * - More weapons
         * - More healing
         * - Slightly less armor
         *
         * Outdoor areas:
         * - More ammunition
         * - More basic survival loot
         */

        const weaponChance =
            indoor ? 0.34 : 0.27;

        const ammoChance =
            indoor ? 0.27 : 0.32;

        const healthChance =
            indoor ? 0.24 : 0.21;


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


    /* =========================================================
       BASE ITEM
       ========================================================= */

    _baseItem(
        x,
        y,
        type,
        indoor
    ) {

        return {

            id:
                Utils.uid(),

            x,
            y,

            type,

            picked: false,

            indoor: !!indoor,

            dropped: false,

            spawnTime:
                Date.now(),

            pickupTime: null,

            rotation:
                Utils.randFloat(
                    -0.15,
                    0.15
                )
        };
    },


    /* =========================================================
       WEAPON LOOT
       ========================================================= */

    _createWeaponLoot(
        x,
        y,
        indoor = false
    ) {

        if (
            typeof WEAPON_DEFS === 'undefined'
        ) {
            return null;
        }


        const weaponKeys =
            Object.keys(
                WEAPON_DEFS
            );


        if (
            weaponKeys.length === 0
        ) {
            return null;
        }


        /*
         * Indoor areas slightly favor
         * stronger weapons.
         */

        let weaponKey;


        const highValueWeapons = [
            'assault',
            'shotgun',
            'sniper'
        ];


        if (
            indoor &&
            Math.random() < 0.45
        ) {

            weaponKey =
                Utils.randomPick(
                    highValueWeapons.filter(
                        key =>
                            WEAPON_DEFS[key]
                    )
                );
        }


        if (!weaponKey) {

            weaponKey =
                Utils.randomPick(
                    weaponKeys
                );
        }


        const rarity =
            this._rollRarity(
                indoor
            );


        const definition =
            WEAPON_DEFS[
                weaponKey
            ];


        const item =
            this._baseItem(
                x,
                y,
                'weapon',
                indoor
            );


        item.weaponKey =
            weaponKey;

        item.rarity =
            rarity;

        item.name =
            definition.name;

        item.color =
            this._rarityColor(
                rarity
            );


        return item;
    },


    /* =========================================================
       AMMO LOOT
       ========================================================= */

    _createAmmoLoot(
        x,
        y,
        indoor = false
    ) {

        /*
         * Weight ammo toward ammo types
         * actually used by the weapon pool.
         */

        const ammoTypes = [
            'light',
            'medium',
            'heavy'
        ];


        const ammoType =
            Utils.randomPick(
                ammoTypes
            );


        const minAmount =
            indoor ? 25 : 15;

        const maxAmount =
            indoor ? 55 : 40;


        const amount =
            Utils.randInt(
                minAmount,
                maxAmount
            );


        const item =
            this._baseItem(
                x,
                y,
                'ammo',
                indoor
            );


        item.ammoType =
            ammoType;

        item.amount =
            amount;

        item.rarity =
            'COMMON';

        item.name =
            `${this._formatAmmoName(
                ammoType
            )} Ammo (${amount})`;

        item.color =
            GAME.COLORS.AMMO_COLOR;


        return item;
    },


    /* =========================================================
       HEALTH LOOT
       ========================================================= */

    _createHealthLoot(
        x,
        y,
        indoor = false
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


        const item =
            this._baseItem(
                x,
                y,
                'health',
                indoor
            );


        item.healAmount =
            healAmount;

        item.rarity =
            rarity;

        item.name =
            `Med Kit (+${healAmount})`;

        item.color =
            GAME.COLORS.HEALTH_BAR;


        return item;
    },


    /* =========================================================
       ARMOR LOOT
       ========================================================= */

    _createArmorLoot(
        x,
        y,
        indoor = false
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


        const item =
            this._baseItem(
                x,
                y,
                'armor',
                indoor
            );


        item.armorAmount =
            armorAmount;

        item.rarity =
            rarity;

        item.name =
            `Armor Plate (+${armorAmount})`;

        item.color =
            GAME.COLORS.ARMOR_BAR;


        return item;
    },


    /* =========================================================
       RARITY
       ========================================================= */

    _rollRarity(
        indoor = false
    ) {

        const r =
            Math.random();


        /*
         * Indoor:
         * Common    48%
         * Uncommon  28%
         * Rare      17%
         * Epic       7%
         */

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


        /*
         * Outdoor:
         * Common    58%
         * Uncommon  24%
         * Rare      13%
         * Epic       5%
         */

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


    /* =========================================================
       RARITY COLOR
       ========================================================= */

    _rarityColor(rarity) {

        if (
            GAME.RARITY &&
            GAME.RARITY[rarity]
        ) {

            return GAME.RARITY[
                rarity
            ].color;
        }


        return GAME.COLORS.LOOT_COMMON;
    },


    /* =========================================================
       CONSUMABLE VALUE
       ========================================================= */

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
                (
                    common +
                    rare
                ) / 2
            );
        }


        return common;
    },


    /* =========================================================
       AMMO NAME
       ========================================================= */

    _formatAmmoName(
        type
    ) {

        if (!type) {
            return 'Ammo';
        }


        return (
            type
                .charAt(0)
                .toUpperCase() +
            type.slice(1)
        );
    },


    /* =========================================================
       FIND NEAREST PICKUP
       ========================================================= */

    findNearestPickup(
        x,
        y,
        range =
            GAME.LOOT_PICKUP_RANGE
    ) {

        let nearest = null;

        let nearestDist =
            Number(range) || 0;


        for (
            const item of
            this.items
        ) {

            if (
                !item ||
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
                distance <=
                nearestDist
            ) {

                nearestDist =
                    distance;

                nearest =
                    item;
            }
        }


        return nearest;
    },


    /* =========================================================
       NEARBY LOOT
       ========================================================= */

    getNearbyLoot(
        x,
        y,
        range = 100
    ) {

        const result = [];

        const safeRange =
            Math.max(
                0,
                Number(range) || 0
            );


        for (
            const item of
            this.items
        ) {

            if (
                !item ||
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
                ) <= safeRange
            ) {

                result.push(
                    item
                );
            }
        }


        return result;
    },


    /* =========================================================
       PICK UP
       ========================================================= */

    pickUp(
        itemId
    ) {

        const item =
            this.items.find(
                entry =>
                    entry &&
                    entry.id ===
                    itemId
            );


        if (!item) {
            return null;
        }


        if (item.picked) {
            return item;
        }


        item.picked =
            true;

        item.pickupTime =
            Date.now();


        /*
         * Store an event for the player animation
         * and future UI systems.
         */

        this.lastPickupEvent = {

            id:
                item.id,

            type:
                item.type,

            rarity:
                item.rarity,

            x:
                item.x,

            y:
                item.y,

            time:
                Date.now()
        };


        /*
         * Optional player animation hook.
         *
         * It is deliberately defensive so the loot system
         * never crashes if Player is not available.
         */

        if (
            typeof Player !== 'undefined'
        ) {

            Player.pickupAnimationUntil =
                Date.now() +
                this.PICKUP_ANIMATION_TIME;

            Player.pickupAnimationTime =
                0;
        }


        /* ---------- AUDIO ---------- */

        if (
            typeof AudioSystem !==
            'undefined' &&
            AudioSystem.playPickup
        ) {

            AudioSystem.playPickup();
        }


        /* ---------- VFX ---------- */

        if (
            typeof VFXSystem !==
            'undefined' &&
            VFXSystem.spawnPickupEffect
        ) {

            VFXSystem.spawnPickupEffect(
                item.x,
                item.y,
                item.color
            );
        }


        return item;
    },


    /* =========================================================
       GET LAST PICKUP EVENT
       ========================================================= */

    getLastPickupEvent() {

        return this.lastPickupEvent;
    },


    /* =========================================================
       CONSUME PICKUP EVENT
       ========================================================= */

    consumePickupEvent() {

        const event =
            this.lastPickupEvent;

        this.lastPickupEvent =
            null;

        return event;
    },


    /* =========================================================
       DROP WEAPON
       ========================================================= */

    dropWeapon(
        weaponKey,
        rarity,
        x,
        y
    ) {

        if (
            typeof WEAPON_DEFS ===
            'undefined' ||
            !WEAPON_DEFS[
                weaponKey
            ]
        ) {
            return null;
        }


        const safeRarity =
            (
                GAME.RARITY &&
                GAME.RARITY[rarity]
            )
                ? rarity
                : 'COMMON';


        const definition =
            WEAPON_DEFS[
                weaponKey
            ];


        const item =
            this._baseItem(
                x,
                y,
                'weapon',
                false
            );


        item.weaponKey =
            weaponKey;

        item.rarity =
            safeRarity;

        item.name =
            definition.name;

        item.color =
            this._rarityColor(
                safeRarity
            );

        item.dropped =
            true;


        this.items.push(
            item
        );


        return item;
    },


    /* =========================================================
       REMOVE ITEM
       ========================================================= */

    removeItem(
        itemId
    ) {

        const index =
            this.items.findIndex(
                item =>
                    item &&
                    item.id ===
                    itemId
            );


        if (index === -1) {
            return false;
        }


        this.items.splice(
            index,
            1
        );


        return true;
    },


    /* =========================================================
       CLEANUP PICKED ITEMS
       ========================================================= */

    cleanupPickedItems() {

        const now =
            Date.now();


        this.items =
            this.items.filter(
                item => {

                    if (!item) {
                        return false;
                    }


                    if (!item.picked) {
                        return true;
                    }


                    /*
                     * Remove one second after pickup.
                     *
                     * IMPORTANT:
                     * pickupTime is now explicitly assigned
                     * in pickUp(), fixing the old cleanup bug.
                     */

                    const pickupTime =
                        item.pickupTime ||
                        now;


                    return (
                        now -
                        pickupTime <
                        1000
                    );
                }
            );
    },


    /* =========================================================
       RENDER
       ========================================================= */

    render(ctx) {

        if (
            !ctx
        ) {
            return;
        }


        const now =
            Date.now();


        for (
            const item of
            this.items
        ) {

            if (
                !item ||
                item.picked
            ) {
                continue;
            }


            const pulse =
                0.86 +
                Math.sin(
                    now * 0.003 +
                    item.x * 0.01 +
                    item.y * 0.007
                ) *
                0.14;


            const color =
                item.color ||
                GAME.COLORS.LOOT_COMMON;


            /* ---------------------------------------------
               OUTER GLOW
               --------------------------------------------- */

            ctx.save();

            ctx.globalAlpha =
                0.18;

            ctx.beginPath();

            ctx.arc(
                item.x,
                item.y,
                (
                    GAME.LOOT_RADIUS +
                    9
                ) * pulse,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                color;

            ctx.fill();

            ctx.restore();


            /* ---------------------------------------------
               LOOT BACKPLATE
               --------------------------------------------- */

            ctx.save();

            ctx.beginPath();

            ctx.arc(
                item.x,
                item.y,
                GAME.LOOT_RADIUS,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                'rgba(10, 14, 23, 0.90)';

            ctx.fill();


            ctx.strokeStyle =
                color;

            ctx.lineWidth =
                item.rarity === 'EPIC'
                    ? 3
                    : item.rarity === 'RARE'
                        ? 2.5
                        : 1.8;

            ctx.stroke();

            ctx.restore();


            /* ---------------------------------------------
               ICON
               --------------------------------------------- */

            let drawn =
                false;


            if (
                item.type === 'weapon' &&
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

                        17
                    );
            }


            /* ---------------------------------------------
               FALLBACK ICON
               --------------------------------------------- */

            if (!drawn) {

                let symbol =
                    '◆';


                if (
                    item.type ===
                    'weapon'
                ) {
                    symbol = '⚔';
                }

                else if (
                    item.type ===
                    'ammo'
                ) {
                    symbol = '•';
                }

                else if (
                    item.type ===
                    'health'
                ) {
                    symbol = '+';
                }

                else if (
                    item.type ===
                    'armor'
                ) {
                    symbol = '▣';
                }


                ctx.save();

                ctx.fillStyle =
                    color;

                ctx.font =
                    'bold 11px Inter, sans-serif';

                ctx.textAlign =
                    'center';

                ctx.textBaseline =
                    'middle';


                ctx.fillText(
                    symbol,
                    item.x,
                    item.y
                );

                ctx.restore();
            }


            /* ---------------------------------------------
               RARE / EPIC PULSE RING
               --------------------------------------------- */

            if (
                item.rarity === 'RARE' ||
                item.rarity === 'EPIC'
            ) {

                ctx.save();

                ctx.globalAlpha =
                    0.45 +
                    Math.sin(
                        now * 0.005
                    ) * 0.20;


                ctx.beginPath();

                ctx.arc(
                    item.x,
                    item.y,

                    GAME.LOOT_RADIUS +
                    (
                        item.rarity === 'EPIC'
                            ? 7
                            : 5
                    ),

                    0,
                    Math.PI * 2
                );


                ctx.strokeStyle =
                    color;

                ctx.lineWidth =
                    item.rarity === 'EPIC'
                        ? 1.8
                        : 1;


                ctx.stroke();

                ctx.restore();
            }


            /* ---------------------------------------------
               ITEM LABEL
               Only shown when the player is nearby.
               --------------------------------------------- */

            if (
                typeof Player !==
                'undefined' &&
                Player.isAlive
            ) {

                const distance =
                    Utils.distance(
                        Player.x,
                        Player.y,
                        item.x,
                        item.y
                    );


                if (
                    distance <= 55
                ) {

                    ctx.save();

                    ctx.globalAlpha =
                        Math.max(
                            0,
                            1 -
                            distance / 70
                        );


                    ctx.font =
                        '600 9px Inter, sans-serif';

                    ctx.textAlign =
                        'center';

                    ctx.textBaseline =
                        'bottom';


                    ctx.fillStyle =
                        '#e8f1f5';


                    ctx.fillText(
                        item.name,
                        item.x,
                        item.y -
                        GAME.LOOT_RADIUS -
                        7
                    );


                    ctx.restore();
                }
            }
        }
    }
};