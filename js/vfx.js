/* ═══════════════════════════════════════════════════════════
  SURVIVOR ZONE — Visual Effects System

  Particles, hit effects, muzzle flashes, elimination effects,
  pickup effects, damage numbers and kill feed.
  ═══════════════════════════════════════════════════════════ */

const VFXSystem = {

    // ─────────────────────────────────────────────
    // STORAGE
    // ─────────────────────────────────────────────

    particles: [],

    damageNumbers: [],

    killFeed: [],

    maxKillFeedEntries: 5,

    killFeedDuration: 4000,

    // Maximum particles prevents accidental
    // performance problems during large fights.
    maxParticles: 700,

    // ─────────────────────────────────────────────
    // RESET
    // ─────────────────────────────────────────────

    reset() {

        this.particles = [];

        this.damageNumbers = [];

        this.killFeed = [];
    },

    // ═════════════════════════════════════════════
    // PARTICLES
    // ═════════════════════════════════════════════

    /**
     * Spawn a burst of particles at a position.
     */
    spawnBurst(
        x,
        y,
        count,
        color,
        speed,
        life
    ) {

        // Don't exceed particle limit
        const available =
            this.maxParticles -
            this.particles.length;

        count =
            Math.min(
                count,
                Math.max(0, available)
            );

        for (
            let i = 0;
            i < count;
            i++
        ) {

            const angle =
                Math.random() *
                Math.PI *
                2;

            const spd =
                Utils.randFloat(
                    speed * 0.5,
                    speed
                );

            this.particles.push({

                x,
                y,

                vx:
                    Math.cos(angle) *
                    spd,

                vy:
                    Math.sin(angle) *
                    spd,

                life:
                    Utils.randFloat(
                        life * 0.6,
                        life
                    ),

                maxLife:
                    life,

                color,

                radius:
                    Utils.randFloat(
                        1.5,
                        3.5
                    ),

                gravity:
                    Utils.randFloat(
                        0,
                        25
                    ),

                friction:
                    Utils.randFloat(
                        0.90,
                        0.97
                    ),

                type: 'normal'
            });
        }
    },

    // ─────────────────────────────────────────────
    // HIT EFFECT
    // ─────────────────────────────────────────────

    /**
     * Spawn blood/hit effect.
     */
    spawnHitEffect(x, y) {

        // Main red particles
        this.spawnBurst(
            x,
            y,
            7,
            '#ff5252',
            130,
            0.32
        );

        // Small bright particles
        this.spawnBurst(
            x,
            y,
            3,
            '#ff8a80',
            80,
            0.20
        );
    },

    // ─────────────────────────────────────────────
    // WALL IMPACT
    // ─────────────────────────────────────────────

    /**
     * Spawn bullet impact on a wall.
     */
    spawnWallHit(x, y) {

        this.spawnBurst(
            x,
            y,
            5,
            '#aaa',
            90,
            0.22
        );

        // Bright impact spark
        this.particles.push({

            x,
            y,

            vx:
                Utils.randFloat(
                    -30,
                    30
                ),

            vy:
                Utils.randFloat(
                    -30,
                    30
                ),

            life: 0.12,

            maxLife: 0.12,

            color: '#ffffff',

            radius: 2.5,

            gravity: 0,

            friction: 0.9,

            type: 'spark'
        });
    },

    // ─────────────────────────────────────────────
    // MUZZLE FLASH
    // ─────────────────────────────────────────────

    /**
     * Spawn directional muzzle flash.
     */
    spawnMuzzleFlash(
        x,
        y,
        angle
    ) {

        const muzzleDistance = 22;

        const mx =
            x +
            Math.cos(angle) *
            muzzleDistance;

        const my =
            y +
            Math.sin(angle) *
            muzzleDistance;

        // Main flash
        this.particles.push({

            x: mx,
            y: my,

            vx:
                Math.cos(angle) *
                40,

            vy:
                Math.sin(angle) *
                40,

            life: 0.07,

            maxLife: 0.07,

            color: '#ffe082',

            radius: 7,

            gravity: 0,

            friction: 0.8,

            type: 'muzzle',

            angle
        });

        // Small smoke particle
        this.particles.push({

            x: mx,
            y: my,

            vx:
                Math.cos(angle) *
                Utils.randFloat(15, 35),

            vy:
                Math.sin(angle) *
                Utils.randFloat(15, 35),

            life: 0.18,

            maxLife: 0.18,

            color: 'rgba(180,180,180,0.6)',

            radius: 3,

            gravity: -5,

            friction: 0.96,

            type: 'smoke'
        });
    },

    // ─────────────────────────────────────────────
    // ELIMINATION
    // ─────────────────────────────────────────────

    /**
     * Spawn elimination explosion.
     */
    spawnElimination(x, y) {

        // Red explosion
        this.spawnBurst(
            x,
            y,
            18,
            '#ff5252',
            170,
            0.55
        );

        // Orange explosion
        this.spawnBurst(
            x,
            y,
            10,
            '#ffab00',
            120,
            0.45
        );

        // White flash
        this.spawnBurst(
            x,
            y,
            5,
            '#ffffff',
            80,
            0.20
        );

        // Screen shake
        if (
            typeof CameraSystem !== 'undefined'
        ) {

            CameraSystem.shake(
                10,
                0.30
            );
        }
    },

    // ─────────────────────────────────────────────
    // PICKUP EFFECT
    // ─────────────────────────────────────────────

    /**
     * Spawn loot pickup sparkle.
     */
    spawnPickupEffect(
        x,
        y,
        color
    ) {

        const pickupColor =
            color ||
            '#00e5ff';

        // Burst
        this.spawnBurst(
            x,
            y,
            8,
            pickupColor,
            70,
            0.38
        );

        // Ring particle
        this.particles.push({

            x,
            y,

            vx: 0,
            vy: 0,

            life: 0.35,

            maxLife: 0.35,

            color:
                pickupColor,

            radius: 5,

            gravity: 0,

            friction: 1,

            type: 'pickupRing'
        });
    },

    // ═════════════════════════════════════════════
    // DAMAGE NUMBERS
    // ═════════════════════════════════════════════

    /**
     * Show floating damage number.
     */
    addDamageNumber(
        x,
        y,
        amount,
        isPlayer
    ) {

        const damage =
            Math.round(amount);

        this.damageNumbers.push({

            x:
                x +
                Utils.randFloat(
                    -10,
                    10
                ),

            y:
                y - 20,

            amount:
                damage,

            life: 1.0,

            maxLife: 1.0,

            color:
                isPlayer
                    ? '#ff1744'
                    : '#ffe082',

            vy: -50,

            // Larger numbers feel stronger
            scale:
                Math.min(
                    1.5,
                    1 +
                    damage / 100
                )
        });
    },

    // ═════════════════════════════════════════════
    // KILL FEED
    // ═════════════════════════════════════════════

    /**
     * Add an entry to the kill feed.
     */
    addKillFeedEntry(
        killerName,
        victimName,
        weaponName
    ) {

        this.killFeed.unshift({

            killer:
                killerName,

            victim:
                victimName,

            weapon:
                weaponName ||
                '',

            time:
                Date.now(),

            // Used for entry animation
            age: 0
        });

        // Trim old entries
        if (
            this.killFeed.length >
            this.maxKillFeedEntries
        ) {

            this.killFeed.pop();
        }
    },

    // ═════════════════════════════════════════════
    // UPDATE
    // ═════════════════════════════════════════════

    update(dt) {

        // ─────────────────────────────────────────
        // PARTICLES
        // ─────────────────────────────────────────

        for (
            let i =
                this.particles.length - 1;
            i >= 0;
            i--
        ) {

            const p =
                this.particles[i];

            // Position
            p.x +=
                p.vx * dt;

            p.y +=
                p.vy * dt;

            // Gravity
            if (
                p.gravity
            ) {

                p.vy +=
                    p.gravity * dt;
            }

            // Friction
            if (
                p.friction
            ) {

                p.vx *=
                    Math.pow(
                        p.friction,
                        dt * 60
                    );

                p.vy *=
                    Math.pow(
                        p.friction,
                        dt * 60
                    );
            }

            // Life
            p.life -= dt;

            // Remove dead particle
            if (
                p.life <= 0
            ) {

                this.particles.splice(
                    i,
                    1
                );
            }
        }

        // ─────────────────────────────────────────
        // DAMAGE NUMBERS
        // ─────────────────────────────────────────

        for (
            let i =
                this.damageNumbers.length - 1;
            i >= 0;
            i--
        ) {

            const d =
                this.damageNumbers[i];

            // Move upward
            d.y +=
                d.vy * dt;

            // Slow down
            d.vy *=
                Math.pow(
                    0.92,
                    dt * 60
                );

            // Life
            d.life -= dt;

            if (
                d.life <= 0
            ) {

                this.damageNumbers.splice(
                    i,
                    1
                );
            }
        }

        // ─────────────────────────────────────────
        // KILL FEED
        // ─────────────────────────────────────────

        const now =
            Date.now();

        this.killFeed =
            this.killFeed.filter(
                entry =>
                    now -
                    entry.time <
                    this.killFeedDuration
            );
    },

    // ═════════════════════════════════════════════
    // WORLD RENDER
    // ═════════════════════════════════════════════

    renderWorld(ctx) {

        // ─────────────────────────────────────────
        // PARTICLES
        // ─────────────────────────────────────────

        for (
            const p of this.particles
        ) {

            const alpha =
                Math.max(
                    0,
                    Math.min(
                        1,
                        p.life /
                        p.maxLife
                    )
                );

            ctx.globalAlpha =
                alpha;

            // ─────────────────────────────────────
            // MUZZLE FLASH
            // ─────────────────────────────────────

            if (
                p.type === 'muzzle'
            ) {

                ctx.save();

                ctx.translate(
                    p.x,
                    p.y
                );

                ctx.rotate(
                    p.angle
                );

                ctx.beginPath();

                ctx.moveTo(
                    0,
                    0
                );

                ctx.lineTo(
                    p.radius * 3,
                    -p.radius
                );

                ctx.lineTo(
                    p.radius * 2,
                    0
                );

                ctx.lineTo(
                    p.radius * 3,
                    p.radius
                );

                ctx.closePath();

                ctx.fillStyle =
                    p.color;

                ctx.fill();

                ctx.restore();

                continue;
            }

            // ─────────────────────────────────────
            // SMOKE
            // ─────────────────────────────────────

            if (
                p.type === 'smoke'
            ) {

                ctx.beginPath();

                ctx.arc(
                    p.x,
                    p.y,
                    p.radius *
                    (1 +
                        (1 - alpha)),
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    p.color;

                ctx.fill();

                continue;
            }

            // ─────────────────────────────────────
            // PICKUP RING
            // ─────────────────────────────────────

            if (
                p.type === 'pickupRing'
            ) {

                const progress =
                    1 - alpha;

                const ringRadius =
                    5 +
                    progress * 18;

                ctx.beginPath();

                ctx.arc(
                    p.x,
                    p.y,
                    ringRadius,
                    0,
                    Math.PI * 2
                );

                ctx.strokeStyle =
                    p.color;

                ctx.lineWidth =
                    2 *
                    alpha;

                ctx.stroke();

                continue;
            }

            // ─────────────────────────────────────
            // NORMAL PARTICLE
            // ─────────────────────────────────────

            ctx.beginPath();

            ctx.arc(
                p.x,
                p.y,
                Math.max(
                    0.5,
                    p.radius *
                    alpha
                ),
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                p.color;

            ctx.fill();
        }

        ctx.globalAlpha = 1;

        // ─────────────────────────────────────────
        // DAMAGE NUMBERS
        // ─────────────────────────────────────────

        for (
            const d of this.damageNumbers
        ) {

            const alpha =
                Math.max(
                    0,
                    d.life /
                    d.maxLife
                );

            ctx.globalAlpha =
                alpha;

            const fontSize =
                12 +
                (1 - alpha) *
                6;

            ctx.font =
                `bold ${fontSize}px Orbitron, Arial`;

            ctx.textAlign =
                'center';

            ctx.textBaseline =
                'middle';

            // Slight outline makes numbers
            // readable over the map.
            ctx.strokeStyle =
                'rgba(0,0,0,0.7)';

            ctx.lineWidth = 3;

            ctx.strokeText(
                `-${d.amount}`,
                d.x,
                d.y
            );

            ctx.fillStyle =
                d.color;

            ctx.fillText(
                `-${d.amount}`,
                d.x,
                d.y
            );
        }

        ctx.globalAlpha = 1;
    },

    // ═════════════════════════════════════════════
    // SCREEN RENDER
    // ═════════════════════════════════════════════

    renderScreen(
        ctx,
        canvas
    ) {

        if (
            this.killFeed.length === 0
        ) {
            return;
        }

        const x =
            canvas.width - 300;

        let y = 80;

        const now =
            Date.now();

        // ─────────────────────────────────────────
        // KILL FEED
        // ─────────────────────────────────────────

        for (
            const entry of this.killFeed
        ) {

            const age =
                now -
                entry.time;

            const alpha =
                Math.max(
                    0,
                    1 -
                    age /
                    this.killFeedDuration
                );

            if (
                alpha <= 0
            ) {
                continue;
            }

            // Entry slides in from the right
            const slideProgress =
                Math.min(
                    1,
                    age / 180
                );

            const slideOffset =
                (1 -
                    slideProgress) *
                25;

            const drawX =
                x +
                slideOffset;

            ctx.globalAlpha =
                alpha * 0.9;

            // ─────────────────────────────────────
            // BACKGROUND
            // ─────────────────────────────────────

            ctx.fillStyle =
                'rgba(10, 14, 23, 0.78)';

            const bgW = 280;
            const bgH = 26;

            ctx.fillRect(
                drawX,
                y,
                bgW,
                bgH
            );

            // Small left accent
            ctx.fillStyle =
                entry.killer === 'You'
                    ? '#00e5ff'
                    : '#ff5252';

            ctx.fillRect(
                drawX,
                y,
                3,
                bgH
            );

            // ─────────────────────────────────────
            // TEXT
            // ─────────────────────────────────────

            ctx.font =
                '10px Inter, Arial';

            ctx.textAlign =
                'left';

            ctx.textBaseline =
                'middle';

            // Killer
            const isPlayerKiller =
                entry.killer === 'You';

            ctx.fillStyle =
                isPlayerKiller
                    ? '#00e5ff'
                    : '#ff5252';

            ctx.fillText(
                entry.killer,
                drawX + 9,
                y + 13
            );

            const killerWidth =
                ctx.measureText(
                    entry.killer
                ).width;

            // Skull
            ctx.fillStyle =
                '#666';

            ctx.fillText(
                ' ☠ ',
                drawX +
                9 +
                killerWidth,
                y + 13
            );

            const skullWidth =
                ctx.measureText(
                    ' ☠ '
                ).width;

            // Victim
            const isPlayerVictim =
                entry.victim === 'You';

            ctx.fillStyle =
                isPlayerVictim
                    ? '#00e5ff'
                    : '#ccc';

            ctx.fillText(
                entry.victim,
                drawX +
                9 +
                killerWidth +
                skullWidth,
                y + 13
            );

            // Weapon name
            if (
                entry.weapon
            ) {

                ctx.fillStyle =
                    '#777';

                ctx.font =
                    '8px Inter, Arial';

                ctx.textAlign =
                    'right';

                ctx.fillText(
                    entry.weapon,
                    drawX +
                    bgW -
                    8,
                    y + 13
                );
            }

            y += 30;
        }

        ctx.globalAlpha = 1;

        ctx.textBaseline =
            'alphabetic';
    }
};