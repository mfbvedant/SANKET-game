/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Projectile System
   Manages all active bullets/projectiles in the world.
   ═══════════════════════════════════════════════════════════ */

const ProjectileSystem = {
    bullets: [],

    reset() {
        this.bullets = [];
    },

    /**
     * Add bullets (array from WeaponSystem.tryFire).
     */
    addBullets(bulletArr, ownerId) {
        if (!bulletArr) return;
        for (const b of bulletArr) {
            b.ownerId = ownerId;
            this.bullets.push(b);
        }
    },

    /**
     * Update all bullets — move, check wall collision, check range.
     */
    update(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            const moveX = b.vx * dt;
            const moveY = b.vy * dt;
            b.x += moveX;
            b.y += moveY;
            b.distTraveled += Math.sqrt(moveX * moveX + moveY * moveY);

            // Remove if out of range
            if (b.distTraveled > b.range) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Remove if out of map
            if (b.x < 0 || b.x > GAME.MAP_WIDTH || b.y < 0 || b.y > GAME.MAP_HEIGHT) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Remove if hits a wall
            if (MapSystem.pointInWall(b.x, b.y)) {
                this.bullets.splice(i, 1);
                continue;
            }
        }
    },

    /**
     * Check bullet hits against a circular entity.
     * Returns { damage, lastHitBy } and removes hitting bullets.
     */
    checkHits(entityX, entityY, entityRadius, entityId) {
        let totalDamage = 0;
        let lastHitBy = null;
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (b.ownerId === entityId) continue; // no self-damage
            const dx = b.x - entityX;
            const dy = b.y - entityY;
            if (dx * dx + dy * dy < (entityRadius + GAME.BULLET_RADIUS) * (entityRadius + GAME.BULLET_RADIUS)) {
                totalDamage += b.damage;
                lastHitBy = b.ownerId;
                this.bullets.splice(i, 1);
            }
        }
        return { damage: totalDamage, lastHitBy };
    },

    /**
     * Render all bullets.
     */
    render(ctx) {
        for (const b of this.bullets) {
            // Trail
            const trailLen = 10;
            const angle = Math.atan2(b.vy, b.vx);
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x - Math.cos(angle) * trailLen, b.y - Math.sin(angle) * trailLen);
            ctx.strokeStyle = GAME.COLORS.BULLET_TRAIL;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Bullet
            ctx.beginPath();
            ctx.arc(b.x, b.y, GAME.BULLET_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = GAME.COLORS.BULLET;
            ctx.fill();
        }
    },
};
