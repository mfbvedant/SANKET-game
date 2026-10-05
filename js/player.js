/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Player Controller
   Movement, aiming, shooting, inventory interaction,
   animation state and animated soldier rendering.
   ═══════════════════════════════════════════════════════════ */

const Player = {

    id: 'player',

    // ─────────────────────────────────────────────
    // POSITION
    // ─────────────────────────────────────────────

    x: 0,
    y: 0,

    radius: GAME.PLAYER_RADIUS,
    speed: GAME.PLAYER_SPEED,

    velocityX: 0,
    velocityY: 0,

    // ─────────────────────────────────────────────
    // AIM
    // ─────────────────────────────────────────────

    aimAngle: 0,

    // ─────────────────────────────────────────────
    // COMPONENTS
    // ─────────────────────────────────────────────

    healthComp: null,
    inventory: null,

    // ─────────────────────────────────────────────
    // GAMEPLAY
    // ─────────────────────────────────────────────

    kills: 0,
    isAlive: true,
    isShooting: false,
    showInventory: false,
    killedBy: null,

    // ─────────────────────────────────────────────
    // ANIMATION
    // ─────────────────────────────────────────────

    animationState: 'idle',

    animationTime: 0,
    animationFrame: 0,

    movementAngle: 0,

    /*
     * Temporary animation overrides.
     *
     * pickupAnimationUntil:
     * Used by the loot system.
     *
     * deathAnimationUntil:
     * Keeps the final death animation visible
     * for a short period after elimination.
     */
    pickupAnimationUntil: 0,
    pickupAnimationTime: 0,

    deathAnimationUntil: 0,
    deathAnimationTime: 0,

    // ─────────────────────────────────────────────
    // COMBAT VISUALS
    // ─────────────────────────────────────────────

    recoilAmount: 0,

    weaponKick: 0,

    // ─────────────────────────────────────────────
    // DAMAGE FEEDBACK
    // ─────────────────────────────────────────────

    hurtAnimationUntil: 0,

    // ─────────────────────────────────────────────
    // FOOTSTEP TIMER
    // ─────────────────────────────────────────────

    footstepTimer: 0,

    // ─────────────────────────────────────────────
    // INPUT STATE
    // ─────────────────────────────────────────────

    keys: {},

    mouseX: 0,
    mouseY: 0,

    mouseDown: false,


    /* =========================================================
       INITIALIZE
       ========================================================= */

    init(
        spawnX,
        spawnY
    ) {

        this.x = spawnX;
        this.y = spawnY;

        this.velocityX = 0;
        this.velocityY = 0;

        this.aimAngle = 0;

        this.healthComp =
            HealthSystem.create(
                GAME.PLAYER_MAX_HEALTH,
                GAME.PLAYER_MAX_ARMOR
            );


        /*
         * Starting armor.
         */
        HealthSystem.addArmor(
            this.healthComp,
            100
        );


        this.inventory =
            InventorySystem.create();


        // Gameplay
        this.kills = 0;
        this.isAlive = true;
        this.isShooting = false;
        this.showInventory = false;
        this.killedBy = null;


        // Animation
        this.animationState = 'idle';
        this.animationTime = 0;
        this.animationFrame = 0;

        this.movementAngle = 0;

        this.pickupAnimationUntil = 0;
        this.pickupAnimationTime = 0;

        this.deathAnimationUntil = 0;
        this.deathAnimationTime = 0;

        this.hurtAnimationUntil = 0;


        // Combat visuals
        this.recoilAmount = 0;
        this.weaponKick = 0;


        // Footsteps
        this.footstepTimer = 0;


        // Input
        this.keys = {};
        this.mouseDown = false;


        /* =====================================================
           STARTING EQUIPMENT
           ===================================================== */

        const pistol =
            WeaponSystem.create(
                'pistol',
                'UNCOMMON'
            );


        InventorySystem.addWeapon(
            this.inventory,
            pistol
        );


        InventorySystem.addAmmo(
            this.inventory,
            'light',
            90
        );


        InventorySystem.addAmmo(
            this.inventory,
            'medium',
            60
        );


        /*
         * Starting healing items.
         */
        InventorySystem.addHealItem(
            this.inventory,
            75,
            'UNCOMMON',
            'First Aid Kit'
        );


        InventorySystem.addHealItem(
            this.inventory,
            75,
            'UNCOMMON',
            'First Aid Kit'
        );


        /*
         * Starting armor item.
         */
        InventorySystem.addArmorItem(
            this.inventory,
            50,
            'RARE',
            'Armor Plate'
        );
    },


    /* =========================================================
       INPUT
       ========================================================= */

    bindInput(canvas) {

        /* -----------------------------------------------------
           KEY DOWN
           ----------------------------------------------------- */

        window.addEventListener(
            'keydown',
            (e) => {

                const key =
                    e.key.toLowerCase();


                this.keys[key] = true;


                /*
                 * Do not process gameplay controls
                 * while the game is paused/menu/results.
                 */
                if (
                    typeof Game !== 'undefined' &&
                    Game.state !== 'PLAYING'
                ) {
                    return;
                }


                /* ---------------------------------------------
                   WEAPON SLOTS
                   --------------------------------------------- */

                if (e.key === '1') {

                    InventorySystem.switchSlot(
                        this.inventory,
                        0
                    );
                }


                if (e.key === '2') {

                    InventorySystem.switchSlot(
                        this.inventory,
                        1
                    );
                }


                if (e.key === '3') {

                    InventorySystem.switchSlot(
                        this.inventory,
                        2
                    );
                }


                /* ---------------------------------------------
                   RELOAD
                   --------------------------------------------- */

                if (key === 'r') {

                    const weapon =
                        InventorySystem.getActiveWeapon(
                            this.inventory
                        );


                    if (
                        weapon &&
                        !weapon.isReloading &&
                        weapon.currentAmmo <
                            weapon.magSize &&
                        InventorySystem.getAmmoReserve(
                            this.inventory
                        ) > 0
                    ) {

                        WeaponSystem.startReload(
                            weapon
                        );
                    }
                }


                /* ---------------------------------------------
                   PICKUP
                   --------------------------------------------- */

                if (key === 'e') {

                    this._tryPickup();
                }


                /* ---------------------------------------------
                   HEAL
                   --------------------------------------------- */

                if (e.key === '4') {

                    if (
                        InventorySystem.useHealItem(
                            this.inventory,
                            this.healthComp
                        )
                    ) {

                        this._startHealAnimation();

                        if (
                            typeof AudioSystem !==
                            'undefined' &&
                            AudioSystem.playHeal
                        ) {

                            AudioSystem.playHeal();
                        }
                    }
                }


                /* ---------------------------------------------
                   ARMOR
                   --------------------------------------------- */

                if (e.key === '5') {

                    if (
                        InventorySystem.useArmorItem(
                            this.inventory,
                            this.healthComp
                        )
                    ) {

                        this._startHealAnimation();

                        if (
                            typeof AudioSystem !==
                            'undefined' &&
                            AudioSystem.playArmorPickup
                        ) {

                            AudioSystem.playArmorPickup();
                        }
                    }
                }


                /* ---------------------------------------------
                   INVENTORY
                   --------------------------------------------- */

                if (e.key === 'Tab') {

                    e.preventDefault();

                    this.showInventory =
                        !this.showInventory;
                }
            }
        );


        /* -----------------------------------------------------
           KEY UP
           ----------------------------------------------------- */

        window.addEventListener(
            'keyup',
            (e) => {

                this.keys[
                    e.key.toLowerCase()
                ] = false;
            }
        );


        /* -----------------------------------------------------
           MOUSE MOVE
           ----------------------------------------------------- */

        canvas.addEventListener(
            'mousemove',
            (e) => {

                this.mouseX =
                    e.clientX;

                this.mouseY =
                    e.clientY;
            }
        );


        /* -----------------------------------------------------
           MOUSE DOWN
           ----------------------------------------------------- */

        canvas.addEventListener(
            'mousedown',
            (e) => {

                if (e.button === 0) {

                    this.mouseDown = true;

                    if (
                        typeof AudioSystem !==
                        'undefined'
                    ) {

                        AudioSystem.resume();
                    }
                }
            }
        );


        /* -----------------------------------------------------
           MOUSE UP
           ----------------------------------------------------- */

        canvas.addEventListener(
            'mouseup',
            (e) => {

                if (e.button === 0) {

                    this.mouseDown = false;
                }
            }
        );


        /* -----------------------------------------------------
           BROWSER BLUR
           ----------------------------------------------------- */

        window.addEventListener(
            'blur',
            () => {

                this.mouseDown = false;
            }
        );


        /* -----------------------------------------------------
           CONTEXT MENU
           ----------------------------------------------------- */

        canvas.addEventListener(
            'contextmenu',
            (e) => {

                e.preventDefault();
            }
        );
    },


    /* =========================================================
       PICKUP
       ========================================================= */

    _tryPickup() {

        if (
            !this.isAlive
        ) {
            return;
        }


        const nearest =
            LootSystem.findNearestPickup(
                this.x,
                this.y
            );


        if (!nearest) {
            return;
        }


        const success =
            InventorySystem.pickUpLoot(
                this.inventory,
                nearest,
                this.healthComp,
                this.x,
                this.y
            );


        if (success) {

            LootSystem.pickUp(
                nearest.id
            );
        }
    },


    /* =========================================================
       HEAL ANIMATION
       ========================================================= */

    _startHealAnimation() {

        this.animationState =
            'heal';

        this.animationTime = 0;
        this.animationFrame = 0;
    },


    /* =========================================================
       PICKUP ANIMATION
       ========================================================= */

    _startPickupAnimation() {

        this.pickupAnimationUntil =
            Date.now() +
            450;

        this.pickupAnimationTime = 0;

        this.animationState =
            'loot';

        this.animationTime = 0;
        this.animationFrame = 0;
    },


    /* =========================================================
       UPDATE ANIMATION STATE
       ========================================================= */

    _updateAnimation(
        dt,
        isMoving,
        weapon
    ) {

        const now =
            Date.now();


        /*
         * Death always has highest priority.
         */
        if (
            !this.isAlive
        ) {

            this.animationState =
                'death';

            this.deathAnimationTime +=
                dt;

            this.animationTime +=
                dt;

            const speed =
                AssetManager.getAnimationSpeed(
                    'death'
                );


            this.animationFrame =
                Math.floor(
                    this.animationTime *
                    speed
                );


            /*
             * Do not loop the death animation.
             */
            const frameCount =
                AssetManager.getAnimationFrameCount(
                    'death'
                );


            this.animationFrame =
                Math.min(
                    this.animationFrame,
                    frameCount - 1
                );


            return;
        }


        /*
         * Pickup / loot animation.
         */
        if (
            now <
            this.pickupAnimationUntil
        ) {

            this.animationState =
                'loot';

            this.pickupAnimationTime +=
                dt;

            this.animationTime +=
                dt;


            const speed =
                AssetManager.getAnimationSpeed(
                    'loot'
                );


            const frameCount =
                AssetManager.getAnimationFrameCount(
                    'loot'
                );


            this.animationFrame =
                Math.min(
                    Math.floor(
                        this.animationTime *
                        speed
                    ),
                    frameCount - 1
                );


            return;
        }


        /*
         * Hurt animation.
         */
        if (
            now <
            this.hurtAnimationUntil
        ) {

            this.animationState =
                'hurt';

            this.animationTime +=
                dt;


            const speed =
                AssetManager.getAnimationSpeed(
                    'hurt'
                );


            const frameCount =
                AssetManager.getAnimationFrameCount(
                    'hurt'
                );


            this.animationFrame =
                Math.min(
                    Math.floor(
                        this.animationTime *
                        speed
                    ),
                    frameCount - 1
                );


            return;
        }


        /*
         * Reload has priority over shooting.
         */
        if (
            weapon &&
            weapon.isReloading
        ) {

            this.animationState =
                'reload';
        }


        else if (
            this.isShooting
        ) {

            this.animationState =
                'shoot';
        }


        else if (
            isMoving
        ) {

            /*
             * Run animation when moving
             * at high speed.
             */
            const velocity =
                Math.sqrt(
                    this.velocityX *
                    this.velocityX +
                    this.velocityY *
                    this.velocityY
                );


            this.animationState =
                velocity >
                this.speed * 0.72
                    ? 'run'
                    : 'walk';
        }


        else {

            this.animationState =
                'idle';
        }


        /*
         * Advance animation.
         */
        this.animationTime +=
            dt;


        const speed =
            AssetManager.getAnimationSpeed(
                this.animationState
            );


        const frameCount =
            AssetManager.getAnimationFrameCount(
                this.animationState
            );


        if (
            this.animationState ===
            'idle'
        ) {

            /*
             * Idle loops continuously.
             */
            this.animationFrame =
                Math.floor(
                    this.animationTime *
                    speed
                ) %
                frameCount;
        }


        else {

            this.animationFrame =
                Math.floor(
                    this.animationTime *
                    speed
                ) %
                frameCount;
        }
    },


    /* =========================================================
       UPDATE
       ========================================================= */

    update(dt) {

        /*
         * Keep death animation alive even after
         * the player is eliminated.
         */
        if (
            !this.isAlive
        ) {

            this._updateAnimation(
                dt,
                false,
                null
            );

            return;
        }


        /*
         * Do not update gameplay while paused.
         */
        if (
            typeof Game !== 'undefined' &&
            Game.state !== 'PLAYING' &&
            Game.state !== 'ENDING'
        ) {
            return;
        }


        /* -----------------------------------------------------
           MOVEMENT INPUT
           ----------------------------------------------------- */

        let dx = 0;
        let dy = 0;


        if (this.keys['w']) {
            dy -= 1;
        }


        if (this.keys['s']) {
            dy += 1;
        }


        if (this.keys['a']) {
            dx -= 1;
        }


        if (this.keys['d']) {
            dx += 1;
        }


        const isMoving =
            dx !== 0 ||
            dy !== 0;


        /* -----------------------------------------------------
           NORMALIZE DIAGONAL MOVEMENT
           ----------------------------------------------------- */

        if (
            dx !== 0 &&
            dy !== 0
        ) {

            const inv =
                1 / Math.SQRT2;

            dx *= inv;
            dy *= inv;
        }


        /* -----------------------------------------------------
           MOVEMENT DIRECTION
           ----------------------------------------------------- */

        if (isMoving) {

            this.movementAngle =
                Math.atan2(
                    dy,
                    dx
                );
        }


        /* -----------------------------------------------------
           ACCELERATION
           ----------------------------------------------------- */

        const targetVelocityX =
            dx *
            this.speed;


        const targetVelocityY =
            dy *
            this.speed;


        const acceleration =
            isMoving
                ? 12
                : 18;


        this.velocityX +=
            (
                targetVelocityX -
                this.velocityX
            ) *
            Math.min(
                acceleration * dt,
                1
            );


        this.velocityY +=
            (
                targetVelocityY -
                this.velocityY
            ) *
            Math.min(
                acceleration * dt,
                1
            );


        /* -----------------------------------------------------
           APPLY MOVEMENT
           ----------------------------------------------------- */

        const newX =
            this.x +
            this.velocityX *
            dt;


        const newY =
            this.y +
            this.velocityY *
            dt;


        const push =
            MapSystem.resolveCollision(
                newX,
                newY,
                this.radius
            );


        this.x =
            Utils.clamp(
                newX + push.x,
                this.radius,
                GAME.MAP_WIDTH -
                    this.radius
            );


        this.y =
            Utils.clamp(
                newY + push.y,
                this.radius,
                GAME.MAP_HEIGHT -
                    this.radius
            );


        /* -----------------------------------------------------
           FOOTSTEPS
           ----------------------------------------------------- */

        if (isMoving) {

            this.footstepTimer -=
                dt;


            if (
                this.footstepTimer <= 0
            ) {

                if (
                    typeof AudioSystem !==
                    'undefined' &&
                    AudioSystem.playFootstep
                ) {

                    AudioSystem.playFootstep();
                }


                this.footstepTimer =
                    this.animationState === 'run'
                        ? 0.24
                        : 0.30;
            }
        }


        else {

            this.footstepTimer = 0;
        }


        /* -----------------------------------------------------
           AIM
           ----------------------------------------------------- */

        const worldMouse =
            CameraSystem.screenToWorld(
                this.mouseX,
                this.mouseY
            );


        this.aimAngle =
            Utils.angleBetween(
                this.x,
                this.y,
                worldMouse.x,
                worldMouse.y
            );


        /* -----------------------------------------------------
           WEAPON
           ----------------------------------------------------- */

        const weapon =
            InventorySystem.getActiveWeapon(
                this.inventory
            );


        if (weapon) {

            const ammoConsumed =
                WeaponSystem.update(
                    weapon,
                    dt,
                    InventorySystem.getAmmoReserve(
                        this.inventory
                    )
                );


            if (
                ammoConsumed > 0
            ) {

                InventorySystem.consumeAmmo(
                    this.inventory,
                    weapon.ammoType,
                    ammoConsumed
                );
            }


            /* ---------------------------------------------
               SHOOTING
               --------------------------------------------- */

            if (
                this.mouseDown &&
                !this.showInventory &&
                !weapon.isReloading
            ) {

                const shouldFire =
                    weapon.auto ||
                    !this.isShooting;


                if (shouldFire) {

                    const bullets =
                        WeaponSystem.tryFire(
                            weapon,
                            this.x,
                            this.y,
                            this.aimAngle,
                            dt
                        );


                    if (bullets) {

                        ProjectileSystem.addBullets(
                            bullets,
                            this.id
                        );


                        this.recoilAmount =
                            Math.min(
                                this.recoilAmount +
                                0.8,
                                4
                            );


                        this.weaponKick = 5;
                    }
                }


                this.isShooting = true;
            }


            else {

                this.isShooting = false;
            }


            /* ---------------------------------------------
               AUTO RELOAD
               --------------------------------------------- */

            if (
                weapon.currentAmmo <= 0 &&
                !weapon.isReloading &&
                InventorySystem.getAmmoReserve(
                    this.inventory
                ) > 0
            ) {

                WeaponSystem.startReload(
                    weapon
                );
            }
        }


        else {

            this.isShooting = false;
        }


        /* -----------------------------------------------------
           RECOIL RECOVERY
           ----------------------------------------------------- */

        this.recoilAmount =
            Math.max(
                0,
                this.recoilAmount -
                dt * 5
            );


        this.weaponKick =
            Math.max(
                0,
                this.weaponKick -
                dt * 25
            );


        /* -----------------------------------------------------
           ANIMATION
           ----------------------------------------------------- */

        this._updateAnimation(
            dt,
            isMoving,
            weapon
        );


        /* -----------------------------------------------------
           PROJECTILE DAMAGE
           ----------------------------------------------------- */

        const hitInfo =
            ProjectileSystem.checkHits(
                this.x,
                this.y,
                this.radius,
                this.id
            );


        if (
            hitInfo.damage > 0
        ) {

            HealthSystem.takeDamage(
                this.healthComp,
                hitInfo.damage
            );


            this.hurtAnimationUntil =
                Date.now() +
                250;


            if (
                typeof AudioSystem !==
                'undefined' &&
                AudioSystem.playHit
            ) {

                AudioSystem.playHit();
            }


            if (
                typeof VFXSystem !==
                'undefined'
            ) {

                VFXSystem.spawnHitEffect(
                    this.x,
                    this.y
                );


                VFXSystem.addDamageNumber(
                    this.x,
                    this.y,
                    hitInfo.damage,
                    true
                );
            }


            if (
                typeof CameraSystem !==
                'undefined'
            ) {

                CameraSystem.shake(
                    4 +
                    hitInfo.damage * 0.1,
                    0.15
                );
            }


            /* ---------------------------------------------
               PLAYER DEATH
               --------------------------------------------- */

            if (
                !this.healthComp.alive
            ) {

                this.isAlive =
                    false;

                this.killedBy =
                    hitInfo.lastHitBy;


                this.velocityX = 0;
                this.velocityY = 0;

                this.mouseDown = false;


                this.animationState =
                    'death';

                this.animationTime = 0;
                this.animationFrame = 0;

                this.deathAnimationTime = 0;

                this.deathAnimationUntil =
                    Date.now() +
                    1200;


                if (
                    typeof VFXSystem !==
                    'undefined'
                ) {

                    VFXSystem.spawnElimination(
                        this.x,
                        this.y
                    );
                }


                if (
                    typeof CameraSystem !==
                    'undefined'
                ) {

                    CameraSystem.shake(
                        12,
                        0.4
                    );
                }
            }
        }
    },


    /* =========================================================
       RENDER
       ========================================================= */

    render(ctx) {

        /*
         * Unlike the old version, dead players are NOT
         * immediately invisible. The death animation gets
         * a chance to play.
         */
        if (
            !this.isAlive &&
            this.animationState !== 'death'
        ) {
            return;
        }


        const x =
            this.x;


        const y =
            this.y;


        const angle =
            this.aimAngle;


        const weapon =
            this.inventory
                ? InventorySystem.getActiveWeapon(
                    this.inventory
                )
                : null;


        /* -----------------------------------------------------
           ANIMATION BOB
           ----------------------------------------------------- */

        let bob = 0;


        if (
            this.animationState === 'walk' ||
            this.animationState === 'run'
        ) {

            const bobAmount =
                this.animationState === 'run'
                    ? 2.0
                    : 1.35;


            bob =
                Math.sin(
                    this.animationTime *
                    (
                        this.animationState === 'run'
                            ? 20
                            : 17
                    )
                ) *
                bobAmount;
        }


        /* -----------------------------------------------------
           DROP SHADOW
           ----------------------------------------------------- */

        ctx.save();

        ctx.globalAlpha =
            this.isAlive
                ? 1
                : 0.55;


        ctx.beginPath();

        ctx.ellipse(
            x + 3,
            y + 4,
            this.radius + 1,
            this.radius - 2,
            0,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            'rgba(0, 0, 0, 0.35)';

        ctx.fill();

        ctx.restore();


        /*
         * Do not draw the gameplay weapon over the
         * soldier during reload/loot/heal/death.
         * Those animations should visually own the character.
         */

        const showWeapon =
            !!weapon &&
            this.animationState !== 'reload' &&
            this.animationState !== 'loot' &&
            this.animationState !== 'heal' &&
            this.animationState !== 'death';


        /* -----------------------------------------------------
           WEAPON
           ----------------------------------------------------- */

        if (showWeapon) {

            const recoilOffset =
                this.recoilAmount;


            const barrelLen =
                weapon
                    ? 22
                    : 16;


            const barrelColor =
                weapon.rarityColor ||
                '#ffffff';


            const weaponStart =
                this.radius *
                0.5;


            const weaponEnd =
                this.radius +
                barrelLen -
                recoilOffset;


            const gx1 =
                x +
                Math.cos(angle) *
                weaponStart;


            const gy1 =
                y +
                bob +
                Math.sin(angle) *
                weaponStart;


            const gx2 =
                x +
                Math.cos(angle) *
                weaponEnd;


            const gy2 =
                y +
                bob +
                Math.sin(angle) *
                weaponEnd;


            ctx.beginPath();

            ctx.moveTo(
                gx1,
                gy1
            );

            ctx.lineTo(
                gx2,
                gy2
            );


            ctx.strokeStyle =
                '#222';

            ctx.lineWidth = 5;

            ctx.stroke();


            ctx.beginPath();

            ctx.moveTo(
                gx1,
                gy1
            );

            ctx.lineTo(
                gx2,
                gy2
            );


            ctx.strokeStyle =
                barrelColor;

            ctx.lineWidth = 2.5;

            ctx.stroke();


            /* ---------------------------------------------
               HANDS
               --------------------------------------------- */

            const handOffsetDist =
                this.radius + 6;


            const leftHandAngle =
                angle - 0.45;


            const rightHandAngle =
                angle + 0.45;


            ctx.beginPath();

            ctx.arc(
                x +
                    Math.cos(
                        leftHandAngle
                    ) *
                    handOffsetDist,

                y +
                    bob +
                    Math.sin(
                        leftHandAngle
                    ) *
                    handOffsetDist,

                4,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                '#ffcc80';

            ctx.fill();


            ctx.strokeStyle =
                '#111';

            ctx.lineWidth = 1;

            ctx.stroke();


            ctx.beginPath();

            ctx.arc(
                x +
                    Math.cos(
                        rightHandAngle
                    ) *
                    handOffsetDist,

                y +
                    bob +
                    Math.sin(
                        rightHandAngle
                    ) *
                    handOffsetDist,

                4,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                '#ffcc80';

            ctx.fill();


            ctx.strokeStyle =
                '#111';

            ctx.lineWidth = 1;

            ctx.stroke();
        }


        /* -----------------------------------------------------
           SOLDIER SPRITE
           ----------------------------------------------------- */

        const drawn =
            AssetManager.drawTopDownCharacter(
                ctx,

                0,

                x,
                y + bob,

                this.radius * 2.6,

                angle,

                this.animationState,

                this.animationFrame
            );


        /* -----------------------------------------------------
           FALLBACK
           ----------------------------------------------------- */

        if (!drawn) {

            ctx.save();

            ctx.translate(
                x,
                y + bob
            );

            ctx.rotate(angle);


            ctx.beginPath();

            ctx.arc(
                0,
                0,
                this.radius,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                this.isAlive
                    ? GAME.COLORS.PLAYER
                    : GAME.COLORS.DEAD_ENTITY;


            ctx.fill();


            ctx.strokeStyle =
                GAME.COLORS.PLAYER_OUTLINE;

            ctx.lineWidth = 2.5;

            ctx.stroke();


            ctx.restore();
        }


        /* -----------------------------------------------------
           MUZZLE FLASH
           ----------------------------------------------------- */

        if (
            this.isAlive &&
            this.isShooting &&
            this.weaponKick > 0
        ) {

            const muzzleDistance =
                this.radius +
                22 -
                this.recoilAmount;


            const muzzleX =
                x +
                Math.cos(angle) *
                muzzleDistance;


            const muzzleY =
                y +
                bob +
                Math.sin(angle) *
                muzzleDistance;


            ctx.save();

            ctx.translate(
                muzzleX,
                muzzleY
            );

            ctx.rotate(angle);


            ctx.beginPath();

            ctx.moveTo(
                0,
                0
            );

            ctx.lineTo(
                14,
                -5
            );

            ctx.lineTo(
                8,
                0
            );

            ctx.lineTo(
                14,
                5
            );

            ctx.closePath();


            ctx.fillStyle =
                'rgba(255, 220, 80, 0.8)';

            ctx.fill();

            ctx.restore();
        }


        /* -----------------------------------------------------
           HEALTH / ARMOR
           ----------------------------------------------------- */

        if (
            this.isAlive
        ) {

            const barW = 32;
            const barH = 4;


            const barX =
                x -
                barW / 2;


            const barY =
                y -
                this.radius -
                14;


            ctx.fillStyle =
                'rgba(0,0,0,0.6)';


            ctx.fillRect(
                barX - 1,
                barY - 1,
                barW + 2,
                barH + 2
            );


            const hp =
                HealthSystem.healthPercent(
                    this.healthComp
                );


            ctx.fillStyle =
                hp > 0.3
                    ? GAME.COLORS.HEALTH_BAR
                    : GAME.COLORS.HEALTH_BAR_LOW;


            ctx.fillRect(
                barX,
                barY,
                barW * hp,
                barH
            );


            if (
                this.healthComp.armor > 0
            ) {

                ctx.fillStyle =
                    'rgba(0,0,0,0.6)';


                ctx.fillRect(
                    barX - 1,
                    barY - 7,
                    barW + 2,
                    barH + 2
                );


                ctx.fillStyle =
                    GAME.COLORS.ARMOR_BAR;


                ctx.fillRect(
                    barX,
                    barY - 6,
                    barW *
                        HealthSystem.armorPercent(
                            this.healthComp
                        ),
                    barH
                );
            }
        }
    },


    /* =========================================================
       CROSSHAIR
       ========================================================= */

    renderCrosshair(ctx) {

        if (
            !this.isAlive
        ) {
            return;
        }


        const cx =
            this.mouseX;


        const cy =
            this.mouseY;


        const size = 12;
        const gap = 5;


        ctx.strokeStyle =
            'rgba(255, 255, 255, 0.8)';

        ctx.lineWidth = 1.5;


        /* Top */
        ctx.beginPath();

        ctx.moveTo(
            cx,
            cy - gap
        );

        ctx.lineTo(
            cx,
            cy - gap - size
        );

        ctx.stroke();


        /* Bottom */
        ctx.beginPath();

        ctx.moveTo(
            cx,
            cy + gap
        );

        ctx.lineTo(
            cx,
            cy + gap + size
        );

        ctx.stroke();


        /* Left */
        ctx.beginPath();

        ctx.moveTo(
            cx - gap,
            cy
        );

        ctx.lineTo(
            cx - gap - size,
            cy
        );

        ctx.stroke();


        /* Right */
        ctx.beginPath();

        ctx.moveTo(
            cx + gap,
            cy
        );

        ctx.lineTo(
            cx + gap + size,
            cy
        );

        ctx.stroke();


        /* Center */
        ctx.beginPath();

        ctx.arc(
            cx,
            cy,
            1.5,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            'rgba(255, 255, 255, 0.9)';

        ctx.fill();
    }
};