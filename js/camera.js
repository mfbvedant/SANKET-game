/* ═══════════════════════════════════════════════════════════
  SURVIVOR ZONE — Camera System
  Smooth camera following, mouse look-ahead and screen shake.
  ═══════════════════════════════════════════════════════════ */

const CameraSystem = {

    // ─────────────────────────────────────────────
    // CAMERA POSITION
    // ─────────────────────────────────────────────

    x: 0,
    y: 0,

    targetX: 0,
    targetY: 0,

    // Base smoothing
    smoothing: 8,

    // Additional smoothing while following
    positionSmoothness: 10,

    screenW: 0,
    screenH: 0,

    // ─────────────────────────────────────────────
    // LOOK AHEAD
    // ─────────────────────────────────────────────

    lookAheadEnabled: true,

    lookAheadAmount: 80,

    lookAheadX: 0,
    lookAheadY: 0,

    lookAheadSmoothness: 5,

    // ─────────────────────────────────────────────
    // SCREEN SHAKE
    // ─────────────────────────────────────────────

    shakeIntensity: 0,
    shakeDuration: 0,
    shakeTimer: 0,

    shakeOffsetX: 0,
    shakeOffsetY: 0,

    // Current shake strength
    currentShakeIntensity: 0,

    // ─────────────────────────────────────────────
    // INITIALIZE
    // ─────────────────────────────────────────────

    init(canvas) {

        this.screenW = canvas.width;
        this.screenH = canvas.height;

        this.x = 0;
        this.y = 0;

        this.targetX = 0;
        this.targetY = 0;

        this.lookAheadX = 0;
        this.lookAheadY = 0;

        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;

        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;

        this.currentShakeIntensity = 0;
    },

    // ─────────────────────────────────────────────
    // RESIZE
    // ─────────────────────────────────────────────

    resize(canvas) {

        this.screenW = canvas.width;
        this.screenH = canvas.height;

        // Keep camera inside map after resizing
        this.x = Utils.clamp(
            this.x,
            0,
            Math.max(
                0,
                GAME.MAP_WIDTH - this.screenW
            )
        );

        this.y = Utils.clamp(
            this.y,
            0,
            Math.max(
                0,
                GAME.MAP_HEIGHT - this.screenH
            )
        );
    },

    // ─────────────────────────────────────────────
    // FOLLOW TARGET
    // ─────────────────────────────────────────────

    follow(targetX, targetY) {

        // ─────────────────────────────────────────
        // MOUSE LOOK-AHEAD
        // ─────────────────────────────────────────

        let lookX = 0;
        let lookY = 0;

        if (
            this.lookAheadEnabled &&
            typeof Player !== 'undefined'
        ) {

            const mouseX =
                Player.mouseX;

            const mouseY =
                Player.mouseY;

            const centerX =
                this.screenW / 2;

            const centerY =
                this.screenH / 2;

            // Distance from screen center
            let dx =
                mouseX - centerX;

            let dy =
                mouseY - centerY;

            // Normalize
            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            if (distance > 1) {

                // Maximum useful mouse distance
                const maxDistance =
                    Math.min(
                        distance,
                        500
                    );

                const strength =
                    maxDistance / 500;

                lookX =
                    (dx / distance) *
                    this.lookAheadAmount *
                    strength;

                lookY =
                    (dy / distance) *
                    this.lookAheadAmount *
                    strength;
            }
        }

        // Smooth look-ahead
        this.lookAheadX =
            Utils.lerp(
                this.lookAheadX,
                lookX,
                this.lookAheadSmoothness *
                0.016
            );

        this.lookAheadY =
            Utils.lerp(
                this.lookAheadY,
                lookY,
                this.lookAheadSmoothness *
                0.016
            );

        // ─────────────────────────────────────────
        // FINAL CAMERA TARGET
        // ─────────────────────────────────────────

        this.targetX =
            targetX -
            this.screenW / 2 +
            this.lookAheadX;

        this.targetY =
            targetY -
            this.screenH / 2 +
            this.lookAheadY;
    },

    // ─────────────────────────────────────────────
    // SCREEN SHAKE
    // ─────────────────────────────────────────────

    shake(intensity, duration) {

        // Ignore useless tiny shakes
        if (
            intensity <= 0 ||
            duration <= 0
        ) {
            return;
        }

        // If there is currently no shake,
        // always accept the new shake.
        if (
            this.shakeTimer <= 0
        ) {

            this.shakeIntensity =
                intensity;

            this.shakeDuration =
                duration;

            this.shakeTimer =
                duration;

            return;
        }

        // Calculate remaining strength
        const remainingProgress =
            this.shakeDuration > 0
                ? this.shakeTimer /
                this.shakeDuration
                : 0;

        const remainingIntensity =
            this.shakeIntensity *
            remainingProgress;

        // Stronger shake replaces weaker shake
        if (
            intensity > remainingIntensity
        ) {

            this.shakeIntensity =
                intensity;

            this.shakeDuration =
                duration;

            this.shakeTimer =
                duration;

        } else {

            // Otherwise slightly extend
            // the current shake.
            this.shakeTimer =
                Math.min(
                    this.shakeTimer +
                    duration * 0.25,
                    this.shakeDuration
                );
        }
    },

    // ─────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────

    update(dt) {

        // ─────────────────────────────────────────
        // CAMERA FOLLOW
        // ─────────────────────────────────────────

        const smoothAmount =
            Math.min(
                1,
                this.positionSmoothness * dt
            );

        this.x =
            Utils.lerp(
                this.x,
                this.targetX,
                smoothAmount
            );

        this.y =
            Utils.lerp(
                this.y,
                this.targetY,
                smoothAmount
            );

        // ─────────────────────────────────────────
        // SCREEN SHAKE
        // ─────────────────────────────────────────

        if (
            this.shakeTimer > 0
        ) {

            this.shakeTimer -= dt;

            // Prevent negative values
            if (
                this.shakeTimer < 0
            ) {
                this.shakeTimer = 0;
            }

            // 1 → 0
            const progress =
                this.shakeDuration > 0
                    ? this.shakeTimer /
                    this.shakeDuration
                    : 0;

            // Smooth fade-out
            const fade =
                progress * progress;

            this.currentShakeIntensity =
                this.shakeIntensity *
                fade;

            // Random shake
            this.shakeOffsetX =
                (
                    Math.random() * 2 - 1
                ) *
                this.currentShakeIntensity;

            this.shakeOffsetY =
                (
                    Math.random() * 2 - 1
                ) *
                this.currentShakeIntensity;

        } else {

            this.currentShakeIntensity = 0;

            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;

            this.shakeIntensity = 0;
            this.shakeDuration = 0;
        }

        // ─────────────────────────────────────────
        // MAP BOUNDARY
        // ─────────────────────────────────────────

        const maxX =
            Math.max(
                0,
                GAME.MAP_WIDTH -
                this.screenW
            );

        const maxY =
            Math.max(
                0,
                GAME.MAP_HEIGHT -
                this.screenH
            );

        this.x =
            Utils.clamp(
                this.x,
                0,
                maxX
            );

        this.y =
            Utils.clamp(
                this.y,
                0,
                maxY
            );
    },

    // ─────────────────────────────────────────────
    // APPLY CAMERA TRANSFORM
    // ─────────────────────────────────────────────

    applyTransform(ctx) {

        ctx.save();

        ctx.translate(

            -Math.round(
                this.x
            ) +
            this.shakeOffsetX,

            -Math.round(
                this.y
            ) +
            this.shakeOffsetY
        );
    },

    // ─────────────────────────────────────────────
    // RESTORE TRANSFORM
    // ─────────────────────────────────────────────

    restore(ctx) {

        ctx.restore();
    },

    // ─────────────────────────────────────────────
    // SCREEN → WORLD
    // ─────────────────────────────────────────────

    screenToWorld(sx, sy) {

        return {

            x:
                sx +
                this.x,

            y:
                sy +
                this.y
        };
    },

    // ─────────────────────────────────────────────
    // WORLD → SCREEN
    // ─────────────────────────────────────────────

    worldToScreen(wx, wy) {

        return {

            x:
                wx -
                this.x,

            y:
                wy -
                this.y
        };
    },

    // ─────────────────────────────────────────────
    // VISIBILITY CHECK
    // ─────────────────────────────────────────────

    isVisible(
        wx,
        wy,
        ww,
        wh
    ) {

        return (

            wx + ww >
            this.x &&

            wx <
            this.x +
            this.screenW &&

            wy + wh >
            this.y &&

            wy <
            this.y +
            this.screenH
        );
    },

    // ─────────────────────────────────────────────
    // RESET CAMERA SHAKE
    // ─────────────────────────────────────────────

    resetShake() {

        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;

        this.currentShakeIntensity = 0;

        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
    }
};