/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Loot System
   Spawns and manages ground loot items.
   ═══════════════════════════════════════════════════════════ */

const LootSystem = {
    items: [],

    reset() {
        this.items = [];
    },

    /**
     * Spawn initial loot across the map.
     */
    spawnInitialLoot() {
        this.items = [];
        const points = MapSystem.lootSpawnPoints.slice();

        // Shuffle spawn points
        for (let i = points.length - 1; i > 0; i--) {
            const j = Utils.randInt(0, i);
            [points[i], points[j]] = [points[j], points[i]];
        }

        const count = Math.min(GAME.LOOT_SPAWN_COUNT, points.length);
        for (let i = 0; i < count; i++) {
            const pt = points[i];
            const item = this._generateRandomLoot(pt.x, pt.y);
            if (item) this.items.push(item);
        }
    },

    /**
     * Generate a random loot item at position.
     */
    _generateRandomLoot(x, y) {
        const roll = Math.random();
        const rarity = this._rollRarity();

        if (roll < 0.30) {
            // Weapon
            const weaponKeys = Object.keys(WEAPON_DEFS);
            const key = Utils.randomPick(weaponKeys);
            return {
                id: Utils.uid(),
                x, y,
                type: 'weapon',
                weaponKey: key,
                rarity,
                name: WEAPON_DEFS[key].name,
                color: GAME.RARITY[rarity].color,
                picked: false,
            };
        } else if (roll < 0.55) {
            // Ammo
            const ammoType = Utils.randomPick(['light', 'medium', 'heavy']);
            const amount = Utils.randInt(15, 40);
            return {
                id: Utils.uid(),
                x, y,
                type: 'ammo',
                ammoType,
                amount,
                rarity: 'COMMON',
                name: `${ammoType} Ammo (${amount})`,
                color: GAME.COLORS.AMMO_COLOR,
                picked: false,
            };
        } else if (roll < 0.78) {
            // Health kit
            const healAmount = rarity === 'EPIC' ? 75 : rarity === 'RARE' ? 50 : 25;
            return {
                id: Utils.uid(),
                x, y,
                type: 'health',
                healAmount,
                rarity,
                name: `Med Kit (+${healAmount})`,
                color: GAME.COLORS.HEALTH_BAR,
                picked: false,
            };
        } else {
            // Armor
            const armorAmount = rarity === 'EPIC' ? 75 : rarity === 'RARE' ? 50 : 25;
            return {
                id: Utils.uid(),
                x, y,
                type: 'armor',
                armorAmount,
                rarity,
                name: `Armor Plate (+${armorAmount})`,
                color: GAME.COLORS.ARMOR_BAR,
                picked: false,
            };
        }
    },

    /**
     * Roll a rarity tier.
     */
    _rollRarity() {
        const r = Math.random();
        if (r < 0.05) return 'EPIC';
        if (r < 0.18) return 'RARE';
        if (r < 0.42) return 'UNCOMMON';
        return 'COMMON';
    },

    /**
     * Find nearest unpicked item within pickup range.
     */
    findNearestPickup(x, y) {
        let nearest = null;
        let nearestDist = GAME.LOOT_PICKUP_RANGE;
        for (const item of this.items) {
            if (item.picked) continue;
            const d = Utils.distance(x, y, item.x, item.y);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = item;
            }
        }
        return nearest;
    },

    /**
     * Mark an item as picked up.
     */
    pickUp(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (item) {
            item.picked = true;
            AudioSystem.playPickup();
            if (typeof VFXSystem !== 'undefined') {
                VFXSystem.spawnPickupEffect(item.x, item.y, item.color);
            }
        }
        return item;
    },

    /**
     * Drop a weapon as loot at position.
     */
    dropWeapon(weaponKey, rarity, x, y) {
        this.items.push({
            id: Utils.uid(),
            x, y,
            type: 'weapon',
            weaponKey,
            rarity,
            name: WEAPON_DEFS[weaponKey].name,
            color: GAME.RARITY[rarity].color,
            picked: false,
        });
    },

    /**
     * Render loot items.
     */
    render(ctx) {
        for (const item of this.items) {
            if (item.picked) continue;

            // Pulsing glow
            const pulse = 0.8 + Math.sin(Date.now() * 0.003 + item.x) * 0.2;

            // Outer rarity glow
            ctx.beginPath();
            ctx.arc(item.x, item.y, (GAME.LOOT_RADIUS + 6) * pulse, 0, Math.PI * 2);
            ctx.fillStyle = (item.color || '#00e5ff') + '44';
            ctx.fill();

            // Background circle
            ctx.beginPath();
            ctx.arc(item.x, item.y, GAME.LOOT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
            ctx.strokeStyle = item.color || '#00e5ff';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();

            // Draw asset icon if available
            let drawn = false;
            if (item.type === 'weapon' && item.weaponKey) {
                const weaponDef = WEAPON_DEFS[item.weaponKey];
                drawn = AssetManager.drawWeaponIcon(ctx, weaponDef ? weaponDef.type : 'pistol', item.x, item.y, 24, 14);
            } else {
                drawn = AssetManager.drawLootIcon(ctx, item.type, item.ammoType, item.x, item.y, 16);
            }

            if (!drawn) {
                ctx.fillStyle = item.color || '#fff';
                ctx.font = 'bold 10px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const symbol = item.type === 'weapon' ? '⚔' :
                               item.type === 'ammo' ? '•' :
                               item.type === 'health' ? '+' : '◆';
                ctx.fillText(symbol, item.x, item.y);
            }
        }
    },
};
