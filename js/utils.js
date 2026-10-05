/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Utility Functions
   Shared math, collision, interpolation and helper functions.
   ═══════════════════════════════════════════════════════════ */

const Utils = {

    /**
     * Calculate distance between two points.
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Squared distance.
     *
     * Faster than distance() when only comparing distances.
     */
    distanceSq(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        return dx * dx + dy * dy;
    },

    /**
     * Calculate angle between two points.
     */
    angleBetween(x1, y1, x2, y2) {
        return Math.atan2(
            y2 - y1,
            x2 - x1
        );
    },

    /**
     * Clamp a value between min and max.
     */
    clamp(value, min, max) {
        return Math.max(
            min,
            Math.min(max, value)
        );
    },

    /**
     * Linear interpolation.
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Smooth interpolation.
     *
     * Useful for camera/UI animation.
     */
    smoothstep(a, b, t) {
        const x = Utils.clamp(
            (t - a) / (b - a || 1),
            0,
            1
        );

        return x * x * (3 - 2 * x);
    },

    /**
     * Random integer between min and max inclusive.
     */
    randInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);

        return Math.floor(
            Math.random() * (max - min + 1)
        ) + min;
    },

    /**
     * Random floating-point value between min and max.
     */
    randFloat(min, max) {
        return (
            Math.random() * (max - min)
        ) + min;
    },

    /**
     * Random boolean.
     */
    randomBool(chance = 0.5) {
        return Math.random() < chance;
    },

    /**
     * Random sign: -1 or +1.
     */
    randomSign() {
        return Math.random() < 0.5 ? -1 : 1;
    },

    /**
     * Random value using a Gaussian-like distribution.
     *
     * Useful for weapon spread and natural variation.
     */
    randomNormal() {
        let u = 0;
        let v = 0;

        while (u === 0) {
            u = Math.random();
        }

        while (v === 0) {
            v = Math.random();
        }

        return Math.sqrt(
            -2 * Math.log(u)
        ) * Math.cos(
            Math.PI * 2 * v
        );
    },

    /**
     * AABB collision between two rectangles.
     */
    rectCollision(a, b) {
        if (!a || !b) return false;

        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    },

    /**
     * Circle vs rectangle collision.
     */
    circleRectCollision(
        cx,
        cy,
        cr,
        rx,
        ry,
        rw,
        rh
    ) {
        const closestX = Utils.clamp(
            cx,
            rx,
            rx + rw
        );

        const closestY = Utils.clamp(
            cy,
            ry,
            ry + rh
        );

        const dx = cx - closestX;
        const dy = cy - closestY;

        return (
            dx * dx +
            dy * dy
        ) < cr * cr;
    },

    /**
     * Circle vs circle collision.
     */
    circleCollision(
        x1,
        y1,
        r1,
        x2,
        y2,
        r2
    ) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        const radii = r1 + r2;

        return (
            dx * dx +
            dy * dy
        ) < radii * radii;
    },

    /**
     * Point inside rectangle.
     */
    pointInRect(x, y, rx, ry, rw, rh) {
        return (
            x >= rx &&
            x <= rx + rw &&
            y >= ry &&
            y <= ry + rh
        );
    },

    /**
     * Point inside circle.
     */
    pointInCircle(x, y, cx, cy, radius) {
        return Utils.distanceSq(
            x,
            y,
            cx,
            cy
        ) <= radius * radius;
    },

    /**
     * Normalize angle to [-PI, PI].
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) {
            angle -= Math.PI * 2;
        }

        while (angle < -Math.PI) {
            angle += Math.PI * 2;
        }

        return angle;
    },

    /**
     * Shortest angular difference.
     */
    angleDifference(a, b) {
        return Utils.normalizeAngle(
            b - a
        );
    },

    /**
     * Move an angle toward another angle.
     */
    moveAngle(current, target, maxStep) {
        const difference =
            Utils.angleDifference(
                current,
                target
            );

        if (Math.abs(difference) <= maxStep) {
            return target;
        }

        return current +
            Math.sign(difference) *
            maxStep;
    },

    /**
     * Pick a random element from an array.
     */
    randomPick(arr) {
        if (!Array.isArray(arr) || arr.length === 0) {
            return undefined;
        }

        return arr[
            Math.floor(
                Math.random() * arr.length
            )
        ];
    },

    /**
     * Remove a random element from an array.
     */
    randomRemove(arr) {
        if (!Array.isArray(arr) || arr.length === 0) {
            return undefined;
        }

        const index = Math.floor(
            Math.random() * arr.length
        );

        return arr.splice(index, 1)[0];
    },

    /**
     * Format seconds as M:SS.
     */
    formatTime(seconds) {
        const safeSeconds = Math.max(
            0,
            Number(seconds) || 0
        );

        const minutes = Math.floor(
            safeSeconds / 60
        );

        const secs = Math.floor(
            safeSeconds % 60
        );

        return `${minutes}:${secs
            .toString()
            .padStart(2, '0')}`;
    },

    /**
     * Format seconds as HH:MM:SS when necessary.
     */
    formatLongTime(seconds) {
        const safeSeconds = Math.max(
            0,
            Math.floor(Number(seconds) || 0)
        );

        const hours = Math.floor(
            safeSeconds / 3600
        );

        const minutes = Math.floor(
            (safeSeconds % 3600) / 60
        );

        const secs =
            safeSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes
                .toString()
                .padStart(2, '0')}:${secs
                    .toString()
                    .padStart(2, '0')}`;
        }

        return `${minutes}:${secs
            .toString()
            .padStart(2, '0')}`;
    },

    /**
     * Generate a unique ID.
     */
    uid() {
        return (
            Date.now().toString(36) +
            Math.random()
                .toString(36)
                .slice(2, 9)
        );
    },

    /**
     * Line segment vs AABB intersection.
     */
    lineRectIntersection(
        x1,
        y1,
        x2,
        y2,
        rx,
        ry,
        rw,
        rh
    ) {
        // Endpoint inside rectangle
        if (
            Utils.pointInRect(
                x1,
                y1,
                rx,
                ry,
                rw,
                rh
            )
        ) {
            return true;
        }

        if (
            Utils.pointInRect(
                x2,
                y2,
                rx,
                ry,
                rw,
                rh
            )
        ) {
            return true;
        }

        // Test against rectangle edges.
        const edges = [
            [
                rx,
                ry,
                rx + rw,
                ry
            ],

            [
                rx,
                ry + rh,
                rx + rw,
                ry + rh
            ],

            [
                rx,
                ry,
                rx,
                ry + rh
            ],

            [
                rx + rw,
                ry,
                rx + rw,
                ry + rh
            ],
        ];

        for (const edge of edges) {
            if (
                Utils.lineLineIntersection(
                    x1,
                    y1,
                    x2,
                    y2,
                    edge[0],
                    edge[1],
                    edge[2],
                    edge[3]
                )
            ) {
                return true;
            }
        }

        return false;
    },

    /**
     * Line segment vs line segment intersection.
     */
    lineLineIntersection(
        x1,
        y1,
        x2,
        y2,
        x3,
        y3,
        x4,
        y4
    ) {
        const denominator =
            (x1 - x2) * (y3 - y4) -
            (y1 - y2) * (x3 - x4);

        /*
         * Parallel or nearly parallel lines.
         */
        if (Math.abs(denominator) < 0.000001) {
            return false;
        }

        const t =
            (
                (x1 - x3) * (y3 - y4) -
                (y1 - y3) * (x3 - x4)
            ) / denominator;

        const u =
            -(
                (x1 - x2) * (y1 - y3) -
                (y1 - y2) * (x1 - x3)
            ) / denominator;

        return (
            t >= 0 &&
            t <= 1 &&
            u >= 0 &&
            u <= 1
        );
    },

    /**
     * Get the closest point on a line segment.
     */
    closestPointOnSegment(
        px,
        py,
        x1,
        y1,
        x2,
        y2
    ) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        const lengthSq =
            dx * dx +
            dy * dy;

        if (lengthSq <= 0.000001) {
            return {
                x: x1,
                y: y1,
                t: 0,
            };
        }

        const t = Utils.clamp(
            (
                (px - x1) * dx +
                (py - y1) * dy
            ) / lengthSq,
            0,
            1
        );

        return {
            x: x1 + dx * t,
            y: y1 + dy * t,
            t,
        };
    },

    /**
     * Get a point at a specific angle and distance.
     */
    pointAtAngle(
        x,
        y,
        angle,
        distance
    ) {
        return {
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
        };
    },

    /**
     * Wrap a number inside a range.
     */
    wrap(value, min, max) {
        const range = max - min;

        if (range <= 0) {
            return min;
        }

        return (
            ((value - min) % range + range) %
            range
        ) + min;
    },

    /**
     * Convert degrees to radians.
     */
    degToRad(degrees) {
        return degrees * Math.PI / 180;
    },

    /**
     * Convert radians to degrees.
     */
    radToDeg(radians) {
        return radians * 180 / Math.PI;
    },

    /**
     * Exponential smoothing.
     *
     * Makes camera/UI transitions frame-rate independent.
     */
    smoothDamp(current, target, speed, dt) {
        const factor =
            1 - Math.exp(
                -Math.max(0, speed) * dt
            );

        return Utils.lerp(
            current,
            target,
            factor
        );
    },

    /**
     * Check whether a value is a valid finite number.
     */
    isNumber(value) {
        return (
            typeof value === 'number' &&
            Number.isFinite(value)
        );
    },

    /**
     * Safely convert a value to a number.
     */
    toNumber(value, fallback = 0) {
        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    },

    /**
     * Round to a fixed number of decimal places.
     */
    round(value, decimals = 2) {
        const factor =
            Math.pow(10, decimals);

        return Math.round(
            value * factor
        ) / factor;
    },
};