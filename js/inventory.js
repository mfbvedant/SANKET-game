/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — INVENTORY SYSTEM
   Weapons, ammunition, healing and armor management.
   ═══════════════════════════════════════════════════════════ */

const InventorySystem = {

    /* =========================================================
       CONFIGURATION
       ========================================================= */

    MAX_WEAPON_SLOTS: 3,

    DEFAULT_AMMO_TYPES: [
        'light',
        'medium',
        'heavy'
    ],


    /* =========================================================
       CREATE INVENTORY
       ========================================================= */

    create() {

        return {

            weapons: [
                null,
                null,
                null
            ],

            activeSlot: 0,

            ammo: {
                light: 0,
                medium: 0,
                heavy: 0
            },

            healItems: [],
            armorItems: [],

            maxHealItems: 5,
            maxArmorItems: 3
        };
    },


    /* =========================================================
       WEAPON ACCESS
       ========================================================= */

    getActiveWeapon(inv) {

        if (!inv || !inv.weapons) {
            return null;
        }

        return (
            inv.weapons[inv.activeSlot] ||
            null
        );
    },


    getWeapon(inv, slot) {

        if (
            !inv ||
            !inv.weapons ||
            slot < 0 ||
            slot >= this.MAX_WEAPON_SLOTS
        ) {
            return null;
        }

        return inv.weapons[slot] || null;
    },


    /* =========================================================
       SWITCH WEAPON
       ========================================================= */

    switchSlot(inv, slot) {

        if (
            !inv ||
            !inv.weapons ||
            slot < 0 ||
            slot >= this.MAX_WEAPON_SLOTS
        ) {
            return false;
        }


        if (
            inv.activeSlot === slot
        ) {
            return false;
        }


        const current =
            inv.weapons[inv.activeSlot];


        // Cancel reload when switching
        if (current) {

            current.isReloading = false;
            current.reloadTimer = 0;
        }


        inv.activeSlot = slot;


        // Reset weapon recoil state
        const next =
            inv.weapons[slot];

        if (next) {

            next.isReloading = false;

            if (
                typeof next.reloadTimer !==
                'number'
            ) {
                next.reloadTimer = 0;
            }
        }


        return true;
    },


    /* =========================================================
       FIND EMPTY WEAPON SLOT
       ========================================================= */

    findEmptySlot(inv) {

        if (!inv || !inv.weapons) {
            return -1;
        }


        for (
            let i = 0;
            i < this.MAX_WEAPON_SLOTS;
            i++
        ) {

            if (!inv.weapons[i]) {
                return i;
            }
        }


        return -1;
    },


    /* =========================================================
       ADD WEAPON
       ========================================================= */

    addWeapon(inv, weapon) {

        if (
            !inv ||
            !weapon
        ) {
            return null;
        }


        // Prefer empty slot
        const emptySlot =
            this.findEmptySlot(inv);


        if (emptySlot !== -1) {

            inv.weapons[emptySlot] =
                weapon;

            inv.activeSlot =
                emptySlot;

            return null;
        }


        // Inventory full:
        // replace active weapon
        const oldWeapon =
            inv.weapons[inv.activeSlot];


        inv.weapons[inv.activeSlot] =
            weapon;


        return oldWeapon;
    },


    /* =========================================================
       REMOVE WEAPON
       ========================================================= */

    removeWeapon(inv, slot) {

        if (
            !inv ||
            !inv.weapons ||
            slot < 0 ||
            slot >= this.MAX_WEAPON_SLOTS
        ) {
            return null;
        }


        const weapon =
            inv.weapons[slot];


        inv.weapons[slot] =
            null;


        // If active slot became empty,
        // find another available weapon.
        if (
            inv.activeSlot === slot
        ) {

            const replacement =
                this.findBestWeaponSlot(inv);

            if (replacement !== -1) {
                inv.activeSlot = replacement;
            }
        }


        return weapon;
    },


    /* =========================================================
       FIND BEST AVAILABLE WEAPON
       ========================================================= */

    findBestWeaponSlot(inv) {

        if (!inv || !inv.weapons) {
            return -1;
        }


        // Prefer first available weapon
        for (
            let i = 0;
            i < this.MAX_WEAPON_SLOTS;
            i++
        ) {

            if (inv.weapons[i]) {
                return i;
            }
        }


        return -1;
    },


    /* =========================================================
       AMMO
       ========================================================= */

    addAmmo(inv, ammoType, amount) {

        if (
            !inv ||
            !inv.ammo ||
            !ammoType
        ) {
            return false;
        }


        const value =
            Math.max(
                0,
                Math.floor(
                    Number(amount) || 0
                )
            );


        if (
            value <= 0
        ) {
            return false;
        }


        if (
            inv.ammo[ammoType] === undefined
        ) {
            inv.ammo[ammoType] = 0;
        }


        inv.ammo[ammoType] += value;

        return true;
    },


    getAmmoReserve(inv) {

        const weapon =
            this.getActiveWeapon(inv);


        if (!weapon) {
            return 0;
        }


        return (
            inv.ammo[
                weapon.ammoType
            ] || 0
        );
    },


    getAmmo(inv, ammoType) {

        if (
            !inv ||
            !inv.ammo
        ) {
            return 0;
        }


        return (
            inv.ammo[ammoType] || 0
        );
    },


    consumeAmmo(
        inv,
        ammoType,
        amount
    ) {

        if (
            !inv ||
            !inv.ammo ||
            !ammoType
        ) {
            return 0;
        }


        const available =
            inv.ammo[ammoType] || 0;


        const requested =
            Math.max(
                0,
                Math.floor(
                    Number(amount) || 0
                )
            );


        const consumed =
            Math.min(
                available,
                requested
            );


        inv.ammo[ammoType] -=
            consumed;


        return consumed;
    },


    /* =========================================================
       AMMO CHECK
       ========================================================= */

    hasAmmo(
        inv,
        ammoType,
        amount = 1
    ) {

        return (
            this.getAmmo(
                inv,
                ammoType
            ) >= amount
        );
    },


    /* =========================================================
       HEAL ITEMS
       ========================================================= */

    addHealItem(
        inv,
        healAmount,
        rarity,
        name
    ) {

        if (
            !inv ||
            !inv.healItems
        ) {
            return false;
        }


        if (
            inv.healItems.length >=
            inv.maxHealItems
        ) {
            return false;
        }


        const amount =
            Math.max(
                0,
                Number(healAmount) || 0
            );


        if (amount <= 0) {
            return false;
        }


        inv.healItems.push({

            healAmount: amount,

            rarity:
                rarity || 'common',

            name:
                name || 'Med Kit',

            addedAt:
                Date.now()
        });


        return true;
    },


    useHealItem(
        inv,
        healthComp
    ) {

        if (
            !inv ||
            !healthComp ||
            inv.healItems.length === 0
        ) {
            return false;
        }


        if (
            healthComp.health >=
            healthComp.maxHealth
        ) {
            return false;
        }


        const item =
            inv.healItems.shift();


        HealthSystem.heal(
            healthComp,
            item.healAmount
        );


        if (
            typeof AudioSystem !==
            'undefined' &&
            AudioSystem.playHeal
        ) {
            AudioSystem.playHeal();
        }


        return true;
    },


    /* =========================================================
       ARMOR ITEMS
       ========================================================= */

    addArmorItem(
        inv,
        armorAmount,
        rarity,
        name
    ) {

        if (
            !inv ||
            !inv.armorItems
        ) {
            return false;
        }


        if (
            inv.armorItems.length >=
            inv.maxArmorItems
        ) {
            return false;
        }


        const amount =
            Math.max(
                0,
                Number(armorAmount) || 0
            );


        if (amount <= 0) {
            return false;
        }


        inv.armorItems.push({

            armorAmount: amount,

            rarity:
                rarity || 'common',

            name:
                name || 'Armor Plate',

            addedAt:
                Date.now()
        });


        return true;
    },


    useArmorItem(
        inv,
        healthComp
    ) {

        if (
            !inv ||
            !healthComp ||
            inv.armorItems.length === 0
        ) {
            return false;
        }


        if (
            healthComp.armor >=
            healthComp.maxArmor
        ) {
            return false;
        }


        const item =
            inv.armorItems.shift();


        HealthSystem.addArmor(
            healthComp,
            item.armorAmount
        );


        if (
            typeof AudioSystem !==
            'undefined' &&
            AudioSystem.playArmorPickup
        ) {
            AudioSystem.playArmorPickup();
        }


        return true;
    },


    /* =========================================================
       LOOT PICKUP
       ========================================================= */

    pickUpLoot(
        inv,
        lootItem,
        healthComp,
        playerX,
        playerY
    ) {

        if (
            !inv ||
            !lootItem
        ) {
            return false;
        }


        switch (lootItem.type) {

            /* -----------------------------------------------
               WEAPON
               ----------------------------------------------- */

            case 'weapon': {

                if (
                    typeof WeaponSystem ===
                    'undefined'
                ) {
                    return false;
                }


                const weapon =
                    WeaponSystem.create(
                        lootItem.weaponKey,
                        lootItem.rarity
                    );


                if (!weapon) {
                    return false;
                }


                const dropped =
                    this.addWeapon(
                        inv,
                        weapon
                    );


                if (dropped) {

                    if (
                        typeof LootSystem !==
                        'undefined' &&
                        LootSystem.dropWeapon
                    ) {

                        LootSystem.dropWeapon(
                            dropped.templateKey,
                            dropped.rarity,
                            playerX,
                            playerY
                        );
                    }
                }


                return true;
            }


            /* -----------------------------------------------
               AMMO
               ----------------------------------------------- */

            case 'ammo': {

                return this.addAmmo(
                    inv,
                    lootItem.ammoType,
                    lootItem.amount
                );
            }


            /* -----------------------------------------------
               HEALTH
               ----------------------------------------------- */

            case 'health': {

                return this.addHealItem(
                    inv,
                    lootItem.healAmount,
                    lootItem.rarity,
                    lootItem.name
                );
            }


            /* -----------------------------------------------
               ARMOR
               ----------------------------------------------- */

            case 'armor': {

                return this.addArmorItem(
                    inv,
                    lootItem.armorAmount,
                    lootItem.rarity,
                    lootItem.name
                );
            }


            default:
                return false;
        }
    },


    /* =========================================================
       INVENTORY SUMMARY
       ========================================================= */

    getSummary(inv) {

        if (!inv) {
            return {
                weapons: 0,
                ammo: 0,
                heals: 0,
                armor: 0
            };
        }


        let weaponCount = 0;

        for (
            const weapon
            of inv.weapons
        ) {

            if (weapon) {
                weaponCount++;
            }
        }


        let ammoCount = 0;

        for (
            const amount
            of Object.values(inv.ammo)
        ) {

            ammoCount +=
                Number(amount) || 0;
        }


        return {

            weapons:
                weaponCount,

            ammo:
                ammoCount,

            heals:
                inv.healItems.length,

            armor:
                inv.armorItems.length
        };
    },


    /* =========================================================
       CLEAR INVENTORY
       ========================================================= */

    clear(inv) {

        if (!inv) return;

        inv.weapons = [
            null,
            null,
            null
        ];

        inv.activeSlot = 0;

        inv.ammo = {
            light: 0,
            medium: 0,
            heavy: 0
        };

        inv.healItems = [];
        inv.armorItems = [];
    }
};