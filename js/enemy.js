/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Enemy AI System
   State-machine-driven AI opponents with detection, combat,
   looting, and zone awareness.
   ═══════════════════════════════════════════════════════════ */

const EnemySystem = {
    enemies: [],

    // AI states
    STATE: {
        IDLE: 'idle',
        EXPLORE: 'explore',
        LOOT: 'loot',
        ATTACK: 'attack',
        MOVE_TO_ZONE: 'moveToZone',
    },

    reset() {
        this.enemies = [];
    },

    /**
     * Spawn all enemies at random spawn points.
     */
    spawnEnemies(count) {
        this.enemies = [];
        const points = MapSystem.spawnPoints.slice();
        // Shuffle
        for (let i = points.length - 1; i > 0; i--) {
            const j = Utils.randInt(0, i);
            [points[i], points[j]] = [points[j], points[i]];
        }

        for (let i = 0; i < count; i++) {
            const sp = points[i % points.length];
            const enemy = this._createEnemy(sp.x + Utils.randInt(-50, 50), sp.y + Utils.randInt(-50, 50), i);
            this.enemies.push(enemy);
        }
    },

    /**
     * Create a single enemy entity.
     */
    _createEnemy(x, y, index) {
        // Random starting weapon
        const weaponKeys = Object.keys(WEAPON_DEFS);
        const startWeapon = Utils.randomPick(weaponKeys);
        const rarity = Math.random() < 0.15 ? 'RARE' : Math.random() < 0.4 ? 'UNCOMMON' : 'COMMON';
        const weapon = WeaponSystem.create(startWeapon, rarity);

        // Difficulty variation
        const difficulty = Utils.randFloat(0.6, 1.2);

        return {
            id: `enemy_${index}`,
            x, y,
            radius: GAME.ENEMY_RADIUS,
            speed: GAME.ENEMY_SPEED * Utils.randFloat(0.85, 1.15),
            aimAngle: Math.random() * Math.PI * 2,
            healthComp: HealthSystem.create(GAME.PLAYER_MAX_HEALTH * Utils.randFloat(0.8, 1.2)),
            weapon,
            ammo: { light: 120, medium: 90, heavy: 40 },
            state: this.STATE.IDLE,
            stateTimer: Utils.randFloat(0.5, 2.0),
            targetX: x,
            targetY: y,
            target: null,       // target entity reference
            detectRange: GAME.ENEMY_DETECT_RANGE * difficulty,
            attackRange: GAME.ENEMY_ATTACK_RANGE * difficulty,
            accuracy: GAME.ENEMY_SHOOT_ACCURACY / difficulty,
            difficulty,
            kills: 0,
            lastPickupTime: 0,
        };
    },

    /**
     * Update all enemies.
     */
    update(dt) {
        for (const enemy of this.enemies) {
            if (!enemy.healthComp.alive) continue;
            this._updateAI(enemy, dt);
            this._updateWeapon(enemy, dt);
            this._checkDamage(enemy);
        }
    },

    /**
     * AI state machine update.
     */
    _updateAI(enemy, dt) {
        enemy.stateTimer -= dt;

        // ── Check if outside safe zone → prioritize moving in ──
        if (typeof SafeZoneSystem !== 'undefined' && SafeZoneSystem.isActive) {
            const distToCenter = Utils.distance(enemy.x, enemy.y, SafeZoneSystem.currentX, SafeZoneSystem.currentY);
            if (distToCenter > SafeZoneSystem.currentRadius - 50) {
                enemy.state = this.STATE.MOVE_TO_ZONE;
                enemy.targetX = SafeZoneSystem.currentX + Utils.randFloat(-100, 100);
                enemy.targetY = SafeZoneSystem.currentY + Utils.randFloat(-100, 100);
            }
        }

        // ── Detect nearby threats ──────────────────────────────
        const detectedTarget = this._detectTarget(enemy);
        if (detectedTarget && enemy.state !== this.STATE.MOVE_TO_ZONE) {
            enemy.state = this.STATE.ATTACK;
            enemy.target = detectedTarget;
        }

        // ── Execute current state ──────────────────────────────
        switch (enemy.state) {
            case this.STATE.IDLE:
                this._stateIdle(enemy, dt);
                break;
            case this.STATE.EXPLORE:
                this._stateExplore(enemy, dt);
                break;
            case this.STATE.LOOT:
                this._stateLoot(enemy, dt);
                break;
            case this.STATE.ATTACK:
                this._stateAttack(enemy, dt);
                break;
            case this.STATE.MOVE_TO_ZONE:
                this._stateMoveToZone(enemy, dt);
                break;
        }
    },

    /**
     * Detect the nearest visible enemy target (player or other AI).
     */
    _detectTarget(enemy) {
        let nearest = null;
        let nearestDist = enemy.detectRange;

        // Check player
        if (Player.isAlive) {
            const d = Utils.distance(enemy.x, enemy.y, Player.x, Player.y);
            if (d < nearestDist) {
                if (MapSystem.hasLineOfSight(enemy.x, enemy.y, Player.x, Player.y)) {
                    nearest = { x: Player.x, y: Player.y, id: Player.id, isPlayer: true };
                    nearestDist = d;
                }
            }
        }

        // Check other enemies (AI vs AI combat)
        for (const other of this.enemies) {
            if (other.id === enemy.id || !other.healthComp.alive) continue;
            const d = Utils.distance(enemy.x, enemy.y, other.x, other.y);
            if (d < nearestDist * 0.7) { // AI is less aggressive toward other AI
                if (MapSystem.hasLineOfSight(enemy.x, enemy.y, other.x, other.y)) {
                    nearest = { x: other.x, y: other.y, id: other.id, isPlayer: false };
                    nearestDist = d;
                }
            }
        }

        return nearest;
    },

    // ── State handlers ─────────────────────────────────────────

    _stateIdle(enemy, dt) {
        if (enemy.stateTimer <= 0) {
            // Transition to explore or loot
            const loot = LootSystem.findNearestPickup(enemy.x, enemy.y);
            if (loot && Utils.distance(enemy.x, enemy.y, loot.x, loot.y) < 300) {
                enemy.state = this.STATE.LOOT;
                enemy.targetX = loot.x;
                enemy.targetY = loot.y;
            } else {
                enemy.state = this.STATE.EXPLORE;
                enemy.targetX = enemy.x + Utils.randFloat(-400, 400);
                enemy.targetY = enemy.y + Utils.randFloat(-400, 400);
                enemy.targetX = Utils.clamp(enemy.targetX, 100, GAME.MAP_WIDTH - 100);
                enemy.targetY = Utils.clamp(enemy.targetY, 100, GAME.MAP_HEIGHT - 100);
            }
            enemy.stateTimer = Utils.randFloat(3, 7);
        }
    },

    _stateExplore(enemy, dt) {
        this._moveToward(enemy, enemy.targetX, enemy.targetY, dt);

        const d = Utils.distance(enemy.x, enemy.y, enemy.targetX, enemy.targetY);
        if (d < 30 || enemy.stateTimer <= 0) {
            enemy.state = this.STATE.IDLE;
            enemy.stateTimer = Utils.randFloat(1, 3);
        }
    },

    _stateLoot(enemy, dt) {
        this._moveToward(enemy, enemy.targetX, enemy.targetY, dt);

        const d = Utils.distance(enemy.x, enemy.y, enemy.targetX, enemy.targetY);
        if (d < GAME.LOOT_PICKUP_RANGE) {
            // Try pick up
            const loot = LootSystem.findNearestPickup(enemy.x, enemy.y);
            if (loot && Date.now() - enemy.lastPickupTime > 500) {
                enemy.lastPickupTime = Date.now();
                if (loot.type === 'weapon') {
                    // Only pick up if rarity is better or if unarmed
                    const rarityOrder = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC'];
                    if (!enemy.weapon || rarityOrder.indexOf(loot.rarity) > rarityOrder.indexOf(enemy.weapon.rarity)) {
                        enemy.weapon = WeaponSystem.create(loot.weaponKey, loot.rarity);
                        LootSystem.pickUp(loot.id);
                    }
                } else if (loot.type === 'ammo') {
                    enemy.ammo[loot.ammoType] = (enemy.ammo[loot.ammoType] || 0) + loot.amount;
                    LootSystem.pickUp(loot.id);
                } else if (loot.type === 'health' && enemy.healthComp.health < enemy.healthComp.maxHealth) {
                    HealthSystem.heal(enemy.healthComp, loot.healAmount);
                    LootSystem.pickUp(loot.id);
                } else if (loot.type === 'armor') {
                    HealthSystem.addArmor(enemy.healthComp, loot.armorAmount);
                    LootSystem.pickUp(loot.id);
                }
            }
            enemy.state = this.STATE.IDLE;
            enemy.stateTimer = Utils.randFloat(0.5, 1.5);
        }

        if (enemy.stateTimer <= 0) {
            enemy.state = this.STATE.IDLE;
            enemy.stateTimer = Utils.randFloat(1, 2);
        }
    },

    _stateAttack(enemy, dt) {
        if (!enemy.target) {
            enemy.state = this.STATE.IDLE;
            enemy.stateTimer = Utils.randFloat(1, 2);
            return;
        }

        // Update target position for player tracking
        if (enemy.target.isPlayer) {
            if (!Player.isAlive) {
                enemy.state = this.STATE.IDLE;
                enemy.stateTimer = Utils.randFloat(1, 2);
                return;
            }
            enemy.target.x = Player.x;
            enemy.target.y = Player.y;
        } else {
            // Find the actual enemy
            const otherEnemy = this.enemies.find(e => e.id === enemy.target.id);
            if (!otherEnemy || !otherEnemy.healthComp.alive) {
                enemy.state = this.STATE.IDLE;
                enemy.stateTimer = Utils.randFloat(1, 2);
                return;
            }
            enemy.target.x = otherEnemy.x;
            enemy.target.y = otherEnemy.y;
        }

        const distToTarget = Utils.distance(enemy.x, enemy.y, enemy.target.x, enemy.target.y);

        // Aim at target
        enemy.aimAngle = Utils.angleBetween(enemy.x, enemy.y, enemy.target.x, enemy.target.y);

        // Move to maintain optimal range
        if (distToTarget > enemy.attackRange * 0.8) {
            this._moveToward(enemy, enemy.target.x, enemy.target.y, dt);
        } else if (distToTarget < enemy.attackRange * 0.3) {
            // Back away
            this._moveAway(enemy, enemy.target.x, enemy.target.y, dt);
        }

        // Shoot if in range and has LOS
        if (distToTarget < enemy.attackRange && enemy.weapon) {
            if (MapSystem.hasLineOfSight(enemy.x, enemy.y, enemy.target.x, enemy.target.y)) {
                const aimWithSpread = enemy.aimAngle + Utils.randFloat(-enemy.accuracy, enemy.accuracy);
                const bullets = WeaponSystem.tryFire(enemy.weapon, enemy.x, enemy.y, aimWithSpread, dt);
                if (bullets) {
                    ProjectileSystem.addBullets(bullets, enemy.id);
                }
            }
        }

        // Lose target if too far
        if (distToTarget > enemy.detectRange * 1.3) {
            enemy.target = null;
            enemy.state = this.STATE.IDLE;
            enemy.stateTimer = Utils.randFloat(1, 3);
        }
    },

    _stateMoveToZone(enemy, dt) {
        this._moveToward(enemy, enemy.targetX, enemy.targetY, dt);

        // Check if inside zone now
        if (typeof SafeZoneSystem !== 'undefined') {
            const distToCenter = Utils.distance(enemy.x, enemy.y, SafeZoneSystem.currentX, SafeZoneSystem.currentY);
            if (distToCenter < SafeZoneSystem.currentRadius - 80) {
                enemy.state = this.STATE.IDLE;
                enemy.stateTimer = Utils.randFloat(1, 3);
            }
        }

        // Still fight if target is close
        const detectedTarget = this._detectTarget(enemy);
        if (detectedTarget) {
            const d = Utils.distance(enemy.x, enemy.y, detectedTarget.x, detectedTarget.y);
            if (d < enemy.attackRange * 0.6) {
                enemy.aimAngle = Utils.angleBetween(enemy.x, enemy.y, detectedTarget.x, detectedTarget.y);
                if (enemy.weapon) {
                    const aimWithSpread = enemy.aimAngle + Utils.randFloat(-enemy.accuracy, enemy.accuracy);
                    const bullets = WeaponSystem.tryFire(enemy.weapon, enemy.x, enemy.y, aimWithSpread, dt);
                    if (bullets) {
                        ProjectileSystem.addBullets(bullets, enemy.id);
                    }
                }
            }
        }

        if (enemy.stateTimer <= 0) {
            enemy.state = this.STATE.IDLE;
            enemy.stateTimer = 1;
        }
    },

    // ── Movement helpers ───────────────────────────────────────

    _moveToward(enemy, tx, ty, dt) {
        const angle = Utils.angleBetween(enemy.x, enemy.y, tx, ty);
        const newX = enemy.x + Math.cos(angle) * enemy.speed * dt;
        const newY = enemy.y + Math.sin(angle) * enemy.speed * dt;
        const push = MapSystem.resolveCollision(newX, newY, enemy.radius);
        enemy.x = Utils.clamp(newX + push.x, enemy.radius, GAME.MAP_WIDTH - enemy.radius);
        enemy.y = Utils.clamp(newY + push.y, enemy.radius, GAME.MAP_HEIGHT - enemy.radius);
        enemy.aimAngle = angle;
    },

    _moveAway(enemy, tx, ty, dt) {
        const angle = Utils.angleBetween(tx, ty, enemy.x, enemy.y);
        const newX = enemy.x + Math.cos(angle) * enemy.speed * 0.7 * dt;
        const newY = enemy.y + Math.sin(angle) * enemy.speed * 0.7 * dt;
        const push = MapSystem.resolveCollision(newX, newY, enemy.radius);
        enemy.x = Utils.clamp(newX + push.x, enemy.radius, GAME.MAP_WIDTH - enemy.radius);
        enemy.y = Utils.clamp(newY + push.y, enemy.radius, GAME.MAP_HEIGHT - enemy.radius);
    },

    /**
     * Update weapon cooldowns and auto-reload.
     */
    _updateWeapon(enemy, dt) {
        if (!enemy.weapon) return;
        const ammoReserve = enemy.ammo[enemy.weapon.ammoType] || 0;
        // Enemy weapons fire at 30% speed (3.3x longer cooldown between shots) for fair player survivability
        const consumed = WeaponSystem.update(enemy.weapon, dt * 0.30, ammoReserve);
        if (consumed > 0) {
            enemy.ammo[enemy.weapon.ammoType] = Math.max(0, (enemy.ammo[enemy.weapon.ammoType] || 0) - consumed);
        }

        // Auto-reload
        if (enemy.weapon.currentAmmo <= 0 && !enemy.weapon.isReloading && ammoReserve > 0) {
            WeaponSystem.startReload(enemy.weapon);
        }
    },

    /**
     * Check bullet damage to this enemy.
     */
    _checkDamage(enemy) {
        const hitInfo = ProjectileSystem.checkHits(enemy.x, enemy.y, enemy.radius, enemy.id);
        if (hitInfo.damage > 0) {
            HealthSystem.takeDamage(enemy.healthComp, hitInfo.damage);
            AudioSystem.playHit();
            VFXSystem.spawnHitEffect(enemy.x, enemy.y);
            VFXSystem.addDamageNumber(enemy.x, enemy.y, hitInfo.damage, false);

            // If hit and not already attacking, turn to attack
            if (enemy.state !== this.STATE.ATTACK) {
                // Try to find who shot us
                const detectedTarget = this._detectTarget(enemy);
                if (detectedTarget) {
                    enemy.state = this.STATE.ATTACK;
                    enemy.target = detectedTarget;
                }
            }

            if (!enemy.healthComp.alive) {
                enemy.killedBy = hitInfo.lastHitBy;
                VFXSystem.spawnElimination(enemy.x, enemy.y);
                AudioSystem.playElimination();
            }
        }
    },

    /**
     * Count alive enemies.
     */
    aliveCount() {
        return this.enemies.filter(e => e.healthComp.alive).length;
    },

    /**
     * Render all enemies.
     */
    render(ctx) {
        for (const enemy of this.enemies) {
            if (!enemy.healthComp.alive) {
                // Death marker
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.radius * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = GAME.COLORS.DEAD_ENTITY;
                ctx.globalAlpha = 0.4;
                ctx.fill();
                ctx.globalAlpha = 1;
                continue;
            }

            const x = enemy.x;
            const y = enemy.y;
            const angle = enemy.aimAngle;
            const weapon = enemy.weapon;

            // ── Drop Shadow ──────────────────────────────────
            ctx.beginPath();
            ctx.ellipse(x + 3, y + 4, enemy.radius + 1, enemy.radius - 2, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fill();

            // ── Gun Barrel ───────────────────────────────────
            const barrelLen = weapon ? 20 : 14;
            const barrelColor = weapon ? weapon.rarityColor : '#cccccc';
            const gx1 = x + Math.cos(angle) * (enemy.radius * 0.5);
            const gy1 = y + Math.sin(angle) * (enemy.radius * 0.5);
            const gx2 = x + Math.cos(angle) * (enemy.radius + barrelLen);
            const gy2 = y + Math.sin(angle) * (enemy.radius + barrelLen);

            ctx.beginPath();
            ctx.moveTo(gx1, gy1);
            ctx.lineTo(gx2, gy2);
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 4.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(gx1, gy1);
            ctx.lineTo(gx2, gy2);
            ctx.strokeStyle = barrelColor;
            ctx.lineWidth = 2.2;
            ctx.stroke();

            // ── Hands ────────────────────────────────────────
            const handDist = enemy.radius + 5;
            const leftHandAngle = angle - 0.45;
            const rightHandAngle = angle + 0.45;

            ctx.beginPath();
            ctx.arc(x + Math.cos(leftHandAngle) * handDist, y + Math.sin(leftHandAngle) * handDist, 3.5, 0, Math.PI * 2);
            ctx.arc(x + Math.cos(rightHandAngle) * handDist, y + Math.sin(rightHandAngle) * handDist, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffab91';
            ctx.fill();

            // ── Body / Character Sprite ─────────────────────
            const skinIdx = (parseInt(enemy.id.split('_')[1] || 1) % 7) + 1;
            const drawn = AssetManager.drawTopDownCharacter(ctx, skinIdx, x, y, enemy.radius * 2.6, angle);
            if (!drawn) {
                ctx.beginPath();
                ctx.arc(x, y, enemy.radius, 0, Math.PI * 2);
                ctx.fillStyle = GAME.COLORS.ENEMY;
                ctx.fill();
                ctx.strokeStyle = GAME.COLORS.ENEMY_OUTLINE;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Tactical Vest
                ctx.beginPath();
                ctx.arc(x, y, enemy.radius * 0.55, 0, Math.PI * 2);
                ctx.fillStyle = enemy.healthComp.armor > 0 ? 'rgba(0, 229, 255, 0.35)' : 'rgba(0, 0, 0, 0.25)';
                ctx.fill();
            }

            // ── Name & Health Bar ────────────────────────────
            const barW = 28;
            const barH = 3.5;
            const barX = x - barW / 2;
            const barY = y - enemy.radius - 12;

            // Name
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.font = 'bold 9px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(enemy.name, x, barY - 3);

            // Health bar bg
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
            const hp = HealthSystem.healthPercent(enemy.healthComp);
            ctx.fillStyle = hp > 0.3 ? GAME.COLORS.HEALTH_BAR : GAME.COLORS.HEALTH_BAR_LOW;
            ctx.fillRect(barX, barY, barW * hp, barH);
        }
    },
};
