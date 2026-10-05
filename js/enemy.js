/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Enemy AI System

   Features:
   - 29+ AI fighters
   - Target detection
   - Line-of-sight combat
   - AI vs AI combat
   - Target memory
   - Investigation
   - Looting
   - Safe-zone awareness
   - Strafing
   - Reloading
   - Animated soldier sprites
   - Hit / death / shoot / reload animations
   ═══════════════════════════════════════════════════════════ */

const EnemySystem = {

    enemies: [],


    // ═════════════════════════════════════════════════════
    // AI STATES
    // ═════════════════════════════════════════════════════

    STATE: {

        IDLE: 'idle',

        EXPLORE: 'explore',

        LOOT: 'loot',

        ATTACK: 'attack',

        INVESTIGATE: 'investigate',

        MOVE_TO_ZONE: 'moveToZone',
    },


    // ═════════════════════════════════════════════════════
    // RESET
    // ═════════════════════════════════════════════════════

    reset() {

        this.enemies = [];
    },


    // ═════════════════════════════════════════════════════
    // SPAWN
    // ═════════════════════════════════════════════════════

    spawnEnemies(count) {

        this.enemies = [];

        const points =
            MapSystem.spawnPoints.slice();


        // Shuffle spawn points
        for (
            let i = points.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Utils.randInt(0, i);

            [
                points[i],
                points[j]
            ] = [
                points[j],
                points[i]
            ];
        }


        for (
            let i = 0;
            i < count;
            i++
        ) {

            const sp =
                points[i % points.length];


            const enemy =
                this._createEnemy(
                    sp.x + Utils.randInt(-50, 50),
                    sp.y + Utils.randInt(-50, 50),
                    i
                );


            this.enemies.push(enemy);
        }
    },


    // ═════════════════════════════════════════════════════
    // CREATE ENEMY
    // ═════════════════════════════════════════════════════

    _createEnemy(x, y, index) {

        const weaponKeys =
            Object.keys(WEAPON_DEFS);


        const startWeapon =
            Utils.randomPick(
                weaponKeys
            );


        const rarity =
            Math.random() < 0.15
                ? 'RARE'
                : Math.random() < 0.4
                    ? 'UNCOMMON'
                    : 'COMMON';


        const weapon =
            WeaponSystem.create(
                startWeapon,
                rarity
            );


        const difficulty =
            Utils.randFloat(
                0.6,
                1.2
            );


        return {

            id:
                `enemy_${index}`,

            name:
                `Fighter ${index + 1}`,

            x,

            y,

            radius:
                GAME.ENEMY_RADIUS,

            speed:
                GAME.ENEMY_SPEED *
                Utils.randFloat(
                    0.85,
                    1.15
                ),

            aimAngle:
                Math.random() *
                Math.PI *
                2,


            // ─────────────────────────────────────
            // HEALTH
            // ─────────────────────────────────────

            healthComp:
                HealthSystem.create(
                    GAME.PLAYER_MAX_HEALTH *
                    Utils.randFloat(
                        0.8,
                        1.2
                    )
                ),


            // ─────────────────────────────────────
            // WEAPON / AMMO
            // ─────────────────────────────────────

            weapon,

            ammo: {

                light: 120,

                medium: 90,

                heavy: 40,
            },


            // ─────────────────────────────────────
            // AI STATE
            // ─────────────────────────────────────

            state:
                this.STATE.IDLE,

            stateTimer:
                Utils.randFloat(
                    0.5,
                    2
                ),


            targetX: x,

            targetY: y,

            target: null,


            // ─────────────────────────────────────
            // TARGET MEMORY
            // ─────────────────────────────────────

            lastKnownTargetX: x,

            lastKnownTargetY: y,

            targetMemoryTimer: 0,


            // ─────────────────────────────────────
            // COMBAT
            // ─────────────────────────────────────

            combatTimer: 0,

            strafeDirection:
                Math.random() < 0.5
                    ? -1
                    : 1,

            strafeTimer:
                Utils.randFloat(
                    1.5,
                    3.5
                ),


            // ─────────────────────────────────────
            // AWARENESS
            // ─────────────────────────────────────

            alertTimer: 0,

            investigateRadius: 180,


            detectRange:
                GAME.ENEMY_DETECT_RANGE *
                difficulty,


            attackRange:
                GAME.ENEMY_ATTACK_RANGE *
                difficulty,


            accuracy:
                GAME.ENEMY_SHOOT_ACCURACY /
                difficulty,


            difficulty,


            kills: 0,


            lastPickupTime: 0,

            lastShotTime: 0,


            // ─────────────────────────────────────
            // PERSONALITY
            // ─────────────────────────────────────

            aggression:
                Utils.randFloat(
                    0.75,
                    1.25
                ),

            bravery:
                Utils.randFloat(
                    0.75,
                    1.25
                ),


            // ═════════════════════════════════════
            // ANIMATION
            // ═════════════════════════════════════

            animationState:
                'idle',

            animationTime: 0,

            animationFrame: 0,

            animationLockTimer: 0,

            animationLocked: false,

            deathAnimationTime: 0,

            deathAnimationFinished: false,
        };
    },


    // ═════════════════════════════════════════════════════
    // MAIN UPDATE
    // ═════════════════════════════════════════════════════

    update(dt) {

        for (
            const enemy of this.enemies
        ) {

            // Keep death animation alive.
            if (
                !enemy.healthComp.alive
            ) {

                this._updateDeathAnimation(
                    enemy,
                    dt
                );

                continue;
            }


            this._updateMemory(
                enemy,
                dt
            );


            this._updateAI(
                enemy,
                dt
            );


            this._updateWeapon(
                enemy,
                dt
            );


            this._updateAnimation(
                enemy,
                dt
            );


            this._checkDamage(
                enemy
            );
        }
    },


    // ═════════════════════════════════════════════════════
    // MEMORY
    // ═════════════════════════════════════════════════════

    _updateMemory(enemy, dt) {

        if (
            enemy.targetMemoryTimer > 0
        ) {

            enemy.targetMemoryTimer -= dt;
        }


        if (
            enemy.alertTimer > 0
        ) {

            enemy.alertTimer -= dt;
        }


        if (
            enemy.combatTimer > 0
        ) {

            enemy.combatTimer -= dt;
        }


        enemy.strafeTimer -= dt;


        if (
            enemy.strafeTimer <= 0
        ) {

            enemy.strafeDirection *= -1;

            enemy.strafeTimer =
                Utils.randFloat(
                    1.5,
                    3.5
                );
        }
    },


    // ═════════════════════════════════════════════════════
    // AI STATE MACHINE
    // ═════════════════════════════════════════════════════

    _updateAI(enemy, dt) {

        enemy.stateTimer -= dt;


        // ─────────────────────────────────────────────
        // SAFE ZONE PRIORITY
        // ─────────────────────────────────────────────

        if (
            this._shouldMoveToZone(
                enemy
            )
        ) {

            if (
                enemy.state !==
                this.STATE.MOVE_TO_ZONE
            ) {

                enemy.state =
                    this.STATE.MOVE_TO_ZONE;


                enemy.targetX =
                    SafeZoneSystem.currentX +
                    Utils.randFloat(
                        -120,
                        120
                    );


                enemy.targetY =
                    SafeZoneSystem.currentY +
                    Utils.randFloat(
                        -120,
                        120
                    );


                enemy.stateTimer =
                    Utils.randFloat(
                        4,
                        7
                    );
            }
        }


        // ─────────────────────────────────────────────
        // DETECTION
        // ─────────────────────────────────────────────

        const detectedTarget =
            this._detectTarget(
                enemy
            );


        if (detectedTarget) {

            enemy.target =
                detectedTarget;


            enemy.lastKnownTargetX =
                detectedTarget.x;


            enemy.lastKnownTargetY =
                detectedTarget.y;


            enemy.targetMemoryTimer =
                4 +
                enemy.difficulty * 3;


            enemy.alertTimer = 2;


            if (
                enemy.state !==
                this.STATE.MOVE_TO_ZONE ||
                Utils.distance(
                    enemy.x,
                    enemy.y,
                    detectedTarget.x,
                    detectedTarget.y
                ) <
                enemy.attackRange * 0.5
            ) {

                enemy.state =
                    this.STATE.ATTACK;
            }
        }


        // ─────────────────────────────────────────────
        // EXECUTE STATE
        // ─────────────────────────────────────────────

        switch (
            enemy.state
        ) {

            case this.STATE.IDLE:

                this._stateIdle(
                    enemy,
                    dt
                );

                break;


            case this.STATE.EXPLORE:

                this._stateExplore(
                    enemy,
                    dt
                );

                break;


            case this.STATE.LOOT:

                this._stateLoot(
                    enemy,
                    dt
                );

                break;


            case this.STATE.ATTACK:

                this._stateAttack(
                    enemy,
                    dt
                );

                break;


            case this.STATE.INVESTIGATE:

                this._stateInvestigate(
                    enemy,
                    dt
                );

                break;


            case this.STATE.MOVE_TO_ZONE:

                this._stateMoveToZone(
                    enemy,
                    dt
                );

                break;
        }
    },


    // ═════════════════════════════════════════════════════
    // SAFE ZONE
    // ═════════════════════════════════════════════════════

    _shouldMoveToZone(enemy) {

        if (
            typeof SafeZoneSystem === 'undefined' ||
            !SafeZoneSystem.isActive
        ) {

            return false;
        }


        const distanceFromCenter =
            Utils.distance(
                enemy.x,
                enemy.y,
                SafeZoneSystem.currentX,
                SafeZoneSystem.currentY
            );


        const dangerMargin = 70;


        return (
            distanceFromCenter >
            SafeZoneSystem.currentRadius -
            dangerMargin
        );
    },


    // ═════════════════════════════════════════════════════
    // DETECTION
    // ═════════════════════════════════════════════════════

    _detectTarget(enemy) {

        let nearest = null;

        let nearestDist =
            enemy.detectRange;


        // ─────────────────────────────────────────────
        // PLAYER
        // ─────────────────────────────────────────────

        if (
            Player.isAlive
        ) {

            const distanceToPlayer =
                Utils.distance(
                    enemy.x,
                    enemy.y,
                    Player.x,
                    Player.y
                );


            if (
                distanceToPlayer <
                nearestDist
            ) {

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


                    nearestDist =
                        distanceToPlayer;
                }
            }
        }


        // ─────────────────────────────────────────────
        // OTHER AI
        // ─────────────────────────────────────────────

        for (
            const other of this.enemies
        ) {

            if (
                other.id === enemy.id ||
                !other.healthComp.alive
            ) {

                continue;
            }


            const distanceToOther =
                Utils.distance(
                    enemy.x,
                    enemy.y,
                    other.x,
                    other.y
                );


            if (
                distanceToOther <
                nearestDist * 0.85
            ) {

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


                    nearestDist =
                        distanceToOther;
                }
            }
        }


        return nearest;
    },


    // ═════════════════════════════════════════════════════
    // LINE OF SIGHT
    // ═════════════════════════════════════════════════════

    _hasLineOfSight(
        x1,
        y1,
        x2,
        y2
    ) {

        if (
            typeof MapSystem !== 'undefined' &&
            typeof MapSystem.hasLineOfSight ===
                'function'
        ) {

            return MapSystem.hasLineOfSight(
                x1,
                y1,
                x2,
                y2
            );
        }


        return true;
    },


    // ═════════════════════════════════════════════════════
    // IDLE
    // ═════════════════════════════════════════════════════

    _stateIdle(enemy, dt) {

        if (
            enemy.stateTimer > 0
        ) {

            return;
        }


        const loot =
            typeof LootSystem !== 'undefined'
                ? LootSystem.findNearestPickup(
                    enemy.x,
                    enemy.y
                )
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

            enemy.state =
                this.STATE.LOOT;


            enemy.targetX =
                loot.x;


            enemy.targetY =
                loot.y;


            enemy.stateTimer =
                Utils.randFloat(
                    3,
                    6
                );


            return;
        }


        // Explore
        enemy.state =
            this.STATE.EXPLORE;


        enemy.targetX =
            Utils.clamp(
                enemy.x +
                Utils.randFloat(
                    -400,
                    400
                ),
                100,
                GAME.MAP_WIDTH - 100
            );


        enemy.targetY =
            Utils.clamp(
                enemy.y +
                Utils.randFloat(
                    -400,
                    400
                ),
                100,
                GAME.MAP_HEIGHT - 100
            );


        enemy.stateTimer =
            Utils.randFloat(
                3,
                7
            );
    },


    // ═════════════════════════════════════════════════════
    // EXPLORE
    // ═════════════════════════════════════════════════════

    _stateExplore(enemy, dt) {

        this._moveToward(
            enemy,
            enemy.targetX,
            enemy.targetY,
            dt
        );


        const distance =
            Utils.distance(
                enemy.x,
                enemy.y,
                enemy.targetX,
                enemy.targetY
            );


        if (
            distance < 30 ||
            enemy.stateTimer <= 0
        ) {

            enemy.state =
                this.STATE.IDLE;


            enemy.stateTimer =
                Utils.randFloat(
                    1,
                    3
                );
        }
    },


    // ═════════════════════════════════════════════════════
    // LOOT
    // ═════════════════════════════════════════════════════

    _stateLoot(enemy, dt) {

        this._moveToward(
            enemy,
            enemy.targetX,
            enemy.targetY,
            dt
        );


        const distance =
            Utils.distance(
                enemy.x,
                enemy.y,
                enemy.targetX,
                enemy.targetY
            );


        if (
            distance <
            GAME.LOOT_PICKUP_RANGE
        ) {

            const loot =
                LootSystem.findNearestPickup(
                    enemy.x,
                    enemy.y
                );


            if (
                loot &&
                Date.now() -
                enemy.lastPickupTime >
                500
            ) {

                enemy.lastPickupTime =
                    Date.now();


                this._pickupLoot(
                    enemy,
                    loot
                );
            }


            enemy.state =
                this.STATE.IDLE;


            enemy.stateTimer =
                Utils.randFloat(
                    0.5,
                    1.5
                );
        }


        if (
            enemy.stateTimer <= 0
        ) {

            enemy.state =
                this.STATE.IDLE;


            enemy.stateTimer =
                Utils.randFloat(
                    1,
                    2
                );
        }
    },


    // ═════════════════════════════════════════════════════
    // LOOT HANDLING
    // ═════════════════════════════════════════════════════

    _pickupLoot(
        enemy,
        loot
    ) {

        if (
            loot.type === 'weapon'
        ) {

            const rarityOrder = [

                'COMMON',

                'UNCOMMON',

                'RARE',

                'EPIC',
            ];


            const currentRarity =
                enemy.weapon?.rarity ||
                'COMMON';


            const currentIndex =
                rarityOrder.indexOf(
                    currentRarity
                );


            const lootIndex =
                rarityOrder.indexOf(
                    loot.rarity
                );


            if (
                !enemy.weapon ||
                lootIndex >
                currentIndex
            ) {

                enemy.weapon =
                    WeaponSystem.create(
                        loot.weaponKey,
                        loot.rarity
                    );


                LootSystem.pickUp(
                    loot.id
                );
            }


            return;
        }


        if (
            loot.type === 'ammo'
        ) {

            enemy.ammo[
                loot.ammoType
            ] =
                (
                    enemy.ammo[
                        loot.ammoType
                    ] || 0
                ) +
                loot.amount;


            LootSystem.pickUp(
                loot.id
            );


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


            LootSystem.pickUp(
                loot.id
            );


            return;
        }


        if (
            loot.type === 'armor'
        ) {

            HealthSystem.addArmor(
                enemy.healthComp,
                loot.armorAmount
            );


            LootSystem.pickUp(
                loot.id
            );
        }
    },


    // ═════════════════════════════════════════════════════
    // ATTACK
    // ═════════════════════════════════════════════════════

    _stateAttack(enemy, dt) {

        if (
            !enemy.target
        ) {

            this._beginInvestigation(
                enemy
            );

            return;
        }


        // ─────────────────────────────────────────────
        // PLAYER
        // ─────────────────────────────────────────────

        if (
            enemy.target.isPlayer
        ) {

            if (
                !Player.isAlive
            ) {

                this._beginInvestigation(
                    enemy
                );

                return;
            }


            enemy.target.x =
                Player.x;

            enemy.target.y =
                Player.y;
        }


        // ─────────────────────────────────────────────
        // AI
        // ─────────────────────────────────────────────

        else {

            const other =
                this.enemies.find(
                    e =>
                        e.id ===
                        enemy.target.id
                );


            if (
                !other ||
                !other.healthComp.alive
            ) {

                this._beginInvestigation(
                    enemy
                );

                return;
            }


            enemy.target.x =
                other.x;

            enemy.target.y =
                other.y;
        }


        const targetX =
            enemy.target.x;


        const targetY =
            enemy.target.y;


        const distance =
            Utils.distance(
                enemy.x,
                enemy.y,
                targetX,
                targetY
            );


        enemy.lastKnownTargetX =
            targetX;


        enemy.lastKnownTargetY =
            targetY;


        enemy.targetMemoryTimer =
            4 +
            enemy.difficulty * 3;


        // Aim
        enemy.aimAngle =
            Utils.angleBetween(
                enemy.x,
                enemy.y,
                targetX,
                targetY
            );


        // ─────────────────────────────────────────────
        // COMBAT MOVEMENT
        // ─────────────────────────────────────────────

        const preferredRange =
            enemy.attackRange *
            Utils.randFloat(
                0.55,
                0.75
            );


        if (
            distance >
            preferredRange
        ) {

            this._moveToward(
                enemy,
                targetX,
                targetY,
                dt
            );

        } else if (
            distance <
            enemy.attackRange * 0.28
        ) {

            this._moveAway(
                enemy,
                targetX,
                targetY,
                dt
            );

        } else {

            this._strafeAroundTarget(
                enemy,
                targetX,
                targetY,
                dt
            );
        }


        // ─────────────────────────────────────────────
        // SHOOT
        // ─────────────────────────────────────────────

        if (
            distance <
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


                const bullets =
                    WeaponSystem.tryFire(
                        enemy.weapon,
                        enemy.x,
                        enemy.y,
                        enemy.aimAngle +
                        spread,
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


        // Lost target
        if (
            distance >
            enemy.detectRange * 1.35
        ) {

            this._beginInvestigation(
                enemy
            );
        }
    },


    // ═════════════════════════════════════════════════════
    // INVESTIGATION
    // ═════════════════════════════════════════════════════

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
                Utils.randFloat(
                    2,
                    4
                );

        } else {

            enemy.state =
                this.STATE.IDLE;


            enemy.stateTimer =
                Utils.randFloat(
                    1,
                    3
                );
        }
    },


    _stateInvestigate(enemy, dt) {

        this._moveToward(
            enemy,
            enemy.targetX,
            enemy.targetY,
            dt
        );


        const distance =
            Utils.distance(
                enemy.x,
                enemy.y,
                enemy.targetX,
                enemy.targetY
            );


        if (
            distance < 35 ||
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


            enemy.investigateRadius *=
                0.7;


            enemy.stateTimer -= dt;


            if (
                enemy.stateTimer <= -1 ||
                enemy.investigateRadius < 50
            ) {

                enemy.investigateRadius =
                    180;


                enemy.state =
                    this.STATE.IDLE;


                enemy.stateTimer =
                    Utils.randFloat(
                        1,
                        2
                    );
            }
        }
    },


    // ═════════════════════════════════════════════════════
    // MOVE TO SAFE ZONE
    // ═════════════════════════════════════════════════════

    _stateMoveToZone(enemy, dt) {

        this._moveToward(
            enemy,
            enemy.targetX,
            enemy.targetY,
            dt
        );


        if (
            typeof SafeZoneSystem !==
            'undefined'
        ) {

            const distance =
                Utils.distance(
                    enemy.x,
                    enemy.y,
                    SafeZoneSystem.currentX,
                    SafeZoneSystem.currentY
                );


            if (
                distance <
                SafeZoneSystem.currentRadius -
                100
            ) {

                enemy.state =
                    this.STATE.IDLE;


                enemy.stateTimer =
                    Utils.randFloat(
                        1,
                        3
                    );
            }
        }


        // Still defend themselves
        const target =
            this._detectTarget(
                enemy
            );


        if (target) {

            const distance =
                Utils.distance(
                    enemy.x,
                    enemy.y,
                    target.x,
                    target.y
                );


            if (
                distance <
                enemy.attackRange * 0.7
            ) {

                enemy.target =
                    target;


                enemy.aimAngle =
                    Utils.angleBetween(
                        enemy.x,
                        enemy.y,
                        target.x,
                        target.y
                    );


                if (
                    enemy.weapon
                ) {

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
                            enemy.aimAngle +
                            spread,
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
        }


        if (
            enemy.stateTimer <= 0
        ) {

            enemy.state =
                this.STATE.IDLE;

            enemy.stateTimer = 1;
        }
    },


    // ═════════════════════════════════════════════════════
    // MOVE TOWARD
    // ═════════════════════════════════════════════════════

    _moveToward(
        enemy,
        targetX,
        targetY,
        dt
    ) {

        const angle =
            Utils.angleBetween(
                enemy.x,
                enemy.y,
                targetX,
                targetY
            );


        const moveSpeed =
            enemy.speed *
            (
                enemy.state ===
                this.STATE.ATTACK
                    ? 0.9
                    : 1
            );


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


        enemy.aimAngle =
            angle;
    },


    // ═════════════════════════════════════════════════════
    // MOVE AWAY
    // ═════════════════════════════════════════════════════

    _moveAway(
        enemy,
        targetX,
        targetY,
        dt
    ) {

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


    // ═════════════════════════════════════════════════════
    // STRAFE
    // ═════════════════════════════════════════════════════

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
            (
                Math.PI / 2
            ) *
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


        // Face the target while strafing
        enemy.aimAngle =
            angleToTarget;
    },


    // ═════════════════════════════════════════════════════
    // WEAPON UPDATE
    // ═════════════════════════════════════════════════════

    _updateWeapon(
        enemy,
        dt
    ) {

        if (
            !enemy.weapon
        ) {

            return;
        }


        const ammoType =
            enemy.weapon.ammoType;


        const ammoReserve =
            enemy.ammo[
                ammoType
            ] || 0;


        const consumed =
            WeaponSystem.update(
                enemy.weapon,
                dt * 0.30,
                ammoReserve
            );


        if (
            consumed > 0
        ) {

            enemy.ammo[
                ammoType
            ] =
                Math.max(
                    0,
                    (
                        enemy.ammo[
                            ammoType
                        ] || 0
                    ) -
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


    // ═════════════════════════════════════════════════════
    // ANIMATION
    // ═════════════════════════════════════════════════════

    _updateAnimation(
        enemy,
        dt
    ) {

        // ─────────────────────────────────────────────
        // HIT / ACTION ANIMATION
        // ─────────────────────────────────────────────

        if (
            enemy.animationLocked
        ) {

            enemy.animationLockTimer -= dt;

            enemy.animationTime += dt;


            const speed =
                AssetManager.getAnimationSpeed
                    ? AssetManager.getAnimationSpeed(
                        enemy.animationState
                    )
                    : 10;


            enemy.animationFrame =
                Math.floor(
                    enemy.animationTime *
                    speed
                );


            if (
                enemy.animationLockTimer <= 0
            ) {

                enemy.animationLocked =
                    false;

                enemy.animationTime = 0;

                enemy.animationFrame = 0;
            }


            return;
        }


        // ─────────────────────────────────────────────
        // RELOAD
        // ─────────────────────────────────────────────

        if (
            enemy.weapon &&
            enemy.weapon.isReloading
        ) {

            enemy.animationState =
                'reload';
        }


        // ─────────────────────────────────────────────
        // SHOOT
        // ─────────────────────────────────────────────

        else if (
            Date.now() -
            enemy.lastShotTime <
            180
        ) {

            enemy.animationState =
                'shoot';
        }


        // ─────────────────────────────────────────────
        // MOVEMENT
        // ─────────────────────────────────────────────

        else if (
            enemy.state ===
            this.STATE.EXPLORE ||
            enemy.state ===
            this.STATE.LOOT ||
            enemy.state ===
            this.STATE.INVESTIGATE ||
            enemy.state ===
            this.STATE.MOVE_TO_ZONE ||
            enemy.state ===
            this.STATE.ATTACK
        ) {

            enemy.animationState =
                'walk';
        }


        // ─────────────────────────────────────────────
        // IDLE
        // ─────────────────────────────────────────────

        else {

            enemy.animationState =
                'idle';
        }


        // ─────────────────────────────────────────────
        // ADVANCE FRAME
        // ─────────────────────────────────────────────

        enemy.animationTime += dt;


        const speed =
            AssetManager.getAnimationSpeed
                ? AssetManager.getAnimationSpeed(
                    enemy.animationState
                )
                : 10;


        const frameCount =
            AssetManager.getAnimationFrameCount
                ? AssetManager.getAnimationFrameCount(
                    enemy.animationState
                )
                : 10;


        enemy.animationFrame =
            Math.floor(
                enemy.animationTime *
                speed
            ) %
            frameCount;
    },


    // ═════════════════════════════════════════════════════
    // DEATH ANIMATION
    // ═════════════════════════════════════════════════════

    _updateDeathAnimation(
        enemy,
        dt
    ) {

        if (
            enemy.deathAnimationFinished
        ) {

            return;
        }


        enemy.animationState =
            'death';


        enemy.deathAnimationTime += dt;

        enemy.animationTime += dt;


        const speed =
            AssetManager.getAnimationSpeed
                ? AssetManager.getAnimationSpeed(
                    'death'
                )
                : 8;


        const frameCount =
            AssetManager.getAnimationFrameCount
                ? AssetManager.getAnimationFrameCount(
                    'death'
                )
                : 10;


        enemy.animationFrame =
            Math.floor(
                enemy.animationTime *
                speed
            );


        if (
            enemy.animationFrame >=
            frameCount
        ) {

            enemy.animationFrame =
                frameCount - 1;

            enemy.deathAnimationFinished =
                true;
        }
    },


    // ═════════════════════════════════════════════════════
    // DAMAGE
    // ═════════════════════════════════════════════════════

    _checkDamage(enemy) {

        const hitInfo =
            ProjectileSystem.checkHits(
                enemy.x,
                enemy.y,
                enemy.radius,
                enemy.id
            );


        if (
            !hitInfo ||
            hitInfo.damage <= 0
        ) {

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
            hitInfo.criticalHit
        );


        // ─────────────────────────────────────────────
        // ALERT
        // ─────────────────────────────────────────────

        enemy.alertTimer = 3;


        if (
            hitInfo.lastHitBy ===
            Player.id
        ) {

            enemy.lastKnownTargetX =
                Player.x;

            enemy.lastKnownTargetY =
                Player.y;

            enemy.targetMemoryTimer = 5;
        }


        // ─────────────────────────────────────────────
        // HIT ANIMATION
        // ─────────────────────────────────────────────

        if (
            enemy.healthComp.alive
        ) {

            enemy.animationState =
                'hurt';

            enemy.animationTime = 0;

            enemy.animationFrame = 0;

            enemy.animationLocked = true;

            enemy.animationLockTimer =
                0.35;
        }


        // ─────────────────────────────────────────────
        // RETALIATION
        // ─────────────────────────────────────────────

        if (
            enemy.state !==
            this.STATE.ATTACK
        ) {

            const detected =
                this._detectTarget(
                    enemy
                );


            if (detected) {

                enemy.state =
                    this.STATE.ATTACK;

                enemy.target =
                    detected;

            } else {

                this._beginInvestigation(
                    enemy
                );
            }
        }


        // ─────────────────────────────────────────────
        // DEATH
        // ─────────────────────────────────────────────

        if (
            !enemy.healthComp.alive
        ) {

            enemy.killedBy =
                hitInfo.lastHitBy;


            enemy.animationState =
                'death';


            enemy.animationTime = 0;

            enemy.animationFrame = 0;

            enemy.deathAnimationTime = 0;

            enemy.deathAnimationFinished =
                false;


            enemy.animationLocked =
                false;


            VFXSystem.spawnElimination(
                enemy.x,
                enemy.y
            );


            AudioSystem.playElimination();
        }
    },


    // ═════════════════════════════════════════════════════
    // ALIVE COUNT
    // ═════════════════════════════════════════════════════

    aliveCount() {

        return this.enemies.filter(
            enemy =>
                enemy.healthComp.alive
        ).length;
    },


    // ═════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════

    render(ctx) {

        for (
            const enemy of this.enemies
        ) {

            const x =
                enemy.x;

            const y =
                enemy.y;

            const angle =
                enemy.aimAngle;


            // ═════════════════════════════════════
            // DEAD
            // ═════════════════════════════════════

            if (
                !enemy.healthComp.alive
            ) {

                /*
                 * Keep rendering the actual death
                 * animation instead of immediately
                 * replacing the soldier with a circle.
                 */

                if (
                    !enemy.deathAnimationFinished
                ) {

                    const drawn =
                        AssetManager.drawAnimatedCharacter(
                            ctx,
                            'death',
                            enemy.animationFrame,
                            x,
                            y,
                            enemy.radius * 3.2,
                            angle
                        );


                    if (!drawn) {

                        ctx.save();

                        ctx.globalAlpha = 0.4;

                        ctx.fillStyle =
                            GAME.COLORS.DEAD_ENTITY;

                        ctx.beginPath();

                        ctx.arc(
                            x,
                            y,
                            enemy.radius * 0.7,
                            0,
                            Math.PI * 2
                        );

                        ctx.fill();

                        ctx.restore();
                    }

                    continue;
                }


                // Dead body remains faintly visible
                ctx.save();

                ctx.globalAlpha = 0.22;

                ctx.fillStyle =
                    GAME.COLORS.DEAD_ENTITY;

                ctx.beginPath();

                ctx.ellipse(
                    x,
                    y + 5,
                    enemy.radius * 1.1,
                    enemy.radius * 0.55,
                    0,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                ctx.restore();

                continue;
            }


            // ═════════════════════════════════════
            // SHADOW
            // ═════════════════════════════════════

            ctx.save();

            ctx.beginPath();

            ctx.ellipse(
                x + 3,
                y + 5,
                enemy.radius * 1.15,
                enemy.radius * 0.55,
                0,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                'rgba(0,0,0,0.38)';

            ctx.fill();

            ctx.restore();


            // ═════════════════════════════════════
            // CHARACTER SPRITE
            // ═════════════════════════════════════

            const skinIdx =
                (
                    parseInt(
                        enemy.id.split('_')[1] ||
                        0
                    ) %
                    7
                );


            const drawn =
                AssetManager.drawTopDownCharacter(
                    ctx,

                    skinIdx,

                    x,

                    y,

                    enemy.radius * 3.2,

                    angle,

                    enemy.animationState,

                    enemy.animationFrame
                );


            // ═════════════════════════════════════
            // FALLBACK
            // ═════════════════════════════════════

            if (
                !drawn
            ) {

                AssetManager.drawFallbackCharacter(
                    ctx,
                    x,
                    y,
                    enemy.radius * 2.6,
                    angle,
                    true
                );
            }


            // ═════════════════════════════════════
            // MUZZLE FLASH
            // ═════════════════════════════════════

            if (
                enemy.animationState === 'shoot' &&
                Date.now() -
                enemy.lastShotTime <
                90
            ) {

                const muzzleDistance =
                    enemy.radius +
                    18;


                const muzzleX =
                    x +
                    Math.cos(angle) *
                    muzzleDistance;


                const muzzleY =
                    y +
                    Math.sin(angle) *
                    muzzleDistance;


                ctx.save();

                ctx.translate(
                    muzzleX,
                    muzzleY
                );


                ctx.rotate(
                    angle
                );


                ctx.beginPath();

                ctx.moveTo(
                    0,
                    0
                );

                ctx.lineTo(
                    13,
                    -4
                );

                ctx.lineTo(
                    8,
                    0
                );

                ctx.lineTo(
                    13,
                    4
                );

                ctx.closePath();


                ctx.fillStyle =
                    'rgba(255,220,80,0.9)';

                ctx.fill();


                ctx.restore();
            }


            // ═════════════════════════════════════
            // HEALTH / ARMOR
            // ═════════════════════════════════════

            const barW = 30;

            const barH = 3.5;


            const barX =
                x -
                barW / 2;


            const barY =
                y -
                enemy.radius -
                16;


            // Name
            ctx.save();

            ctx.textAlign =
                'center';

            ctx.font =
                'bold 9px Inter';

            ctx.fillStyle =
                'rgba(255,255,255,0.88)';


            ctx.fillText(
                enemy.name,
                x,
                barY - 4
            );


            // Background
            ctx.fillStyle =
                'rgba(0,0,0,0.65)';


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


            // Armor
            if (
                enemy.healthComp.armor > 0
            ) {

                ctx.fillStyle =
                    'rgba(0,0,0,0.65)';


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
                        enemy.healthComp
                    ),
                    barH
                );
            }


            ctx.restore();
        }
    },
};