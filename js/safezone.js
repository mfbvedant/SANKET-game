/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Safe Zone System
   Dynamic shrinking battle-royale zone with:
   - Moving zone center
   - Smooth shrinking
   - Warning system
   - Progressive damage
   - Final zone handling
   - Visual indicators
   ═══════════════════════════════════════════════════════════ */

const SafeZoneSystem = {
    isActive: false,

    currentPhase: 0,

    phaseState: 'waiting',
    // waiting | shrinking | done

    // ─────────────────────────────────────────────────────────
    // CURRENT ZONE
    // ─────────────────────────────────────────────────────────

    currentX: 0,
    currentY: 0,
    currentRadius: 0,

    // ─────────────────────────────────────────────────────────
    // NEXT ZONE
    // ─────────────────────────────────────────────────────────

    targetX: 0,
    targetY: 0,
    targetRadius: 0,

    // ─────────────────────────────────────────────────────────
    // PHASE TIMERS
    // ─────────────────────────────────────────────────────────

    timer: 0,

    shrinkProgress: 0,

    // ─────────────────────────────────────────────────────────
    // SHRINK START VALUES
    // ─────────────────────────────────────────────────────────

    startX: 0,
    startY: 0,
    startRadius: 0,

    // ─────────────────────────────────────────────────────────
    // DAMAGE
    // ─────────────────────────────────────────────────────────

    dps: 1,

    zoneWarningPlayed: false,

    // Time spent outside before damage gets serious
    graceTimer: 0,

    // ─────────────────────────────────────────────────────────
    // VISUAL ANIMATION
    // ─────────────────────────────────────────────────────────

    pulseTime: 0,

    // ─────────────────────────────────────────────────────────
    // RESET
    // ─────────────────────────────────────────────────────────

    reset() {
        this.isActive = false;

        this.currentPhase = 0;

        this.phaseState = 'waiting';

        this.currentX =
            GAME.MAP_WIDTH / 2;

        this.currentY =
            GAME.MAP_HEIGHT / 2;

        this.currentRadius =
            GAME.SAFE_ZONE_INITIAL_RADIUS;

        this.targetX =
            this.currentX;

        this.targetY =
            this.currentY;

        this.targetRadius =
            this.currentRadius;

        this.timer = 0;

        this.shrinkProgress = 0;

        this.startX = this.currentX;
        this.startY = this.currentY;
        this.startRadius = this.currentRadius;

        this.dps = 1;

        this.zoneWarningPlayed = false;

        this.graceTimer = 0;

        this.pulseTime = 0;
    },

    // ─────────────────────────────────────────────────────────
    // START
    // ─────────────────────────────────────────────────────────

    start() {
        this.reset();

        this.isActive = true;

        this._beginPhase(0);
    },

    // ─────────────────────────────────────────────────────────
    // START PHASE
    // ─────────────────────────────────────────────────────────

    _beginPhase(phaseIndex) {
        // All phases complete
        if (
            phaseIndex >=
            GAME.SAFE_ZONE_PHASES.length
        ) {
            this.phaseState = 'done';

            this.currentPhase =
                GAME.SAFE_ZONE_PHASES.length;

            this.dps =
                GAME.SAFE_ZONE_PHASES.length > 0
                    ? GAME.SAFE_ZONE_PHASES[
                        GAME.SAFE_ZONE_PHASES.length - 1
                    ].dps
                    : 1;

            return;
        }

        this.currentPhase =
            phaseIndex;

        const phase =
            GAME.SAFE_ZONE_PHASES[
            phaseIndex
            ];

        this.phaseState = 'waiting';

        this.timer =
            Math.max(0, phase.delay);

        this.dps =
            phase.dps;

        this.shrinkProgress = 0;

        // ─────────────────────────────────────────────────────
        // CALCULATE NEXT RADIUS
        // ─────────────────────────────────────────────────────

        const newRadius =
            Math.max(
                80,
                GAME.SAFE_ZONE_INITIAL_RADIUS *
                phase.radiusMult
            );

        // ─────────────────────────────────────────────────────
        // CALCULATE CENTER MOVEMENT
        // ─────────────────────────────────────────────────────

        const radiusDifference =
            Math.max(
                0,
                this.currentRadius -
                newRadius
            );

        // Larger shrink = potentially larger movement
        const maxShift =
            Math.max(
                40,
                radiusDifference *
                0.5
            );

        let newX =
            this.currentX +
            Utils.randFloat(
                -maxShift,
                maxShift
            );

        let newY =
            this.currentY +
            Utils.randFloat(
                -maxShift,
                maxShift
            );

        // Keep zone inside map
        newX =
            Utils.clamp(
                newX,
                newRadius + 50,
                GAME.MAP_WIDTH -
                newRadius -
                50
            );

        newY =
            Utils.clamp(
                newY,
                newRadius + 50,
                GAME.MAP_HEIGHT -
                newRadius -
                50
            );

        this.targetX = newX;

        this.targetY = newY;

        this.targetRadius =
            newRadius;

        this.zoneWarningPlayed =
            false;

        this.graceTimer = 0;
    },

    // ─────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────

    update(dt) {
        if (!this.isActive) {
            return;
        }

        this.pulseTime += dt;

        if (
            this.phaseState ===
            'done'
        ) {
            this._applyZoneDamage(dt);

            return;
        }

        this.timer -= dt;

        // ─────────────────────────────────────────────────────
        // WAITING
        // ─────────────────────────────────────────────────────

        if (
            this.phaseState ===
            'waiting'
        ) {
            // Warning at 5 seconds
            if (
                this.timer <= 5 &&
                !this.zoneWarningPlayed
            ) {
                AudioSystem.playZoneWarning();

                this.zoneWarningPlayed =
                    true;
            }

            // Begin shrink
            if (
                this.timer <= 0
            ) {
                this.phaseState =
                    'shrinking';

                const phase =
                    GAME.SAFE_ZONE_PHASES[
                    this.currentPhase
                    ];

                this.timer =
                    Math.max(
                        0.1,
                        phase.shrinkTime
                    );

                this.shrinkProgress = 0;

                this.startX =
                    this.currentX;

                this.startY =
                    this.currentY;

                this.startRadius =
                    this.currentRadius;
            }
        }

        // ─────────────────────────────────────────────────────
        // SHRINKING
        // ─────────────────────────────────────────────────────

        else if (
            this.phaseState ===
            'shrinking'
        ) {
            const phase =
                GAME.SAFE_ZONE_PHASES[
                this.currentPhase
                ];

            const shrinkTime =
                Math.max(
                    0.1,
                    phase.shrinkTime
                );

            this.shrinkProgress =
                1 -
                this.timer /
                shrinkTime;

            this.shrinkProgress =
                Utils.clamp(
                    this.shrinkProgress,
                    0,
                    1
                );

            // Smooth easing
            const eased =
                this._easeInOut(
                    this.shrinkProgress
                );

            this.currentX =
                Utils.lerp(
                    this.startX,
                    this.targetX,
                    eased
                );

            this.currentY =
                Utils.lerp(
                    this.startY,
                    this.targetY,
                    eased
                );

            this.currentRadius =
                Utils.lerp(
                    this.startRadius,
                    this.targetRadius,
                    eased
                );

            // Shrink completed
            if (
                this.timer <= 0
            ) {
                this.currentX =
                    this.targetX;

                this.currentY =
                    this.targetY;

                this.currentRadius =
                    this.targetRadius;

                this._beginPhase(
                    this.currentPhase + 1
                );
            }
        }

        // ─────────────────────────────────────────────────────
        // DAMAGE
        // ─────────────────────────────────────────────────────

        this._applyZoneDamage(dt);
    },

    // ─────────────────────────────────────────────────────────
    // EASING
    // ─────────────────────────────────────────────────────────

    _easeInOut(t) {
        return (
            t < 0.5
                ? 2 * t * t
                : 1 -
                Math.pow(
                    -2 * t + 2,
                    2
                ) / 2
        );
    },

    // ─────────────────────────────────────────────────────────
    // ZONE DAMAGE
    // ─────────────────────────────────────────────────────────

    _applyZoneDamage(dt) {
        if (!this.isActive) {
            return;
        }

        // ─────────────────────────────────────────────────────
        // PLAYER
        // ─────────────────────────────────────────────────────

        if (Player.isAlive) {
            const outside =
                !this.isInsideZone(
                    Player.x,
                    Player.y
                );

            if (outside) {
                this.graceTimer += dt;

                // Damage starts immediately but is kept
                // consistent with the configured DPS.
                const damage =
                    this.dps * dt;

                HealthSystem.takeDamage(
                    Player.healthComp,
                    damage
                );

                if (
                    !Player.healthComp.alive
                ) {
                    Player.isAlive =
                        false;
                }
            } else {
                this.graceTimer = 0;
            }
        }

        // ─────────────────────────────────────────────────────
        // ENEMIES
        // ─────────────────────────────────────────────────────

        if (
            typeof EnemySystem !==
            'undefined'
        ) {
            for (
                const enemy of
                EnemySystem.enemies
            ) {
                if (
                    !enemy.healthComp
                        .alive
                ) {
                    continue;
                }

                if (
                    !this.isInsideZone(
                        enemy.x,
                        enemy.y
                    )
                ) {
                    HealthSystem.takeDamage(
                        enemy.healthComp,
                        this.dps * dt
                    );

                    if (
                        !enemy.healthComp
                            .alive
                    ) {
                        enemy.killedBy =
                            'zone';

                        if (
                            typeof VFXSystem !==
                            'undefined'
                        ) {
                            VFXSystem.spawnElimination(
                                enemy.x,
                                enemy.y
                            );
                        }

                        if (
                            typeof AudioSystem !==
                            'undefined'
                        ) {
                            AudioSystem.playElimination();
                        }
                    }
                }
            }
        }
    },

    // ─────────────────────────────────────────────────────────
    // CHECK INSIDE
    // ─────────────────────────────────────────────────────────

    isInsideZone(x, y) {
        const dx =
            x - this.currentX;

        const dy =
            y - this.currentY;

        return (
            dx * dx +
            dy * dy <=
            this.currentRadius *
            this.currentRadius
        );
    },

    // ─────────────────────────────────────────────────────────
    // DISTANCE TO EDGE
    // ─────────────────────────────────────────────────────────

    distanceToEdge(x, y) {
        const distance =
            Utils.distance(
                x,
                y,
                this.currentX,
                this.currentY
            );

        return (
            this.currentRadius -
            distance
        );
    },

    // ─────────────────────────────────────────────────────────
    // PLAYER ZONE STATUS
    // ─────────────────────────────────────────────────────────

    getPlayerZoneStatus() {
        if (!Player.isAlive) {
            return {
                inside: false,
                distance: 0,
                outside: true,
                danger: true,
            };
        }

        const edgeDistance =
            this.distanceToEdge(
                Player.x,
                Player.y
            );

        return {
            inside:
                edgeDistance >= 0,

            distance:
                edgeDistance,

            outside:
                edgeDistance < 0,

            danger:
                edgeDistance < 80,
        };
    },

    // ─────────────────────────────────────────────────────────
    // TIMER
    // ─────────────────────────────────────────────────────────

    getTimerDisplay() {
        if (
            this.phaseState ===
            'done'
        ) {
            return 'FINAL';
        }

        return Utils.formatTime(
            Math.max(
                0,
                this.timer
            )
        );
    },

    // ─────────────────────────────────────────────────────────
    // STATUS
    // ─────────────────────────────────────────────────────────

    getStatusText() {
        if (
            this.phaseState ===
            'waiting'
        ) {
            return (
                `Zone ${this.currentPhase + 1
                } closes in`
            );
        }

        if (
            this.phaseState ===
            'shrinking'
        ) {
            return (
                `Zone ${this.currentPhase + 1
                } CLOSING`
            );
        }

        return 'FINAL ZONE';
    },

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────

    render(ctx) {
        if (!this.isActive) {
            return;
        }

        // ─────────────────────────────────────────────────────
        // DANGER AREA
        // ─────────────────────────────────────────────────────

        ctx.save();

        ctx.beginPath();

        ctx.rect(
            0,
            0,
            GAME.MAP_WIDTH,
            GAME.MAP_HEIGHT
        );

        ctx.arc(
            this.currentX,
            this.currentY,
            this.currentRadius,
            0,
            Math.PI * 2,
            true
        );

        ctx.fillStyle =
            GAME.COLORS.DANGER_ZONE;

        ctx.fill();

        ctx.restore();

        // ─────────────────────────────────────────────────────
        // ZONE PULSE
        // ─────────────────────────────────────────────────────

        const pulse =
            0.65 +
            Math.sin(
                this.pulseTime * 3
            ) *
            0.35;

        // ─────────────────────────────────────────────────────
        // CURRENT ZONE BORDER
        // ─────────────────────────────────────────────────────

        ctx.beginPath();

        ctx.arc(
            this.currentX,
            this.currentY,
            this.currentRadius,
            0,
            Math.PI * 2
        );

        ctx.strokeStyle =
            GAME.COLORS.SAFE_ZONE_BORDER;

        ctx.lineWidth =
            2.5 +
            pulse * 2;

        ctx.stroke();

        // ─────────────────────────────────────────────────────
        // NEXT ZONE
        // ─────────────────────────────────────────────────────

        if (
            this.phaseState ===
            'waiting' &&
            this.currentPhase <
            GAME.SAFE_ZONE_PHASES.length
        ) {
            ctx.save();

            ctx.beginPath();

            ctx.arc(
                this.targetX,
                this.targetY,
                this.targetRadius,
                0,
                Math.PI * 2
            );

            ctx.strokeStyle =
                GAME.COLORS.NEXT_ZONE_BORDER;

            ctx.lineWidth = 2;

            ctx.setLineDash([
                10,
                10,
            ]);

            ctx.stroke();

            ctx.setLineDash([]);

            ctx.restore();
        }

        // ─────────────────────────────────────────────────────
        // WARNING RING
        // ─────────────────────────────────────────────────────

        if (
            Player.isAlive &&
            !this.isInsideZone(
                Player.x,
                Player.y
            )
        ) {
            const warningPulse =
                0.5 +
                Math.sin(
                    this.pulseTime * 7
                ) *
                0.5;

            ctx.save();

            ctx.beginPath();

            ctx.arc(
                Player.x,
                Player.y,
                30 +
                warningPulse * 8,
                0,
                Math.PI * 2
            );

            ctx.strokeStyle =
                `rgba(255, 23, 68, ${0.25 +
                warningPulse *
                0.35
                })`;

            ctx.lineWidth = 2;

            ctx.stroke();

            ctx.restore();
        }
    },
};