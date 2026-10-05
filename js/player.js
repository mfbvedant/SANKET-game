/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Player Controller
   Movement, aiming, shooting, inventory interaction,
   animation state and player rendering.
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

    // Small weapon recoil amount
    recoilAmount: 0,

    // Weapon kick animation
    weaponKick: 0,

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

    /**
     * Initialize the player.
     */
    init(spawnX, spawnY) {

        // Position
        this.x = spawnX;
        this.y = spawnY;

        // Movement
        this.velocityX = 0;
        this.velocityY = 0;

        // Aim
        this.aimAngle = 0;

        // Components
        this.healthComp =
            HealthSystem.create(
                GAME.PLAYER_MAX_HEALTH,
                GAME.PLAYER_MAX_ARMOR
            );

        // 100 starting armor vest
        HealthSystem.addArmor(
            this.healthComp,
            100
        );

        this.inventory =
            InventorySystem.create();

        // Gameplay state
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

        this.recoilAmount = 0;
        this.weaponKick = 0;

        // Footsteps
        this.footstepTimer = 0;

        // Input
        this.keys = {};
        this.mouseDown = false;

        // ─────────────────────────────────────────────
        // STARTING EQUIPMENT
        // ─────────────────────────────────────────────

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

        // Starting heals
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

        // Starting armor
        InventorySystem.addArmorItem(
            this.inventory,
            50,
            'RARE',
            'Armor Plate'
        );
    },

    /**
     * Bind input listeners.
     */
    bindInput(canvas) {

        // ─────────────────────────────────────────────
        // KEY DOWN
        // ─────────────────────────────────────────────

        window.addEventListener('keydown', (e) => {

            const key =
                e.key.toLowerCase();

            // Store key
            this.keys[key] = true;

            // Don't process gameplay controls
            // while paused or outside gameplay.
            if (
                typeof Game !== 'undefined' &&
                Game.state !== 'PLAYING'
            ) {
                return;
            }

            // ─────────────────────────────────────────
            // WEAPON SWITCHING
            // ─────────────────────────────────────────

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

            // ─────────────────────────────────────────
            // RELOAD
            // ─────────────────────────────────────────

            if (key === 'r') {

                const weapon =
                    InventorySystem.getActiveWeapon(
                        this.inventory
                    );

                if (
                    weapon &&
                    InventorySystem.getAmmoReserve(
                        this.inventory
                    ) > 0
                ) {

                    WeaponSystem.startReload(
                        weapon
                    );
                }
            }

            // ─────────────────────────────────────────
            // PICKUP
            // ─────────────────────────────────────────

            if (key === 'e') {
                this._tryPickup();
            }

            // ─────────────────────────────────────────
            // HEAL
            // ─────────────────────────────────────────

            if (e.key === '4') {

                if (
                    InventorySystem.useHealItem(
                        this.inventory,
                        this.healthComp
                    )
                ) {
                    AudioSystem.playHeal();
                }
            }

            // ─────────────────────────────────────────
            // ARMOR
            // ─────────────────────────────────────────

            if (e.key === '5') {

                if (
                    InventorySystem.useArmorItem(
                        this.inventory,
                        this.healthComp
                    )
                ) {
                    AudioSystem.playHeal();
                }
            }

            // ─────────────────────────────────────────
            // INVENTORY
            // ─────────────────────────────────────────

            if (e.key === 'Tab') {

                e.preventDefault();

                this.showInventory =
                    !this.showInventory;
            }
        });

        // ─────────────────────────────────────────────
        // KEY UP
        // ─────────────────────────────────────────────

        window.addEventListener('keyup', (e) => {

            this.keys[
                e.key.toLowerCase()
            ] = false;
        });

        // ─────────────────────────────────────────────
        // MOUSE MOVE
        // ─────────────────────────────────────────────

        canvas.addEventListener(
            'mousemove',
            (e) => {

                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
            }
        );

        // ─────────────────────────────────────────────
        // MOUSE DOWN
        // ─────────────────────────────────────────────

        canvas.addEventListener(
            'mousedown',
            (e) => {

                if (e.button === 0) {

                    this.mouseDown = true;

                    AudioSystem.resume();
                }
            }
        );

        // ─────────────────────────────────────────────
        // MOUSE UP
        // ─────────────────────────────────────────────

        canvas.addEventListener(
            'mouseup',
            (e) => {

                if (e.button === 0) {
                    this.mouseDown = false;
                }
            }
        );

        // If mouse leaves the browser window,
        // prevent the weapon from staying stuck firing.
        window.addEventListener(
            'blur',
            () => {
                this.mouseDown = false;
            }
        );

        // Prevent context menu
        canvas.addEventListener(
            'contextmenu',
            (e) => e.preventDefault()
        );
    },

    /**
     * Try to pick up nearest loot.
     */
    _tryPickup() {

        if (!this.isAlive) {
            return;
        }

        const nearest =
            LootSystem.findNearestPickup(
                this.x,
                this.y
            );

        if (nearest) {

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
        }
    },

    /**
     * Update the player each frame.
     */
    update(dt) {

        if (!this.isAlive) {
            return;
        }

        // Safety check:
        // don't process player movement if paused.
        if (
            typeof Game !== 'undefined' &&
            Game.state !== 'PLAYING' &&
            Game.state !== 'ENDING'
        ) {
            return;
        }

        // ─────────────────────────────────────────────
        // MOVEMENT INPUT
        // ─────────────────────────────────────────────

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
            dx !== 0 || dy !== 0;

        // ─────────────────────────────────────────────
        // NORMALIZE DIAGONAL MOVEMENT
        // ─────────────────────────────────────────────

        if (dx !== 0 && dy !== 0) {

            const inv =
                1 / Math.SQRT2;

            dx *= inv;
            dy *= inv;
        }

        // ─────────────────────────────────────────────
        // MOVEMENT DIRECTION
        // ─────────────────────────────────────────────

        if (isMoving) {

            this.movementAngle =
                Math.atan2(dy, dx);
        }

        // ─────────────────────────────────────────────
        // SMOOTH ACCELERATION
        // ─────────────────────────────────────────────

        const targetVelocityX =
            dx * this.speed;

        const targetVelocityY =
            dy * this.speed;

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

        // ─────────────────────────────────────────────
        // APPLY MOVEMENT
        // ─────────────────────────────────────────────

        const newX =
            this.x +
            this.velocityX * dt;

        const newY =
            this.y +
            this.velocityY * dt;

        // Wall collision
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
                GAME.MAP_WIDTH - this.radius
            );

        this.y =
            Utils.clamp(
                newY + push.y,
                this.radius,
                GAME.MAP_HEIGHT - this.radius
            );

        // ─────────────────────────────────────────────
        // FOOTSTEP SOUND
        // ─────────────────────────────────────────────

        if (isMoving) {

            this.footstepTimer -= dt;

            if (this.footstepTimer <= 0) {

                AudioSystem.playFootstep();

                // Time between footsteps
                this.footstepTimer = 0.28;
            }
        } else {

            this.footstepTimer = 0;
        }

        // ─────────────────────────────────────────────
        // AIM
        // ─────────────────────────────────────────────

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

        // ─────────────────────────────────────────────
        // WEAPON UPDATE
        // ─────────────────────────────────────────────

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

            if (ammoConsumed > 0) {

                InventorySystem.consumeAmmo(
                    this.inventory,
                    weapon.ammoType,
                    ammoConsumed
                );
            }

            // ─────────────────────────────────────────
            // SHOOTING
            // ─────────────────────────────────────────

            if (
                this.mouseDown &&
                !this.showInventory
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

                        // Visual recoil
                        this.recoilAmount =
                            Math.min(
                                this.recoilAmount + 0.8,
                                4
                            );

                        this.weaponKick = 5;
                    }
                }

                this.isShooting = true;

            } else {

                this.isShooting = false;
            }

            // ─────────────────────────────────────────
            // AUTO RELOAD
            // ─────────────────────────────────────────

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

        // ─────────────────────────────────────────────
        // RECOIL RECOVERY
        // ─────────────────────────────────────────────

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

        // ─────────────────────────────────────────────
        // ANIMATION STATE
        // ─────────────────────────────────────────────

        if (weapon && weapon.isReloading) {

            this.animationState = 'reload';

        } else if (this.isShooting) {

            this.animationState = 'shoot';

        } else if (isMoving) {

            this.animationState = 'walk';

        } else {

            this.animationState = 'idle';
        }

        // ─────────────────────────────────────────────
        // ANIMATION TIMER
        // ─────────────────────────────────────────────

        if (
            this.animationState !== 'idle'
        ) {

            this.animationTime += dt;

            // Faster animation while moving
            const frameRate =
                this.animationState === 'walk'
                    ? 10
                    : 14;

            this.animationFrame =
                Math.floor(
                    this.animationTime *
                    frameRate
                ) % 4;

        } else {

            this.animationTime = 0;
            this.animationFrame = 0;
        }

        // ─────────────────────────────────────────────
        // DAMAGE FROM BULLETS
        // ─────────────────────────────────────────────

        const hitInfo =
            ProjectileSystem.checkHits(
                this.x,
                this.y,
                this.radius,
                this.id
            );

        if (hitInfo.damage > 0) {

            HealthSystem.takeDamage(
                this.healthComp,
                hitInfo.damage
            );

            AudioSystem.playHit();

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

            CameraSystem.shake(
                4 + hitInfo.damage * 0.1,
                0.15
            );

            // ─────────────────────────────────────────
            // PLAYER DEATH
            // ─────────────────────────────────────────

            if (!this.healthComp.alive) {

                this.isAlive = false;

                this.killedBy =
                    hitInfo.lastHitBy;

                VFXSystem.spawnElimination(
                    this.x,
                    this.y
                );

                CameraSystem.shake(
                    12,
                    0.4
                );
            }
        }
    },

    /**
     * Render the player.
     */
    render(ctx) {

        if (!this.isAlive) {
            return;
        }

        const x = this.x;
        const y = this.y;

        const angle =
            this.aimAngle;

        const weapon =
            InventorySystem.getActiveWeapon(
                this.inventory
            );

        // ─────────────────────────────────────────────
        // ANIMATION BOB
        // ─────────────────────────────────────────────

        let bob = 0;

        if (
            this.animationState === 'walk'
        ) {

            bob =
                Math.sin(
                    this.animationTime * 18
                ) * 1.5;
        }

        // ─────────────────────────────────────────────
        // DROP SHADOW
        // ─────────────────────────────────────────────

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

        // ─────────────────────────────────────────────
        // WEAPON RECOIL
        // ─────────────────────────────────────────────

        const recoilOffset =
            this.recoilAmount;

        const barrelLen =
            weapon
                ? 22
                : 16;

        const barrelColor =
            weapon
                ? weapon.rarityColor
                : '#ffffff';

        const weaponStart =
            this.radius * 0.5;

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

        // Outer barrel
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

        // Inner barrel
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

        // ─────────────────────────────────────────────
        // HANDS HOLDING WEAPON
        // ─────────────────────────────────────────────

        const handOffsetDist =
            this.radius + 6;

        const leftHandAngle =
            angle - 0.45;

        const rightHandAngle =
            angle + 0.45;

        // Left hand
        ctx.beginPath();

        ctx.arc(
            x +
                Math.cos(leftHandAngle) *
                handOffsetDist,

            y +
                bob +
                Math.sin(leftHandAngle) *
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

        // Right hand
        ctx.beginPath();

        ctx.arc(
            x +
                Math.cos(rightHandAngle) *
                handOffsetDist,

            y +
                bob +
                Math.sin(rightHandAngle) *
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

        // ─────────────────────────────────────────────
        // CHARACTER SPRITE
        // ─────────────────────────────────────────────

        const drawn =
            AssetManager.drawTopDownCharacter(
                ctx,
                0,
                x,
                y + bob,
                this.radius * 2.6,
                angle
            );

        // ─────────────────────────────────────────────
        // FALLBACK CHARACTER
        // ─────────────────────────────────────────────

        if (!drawn) {

            ctx.beginPath();

            ctx.arc(
                x,
                y + bob,
                this.radius,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                GAME.COLORS.PLAYER;

            ctx.fill();

            ctx.strokeStyle =
                GAME.COLORS.PLAYER_OUTLINE;

            ctx.lineWidth = 2.5;

            ctx.stroke();

            // Vest / inner detail
            ctx.beginPath();

            ctx.arc(
                x,
                y + bob,
                this.radius * 0.6,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                this.healthComp.armor > 0
                    ? 'rgba(0, 229, 255, 0.4)'
                    : 'rgba(255, 255, 255, 0.15)';

            ctx.fill();
        }

        // ─────────────────────────────────────────────
        // SHOOT MUZZLE EFFECT
        // ─────────────────────────────────────────────

        if (
            this.isShooting &&
            this.weaponKick > 0
        ) {

            const muzzleDistance =
                this.radius +
                barrelLen -
                recoilOffset;

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

            ctx.moveTo(0, 0);

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

        // ─────────────────────────────────────────────
        // HEALTH & ARMOR BARS
        // ─────────────────────────────────────────────

        const barW = 32;
        const barH = 4;

        const barX =
            x -
            barW / 2;

        const barY =
            y -
            this.radius -
            14;

        // Background
        ctx.fillStyle =
            'rgba(0,0,0,0.6)';

        ctx.fillRect(
            barX - 1,
            barY - 1,
            barW + 2,
            barH + 2
        );

        // Health
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

        // Armor
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
    },

    /**
     * Render crosshair on screen.
     */
    renderCrosshair(ctx) {

        if (!this.isAlive) {
            return;
        }

        const cx = this.mouseX;
        const cy = this.mouseY;

        const size = 12;
        const gap = 5;

        ctx.strokeStyle =
            'rgba(255, 255, 255, 0.8)';

        ctx.lineWidth = 1.5;

        // Top
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

        // Bottom
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

        // Left
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

        // Right
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

        // Center dot
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
    },
};