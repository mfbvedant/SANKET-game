/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Health System
   Handles health, armor, damage, healing and combat feedback.
   ═══════════════════════════════════════════════════════════ */

const HealthSystem = {

    /**
     * Create a health component.
     */
    create(maxHealth, maxArmor) {
        const safeMaxHealth = Math.max(1, Number(maxHealth) || 1);
        const safeMaxArmor =
            Math.max(0, Number(maxArmor ?? GAME.PLAYER_MAX_ARMOR));

        return {
            health: safeMaxHealth,
            maxHealth: safeMaxHealth,

            armor: 0,
            maxArmor: safeMaxArmor,

            alive: true,

            // Combat state
            lastDamageTime: 0,
            lastDamageAmount: 0,
            lastArmorDamage: 0,
            lastHealthDamage: 0,

            // Useful for UI / regeneration systems
            damageFlash: 0,
            invulnerable: false,
        };
    },

    /**
     * Apply damage.
     *
     * Armor absorbs 60% of incoming damage while available.
     *
     * Returns information about how the damage was distributed.
     */
    takeDamage(hc, amount) {
        if (!hc || !hc.alive || hc.invulnerable) {
            return {
                damage: 0,
                armorDamage: 0,
                healthDamage: 0,
                killed: false,
            };
        }

        let incoming = Number(amount);

        if (!Number.isFinite(incoming) || incoming <= 0) {
            return {
                damage: 0,
                armorDamage: 0,
                healthDamage: 0,
                killed: false,
            };
        }

        incoming = Math.max(0, incoming);

        const startingHealth = hc.health;
        const startingArmor = hc.armor;

        let armorDamage = 0;
        let healthDamage = 0;

        /*
         * Armor absorbs 60% of incoming damage.
         * The armor pool itself is consumed by that absorbed amount.
         */
        if (hc.armor > 0) {
            armorDamage = Math.min(hc.armor, incoming * 0.6);

            hc.armor -= armorDamage;
            incoming -= armorDamage;
        }

        /*
         * Whatever armor could not absorb goes directly to health.
         */
        healthDamage = Math.min(hc.health, incoming);
        hc.health -= healthDamage;

        // Numerical safety
        hc.armor = Math.max(0, hc.armor);
        hc.health = Math.max(0, hc.health);

        hc.lastDamageTime = Date.now();
        hc.lastDamageAmount = armorDamage + healthDamage;
        hc.lastArmorDamage = armorDamage;
        hc.lastHealthDamage = healthDamage;

        // Used by player/enemy rendering for damage feedback
        hc.damageFlash = 1;

        let killed = false;

        if (hc.health <= 0) {
            hc.health = 0;
            hc.alive = false;
            killed = true;
        }

        return {
            damage: armorDamage + healthDamage,
            armorDamage,
            healthDamage,
            killed,

            healthRemaining: hc.health,
            armorRemaining: hc.armor,

            previousHealth: startingHealth,
            previousArmor: startingArmor,
        };
    },

    /**
     * Heal the entity.
     *
     * Returns the actual amount healed.
     */
    heal(hc, amount) {
        if (!hc || !hc.alive) return 0;

        const healAmount = Number(amount);

        if (!Number.isFinite(healAmount) || healAmount <= 0) {
            return 0;
        }

        const previousHealth = hc.health;

        hc.health = Math.min(
            hc.health + healAmount,
            hc.maxHealth
        );

        return hc.health - previousHealth;
    },

    /**
     * Add armor.
     *
     * Returns the actual armor added.
     */
    addArmor(hc, amount) {
        if (!hc || !hc.alive) return 0;

        const armorAmount = Number(amount);

        if (!Number.isFinite(armorAmount) || armorAmount <= 0) {
            return 0;
        }

        const previousArmor = hc.armor;

        hc.armor = Math.min(
            hc.armor + armorAmount,
            hc.maxArmor
        );

        return hc.armor - previousArmor;
    },

    /**
     * Set health directly.
     */
    setHealth(hc, amount) {
        if (!hc) return;

        const value = Number(amount);

        if (!Number.isFinite(value)) return;

        hc.health = Utils.clamp(
            value,
            0,
            hc.maxHealth
        );

        if (hc.health <= 0) {
            hc.health = 0;
            hc.alive = false;
        } else {
            hc.alive = true;
        }
    },

    /**
     * Set armor directly.
     */
    setArmor(hc, amount) {
        if (!hc) return;

        const value = Number(amount);

        if (!Number.isFinite(value)) return;

        hc.armor = Utils.clamp(
            value,
            0,
            hc.maxArmor
        );
    },

    /**
     * Restore the entity to full health.
     */
    fullHeal(hc) {
        if (!hc) return;

        hc.health = hc.maxHealth;
        hc.alive = true;
        hc.damageFlash = 0;
    },

    /**
     * Restore health and armor.
     */
    reset(hc) {
        if (!hc) return;

        hc.health = hc.maxHealth;
        hc.armor = 0;
        hc.alive = true;

        hc.lastDamageTime = 0;
        hc.lastDamageAmount = 0;
        hc.lastArmorDamage = 0;
        hc.lastHealthDamage = 0;

        hc.damageFlash = 0;
        hc.invulnerable = false;
    },

    /**
     * Update temporary visual damage feedback.
     */
    update(hc, dt) {
        if (!hc) return;

        if (hc.damageFlash > 0) {
            hc.damageFlash = Math.max(
                0,
                hc.damageFlash - dt * 5
            );
        }
    },

    /**
     * Get health as a percentage from 0 to 1.
     */
    healthPercent(hc) {
        if (!hc || hc.maxHealth <= 0) return 0;

        return Utils.clamp(
            hc.health / hc.maxHealth,
            0,
            1
        );
    },

    /**
     * Get armor as a percentage from 0 to 1.
     */
    armorPercent(hc) {
        if (!hc || hc.maxArmor <= 0) return 0;

        return Utils.clamp(
            hc.armor / hc.maxArmor,
            0,
            1
        );
    },

    /**
     * Check whether an entity is alive.
     */
    isAlive(hc) {
        return !!(hc && hc.alive && hc.health > 0);
    },

    /**
     * Check whether health is critically low.
     */
    isCritical(hc, threshold = 0.25) {
        return this.healthPercent(hc) <= threshold;
    },

    /**
     * Check whether armor is depleted.
     */
    hasArmor(hc) {
        return !!(hc && hc.armor > 0);
    },

    /**
     * Get a simple status object for HUD/UI systems.
     */
    getStatus(hc) {
        if (!hc) {
            return {
                health: 0,
                maxHealth: 0,
                armor: 0,
                maxArmor: 0,
                healthPercent: 0,
                armorPercent: 0,
                alive: false,
                critical: true,
            };
        }

        return {
            health: hc.health,
            maxHealth: hc.maxHealth,

            armor: hc.armor,
            maxArmor: hc.maxArmor,

            healthPercent: this.healthPercent(hc),
            armorPercent: this.armorPercent(hc),

            alive: this.isAlive(hc),
            critical: this.isCritical(hc),
        };
    },
};