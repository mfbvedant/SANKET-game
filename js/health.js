/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Health System
   Manages health and armor for any entity.
   ═══════════════════════════════════════════════════════════ */

const HealthSystem = {
    /**
     * Create a health component.
     */
    create(maxHealth, maxArmor) {
        return {
            health: maxHealth,
            maxHealth,
            armor: 0,
            maxArmor: maxArmor || GAME.PLAYER_MAX_ARMOR,
            alive: true,
            lastDamageTime: 0,
        };
    },

    /**
     * Apply damage. Armor absorbs 60% of damage first.
     */
    takeDamage(hc, amount) {
        if (!hc.alive) return;

        if (hc.armor > 0) {
            const armorAbsorb = Math.min(hc.armor, amount * 0.6);
            hc.armor -= armorAbsorb;
            amount -= armorAbsorb;
        }

        hc.health -= amount;
        hc.lastDamageTime = Date.now();

        if (hc.health <= 0) {
            hc.health = 0;
            hc.alive = false;
        }
    },

    /**
     * Heal the entity.
     */
    heal(hc, amount) {
        hc.health = Math.min(hc.health + amount, hc.maxHealth);
    },

    /**
     * Add armor.
     */
    addArmor(hc, amount) {
        hc.armor = Math.min(hc.armor + amount, hc.maxArmor);
    },

    /**
     * Get health as percentage.
     */
    healthPercent(hc) {
        return hc.health / hc.maxHealth;
    },

    /**
     * Get armor as percentage.
     */
    armorPercent(hc) {
        return hc.armor / hc.maxArmor;
    },
};
