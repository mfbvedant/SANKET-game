/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Weapon Definitions & System
   ═══════════════════════════════════════════════════════════ */

/**
 * Weapon templates — data-driven weapon system.
 * All weapon behavior is derived from these definitions.
 */
const WEAPON_DEFS = {
    pistol: {
        name: 'Viper Pistol',
        type: 'pistol',
        damage: 18,
        fireRate: 0.25,       // seconds between shots
        magSize: 12,
        reloadTime: 1.5,
        bulletSpeed: 700,
        range: 450,
        spread: 0.04,         // radians
        recoil: 0.02,
        ammoType: 'light',
        burstCount: 1,
        pellets: 1,
        auto: false,
    },
    smg: {
        name: 'Hornet SMG',
        type: 'smg',
        damage: 14,
        fireRate: 0.08,
        magSize: 30,
        reloadTime: 2.0,
        bulletSpeed: 650,
        range: 350,
        spread: 0.09,
        recoil: 0.03,
        ammoType: 'light',
        burstCount: 1,
        pellets: 1,
        auto: true,
    },
    assault: {
        name: 'Talon AR',
        type: 'assault',
        damage: 22,
        fireRate: 0.1,
        magSize: 25,
        reloadTime: 2.3,
        bulletSpeed: 800,
        range: 550,
        spread: 0.05,
        recoil: 0.04,
        ammoType: 'medium',
        burstCount: 1,
        pellets: 1,
        auto: true,
    },
    shotgun: {
        name: 'Breaker SG',
        type: 'shotgun',
        damage: 12,            // per pellet
        fireRate: 0.8,
        magSize: 5,
        reloadTime: 2.8,
        bulletSpeed: 550,
        range: 200,
        spread: 0.2,
        recoil: 0.08,
        ammoType: 'heavy',
        burstCount: 1,
        pellets: 6,
        auto: false,
    },
    sniper: {
        name: 'Farsight SR',
        type: 'sniper',
        damage: 75,
        fireRate: 1.5,
        magSize: 5,
        reloadTime: 3.0,
        bulletSpeed: 1200,
        range: 900,
        spread: 0.01,
        recoil: 0.1,
        ammoType: 'heavy',
        burstCount: 1,
        pellets: 1,
        auto: false,
    },
};

/**
 * WeaponSystem — manages creating, firing, and reloading weapon instances.
 */
const WeaponSystem = {
    /**
     * Create a weapon instance from a template key + optional rarity.
     */
    create(templateKey, rarity = 'COMMON') {
        const def = WEAPON_DEFS[templateKey];
        if (!def) return null;
        const rarityData = GAME.RARITY[rarity] || GAME.RARITY.COMMON;
        return {
            id: Utils.uid(),
            templateKey,
            name: def.name,
            type: def.type,
            damage: Math.round(def.damage * rarityData.mult),
            fireRate: def.fireRate,
            magSize: def.magSize,
            reloadTime: def.reloadTime / (rarity === 'EPIC' ? 1.15 : 1),
            bulletSpeed: def.bulletSpeed,
            range: def.range,
            spread: def.spread,
            recoil: def.recoil,
            ammoType: def.ammoType,
            burstCount: def.burstCount,
            pellets: def.pellets,
            auto: def.auto,
            rarity: rarity,
            rarityColor: rarityData.color,
            currentAmmo: def.magSize,
            isReloading: false,
            reloadTimer: 0,
            fireCooldown: 0,
        };
    },

    /**
     * Try to fire the weapon. Returns bullet data array or null.
     */
    tryFire(weapon, ownerX, ownerY, aimAngle, dt) {
        if (!weapon) return null;
        if (weapon.isReloading) return null;
        if (weapon.fireCooldown > 0) return null;
        if (weapon.currentAmmo <= 0) return null;

        weapon.currentAmmo--;
        weapon.fireCooldown = weapon.fireRate;

        const bullets = [];
        for (let p = 0; p < weapon.pellets; p++) {
            const spreadAngle = aimAngle + Utils.randFloat(-weapon.spread, weapon.spread);
            bullets.push({
                x: ownerX + Math.cos(aimAngle) * 20,
                y: ownerY + Math.sin(aimAngle) * 20,
                vx: Math.cos(spreadAngle) * weapon.bulletSpeed,
                vy: Math.sin(spreadAngle) * weapon.bulletSpeed,
                damage: weapon.damage,
                range: weapon.range,
                distTraveled: 0,
                ownerId: null, // set by caller
            });
        }

        // Audio & VFX
        AudioSystem.playGunshot(weapon.type);
        if (typeof VFXSystem !== 'undefined') {
            VFXSystem.spawnMuzzleFlash(ownerX, ownerY, aimAngle);
        }

        return bullets;
    },

    /**
     * Start reloading. Needs ammo reserve passed in, returns ammo needed.
     */
    startReload(weapon) {
        if (!weapon) return;
        if (weapon.isReloading) return;
        if (weapon.currentAmmo >= weapon.magSize) return;
        weapon.isReloading = true;
        weapon.reloadTimer = weapon.reloadTime;
        AudioSystem.playReload();
    },

    /**
     * Update weapon timers.
     */
    update(weapon, dt, ammoReserve) {
        if (!weapon) return;
        if (weapon.fireCooldown > 0) {
            weapon.fireCooldown -= dt;
        }
        if (weapon.isReloading) {
            weapon.reloadTimer -= dt;
            if (weapon.reloadTimer <= 0) {
                weapon.isReloading = false;
                const needed = weapon.magSize - weapon.currentAmmo;
                const available = Math.min(needed, ammoReserve || Infinity);
                weapon.currentAmmo += available;
                return available; // return ammo consumed from reserve
            }
        }
        return 0;
    },
};
