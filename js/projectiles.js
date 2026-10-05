/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — PROJECTILE SYSTEM
   Handles bullets, movement, collision, hit detection and VFX.
   ═══════════════════════════════════════════════════════════ */

const ProjectileSystem = {

    bullets: [],

    /* Maximum active bullets for performance */
    MAX_BULLETS: 500,


    /* =========================================================
       RESET
       ========================================================= */

    reset() {

        this.bullets = [];
    },


    /* =========================================================
       ADD BULLETS
       ========================================================= */

    addBullets(
        bulletArr,
        ownerId
    ) {

        if (
            !bulletArr ||
            bulletArr.length === 0
        ) {
            return;
        }


        for (
            const bullet
            of bulletArr
        ) {

            if (
                this.bullets.length >=
                this.MAX_BULLETS
            ) {
                break;
            }


            if (!bullet) {
                continue;
            }


            bullet.ownerId =
                ownerId;


            /*
             * Runtime values used for
             * trail rendering and effects.
             */

            bullet.prevX =
                bullet.x;

            bullet.prevY =
                bullet.y;

            bullet.age = 0;

            bullet.hitWall = false;


            this.bullets.push(
                bullet
            );
        }
    },


    /* =========================================================
       UPDATE
       ========================================================= */

    update(dt) {

        if (
            !dt ||
            dt <= 0
        ) {
            return;
        }


        for (
            let i = this.bullets.length - 1;
            i >= 0;
            i--
        ) {

            const bullet =
                this.bullets[i];


            if (!bullet) {
                this.bullets.splice(i, 1);
                continue;
            }


            bullet.age =
                (bullet.age || 0) + dt;


            /* -----------------------------------------------
               Previous position
               ----------------------------------------------- */

            bullet.prevX =
                bullet.x;

            bullet.prevY =
                bullet.y;


            /* -----------------------------------------------
               Movement
               ----------------------------------------------- */

            const moveX =
                bullet.vx * dt;

            const moveY =
                bullet.vy * dt;


            const nextX =
                bullet.x + moveX;

            const nextY =
                bullet.y + moveY;


            const distance =
                Math.sqrt(
                    moveX * moveX +
                    moveY * moveY
                );


            bullet.distTraveled =
                (bullet.distTraveled || 0) +
                distance;


            /* -----------------------------------------------
               Wall collision

               Check the line between the previous and
               next position so fast bullets don't tunnel
               through thin walls.
               ----------------------------------------------- */

            if (
                this._lineHitsWall(
                    bullet.x,
                    bullet.y,
                    nextX,
                    nextY
                )
            ) {

                this._spawnWallImpact(
                    nextX,
                    nextY,
                    bullet.vx,
                    bullet.vy
                );


                this.bullets.splice(i, 1);

                continue;
            }


            /* -----------------------------------------------
               Move
               ----------------------------------------------- */

            bullet.x =
                nextX;

            bullet.y =
                nextY;


            /* -----------------------------------------------
               Range
               ----------------------------------------------- */

            if (
                bullet.distTraveled >=
                bullet.range
            ) {

                this.bullets.splice(i, 1);

                continue;
            }


            /* -----------------------------------------------
               Map boundary
               ----------------------------------------------- */

            if (
                bullet.x < 0 ||
                bullet.x > GAME.MAP_WIDTH ||
                bullet.y < 0 ||
                bullet.y > GAME.MAP_HEIGHT
            ) {

                this.bullets.splice(i, 1);

                continue;
            }


            /* -----------------------------------------------
               Safety lifetime
               ----------------------------------------------- */

            if (
                bullet.age > 5
            ) {

                this.bullets.splice(i, 1);
            }
        }
    },


    /* =========================================================
       WALL LINE TEST
       ========================================================= */

    _lineHitsWall(
        x1,
        y1,
        x2,
        y2
    ) {

        if (
            typeof MapSystem ===
            'undefined'
        ) {
            return false;
        }


        /*
         * Use the map's LOS implementation
         * if available.
         */

        if (
            typeof MapSystem.hasLineOfSight ===
            'function'
        ) {

            return !MapSystem.hasLineOfSight(
                x1,
                y1,
                x2,
                y2
            );
        }


        /*
         * Fallback:
         * sample the bullet path.
         */

        const distance =
            Math.sqrt(
                (x2 - x1) *
                (x2 - x1) +
                (y2 - y1) *
                (y2 - y1)
            );


        const steps =
            Math.max(
                1,
                Math.ceil(
                    distance / 12
                )
            );


        for (
            let i = 1;
            i <= steps;
            i++
        ) {

            const t =
                i / steps;


            const x =
                x1 +
                (x2 - x1) * t;

            const y =
                y1 +
                (y2 - y1) * t;


            if (
                MapSystem.pointInWall(
                    x,
                    y
                )
            ) {
                return true;
            }
        }


        return false;
    },


    /* =========================================================
       WALL IMPACT
       ========================================================= */

    _spawnWallImpact(
        x,
        y,
        vx,
        vy
    ) {

        if (
            typeof VFXSystem ===
            'undefined'
        ) {
            return;
        }


        if (
            typeof VFXSystem.spawnWallHit ===
            'function'
        ) {

            VFXSystem.spawnWallHit(
                x,
                y,
                Math.atan2(vy, vx)
            );
        }
    },


    /* =========================================================
       HIT DETECTION
       ========================================================= */

    checkHits(
        entityX,
        entityY,
        entityRadius,
        entityId
    ) {

        let totalDamage = 0;
        let lastHitBy = null;

        let hitCount = 0;
        let criticalHit = false;


        for (
            let i = this.bullets.length - 1;
            i >= 0;
            i--
        ) {

            const bullet =
                this.bullets[i];


            if (!bullet) {
                continue;
            }


            /*
             * No self damage.
             */

            if (
                bullet.ownerId ===
                entityId
            ) {
                continue;
            }


            const dx =
                bullet.x -
                entityX;

            const dy =
                bullet.y -
                entityY;


            const combinedRadius =
                entityRadius +
                GAME.BULLET_RADIUS;


            if (
                dx * dx +
                dy * dy <=
                combinedRadius *
                combinedRadius
            ) {

                let damage =
                    bullet.damage;


                /*
                 * Critical hit.
                 *
                 * Snipers get a higher chance.
                 */

                if (
                    bullet.criticalChance &&
                    Math.random() <
                    bullet.criticalChance
                ) {

                    damage *= 1.5;

                    criticalHit = true;
                }


                totalDamage +=
                    damage;


                lastHitBy =
                    bullet.ownerId;


                hitCount++;


                /*
                 * Hit VFX.
                 */

                if (
                    typeof VFXSystem !==
                    'undefined' &&
                    VFXSystem.spawnHitEffect
                ) {

                    VFXSystem.spawnHitEffect(
                        entityX,
                        entityY
                    );
                }


                /*
                 * Hit sound.
                 */

                if (
                    typeof AudioSystem !==
                    'undefined'
                ) {

                    if (
                        criticalHit &&
                        AudioSystem.playCriticalHit
                    ) {

                        AudioSystem.playCriticalHit();

                    } else if (
                        AudioSystem.playHit
                    ) {

                        AudioSystem.playHit();
                    }
                }


                /*
                 * Damage number.
                 */

                if (
                    typeof VFXSystem !==
                    'undefined' &&
                    VFXSystem.addDamageNumber
                ) {

                    VFXSystem.addDamageNumber(
                        entityX,
                        entityY,
                        Math.round(damage),
                        criticalHit
                    );
                }


                this.bullets.splice(
                    i,
                    1
                );
            }
        }


        return {

            damage:
                totalDamage,

            lastHitBy,

            hitCount,

            criticalHit
        };
    },


    /* =========================================================
       RENDER
       ========================================================= */

    render(ctx) {

        if (
            this.bullets.length === 0
        ) {
            return;
        }


        for (
            const bullet
            of this.bullets
        ) {

            if (!bullet) {
                continue;
            }


            const angle =
                Math.atan2(
                    bullet.vy,
                    bullet.vx
                );


            /*
             * Dynamic trail length.
             */

            const speed =
                Math.sqrt(
                    bullet.vx *
                    bullet.vx +
                    bullet.vy *
                    bullet.vy
                );


            const trailLength =
                Math.max(
                    8,
                    Math.min(
                        20,
                        speed * 0.018
                    )
                );


            const startX =
                bullet.x -
                Math.cos(angle) *
                trailLength;


            const startY =
                bullet.y -
                Math.sin(angle) *
                trailLength;


            /* -----------------------------------------------
               Trail
               ----------------------------------------------- */

            ctx.beginPath();

            ctx.moveTo(
                startX,
                startY
            );

            ctx.lineTo(
                bullet.x,
                bullet.y
            );


            ctx.strokeStyle =
                GAME.COLORS.BULLET_TRAIL;

            ctx.lineWidth = 2.5;

            ctx.lineCap = 'round';

            ctx.stroke();


            /* -----------------------------------------------
               Bullet glow
               ----------------------------------------------- */

            ctx.beginPath();

            ctx.arc(
                bullet.x,
                bullet.y,
                GAME.BULLET_RADIUS * 1.8,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                'rgba(255,210,80,0.12)';

            ctx.fill();


            /* -----------------------------------------------
               Bullet core
               ----------------------------------------------- */

            ctx.beginPath();

            ctx.arc(
                bullet.x,
                bullet.y,
                GAME.BULLET_RADIUS,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                GAME.COLORS.BULLET;

            ctx.fill();


            ctx.lineCap =
                'butt';
        }
    }
};