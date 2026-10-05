/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — WEAPON SYSTEM
   Data-driven weapons, firing, recoil and reload management.
   ═══════════════════════════════════════════════════════════ */


/* =========================================================
   WEAPON DEFINITIONS
   ========================================================= */

const WEAPON_DEFS = {

    pistol: {
        name: 'Viper Pistol',
        type: 'pistol',

        damage: 18,
        fireRate: 0.25,

        magSize: 12,
        reloadTime: 1.5,

        bulletSpeed: 700,
        range: 450,

        spread: 0.04,
        recoil: 0.02,

        ammoType: 'light',

        burstCount: 1,
        pellets: 1,

        auto: false
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

        auto: true
    },


    assault: {
        name: 'Talon AR',
        type: 'assault',

        damage: 22,
        fireRate: 0.10,

        magSize: 25,
        reloadTime: 2.3,

        bulletSpeed: 800,
        range: 550,

        spread: 0.05,
        recoil: 0.04,

        ammoType: 'medium',

        burstCount: 1,
        pellets: 1,

        auto: true
    },


    shotgun: {
        name: 'Breaker SG',
        type: 'shotgun',

        damage: 12,
        fireRate: 0.8,

        magSize: 5,
        reloadTime: 2.8,

        bulletSpeed: 550,
        range: 200,

        spread: 0.20,
        recoil: 0.08,

        ammoType: 'heavy',

        burstCount: 1,
        pellets: 6,

        auto: false
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
        recoil: 0.10,

        ammoType: 'heavy',

        burstCount: 1,
        pellets: 1,

        auto: false
    }
};


/* =========================================================
   WEAPON SYSTEM
   ========================================================= */

