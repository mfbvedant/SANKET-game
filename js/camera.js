/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Camera System
   Follows the player with smooth interpolation + screen shake.
   ═══════════════════════════════════════════════════════════ */

const CameraSystem = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    smoothing: 8,        // higher = snappier
    screenW: 0,
    screenH: 0,

    // Screen shake
    shakeIntensity: 0,
    shakeDuration: 0,
    shakeTimer: 0,
    shakeOffsetX: 0,
    shakeOffsetY: 0,

    init(canvas) {
        this.screenW = canvas.width;
        this.screenH = canvas.height;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
    },

    resize(canvas) {
        this.screenW = canvas.width;
        this.screenH = canvas.height;
    },

    /**
     * Set the target to follow (player position).
     */
    follow(targetX, targetY) {
        this.targetX = targetX - this.screenW / 2;
        this.targetY = targetY - this.screenH / 2;
    },

    /**
     * Trigger screen shake.
     */
    shake(intensity, duration) {
        // Only override if new shake is stronger
        if (intensity > this.shakeIntensity * (this.shakeTimer / this.shakeDuration || 0)) {
            this.shakeIntensity = intensity;
            this.shakeDuration = duration;
            this.shakeTimer = duration;
        }
    },

    /**
     * Update camera position with smooth lerp + shake.
     */
    update(dt) {
        this.x = Utils.lerp(this.x, this.targetX, this.smoothing * dt);
        this.y = Utils.lerp(this.y, this.targetY, this.smoothing * dt);

        // Update shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const progress = this.shakeTimer / this.shakeDuration;
            const currentIntensity = this.shakeIntensity * progress;
            this.shakeOffsetX = (Math.random() * 2 - 1) * currentIntensity;
            this.shakeOffsetY = (Math.random() * 2 - 1) * currentIntensity;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }

        // Clamp to map bounds
        this.x = Utils.clamp(this.x, 0, GAME.MAP_WIDTH - this.screenW);
        this.y = Utils.clamp(this.y, 0, GAME.MAP_HEIGHT - this.screenH);
    },

    /**
     * Apply camera transform to the canvas context.
     */
    applyTransform(ctx) {
        ctx.save();
        ctx.translate(
            -Math.round(this.x) + this.shakeOffsetX,
            -Math.round(this.y) + this.shakeOffsetY
        );
    },

    /**
     * Restore the canvas transform.
     */
    restore(ctx) {
        ctx.restore();
    },

    /**
     * Convert screen coords to world coords.
     */
    screenToWorld(sx, sy) {
        return {
            x: sx + this.x,
            y: sy + this.y,
        };
    },

    /**
     * Convert world coords to screen coords.
     */
    worldToScreen(wx, wy) {
        return {
            x: wx - this.x,
            y: wy - this.y,
        };
    },

    /**
     * Check if a world-space rectangle is visible on screen.
     */
    isVisible(wx, wy, ww, wh) {
        return (
            wx + ww > this.x &&
            wx < this.x + this.screenW &&
            wy + wh > this.y &&
            wy < this.y + this.screenH
        );
    },
};
