/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Safe Zone System
   Manages the shrinking battle-royale safe zone.
   ═══════════════════════════════════════════════════════════ */

const SafeZoneSystem = {
    isActive: false,
    currentPhase: 0,
    phaseState: 'waiting',  // 'waiting' | 'shrinking' | 'done'

    // Current zone circle
    currentX: 0,
    currentY: 0,
    currentRadius: 0,

    // Target zone circle (next shrink target)
    targetX: 0,
    targetY: 0,
    targetRadius: 0,

    // Timers
    timer: 0,        // countdown timer for current phase state
    shrinkProgress: 0,

    // For interpolation during shrink
    startX: 0,
    startY: 0,
    startRadius: 0,

    dps: 1,          // damage per second outside zone
    zoneWarningPlayed: false,

    reset() {
        this.isActive = false;
        this.currentPhase = 0;
        this.phaseState = 'waiting';
        this.currentX = GAME.MAP_WIDTH / 2;
        this.currentY = GAME.MAP_HEIGHT / 2;
        this.currentRadius = GAME.SAFE_ZONE_INITIAL_RADIUS;
        this.targetX = this.currentX;
        this.targetY = this.currentY;
        this.targetRadius = this.currentRadius;
        this.dps = 1;
        this.zoneWarningPlayed = false;
    },

    /**
     * Start the zone system.
     */
    start() {
        this.reset();
        this.isActive = true;
        this._beginPhase(0);
    },

    /**
     * Begin a specific phase.
     */
    _beginPhase(phaseIndex) {
        if (phaseIndex >= GAME.SAFE_ZONE_PHASES.length) {
            this.phaseState = 'done';
            return;
        }

        this.currentPhase = phaseIndex;
        const phase = GAME.SAFE_ZONE_PHASES[phaseIndex];
        this.phaseState = 'waiting';
        this.timer = phase.delay;
        this.dps = phase.dps;

        // Calculate next zone target
        const newRadius = GAME.SAFE_ZONE_INITIAL_RADIUS * phase.radiusMult;

        // New center can shift, but stays within map bounds
        const maxShift = (this.currentRadius - newRadius) * 0.5;
        const newX = Utils.clamp(
            this.currentX + Utils.randFloat(-maxShift, maxShift),
            newRadius + 50,
            GAME.MAP_WIDTH - newRadius - 50
        );
        const newY = Utils.clamp(
            this.currentY + Utils.randFloat(-maxShift, maxShift),
            newRadius + 50,
            GAME.MAP_HEIGHT - newRadius - 50
        );

        this.targetX = newX;
        this.targetY = newY;
        this.targetRadius = newRadius;

        this.zoneWarningPlayed = false;
    },

    /**
     * Update the zone each frame.
     */
    update(dt) {
        if (!this.isActive || this.phaseState === 'done') return;

        this.timer -= dt;

        if (this.phaseState === 'waiting') {
            // Warning when 5 seconds remain
            if (this.timer <= 5 && !this.zoneWarningPlayed) {
                AudioSystem.playZoneWarning();
                this.zoneWarningPlayed = true;
            }

            if (this.timer <= 0) {
                // Begin shrinking
                this.phaseState = 'shrinking';
                this.timer = GAME.SAFE_ZONE_PHASES[this.currentPhase].shrinkTime;
                this.shrinkProgress = 0;
                this.startX = this.currentX;
                this.startY = this.currentY;
                this.startRadius = this.currentRadius;
            }
        } else if (this.phaseState === 'shrinking') {
            const phase = GAME.SAFE_ZONE_PHASES[this.currentPhase];
            this.shrinkProgress = 1 - (this.timer / phase.shrinkTime);
            this.shrinkProgress = Utils.clamp(this.shrinkProgress, 0, 1);

            // Smoothly interpolate zone
            this.currentX = Utils.lerp(this.startX, this.targetX, this.shrinkProgress);
            this.currentY = Utils.lerp(this.startY, this.targetY, this.shrinkProgress);
            this.currentRadius = Utils.lerp(this.startRadius, this.targetRadius, this.shrinkProgress);

            if (this.timer <= 0) {
                // Phase complete — move to next
                this.currentX = this.targetX;
                this.currentY = this.targetY;
                this.currentRadius = this.targetRadius;
                this._beginPhase(this.currentPhase + 1);
            }
        }

        // ── Apply zone damage ──────────────────────────────────
        this._applyZoneDamage(dt);
    },

    /**
     * Damage entities outside the zone.
     */
    _applyZoneDamage(dt) {
        // Player
        if (Player.isAlive) {
            if (!this.isInsideZone(Player.x, Player.y)) {
                HealthSystem.takeDamage(Player.healthComp, this.dps * dt);
                if (!Player.healthComp.alive) {
                    Player.isAlive = false;
                }
            }
        }

        // Enemies
        for (const enemy of EnemySystem.enemies) {
            if (!enemy.healthComp.alive) continue;
            if (!this.isInsideZone(enemy.x, enemy.y)) {
                HealthSystem.takeDamage(enemy.healthComp, this.dps * dt);
            }
        }
    },

    /**
     * Check if a point is inside the current safe zone.
     */
    isInsideZone(x, y) {
        const d = Utils.distance(x, y, this.currentX, this.currentY);
        return d <= this.currentRadius;
    },

    /**
     * Get time remaining as formatted string.
     */
    getTimerDisplay() {
        if (this.phaseState === 'done') return 'FINAL';
        return Utils.formatTime(Math.max(0, this.timer));
    },

    /**
     * Get status text.
     */
    getStatusText() {
        if (this.phaseState === 'waiting') return `Zone ${this.currentPhase + 1} closing in`;
        if (this.phaseState === 'shrinking') return `Zone ${this.currentPhase + 1} CLOSING`;
        return 'Final Zone';
    },

    /**
     * Render the zone.
     */
    render(ctx) {
        if (!this.isActive) return;

        // ── Draw danger zone (outside safe zone) ──────────────
        // We draw a full-map rect then cut out the safe zone circle
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, GAME.MAP_WIDTH, GAME.MAP_HEIGHT);
        ctx.arc(this.currentX, this.currentY, this.currentRadius, 0, Math.PI * 2, true);
        ctx.fillStyle = GAME.COLORS.DANGER_ZONE;
        ctx.fill();
        ctx.restore();

        // Blue border pulsing effect
        const pulse = 0.6 + Math.sin(Date.now() * 0.003) * 0.4;

        // ── Safe zone border ──────────────────────────────────
        ctx.beginPath();
        ctx.arc(this.currentX, this.currentY, this.currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = GAME.COLORS.SAFE_ZONE_BORDER;
        ctx.lineWidth = 3 * pulse;
        ctx.stroke();

        // ── Next zone indicator (white circle) ────────────────
        if (this.phaseState === 'waiting' && this.currentPhase < GAME.SAFE_ZONE_PHASES.length) {
            ctx.beginPath();
            ctx.arc(this.targetX, this.targetY, this.targetRadius, 0, Math.PI * 2);
            ctx.strokeStyle = GAME.COLORS.NEXT_ZONE_BORDER;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    },
};
