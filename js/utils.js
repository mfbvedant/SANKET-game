/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Utility Functions
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
     * Calculate angle between two points (radians).
     */
    angleBetween(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    /**
     * Clamp value between min and max.
     */
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    /**
     * Linear interpolation.
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Random integer between min (inclusive) and max (inclusive).
     */
    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Random float between min and max.
     */
    randFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Check AABB collision between two rectangles.
     */
    rectCollision(a, b) {
        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    },

    /**
     * Check if a circle collides with a rectangle.
     */
    circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
        const closestX = Utils.clamp(cx, rx, rx + rw);
        const closestY = Utils.clamp(cy, ry, ry + rh);
        const dx = cx - closestX;
        const dy = cy - closestY;
        return (dx * dx + dy * dy) < (cr * cr);
    },

    /**
     * Check circle-circle collision.
     */
    circleCollision(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = dx * dx + dy * dy;
        const radii = r1 + r2;
        return dist < radii * radii;
    },

    /**
     * Normalize angle to [-PI, PI].
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    },

    /**
     * Pick a random element from an array.
     */
    randomPick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    /**
     * Format seconds as M:SS.
     */
    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    },

    /**
     * Generate a unique ID.
     */
    uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    /**
     * Line segment vs AABB intersection test. Returns true if the segment from
     * (x1,y1)→(x2,y2) intersects the rectangle (rx,ry,rw,rh).
     */
    lineRectIntersection(x1, y1, x2, y2, rx, ry, rw, rh) {
        // Check if either endpoint is inside the rect
        if (x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) return true;
        if (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh) return true;

        // Check line vs each edge
        const edges = [
            [rx, ry, rx + rw, ry],           // top
            [rx, ry + rh, rx + rw, ry + rh], // bottom
            [rx, ry, rx, ry + rh],           // left
            [rx + rw, ry, rx + rw, ry + rh]  // right
        ];
        for (const [ex1, ey1, ex2, ey2] of edges) {
            if (Utils.lineLineIntersection(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) {
                return true;
            }
        }
        return false;
    },

    /**
     * Line segment vs line segment intersection.
     */
    lineLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(den) < 0.0001) return false;
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
};
