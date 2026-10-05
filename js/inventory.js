/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Inventory System
   Manages the player's inventory (weapons, ammo, items).
   ═══════════════════════════════════════════════════════════ */

const InventorySystem = {
    /** Maximum weapon slots */
    MAX_WEAPON_SLOTS: 3,

    /**
     * Create an inventory.
     */
    create() {
        return {
            weapons: [null, null, null],  // 3 weapon slots
            activeSlot: 0,
            ammo: {
                light: 0,
                medium: 0,
                heavy: 0,
            },
            healItems: [],    // { healAmount, rarity, name }
            armorItems: [],   // { armorAmount, rarity, name }
            maxHealItems: 5,
            maxArmorItems: 3,
        };
    },

    /**
     * Get the active weapon.
     */
    getActiveWeapon(inv) {
        return inv.weapons[inv.activeSlot];
    },

    /**
     * Switch to a weapon slot (0, 1, 2).
     */
    switchSlot(inv, slot) {
        if (slot < 0 || slot >= this.MAX_WEAPON_SLOTS) return;
        // Cancel reload on the current weapon
        const current = inv.weapons[inv.activeSlot];
        if (current) {
            current.isReloading = false;
            current.reloadTimer = 0;
        }
        inv.activeSlot = slot;
    },

    /**
     * Add a weapon to the inventory. If all slots full, returns the replaced weapon info.
     */
    addWeapon(inv, weapon) {
        // Try empty slot first
        for (let i = 0; i < this.MAX_WEAPON_SLOTS; i++) {
            if (!inv.weapons[i]) {
                inv.weapons[i] = weapon;
                inv.activeSlot = i;
                return null; // nothing dropped
            }
        }
        // Replace active slot
        const old = inv.weapons[inv.activeSlot];
        inv.weapons[inv.activeSlot] = weapon;
        return old; // caller should drop this as loot
    },

    /**
     * Add ammo to inventory.
     */
    addAmmo(inv, ammoType, amount) {
        if (inv.ammo[ammoType] !== undefined) {
            inv.ammo[ammoType] += amount;
        }
    },

    /**
     * Get ammo reserve for the active weapon's ammo type.
     */
    getAmmoReserve(inv) {
        const weapon = this.getActiveWeapon(inv);
        if (!weapon) return 0;
        return inv.ammo[weapon.ammoType] || 0;
    },

    /**
     * Consume ammo from reserve (called when reload completes).
     */
    consumeAmmo(inv, ammoType, amount) {
        if (inv.ammo[ammoType] !== undefined) {
            inv.ammo[ammoType] = Math.max(0, inv.ammo[ammoType] - amount);
        }
    },

    /**
     * Add a heal item.
     */
    addHealItem(inv, healAmount, rarity, name) {
        if (inv.healItems.length < inv.maxHealItems) {
            inv.healItems.push({ healAmount, rarity, name });
            return true;
        }
        return false;
    },

    /**
     * Use the first heal item.
     */
    useHealItem(inv, healthComp) {
        if (inv.healItems.length === 0) return false;
        if (healthComp.health >= healthComp.maxHealth) return false;
        const item = inv.healItems.shift();
        HealthSystem.heal(healthComp, item.healAmount);
        return true;
    },

    /**
     * Add an armor item.
     */
    addArmorItem(inv, armorAmount, rarity, name) {
        if (inv.armorItems.length < inv.maxArmorItems) {
            inv.armorItems.push({ armorAmount, rarity, name });
            return true;
        }
        return false;
    },

    /**
     * Use the first armor item.
     */
    useArmorItem(inv, healthComp) {
        if (inv.armorItems.length === 0) return false;
        if (healthComp.armor >= healthComp.maxArmor) return false;
        const item = inv.armorItems.shift();
        HealthSystem.addArmor(healthComp, item.armorAmount);
        return true;
    },

    /**
     * Try to pick up a loot item. Returns true if successful.
     */
    pickUpLoot(inv, lootItem, healthComp, playerX, playerY) {
        switch (lootItem.type) {
            case 'weapon': {
                const weapon = WeaponSystem.create(lootItem.weaponKey, lootItem.rarity);
                const dropped = this.addWeapon(inv, weapon);
                if (dropped) {
                    // Drop the old weapon at player's location
                    LootSystem.dropWeapon(dropped.templateKey, dropped.rarity, playerX, playerY);
                }
                return true;
            }
            case 'ammo':
                this.addAmmo(inv, lootItem.ammoType, lootItem.amount);
                return true;
            case 'health':
                return this.addHealItem(inv, lootItem.healAmount, lootItem.rarity, lootItem.name);
            case 'armor':
                return this.addArmorItem(inv, lootItem.armorAmount, lootItem.rarity, lootItem.name);
            default:
                return false;
        }
    },
};
