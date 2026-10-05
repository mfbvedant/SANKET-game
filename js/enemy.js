/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Enemy AI System
   Smarter state-machine AI with:
   - Target detection
   - Target memory / investigation
   - Combat positioning
   - Zone awareness
   - Loot decisions
   - AI-vs-AI combat
   - Hit reaction
   ═══════════════════════════════════════════════════════════ */

const EnemySystem = {
    enemies: [],

    // ─────────────────────────────────────────────────────────
    // AI STATES
    // ─────────────────────────────────────────────────────────

    STATE: {
        IDLE: 'idle',
        EXPLORE: 'explore',
        LOOT: 'loot',
        ATTACK: 'attack',
        INVESTIGATE: 'investigate',
        MOVE_TO_ZONE: 'moveToZone',
    },

    reset() {
        this.enemies = [];
    },

    // ─────────────────────────────────────────────────────────
    // SPAWNING
    // ─────────────────────────────────────────────────────────

    spawnEnemies(count) {
        this.enemies = [];

        const points = MapSystem.spawnPoints.slice();

        // Shuffle spawn points
        for (let i = points.length - 1; i > 0; i--) {
            const j = Utils.randInt(0, i);
            [points[i], points[j]] = [points[j], points[i]];
        }

        for (let i = 0; i < count; i++) {
            const sp = points[i % points.length];

            const enemy = this._createEnemy(
                sp.x + Utils.randInt(-50, 50),
                sp.y + Utils.randInt(-50, 50),
                i
            );

            this.enemies.push(enemy);
        }
    },

    _createEnemy(x, y, index) {
        const weaponKeys = Object.keys(WEAPON_DEFS);
        const startWeapon = Utils.randomPick(weaponKeys);

        const rarity =
            Math.random() < 0.15
                ? 'RARE'
                : Math.random() < 0.4
                    ? 'UNCOMMON'
                    : 'COMMON';

        const weapon = WeaponSystem.create(startWeapon, rarity);

        // Individual skill variation
        const difficulty = Utils.randFloat(0.6, 1.2);

        return {
            id: `enemy_${index}`,

            name: `Fighter ${index + 1}`,

            x,
            y,

            radius: GAME.ENEMY_RADIUS,

            speed: GAME.ENEMY_SPEED * Utils.randFloat(0.85, 1.15),

            aimAngle: Math.random() * Math.PI * 2,

            healthComp: HealthSystem.create(
                GAME.PLAYER_MAX_HEALTH * Utils.randFloat(0.8, 1.2)
            ),

            weapon,

            ammo: {
                light: 120,
                medium: 90,
                heavy: 40,
            },

            state: this.STATE.IDLE,

            stateTimer: Utils.randFloat(0.5, 2.0),

            targetX: x,
            targetY: y,

            target: null,

            // Target memory
            lastKnownTargetX: x,
            lastKnownTargetY: y,
            targetMemoryTimer: 0,

            // Combat behavior
            combatTimer: 0,
            strafeDirection: Math.random() < 0.5 ? -1 : 1,
            strafeTimer: Utils.randFloat(1.5, 3.5),

            // Reaction / awareness
            alertTimer: 0,
            investigateRadius: 180,

            detectRange: GAME.ENEMY_DETECT_RANGE * difficulty,

            attackRange: GAME.ENEMY_ATTACK_RANGE * difficulty,

            accuracy: GAME.ENEMY_SHOOT_ACCURACY / difficulty,

            difficulty,

            kills: 0,

            lastPickupTime: 0,

            lastShotTime: 0,

            // Small personality variation
            aggression: Utils.randFloat(0.75, 1.25),
            bravery: Utils.randFloat(0.75, 1.25),
        };
    },

    // ─────────────────────────────────────────────────────────
    // MAIN UPDATE
    // ─────────────────────────────────────────────────────────

    update(dt) {
        for (const enemy of this.enemies) {
            if (!enemy.healthComp.alive) continue;

            this._updateMemory(enemy, dt);
            this._updateAI(enemy, dt);
            this._updateWeapon(enemy, dt);
            this._checkDamage(enemy);
        }
    },

    // ─────────────────────────────────────────────────────────
    // MEMORY
    // ─────────────────────────────────────────────────────────

    _updateMemory(enemy, dt) {
        if (enemy.targetMemoryTimer > 0) {
            enemy.targetMemoryTimer -= dt;
        }

        if (enemy.alertTimer > 0) {
            enemy.alertTimer -= dt;
        }

        if (enemy.combatTimer > 0) {
            enemy.combatTimer -= dt;
        }

        enemy.strafeTimer -= dt;

        if (enemy.strafeTimer <= 0) {
            enemy.strafeDirection *= -1;
            enemy.strafeTimer = Utils.randFloat(1.5, 3.5);
        }
    },

    // ─────────────────────────────────────────────────────────
    // AI STATE MACHINE
    // ─────────────────────────────────────────────────────────

    _updateAI(enemy, dt) {
        enemy.stateTimer -= dt;

        // -----------------------------------------------------
        // SAFE ZONE HAS HIGH PRIORITY
        // -----------------------------------------------------

        if (this._shouldMoveToZone(enemy)) {
            if (enemy.state !== this.STATE.MOVE_TO_ZONE) {
                enemy.state = this.STATE.MOVE_TO_ZONE;

                enemy.targetX =
                    SafeZoneSystem.currentX +
                    Utils.randFloat(-120, 120);

                enemy.targetY =
                    SafeZoneSystem.currentY +
                    Utils.randFloat(-120, 120);

                enemy.stateTimer = Utils.randFloat(4, 7);
            }
        }

        // -----------------------------------------------------
        // DETECTION
        // -----------------------------------------------------

        const detectedTarget = this._detectTarget(enemy);

        if (detectedTarget) {
            enemy.target = detectedTarget;

            enemy.lastKnownTargetX = detectedTarget.x;
            enemy.lastKnownTargetY = detectedTarget.y;

            enemy.targetMemoryTimer = 4 + enemy.difficulty * 3;

            enemy.alertTimer = 2;

            if (
                enemy.state !== this.STATE.MOVE_TO_ZONE ||
                Utils.distance(
                    enemy.x,
                    enemy.y,
                    detectedTarget.x,
                    detectedTarget.y
                ) < enemy.attackRange * 0.5
            ) {
                enemy.state = this.STATE.ATTACK;
            }
        }

        // -----------------------------------------------------
        // STATE EXECUTION
        // -----------------------------------------------------

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

            case this.STATE.INVESTIGATE:
                this._stateInvestigate(enemy, dt);
                break;

            case this.STATE.MOVE_TO_ZONE:
                this._stateMoveToZone(enemy, dt);
                break;
        }
    },

    // ─────────────────────────────────────────────────────────
    // SAFE ZONE DECISION
    // ─────────────────────────────────────────────────────────

    _shouldMoveToZone(enemy) {
        if (
            typeof SafeZoneSystem === 'undefined' ||
            !SafeZoneSystem.isActive
        ) {
            return false;
        }

        const distanceFromCenter = Utils.distance(
            enemy.x,
            enemy.y,
            SafeZoneSystem.currentX,
            SafeZoneSystem.currentY
        );

        const dangerMargin = 70;

        return (
            distanceFromCenter >
            SafeZoneSystem.currentRadius - dangerMargin
        );
    },

    // ─────────────────────────────────────────────────────────
    // TARGET DETECTION
    // ─────────────────────────────────────────────────────────

    _detectTarget(enemy) {
        let nearest = null;
        let nearestDist = enemy.detectRange;

        // -----------------------------------------------------
        // PLAYER
        // -----------------------------------------------------

        if (Player.isAlive) {
            const distanceToPlayer = Utils.distance(
                enemy.x,
                enemy.y,
                Player.x,
                Player.y
            );

            if (distanceToPlayer < nearestDist) {
                if (
                    this._hasLineOfSight(
                        enemy.x,
                        enemy.y,
                        Player.x,
                        Player.y
                    )
                ) {
                    nearest = {
                        x: Player.x,
                        y: Player.y,
                        id: Player.id,
                        isPlayer: true,
                    };

                    nearestDist = distanceToPlayer;
                }
            }
        }

        // -----------------------------------------------------
        // OTHER AI
        // -----------------------------------------------------

        for (const other of this.enemies) {
            if (
                other.id === enemy.id ||
                !other.healthComp.alive
            ) {
                continue;
            }

            const distanceToOther = Utils.distance(
                enemy.x,
                enemy.y,
                other.x,
                other.y
            );

            // AI is slightly less aggressive toward AI
            if (distanceToOther < nearestDist * 0.85) {
                if (
                    this._hasLineOfSight(
                        enemy.x,
                        enemy.y,
                        other.x,
                        other.y
                    )
                ) {
                    nearest = {
                        x: other.x,
                        y: other.y,
                        id: other.id,
                        isPlayer: false,
                    };

                    nearestDist = distanceToOther;
                }
            }
        }

        return nearest;
    },

    // Defensive LOS wrapper.
    // This lets enemy.js work even before map.js gets upgraded.
    _hasLineOfSight(x1, y1, x2, y2) {
        if (
            typeof MapSystem !== 'undefined' &&
            typeof MapSystem.hasLineOfSight === 'function'
        ) {
            return MapSystem.hasLineOfSight(
                x1,
                y1,
                x2,
                y2
            );
        }

        // Fallback until MapSystem receives its LOS upgrade
        return true;
    },

    // ─────────────────────────────────────────────────────────
    // IDLE
    // ─────────────────────────────────────────────────────────

    _stateIdle(enemy, dt) {
        if (enemy.stateTimer > 0) return;

        // Look for nearby loot
        const loot =
            typeof LootSystem !== 'undefined'
                ? LootSystem.findNearestPickup(enemy.x, enemy.y)
                : null;

        if (
            loot &&
            Utils.distance(
                enemy.x,
                enemy.y,
                loot.x,
                loot.y
            ) < 300
        ) {
            enemy.state = this.STATE.LOOT;

            enemy.targetX = loot.x;
            enemy.targetY = loot.y;

            enemy.stateTimer = Utils.randFloat(3, 6);

            return;
        }

        // Otherwise explore
        enemy.state = this.STATE.EXPLORE;

        enemy.targetX =
            enemy.x + Utils.randFloat(-400, 400);

        enemy.targetY =
            enemy.y + Utils.randFloat(-400, 400);

        enemy.targetX = Utils.clamp(
            enemy.targetX,
            100,
            GAME.MAP_WIDTH - 100
        );

        enemy.targetY = Utils.clamp(
            enemy.targetY,
            100,
            GAME.MAP_HEIGHT - 100
        );

        enemy.stateTimer = Utils.randFloat(3, 7);
    },

    // ─────────────────────────────────────────────────────────
    // EXPLORE
    // ─────────────────────────────────────────────────────────

    _stateExplore(enemy, dt) {
        this._moveToward(
            enemy,
            enemy.targetX,
            enemy.targetY,
            dt
        );

        const distanceToDestination = Utils.distance(
            enemy.x,
            enemy.y,
            enemy.targetX,
            enemy.targetY
        );

        if (
            distanceToDestination < 30 ||
            enemy.stateTimer <= 0
        ) {
            enemy.state = this.STATE.IDLE;

            enemy.stateTimer =
                Utils.randFloat(1, 3);
        }
    },

    // ─────────────────────────────────────────────────────────
    // LOOT
    // ─────────────────────────────────────────────────────────

    _stateLoot(enemy, dt) {
        this._moveToward(
            enemy,
            enemy.targetX,
            enemy.targetY,
            dt
        );

        const distanceToLoot = Utils.distance(
            enemy.x,
            enemy.y,
            enemy.targetX,
            enemy.targetY
        );

        if (distanceToLoot < GAME.LOOT_PICKUP_RANGE) {
            const loot =
                LootSystem.findNearestPickup(
                    enemy.x,
                    enemy.y
                );

            if (
                loot &&
                Date.now() - enemy.lastPickupTime > 500
            ) {
                enemy.lastPickupTime = Date.now();

                this._pickupLoot(enemy, loot);
            }

            enemy.state = this.STATE.IDLE;

            enemy.stateTimer =
                Utils.randFloat(0.5, 1.5);
        }

        if (enemy.stateTimer <= 0) {
            enemy.state = this.STATE.IDLE;

            enemy.stateTimer =
                Utils.randFloat(1, 2);
        }
    },

    _pickupLoot(enemy, loot) {
        if (loot.type === 'weapon') {
            const rarityOrder = [
                'COMMON',
                'UNCOMMON',
                'RARE',
                'EPIC',
            ];

            const currentRarity =
                enemy.weapon?.rarity || 'COMMON';

            const currentIndex =
                rarityOrder.indexOf(currentRarity);

            const lootIndex =
                rarityOrder.indexOf(loot.rarity);

            if (
                !enemy.weapon ||
                lootIndex > currentIndex
            ) {
                enemy.weapon = WeaponSystem.create(
                    loot.weaponKey,
                    loot.rarity
                );

                LootSystem.pickUp(loot.id);
            }

            return;
        }

        if (loot.type === 'ammo') {
            enemy.ammo[loot.ammoType] =
                (enemy.ammo[loot.ammoType] || 0) +
                loot.amount;

            LootSystem.pickUp(loot.id);

            return;
        }

        if (
            loot.type === 'health' &&
            enemy.healthComp.health <
            enemy.healthComp.maxHealth
        ) {
            HealthSystem.heal(
                enemy.healthComp,
                loot.healAmount
            );

            LootSystem.pickUp(loot.id);

            return;
        }

        if (loot.type === 'armor') {
            HealthSystem.addArmor(
                enemy.healthComp,
                loot.armorAmount
            );

            LootSystem.pickUp(loot.id);
        }
    },

    // ─────────────────────────────────────────────────────────
    // ATTACK
    // ─────────────────────────────────────────────────────────

    _stateAttack(enemy, dt) {
        if (!enemy.target) {
            this._beginInvestigation(enemy);
            return;
        }

        // -----------------------------------------------------
        // PLAYER TARGET
        // -----------------------------------------------------

        if (enemy.target.isPlayer) {
            if (!Player.isAlive) {
                this._beginInvestigation(enemy);
                return;
            }

            enemy.target.x = Player.x;
            enemy.target.y = Player.y;
        }

        // -----------------------------------------------------
        // AI TARGET
        // -----------------------------------------------------

        else {
            const otherEnemy =
                this.enemies.find(
                    e => e.id === enemy.target.id
                );

            if (
                !otherEnemy ||
                !otherEnemy.healthComp.alive
            ) {
                this._beginInvestigation(enemy);
                return;
            }

            enemy.target.x = otherEnemy.x;
            enemy.target.y = otherEnemy.y;
        }

        const targetX = enemy.target.x;
        const targetY = enemy.target.y;

        const distanceToTarget = Utils.distance(
            enemy.x,
            enemy.y,
            targetX,
            targetY
        );

        // Save target position
        enemy.lastKnownTargetX = targetX;
        enemy.lastKnownTargetY = targetY;

        enemy.targetMemoryTimer =
            4 + enemy.difficulty * 3;

        // Aim
        enemy.aimAngle =
            Utils.angleBetween(
                enemy.x,
                enemy.y,
                targetX,
                targetY
            );

        // -----------------------------------------------------
        // COMBAT MOVEMENT
        // -----------------------------------------------------

        const preferredRange =
            enemy.attackRange *
            Utils.randFloat(0.55, 0.75);

        if (
            distanceToTarget >
            preferredRange
        ) {
            this._moveToward(
                enemy,
                targetX,
                targetY,
                dt
            );
        } else if (
            distanceToTarget <
            enemy.attackRange * 0.28
        ) {
            this._moveAway(
                enemy,
                targetX,
                targetY,
                dt
            );
        } else {
            // Strafe while fighting
            this._strafeAroundTarget(
                enemy,
                targetX,
                targetY,
                dt
            );
        }

        // -----------------------------------------------------
        // SHOOT
        // -----------------------------------------------------

        if (
            distanceToTarget <
            enemy.attackRange &&
            enemy.weapon
        ) {
            const hasLOS =
                this._hasLineOfSight(
                    enemy.x,
                    enemy.y,
                    targetX,
                    targetY
                );

            if (hasLOS) {
                const spread =
                    Utils.randFloat(
                        -enemy.accuracy,
                        enemy.accuracy
                    );

                const aimAngle =
                    enemy.aimAngle + spread;

                const bullets =
                    WeaponSystem.tryFire(
                        enemy.weapon,
                        enemy.x,
                        enemy.y,
                        aimAngle,
                        dt
                    );

                if (bullets) {
                    ProjectileSystem.addBullets(
                        bullets,
                        enemy.id
                    );

                    enemy.lastShotTime =
                        Date.now();
                }
            }
        }

        // -----------------------------------------------------
        // LOST TARGET
        // -----------------------------------------------------

        if (
            distanceToTarget >
            enemy.detectRange * 1.35
        ) {
            this._beginInvestigation(enemy);
        }
    },

    // ─────────────────────────────────────────────────────────
    // INVESTIGATION
    // ─────────────────────────────────────────────────────────

    _beginInvestigation(enemy) {
        enemy.target = null;

        if (
            enemy.targetMemoryTimer > 0
        ) {
            enemy.state =
                this.STATE.INVESTIGATE;

            enemy.targetX =
                enemy.lastKnownTargetX;

            enemy.targetY =
                enemy.lastKnownTargetY;

            enemy.stateTimer =
                Utils.randFloat(2, 4);
        } else {
            enemy.state = this.STATE.IDLE;

            enemy.stateTimer =
                Utils.randFloat(1, 3);
        }
    },

    _stateInvestigate(enemy, dt) {
        this._moveToward(
            enemy,
            enemy.targetX,
            enemy.targetY,
            dt
        );

        const distanceToMemory =
            Utils.distance(
                enemy.x,
                enemy.y,
                enemy.targetX,
                enemy.targetY
            );

        // Look around after reaching last known position
        if (
            distanceToMemory < 35 ||
            enemy.stateTimer <= 0
        ) {
            enemy.targetX =
                enemy.lastKnownTargetX +
                Utils.randFloat(
                    -enemy.investigateRadius,
                    enemy.investigateRadius
                );

            enemy.targetY =
                enemy.lastKnownTargetY +
                Utils.randFloat(
                    -enemy.investigateRadius,
                    enemy.investigateRadius
                );

            enemy.investigateRadius *= 0.7;

            enemy.stateTimer -= dt;

            if (
                enemy.stateTimer <= -1 ||
                enemy.investigateRadius < 50
            ) {
                enemy.investigateRadius = 180;

                enemy.state =
                    this.STATE.IDLE;

                enemy.stateTimer =
                    Utils.randFloat(1, 2);
            }
        }
    },

    // ─────────────────────────────────────────────────────────
    // SAFE ZONE MOVEMENT
    // ─────────────────────────────────────────────────────────

    _stateMoveToZone(enemy, dt) {
        this._moveToward(
            enemy,
            enemy.targetX,
            enemy.targetY,
            dt
        );

        if (
            typeof SafeZoneSystem !== 'undefined'
        ) {
            const distanceFromCenter =
                Utils.distance(
                    enemy.x,
                    enemy.y,
                    SafeZoneSystem.currentX,
                    SafeZoneSystem.currentY
                );

            if (
                distanceFromCenter <
                SafeZoneSystem.currentRadius - 100
            ) {
                enemy.state =
                    this.STATE.IDLE;

                enemy.stateTimer =
                    Utils.randFloat(1, 3);
            }
        }

        // Still defend themselves while moving
        const detectedTarget =
            this._detectTarget(enemy);

        if (detectedTarget) {
            const distanceToTarget =
                Utils.distance(
                    enemy.x,
                    enemy.y,
                    detectedTarget.x,
                    detectedTarget.y
                );

            if (
                distanceToTarget <
                enemy.attackRange * 0.7
            ) {
                enemy.target = detectedTarget;

                enemy.lastKnownTargetX =
                    detectedTarget.x;

                enemy.lastKnownTargetY =
                    detectedTarget.y;

                enemy.aimAngle =
                    Utils.angleBetween(
                        enemy.x,
                        enemy.y,
                        detectedTarget.x,
                        detectedTarget.y
                    );

                if (enemy.weapon) {
                    const spread =
                        Utils.randFloat(
                            -enemy.accuracy,
                            enemy.accuracy
                        );

                    const bullets =
                        WeaponSystem.tryFire(
                            enemy.weapon,
                            enemy.x,
                            enemy.y,
                            enemy.aimAngle + spread,
                            dt
                        );

                    if (bullets) {
                        ProjectileSystem.addBullets(
                            bullets,
                            enemy.id
                        );
                    }
                }
            }
        }

        if (enemy.stateTimer <= 0) {
            enemy.state = this.STATE.IDLE;
            enemy.stateTimer = 1;
        }
    },

    // ─────────────────────────────────────────────────────────
    // MOVEMENT
    // ─────────────────────────────────────────────────────────

    _moveToward(enemy, targetX, targetY, dt) {
        const angle =
            Utils.angleBetween(
                enemy.x,
                enemy.y,
                targetX,
                targetY
            );

        const moveSpeed =
            enemy.speed *
            (enemy.state === this.STATE.ATTACK
                ? 0.9
                : 1);

        const newX =
            enemy.x +
            Math.cos(angle) *
            moveSpeed *
            dt;

        const newY =
            enemy.y +
            Math.sin(angle) *
            moveSpeed *
            dt;

        const push =
            MapSystem.resolveCollision(
                newX,
                newY,
                enemy.radius
            );

        enemy.x =
            Utils.clamp(
                newX + push.x,
                enemy.radius,
                GAME.MAP_WIDTH -
                enemy.radius
            );

        enemy.y =
            Utils.clamp(
                newY + push.y,
                enemy.radius,
                GAME.MAP_HEIGHT -
                enemy.radius
            );

        enemy.aimAngle = angle;
    },

    _moveAway(enemy, targetX, targetY, dt) {
        const angle =
            Utils.angleBetween(
                targetX,
                targetY,
                enemy.x,
                enemy.y
            );

        const newX =
            enemy.x +
            Math.cos(angle) *
            enemy.speed *
            0.7 *
            dt;

        const newY =
            enemy.y +
            Math.sin(angle) *
            enemy.speed *
            0.7 *
            dt;

        const push =
            MapSystem.resolveCollision(
                newX,
                newY,
                enemy.radius
            );

        enemy.x =
            Utils.clamp(
                newX + push.x,
                enemy.radius,
                GAME.MAP_WIDTH -
                enemy.radius
            );

        enemy.y =
            Utils.clamp(
                newY + push.y,
                enemy.radius,
                GAME.MAP_HEIGHT -
                enemy.radius
            );
    },

    _strafeAroundTarget(
        enemy,
        targetX,
        targetY,
        dt
    ) {
        const angleToTarget =
            Utils.angleBetween(
                enemy.x,
                enemy.y,
                targetX,
                targetY
            );

        const strafeAngle =
            angleToTarget +
            Math.PI / 2 *
            enemy.strafeDirection;

        const strafeSpeed =
            enemy.speed * 0.45;

        const newX =
            enemy.x +
            Math.cos(strafeAngle) *
            strafeSpeed *
            dt;

        const newY =
            enemy.y +
            Math.sin(strafeAngle) *
            strafeSpeed *
            dt;

        const push =
            MapSystem.resolveCollision(
                newX,
                newY,
                enemy.radius
            );

        enemy.x =
            Utils.clamp(
                newX + push.x,
                enemy.radius,
                GAME.MAP_WIDTH -
                enemy.radius
            );

        enemy.y =
            Utils.clamp(
                newY + push.y,
                enemy.radius,
                GAME.MAP_HEIGHT -
                enemy.radius
            );
    },

    // ─────────────────────────────────────────────────────────
    // WEAPON
    // ─────────────────────────────────────────────────────────

    _updateWeapon(enemy, dt) {
        if (!enemy.weapon) return;

        const ammoType =
            enemy.weapon.ammoType;

        const ammoReserve =
            enemy.ammo[ammoType] || 0;

        // AI shoots slower than player
        const consumed =
            WeaponSystem.update(
                enemy.weapon,
                dt * 0.30,
                ammoReserve
            );

        if (consumed > 0) {
            enemy.ammo[ammoType] =
                Math.max(
                    0,
                    (enemy.ammo[ammoType] || 0) -
                    consumed
                );
        }

        // Reload
        if (
            enemy.weapon.currentAmmo <= 0 &&
            !enemy.weapon.isReloading &&
            ammoReserve > 0
        ) {
            WeaponSystem.startReload(
                enemy.weapon
            );
        }
    },

    // ─────────────────────────────────────────────────────────
    // DAMAGE
    // ─────────────────────────────────────────────────────────

    _checkDamage(enemy) {
        const hitInfo =
            ProjectileSystem.checkHits(
                enemy.x,
                enemy.y,
                enemy.radius,
                enemy.id
            );

        if (!hitInfo || hitInfo.damage <= 0) {
            return;
        }

        HealthSystem.takeDamage(
            enemy.healthComp,
            hitInfo.damage
        );

        AudioSystem.playHit();

        VFXSystem.spawnHitEffect(
            enemy.x,
            enemy.y
        );

        VFXSystem.addDamageNumber(
            enemy.x,
            enemy.y,
            hitInfo.damage,
            false
        );

        // -----------------------------------------------------
        // GETTING SHOT = ALERT
        // -----------------------------------------------------

        enemy.alertTimer = 3;

        if (
            hitInfo.lastHitBy === Player.id
        ) {
            enemy.lastKnownTargetX =
                Player.x;

            enemy.lastKnownTargetY =
                Player.y;

            enemy.targetMemoryTimer = 5;
        }

        // Try to immediately retaliate
        if (
            enemy.state !== this.STATE.ATTACK
        ) {
            const detectedTarget =
                this._detectTarget(enemy);

            if (detectedTarget) {
                enemy.state =
                    this.STATE.ATTACK;

                enemy.target =
                    detectedTarget;
            } else {
                this._beginInvestigation(enemy);
            }
        }

        // -----------------------------------------------------
        // DEATH
        // -----------------------------------------------------

        if (!enemy.healthComp.alive) {
            enemy.killedBy =
                hitInfo.lastHitBy;

            VFXSystem.spawnElimination(
                enemy.x,
                enemy.y
            );

            AudioSystem.playElimination();
        }
    },

    // ─────────────────────────────────────────────────────────
    // UTILITY
    // ─────────────────────────────────────────────────────────

    aliveCount() {
        return this.enemies.filter(
            enemy => enemy.healthComp.alive
        ).length;
    },

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────

    render(ctx) {
        for (const enemy of this.enemies) {
            // -------------------------------------------------
            // DEAD
            // -------------------------------------------------

            if (!enemy.healthComp.alive) {
                ctx.beginPath();

                ctx.arc(
                    enemy.x,
                    enemy.y,
                    enemy.radius * 0.6,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    GAME.COLORS.DEAD_ENTITY;

                ctx.globalAlpha = 0.4;

                ctx.fill();

                ctx.globalAlpha = 1;

                continue;
            }

            const x = enemy.x;
            const y = enemy.y;
            const angle = enemy.aimAngle;
            const weapon = enemy.weapon;

            // -------------------------------------------------
            // SHADOW
            // -------------------------------------------------

            ctx.beginPath();

            ctx.ellipse(
                x + 3,
                y + 4,
                enemy.radius + 1,
                enemy.radius - 2,
                0,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                'rgba(0, 0, 0, 0.35)';

            ctx.fill();

            // -------------------------------------------------
            // GUN
            // -------------------------------------------------

            const barrelLen =
                weapon ? 20 : 14;

            const barrelColor =
                weapon
                    ? weapon.rarityColor
                    : '#cccccc';

            const gx1 =
                x +
                Math.cos(angle) *
                (enemy.radius * 0.5);

            const gy1 =
                y +
                Math.sin(angle) *
                (enemy.radius * 0.5);

            const gx2 =
                x +
                Math.cos(angle) *
                (enemy.radius + barrelLen);

            const gy2 =
                y +
                Math.sin(angle) *
                (enemy.radius + barrelLen);

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

            // -------------------------------------------------
            // HANDS
            // -------------------------------------------------

            const handDist =
                enemy.radius + 5;

            const leftHandAngle =
                angle - 0.45;

            const rightHandAngle =
                angle + 0.45;

            ctx.beginPath();

            ctx.arc(
                x +
                Math.cos(leftHandAngle) *
                handDist,
                y +
                Math.sin(leftHandAngle) *
                handDist,
                3.5,
                0,
                Math.PI * 2
            );

            ctx.arc(
                x +
                Math.cos(rightHandAngle) *
                handDist,
                y +
                Math.sin(rightHandAngle) *
                handDist,
                3.5,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = '#ffab91';

            ctx.fill();

            // -------------------------------------------------
            // CHARACTER
            // -------------------------------------------------

            const skinIdx =
                (parseInt(
                    enemy.id.split('_')[1] || 1
                ) % 7) + 1;

            const drawn =
                AssetManager.drawTopDownCharacter(
                    ctx,
                    skinIdx,
                    x,
                    y,
                    enemy.radius * 2.6,
                    angle
                );

            if (!drawn) {
                ctx.beginPath();

                ctx.arc(
                    x,
                    y,
                    enemy.radius,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    GAME.COLORS.ENEMY;

                ctx.fill();

                ctx.strokeStyle =
                    GAME.COLORS.ENEMY_OUTLINE;

                ctx.lineWidth = 2;

                ctx.stroke();

                // Tactical armor indicator
                ctx.beginPath();

                ctx.arc(
                    x,
                    y,
                    enemy.radius * 0.55,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    enemy.healthComp.armor > 0
                        ? 'rgba(0, 229, 255, 0.35)'
                        : 'rgba(0, 0, 0, 0.25)';

                ctx.fill();
            }

            // -------------------------------------------------
            // HEALTH BAR
            // -------------------------------------------------

            const barW = 28;
            const barH = 3.5;

            const barX =
                x - barW / 2;

            const barY =
                y -
                enemy.radius -
                12;

            // Name
            ctx.fillStyle =
                'rgba(255, 255, 255, 0.85)';

            ctx.font =
                'bold 9px Inter';

            ctx.textAlign = 'center';

            ctx.fillText(
                enemy.name,
                x,
                barY - 3
            );

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
                    enemy.healthComp
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
        }
    },
};