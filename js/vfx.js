/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Visual Effects System
   Manages particles, muzzle flashes, damage indicators,
   and the kill feed.
   ═══════════════════════════════════════════════════════════ */

const VFXSystem = {
    particles: [],
    damageNumbers: [],
    killFeed: [],
    maxKillFeedEntries: 5,
    killFeedDuration: 4000, // ms

    reset() {
        this.particles = [];
        this.damageNumbers = [];
        this.killFeed = [];
    },

    // ── Particles ──────────────────────────────────────────────

    /**
     * Spawn a burst of particles at position.
     */
    spawnBurst(x, y, count, color, speed, life) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Utils.randFloat(speed * 0.5, speed);
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: Utils.randFloat(life * 0.6, life),
                maxLife: life,
                color,
                radius: Utils.randFloat(1.5, 3.5),
            });
        }
    },

    /**
     * Spawn blood/hit effect.
     */
    spawnHitEffect(x, y) {
        this.spawnBurst(x, y, 6, '#ff5252', 120, 0.3);
    },

    /**
     * Spawn bullet impact on wall.
     */
    spawnWallHit(x, y) {
        this.spawnBurst(x, y, 4, '#aaa', 80, 0.2);
    },

    /**
     * Spawn muzzle flash.
     */
    spawnMuzzleFlash(x, y, angle) {
        this.particles.push({
            x: x + Math.cos(angle) * 22,
            y: y + Math.sin(angle) * 22,
            vx: Math.cos(angle) * 40,
            vy: Math.sin(angle) * 40,
            life: 0.06,
            maxLife: 0.06,
            color: '#ffe082',
            radius: 5,
        });
    },

    /**
     * Spawn elimination explosion.
     */
    spawnElimination(x, y) {
        this.spawnBurst(x, y, 15, '#ff5252', 150, 0.5);
        this.spawnBurst(x, y, 8, '#ffab00', 100, 0.4);
    },

    /**
     * Spawn loot pickup sparkle.
     */
    spawnPickupEffect(x, y, color) {
        this.spawnBurst(x, y, 6, color || '#00e5ff', 60, 0.35);
    },

    // ── Damage Numbers ─────────────────────────────────────────

    /**
     * Show floating damage number.
     */
    addDamageNumber(x, y, amount, isPlayer) {
        this.damageNumbers.push({
            x: x + Utils.randFloat(-10, 10),
            y: y - 20,
            amount: Math.round(amount),
            life: 1.0,
            maxLife: 1.0,
            color: isPlayer ? '#ff1744' : '#ffe082',
            vy: -50,
        });
    },

    // ── Kill Feed ──────────────────────────────────────────────

    /**
     * Add an entry to the kill feed.
     */
    addKillFeedEntry(killerName, victimName, weaponName) {
        this.killFeed.unshift({
            killer: killerName,
            victim: victimName,
            weapon: weaponName || '',
            time: Date.now(),
        });
        // Trim
        if (this.killFeed.length > this.maxKillFeedEntries) {
            this.killFeed.pop();
        }
    },

    // ── Update ─────────────────────────────────────────────────

    update(dt) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.vx *= 0.95;
            p.vy *= 0.95;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update damage numbers
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const d = this.damageNumbers[i];
            d.y += d.vy * dt;
            d.life -= dt;
            if (d.life <= 0) {
                this.damageNumbers.splice(i, 1);
            }
        }

        // Clean old kill feed entries
        const now = Date.now();
        this.killFeed = this.killFeed.filter(e => now - e.time < this.killFeedDuration);
    },

    // ── Render (World Space) ───────────────────────────────────

    renderWorld(ctx) {
        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Damage numbers
        for (const d of this.damageNumbers) {
            const alpha = d.life / d.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = d.color;
            ctx.font = `bold ${12 + (1 - alpha) * 6}px Orbitron`;
            ctx.textAlign = 'center';
            ctx.fillText(`-${d.amount}`, d.x, d.y);
        }
        ctx.globalAlpha = 1;
    },

    // ── Render (Screen Space) ──────────────────────────────────

    renderScreen(ctx, canvas) {
        if (this.killFeed.length === 0) return;

        const x = canvas.width - 300;
        let y = 80;
        const now = Date.now();

        for (const entry of this.killFeed) {
            const age = now - entry.time;
            const alpha = Math.max(0, 1 - age / this.killFeedDuration);
            if (alpha <= 0) continue;

            ctx.globalAlpha = alpha * 0.85;

            // Background
            ctx.fillStyle = 'rgba(10, 14, 23, 0.7)';
            const bgW = 280;
            const bgH = 24;
            ctx.fillRect(x, y, bgW, bgH);

            // Text
            ctx.font = '10px Inter';
            ctx.textAlign = 'left';

            // Killer name
            const isPlayerKiller = entry.killer === 'You';
            ctx.fillStyle = isPlayerKiller ? '#00e5ff' : '#ff5252';
            ctx.fillText(entry.killer, x + 8, y + 16);

            // "eliminated"
            const killerWidth = ctx.measureText(entry.killer).width;
            ctx.fillStyle = '#666';
            ctx.fillText(' ☠ ', x + 8 + killerWidth, y + 16);

            // Victim name
            const midWidth = ctx.measureText(' ☠ ').width;
            const isPlayerVictim = entry.victim === 'You';
            ctx.fillStyle = isPlayerVictim ? '#00e5ff' : '#ccc';
            ctx.fillText(entry.victim, x + 8 + killerWidth + midWidth, y + 16);

            y += 28;
        }

        ctx.globalAlpha = 1;
    },
};
