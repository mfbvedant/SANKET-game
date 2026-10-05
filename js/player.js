/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Player Controller
   ═══════════════════════════════════════════════════════════ */

const Player = {
    id: 'player',
    x: 0,
    y: 0,
    radius: GAME.PLAYER_RADIUS,
    speed: GAME.PLAYER_SPEED,
    aimAngle: 0,
    healthComp: null,
    inventory: null,
    kills: 0,
    isAlive: true,
    isShooting: false,
    showInventory: false,

    // Input state
    keys: {},
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,

    /**
     * Initialize the player.
     */
    init(spawnX, spawnY) {
        this.x = spawnX;
        this.y = spawnY;
        this.aimAngle = 0;
        this.healthComp = HealthSystem.create(GAME.PLAYER_MAX_HEALTH, GAME.PLAYER_MAX_ARMOR);
        HealthSystem.addArmor(this.healthComp, 100); // 100 starting armor vest
        this.inventory = InventorySystem.create();
        this.kills = 0;
        this.isAlive = true;
        this.isShooting = false;
        this.showInventory = false;
        this.keys = {};
        this.mouseDown = false;
        this.killedBy = null;

        // Give player a starting pistol + supplies
        const pistol = WeaponSystem.create('pistol', 'UNCOMMON');
        InventorySystem.addWeapon(this.inventory, pistol);
        InventorySystem.addAmmo(this.inventory, 'light', 90);
        InventorySystem.addAmmo(this.inventory, 'medium', 60);

        // Starting heals and armor plates
        InventorySystem.addHealItem(this.inventory, 75, 'UNCOMMON', 'First Aid Kit');
        InventorySystem.addHealItem(this.inventory, 75, 'UNCOMMON', 'First Aid Kit');
        InventorySystem.addArmorItem(this.inventory, 50, 'RARE', 'Armor Plate');
    },

    /**
     * Bind input listeners.
     */
    bindInput(canvas) {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            // Weapon switching
            if (e.key === '1') InventorySystem.switchSlot(this.inventory, 0);
            if (e.key === '2') InventorySystem.switchSlot(this.inventory, 1);
            if (e.key === '3') InventorySystem.switchSlot(this.inventory, 2);

            // Reload
            if (e.key.toLowerCase() === 'r') {
                const weapon = InventorySystem.getActiveWeapon(this.inventory);
                if (weapon && InventorySystem.getAmmoReserve(this.inventory) > 0) {
                    WeaponSystem.startReload(weapon);
                }
            }

            // Interact / Pick up
            if (e.key.toLowerCase() === 'e') {
                this._tryPickup();
            }

            // Use heal (4) or armor (5)
            if (e.key === '4') {
                if (InventorySystem.useHealItem(this.inventory, this.healthComp)) {
                    AudioSystem.playHeal();
                }
            }
            if (e.key === '5') {
                if (InventorySystem.useArmorItem(this.inventory, this.healthComp)) {
                    AudioSystem.playHeal();
                }
            }

            // Toggle inventory
            if (e.key === 'Tab') {
                e.preventDefault();
                this.showInventory = !this.showInventory;
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouseDown = true;
                AudioSystem.resume();
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouseDown = false;
            }
        });

        // Prevent context menu
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    /**
     * Try to pick up nearest loot.
     */
    _tryPickup() {
        const nearest = LootSystem.findNearestPickup(this.x, this.y);
        if (nearest) {
            const success = InventorySystem.pickUpLoot(
                this.inventory, nearest, this.healthComp, this.x, this.y
            );
            if (success) {
                LootSystem.pickUp(nearest.id);
            }
        }
    },

    /**
     * Update the player each frame.
     */
    update(dt) {
        if (!this.isAlive) return;

        // ── Movement ──────────────────────────────────────────
        let dx = 0, dy = 0;
        if (this.keys['w']) dy -= 1;
        if (this.keys['s']) dy += 1;
        if (this.keys['a']) dx -= 1;
        if (this.keys['d']) dx += 1;

        // Normalize diagonal
        if (dx !== 0 && dy !== 0) {
            const inv = 1 / Math.SQRT2;
            dx *= inv;
            dy *= inv;
        }

        const newX = this.x + dx * this.speed * dt;
        const newY = this.y + dy * this.speed * dt;

        // Wall collision
        const push = MapSystem.resolveCollision(newX, newY, this.radius);
        this.x = Utils.clamp(newX + push.x, this.radius, GAME.MAP_WIDTH - this.radius);
        this.y = Utils.clamp(newY + push.y, this.radius, GAME.MAP_HEIGHT - this.radius);

        // Footstep sound when moving
        if (dx !== 0 || dy !== 0) {
            AudioSystem.playFootstep();
        }

        // ── Aim ────────────────────────────────────────────────
        const worldMouse = CameraSystem.screenToWorld(this.mouseX, this.mouseY);
        this.aimAngle = Utils.angleBetween(this.x, this.y, worldMouse.x, worldMouse.y);

        // ── Weapon update ──────────────────────────────────────
        const weapon = InventorySystem.getActiveWeapon(this.inventory);
        if (weapon) {
            const ammoConsumed = WeaponSystem.update(weapon, dt, InventorySystem.getAmmoReserve(this.inventory));
            if (ammoConsumed > 0) {
                InventorySystem.consumeAmmo(this.inventory, weapon.ammoType, ammoConsumed);
            }

            // Shooting
            if (this.mouseDown && !this.showInventory) {
                const shouldFire = weapon.auto || !this.isShooting;
                if (shouldFire) {
                    const bullets = WeaponSystem.tryFire(weapon, this.x, this.y, this.aimAngle, dt);
                    if (bullets) {
                        ProjectileSystem.addBullets(bullets, this.id);
                    }
                }
                this.isShooting = true;
            } else {
                this.isShooting = false;
            }

            // Auto-reload when empty
            if (weapon.currentAmmo <= 0 && !weapon.isReloading && InventorySystem.getAmmoReserve(this.inventory) > 0) {
                WeaponSystem.startReload(weapon);
            }
        }

        // ── Damage from bullets ────────────────────────────────
        const hitInfo = ProjectileSystem.checkHits(this.x, this.y, this.radius, this.id);
        if (hitInfo.damage > 0) {
            HealthSystem.takeDamage(this.healthComp, hitInfo.damage);
            AudioSystem.playHit();
            VFXSystem.spawnHitEffect(this.x, this.y);
            VFXSystem.addDamageNumber(this.x, this.y, hitInfo.damage, true);
            CameraSystem.shake(4 + hitInfo.damage * 0.1, 0.15);
            if (!this.healthComp.alive) {
                this.isAlive = false;
                this.killedBy = hitInfo.lastHitBy;
                VFXSystem.spawnElimination(this.x, this.y);
                CameraSystem.shake(12, 0.4);
            }
        }
    },

    /**
     * Render the player.
     */
    render(ctx) {
        if (!this.isAlive) return;

        const x = this.x;
        const y = this.y;
        const angle = this.aimAngle;
        const weapon = InventorySystem.getActiveWeapon(this.inventory);

        // ── Drop Shadow ──────────────────────────────────────
        ctx.beginPath();
        ctx.ellipse(x + 3, y + 4, this.radius + 1, this.radius - 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fill();

        // ── Gun Barrel ───────────────────────────────────────
        const barrelLen = weapon ? 22 : 16;
        const barrelColor = weapon ? weapon.rarityColor : '#ffffff';
        const gx1 = x + Math.cos(angle) * (this.radius * 0.5);
        const gy1 = y + Math.sin(angle) * (this.radius * 0.5);
        const gx2 = x + Math.cos(angle) * (this.radius + barrelLen);
        const gy2 = y + Math.sin(angle) * (this.radius + barrelLen);

        ctx.beginPath();
        ctx.moveTo(gx1, gy1);
        ctx.lineTo(gx2, gy2);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(gx1, gy1);
        ctx.lineTo(gx2, gy2);
        ctx.strokeStyle = barrelColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // ── Hands holding weapon ─────────────────────────────
        const handOffsetDist = this.radius + 6;
        const leftHandAngle = angle - 0.45;
        const rightHandAngle = angle + 0.45;

        // Left Hand
        ctx.beginPath();
        ctx.arc(x + Math.cos(leftHandAngle) * handOffsetDist, y + Math.sin(leftHandAngle) * handOffsetDist, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc80';
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Right Hand
        ctx.beginPath();
        ctx.arc(x + Math.cos(rightHandAngle) * handOffsetDist, y + Math.sin(rightHandAngle) * handOffsetDist, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc80';
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        ctx.stroke();

        // ── Body / Character Sprite ─────────────────────────
        const drawn = AssetManager.drawTopDownCharacter(ctx, 0, x, y, this.radius * 2.6, angle);
        if (!drawn) {
            ctx.beginPath();
            ctx.arc(x, y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = GAME.COLORS.PLAYER;
            ctx.fill();
            ctx.strokeStyle = GAME.COLORS.PLAYER_OUTLINE;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Vest / Inner Detail
            ctx.beginPath();
            ctx.arc(x, y, this.radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = this.healthComp.armor > 0 ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
            ctx.fill();
        }

        // ── Overhead Health & Armor Bars ──────────────────────
        const barW = 32;
        const barH = 4;
        const barX = x - barW / 2;
        const barY = y - this.radius - 14;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        // Health fill
        const hp = HealthSystem.healthPercent(this.healthComp);
        ctx.fillStyle = hp > 0.3 ? GAME.COLORS.HEALTH_BAR : GAME.COLORS.HEALTH_BAR_LOW;
        ctx.fillRect(barX, barY, barW * hp, barH);

        // Armor bar
        if (this.healthComp.armor > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX - 1, barY - 7, barW + 2, barH + 2);
            ctx.fillStyle = GAME.COLORS.ARMOR_BAR;
            ctx.fillRect(barX, barY - 6, barW * HealthSystem.armorPercent(this.healthComp), barH);
        }
    },

    /**
     * Render crosshair on screen (not in world space).
     */
    renderCrosshair(ctx) {
        if (!this.isAlive) return;
        const cx = this.mouseX;
        const cy = this.mouseY;
        const size = 12;
        const gap = 5;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;

        // Top
        ctx.beginPath();
        ctx.moveTo(cx, cy - gap);
        ctx.lineTo(cx, cy - gap - size);
        ctx.stroke();
        // Bottom
        ctx.beginPath();
        ctx.moveTo(cx, cy + gap);
        ctx.lineTo(cx, cy + gap + size);
        ctx.stroke();
        // Left
        ctx.beginPath();
        ctx.moveTo(cx - gap, cy);
        ctx.lineTo(cx - gap - size, cy);
        ctx.stroke();
        // Right
        ctx.beginPath();
        ctx.moveTo(cx + gap, cy);
        ctx.lineTo(cx + gap + size, cy);
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
    },
};