const WeaponSystem = {


    /* =======================================================
       CREATE WEAPON
       ======================================================= */

    create(templateKey, rarity = 'COMMON') {

        const def =
            WEAPON_DEFS[templateKey];


        if (!def) {
            return null;
        }


        const rarityData =
            GAME.RARITY[rarity] ||
            GAME.RARITY.COMMON;


        const rarityMultiplier =
            rarityData.mult || 1;


        const reloadMultiplier =
            rarity === 'EPIC'
                ? 1 / 1.15
                : rarity === 'LEGENDARY'
                    ? 1 / 1.20
                    : 1;


        return {

            id:
                Utils.uid(),

            templateKey,

            name:
                def.name,

            type:
                def.type,


            /* ---------- Combat ---------- */

            damage:
                Math.round(
                    def.damage *
                    rarityMultiplier
                ),

            fireRate:
                def.fireRate,

            magSize:
                def.magSize,

            reloadTime:
                def.reloadTime *
                reloadMultiplier,

            bulletSpeed:
                def.bulletSpeed,

            range:
                def.range,

            spread:
                def.spread,

            recoil:
                def.recoil,


            /* ---------- Ammo ---------- */

            ammoType:
                def.ammoType,


            /* ---------- Firing ---------- */

            burstCount:
                def.burstCount,

            pellets:
                def.pellets,

            auto:
                def.auto,


            /* ---------- Rarity ---------- */

            rarity,

            rarityColor:
                rarityData.color,


            /* ---------- Runtime ---------- */

            currentAmmo:
                def.magSize,

            isReloading:
                false,

            reloadTimer:
                0,

            fireCooldown:
                0,

            recoilAmount:
                0,

            shotsFired:
                0
        };
    },


    /* =======================================================
       UPDATE WEAPON
       ======================================================= */

    update(
        weapon,
        dt,
        ammoReserve
    ) {

        if (!weapon) {
            return 0;
        }


        /* ---------- Fire cooldown ---------- */

        if (weapon.fireCooldown > 0) {

            weapon.fireCooldown =
                Math.max(
                    0,
                    weapon.fireCooldown - dt
                );
        }


        /* ---------- Recoil recovery ---------- */

        if (
            typeof weapon.recoilAmount !==
            'number'
        ) {
            weapon.recoilAmount = 0;
        }


        weapon.recoilAmount =
            Math.max(
                0,
                weapon.recoilAmount -
                dt * 4
            );


        /* ---------- Reload ---------- */

        if (!weapon.isReloading) {
            return 0;
        }


        weapon.reloadTimer -= dt;


        if (
            weapon.reloadTimer > 0
        ) {
            return 0;
        }


        weapon.reloadTimer = 0;
        weapon.isReloading = false;


        const needed =
            Math.max(
                0,
                weapon.magSize -
                weapon.currentAmmo
            );


        if (needed <= 0) {
            return 0;
        }


        const available =
            Math.max(
                0,
                Number(ammoReserve) || 0
            );


        const loaded =
            Math.min(
                needed,
                available
            );


        weapon.currentAmmo +=
            loaded;


        return loaded;
    },


    /* =======================================================
       START RELOAD
       ======================================================= */

    startReload(weapon) {

        if (!weapon) {
            return false;
        }


        if (weapon.isReloading) {
            return false;
        }


        if (
            weapon.currentAmmo >=
            weapon.magSize
        ) {
            return false;
        }


        weapon.isReloading = true;

        weapon.reloadTimer =
            weapon.reloadTime;


        if (
            typeof AudioSystem !==
            'undefined' &&
            AudioSystem.playReload
        ) {
            AudioSystem.playReload();
        }


        return true;
    },


    /* =======================================================
       CAN FIRE
       ======================================================= */

    canFire(weapon) {

        if (!weapon) {
            return false;
        }


        if (weapon.isReloading) {
            return false;
        }


        if (
            weapon.fireCooldown > 0
        ) {
            return false;
        }


        if (
            weapon.currentAmmo <= 0
        ) {
            return false;
        }


        return true;
    },


    /* =======================================================
       TRY FIRE
       ======================================================= */

    tryFire(
        weapon,
        ownerX,
        ownerY,
        aimAngle,
        dt
    ) {

        if (!this.canFire(weapon)) {

            // Empty magazine feedback
            if (
                weapon &&
                weapon.currentAmmo <= 0 &&
                weapon.fireCooldown <= 0 &&
                !weapon.isReloading
            ) {

                weapon.fireCooldown = 0.15;

                if (
                    typeof AudioSystem !==
                    'undefined' &&
                    AudioSystem.playEmpty
                ) {
                    AudioSystem.playEmpty();
                }
            }

            return null;
        }


        /* ---------- Consume magazine ---------- */

        weapon.currentAmmo--;

        weapon.fireCooldown =
            weapon.fireRate;

        weapon.shotsFired++;


        /* ---------- Recoil ---------- */

        weapon.recoilAmount =
            Math.min(
                1,
                weapon.recoilAmount +
                weapon.recoil
            );


        /* ---------- Bullets ---------- */

        const bullets = [];


        for (
            let pellet = 0;
            pellet < weapon.pellets;
            pellet++
        ) {

            /*
             * Slightly increase spread while
             * firing continuously.
             */
            const dynamicSpread =
                weapon.spread *
                (
                    1 +
                    weapon.recoilAmount *
                    0.35
                );


            const spreadAngle =
                aimAngle +
                Utils.randFloat(
                    -dynamicSpread,
                    dynamicSpread
                );


            bullets.push({

                x:
                    ownerX +
                    Math.cos(aimAngle) *
                    20,

                y:
                    ownerY +
                    Math.sin(aimAngle) *
                    20,


                vx:
                    Math.cos(spreadAngle) *
                    weapon.bulletSpeed,

                vy:
                    Math.sin(spreadAngle) *
                    weapon.bulletSpeed,


                damage:
                    weapon.damage,

                range:
                    weapon.range,

                distTraveled:
                    0,

                ownerId:
                    null,

                weaponType:
                    weapon.type,

                criticalChance:
                    weapon.type === 'sniper'
                        ? 0.15
                        : 0.05
            });
        }


        /* ---------- Audio ---------- */

        if (
            typeof AudioSystem !==
            'undefined' &&
            AudioSystem.playGunshot
        ) {

            AudioSystem.playGunshot(
                weapon.type
            );
        }


        /* ---------- Muzzle flash ---------- */

        if (
            typeof VFXSystem !==
            'undefined' &&
            VFXSystem.spawnMuzzleFlash
        ) {

            VFXSystem.spawnMuzzleFlash(
                ownerX,
                ownerY,
                aimAngle
            );
        }


        return bullets;
    },


    /* =======================================================
       FORCE RELOAD
       ======================================================= */

    cancelReload(weapon) {

        if (!weapon) {
            return;
        }


        weapon.isReloading = false;
        weapon.reloadTimer = 0;
    },


    /* =======================================================
       GET WEAPON INFO
       ======================================================= */

    getDefinition(templateKey) {

        return (
            WEAPON_DEFS[templateKey] ||
            null
        );
    },


    /* =======================================================
       WEAPON STAT SUMMARY
       ======================================================= */

    getStats(weapon) {

        if (!weapon) {
            return null;
        }


        return {

            name:
                weapon.name,

            damage:
                weapon.damage,

            fireRate:
                weapon.fireRate,

            magazine:
                weapon.magSize,

            ammo:
                weapon.currentAmmo,

            reload:
                weapon.reloadTime,

            range:
                weapon.range,

            rarity:
                weapon.rarity
        };
    }
};