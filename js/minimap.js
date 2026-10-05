/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — MINIMAP SYSTEM
   Tactical top-down minimap.
   ═══════════════════════════════════════════════════════════ */

const MinimapSystem = {

    size: 180,
    padding: 16,
    scale: 0,

    // Rendering options
    showLoot: true,
    showEnemies: true,
    showBuildings: true,
    showRoads: true,


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    init() {

        this.scale =
            this.size / GAME.MAP_WIDTH;
    },


    /* =========================================================
       MAIN RENDER
       ========================================================= */

    render(ctx, canvas) {

        if (!this.scale) {
            this.init();
        }


        const size =
            Math.min(
                this.size,
                canvas.width * 0.28,
                canvas.height * 0.30
            );


        const x =
            canvas.width -
            size -
            this.padding;


        const y =
            this.padding;


        const scale =
            size / GAME.MAP_WIDTH;


        ctx.save();


        /* -----------------------------------------------------
           OUTER PANEL
           ----------------------------------------------------- */

        ctx.fillStyle =
            'rgba(5,8,14,0.94)';

        ctx.strokeStyle =
            'rgba(0,229,255,0.45)';

        ctx.lineWidth = 1.5;


        this._roundRect(
            ctx,
            x,
            y,
            size,
            size,
            10
        );


        /* -----------------------------------------------------
           MAP CLIPPING
           ----------------------------------------------------- */

        ctx.save();

        ctx.beginPath();

        this._roundedPath(
            ctx,
            x + 3,
            y + 3,
            size - 6,
            size - 6,
            7
        );

        ctx.clip();


        /* -----------------------------------------------------
           MAP BACKGROUND
           ----------------------------------------------------- */

        ctx.fillStyle =
            '#111821';

        ctx.fillRect(
            x,
            y,
            size,
            size
        );


        /* -----------------------------------------------------
           GRID
           ----------------------------------------------------- */

        this._renderGrid(
            ctx,
            x,
            y,
            size,
            scale
        );


        /* -----------------------------------------------------
           ROADS
           ----------------------------------------------------- */

        if (this.showRoads) {

            ctx.fillStyle =
                'rgba(90,100,108,0.35)';

            for (const road of MapSystem.roads) {

                ctx.fillRect(
                    x + road.x * scale,
                    y + road.y * scale,
                    Math.max(road.w * scale, 1),
                    Math.max(road.h * scale, 1)
                );
            }
        }


        /* -----------------------------------------------------
           BUILDINGS
           ----------------------------------------------------- */

        if (this.showBuildings) {

            for (const building of MapSystem.buildings) {

                ctx.fillStyle =
                    'rgba(115,125,135,0.55)';

                ctx.fillRect(
                    x + building.x * scale,
                    y + building.y * scale,
                    Math.max(
                        building.w * scale,
                        1
                    ),
                    Math.max(
                        building.h * scale,
                        1
                    )
                );


                // Building outline
                ctx.strokeStyle =
                    'rgba(190,200,210,0.12)';

                ctx.lineWidth = 0.5;

                ctx.strokeRect(
                    x + building.x * scale,
                    y + building.y * scale,
                    Math.max(
                        building.w * scale,
                        1
                    ),
                    Math.max(
                        building.h * scale,
                        1
                    )
                );
            }
        }


        /* -----------------------------------------------------
           LOOT
           ----------------------------------------------------- */

        if (
            this.showLoot &&
            typeof LootSystem !== 'undefined'
        ) {

            this._renderLoot(
                ctx,
                x,
                y,
                scale
            );
        }


        /* -----------------------------------------------------
           SAFE ZONE
           ----------------------------------------------------- */

        this._renderSafeZone(
            ctx,
            x,
            y,
            scale
        );


        /* -----------------------------------------------------
           ENEMIES
           ----------------------------------------------------- */

        if (
            this.showEnemies &&
            typeof EnemySystem !== 'undefined'
        ) {

            this._renderEnemies(
                ctx,
                x,
                y,
                scale
            );
        }


        /* -----------------------------------------------------
           PLAYER
           ----------------------------------------------------- */

        if (Player.isAlive) {

            this._renderPlayer(
                ctx,
                x,
                y,
                scale
            );
        }


        /* -----------------------------------------------------
           CAMERA VIEWPORT
           ----------------------------------------------------- */

        this._renderViewport(
            ctx,
            x,
            y,
            scale
        );


        ctx.restore();


        /* -----------------------------------------------------
           HEADER
           ----------------------------------------------------- */

        this._renderHeader(
            ctx,
            x,
            y,
            size
        );


        /* -----------------------------------------------------
           BORDER
           ----------------------------------------------------- */

        ctx.strokeStyle =
            'rgba(0,229,255,0.45)';

        ctx.lineWidth = 1.5;

        this._roundedPath(
            ctx,
            x,
            y,
            size,
            size,
            10
        );

        ctx.stroke();


        ctx.restore();
    },


    /* =========================================================
       GRID
       ========================================================= */

    _renderGrid(ctx, x, y, size, scale) {

        ctx.strokeStyle =
            'rgba(255,255,255,0.035)';

        ctx.lineWidth = 0.5;


        const cell =
            GAME.GRID_CELL * scale;


        if (cell < 4) return;


        for (
            let px = 0;
            px <= size;
            px += cell
        ) {

            ctx.beginPath();

            ctx.moveTo(
                x + px,
                y
            );

            ctx.lineTo(
                x + px,
                y + size
            );

            ctx.stroke();
        }


        for (
            let py = 0;
            py <= size;
            py += cell
        ) {

            ctx.beginPath();

            ctx.moveTo(
                x,
                y + py
            );

            ctx.lineTo(
                x + size,
                y + py
            );

            ctx.stroke();
        }
    },


    /* =========================================================
       SAFE ZONE
       ========================================================= */

    _renderSafeZone(
        ctx,
        x,
        y,
        scale
    ) {

        if (
            typeof SafeZoneSystem === 'undefined' ||
            !SafeZoneSystem.isActive
        ) {
            return;
        }


        const cx =
            x +
            SafeZoneSystem.currentX * scale;

        const cy =
            y +
            SafeZoneSystem.currentY * scale;

        const radius =
            SafeZoneSystem.currentRadius * scale;


        /* Current zone fill */

        ctx.beginPath();

        ctx.arc(
            cx,
            cy,
            radius,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            'rgba(0,190,255,0.035)';

        ctx.fill();


        /* Current zone border */

        ctx.strokeStyle =
            SafeZoneSystem.phaseState === 'shrinking'
                ? 'rgba(255,23,68,0.85)'
                : 'rgba(0,220,255,0.75)';

        ctx.lineWidth = 2;

        ctx.stroke();


        /* Next zone */

        if (
            SafeZoneSystem.phaseState === 'waiting' &&
            SafeZoneSystem.targetRadius > 0
        ) {

            ctx.beginPath();

            ctx.arc(
                x +
                SafeZoneSystem.targetX *
                scale,
                y +
                SafeZoneSystem.targetY *
                scale,
                SafeZoneSystem.targetRadius *
                scale,
                0,
                Math.PI * 2
            );


            ctx.strokeStyle =
                'rgba(255,255,255,0.40)';

            ctx.lineWidth = 1;

            ctx.setLineDash([
                4,
                4
            ]);

            ctx.stroke();

            ctx.setLineDash([]);
        }
    },


    /* =========================================================
       PLAYER
       ========================================================= */

    _renderPlayer(
        ctx,
        x,
        y,
        scale
    ) {

        const px =
            x + Player.x * scale;

        const py =
            y + Player.y * scale;


        /* Direction line */

        const directionLength = 11;


        ctx.beginPath();

        ctx.moveTo(
            px,
            py
        );

        ctx.lineTo(
            px +
            Math.cos(Player.aimAngle) *
            directionLength,

            py +
            Math.sin(Player.aimAngle) *
            directionLength
        );


        ctx.strokeStyle =
            '#ffffff';

        ctx.lineWidth = 2;

        ctx.stroke();


        /* Player glow */

        ctx.beginPath();

        ctx.arc(
            px,
            py,
            6,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            'rgba(0,229,255,0.20)';

        ctx.fill();


        /* Player marker */

        ctx.beginPath();

        ctx.arc(
            px,
            py,
            3.5,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            GAME.COLORS.PLAYER ||
            '#00e5ff';

        ctx.fill();


        ctx.strokeStyle =
            '#ffffff';

        ctx.lineWidth = 1;

        ctx.stroke();
    },


    /* =========================================================
       ENEMIES
       ========================================================= */

    _renderEnemies(
        ctx,
        x,
        y,
        scale
    ) {

        if (!EnemySystem.enemies) return;


        for (
            const enemy
            of EnemySystem.enemies
        ) {

            if (!enemy.isAlive) continue;


            // Don't reveal enemies globally
            // unless they are close to the player.
            const distance =
                Utils.distance(
                    Player.x,
                    Player.y,
                    enemy.x,
                    enemy.y
                );


            if (
                Player.isAlive &&
                distance > 420
            ) {
                continue;
            }


            const ex =
                x + enemy.x * scale;

            const ey =
                y + enemy.y * scale;


            ctx.beginPath();

            ctx.arc(
                ex,
                ey,
                2.5,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                '#ff1744';

            ctx.fill();
        }
    },


    /* =========================================================
       LOOT
       ========================================================= */

    _renderLoot(
        ctx,
        x,
        y,
        scale
    ) {

        if (!LootSystem.items) return;


        for (
            const item
            of LootSystem.items
        ) {

            if (
                item.picked ||
                item.collected
            ) {
                continue;
            }


            const distance =
                Utils.distance(
                    Player.x,
                    Player.y,
                    item.x,
                    item.y
                );


            // Avoid cluttering the minimap
            if (
                Player.isAlive &&
                distance > 500
            ) {
                continue;
            }


            const ix =
                x + item.x * scale;

            const iy =
                y + item.y * scale;


            let color =
                item.color ||
                '#ffffff';


            if (
                item.rarity === 'legendary'
            ) {
                color = '#ff9800';
            }


            ctx.fillStyle = color;


            ctx.fillRect(
                ix - 1,
                iy - 1,
                2,
                2
            );
        }
    },


    /* =========================================================
       CAMERA VIEWPORT
       ========================================================= */

    _renderViewport(
        ctx,
        x,
        y,
        scale
    ) {

        if (
            typeof CameraSystem === 'undefined'
        ) {
            return;
        }


        const viewportX =
            x +
            CameraSystem.x * scale;

        const viewportY =
            y +
            CameraSystem.y * scale;


        const viewportW =
            CameraSystem.screenW *
            scale;

        const viewportH =
            CameraSystem.screenH *
            scale;


        ctx.strokeStyle =
            'rgba(255,255,255,0.18)';

        ctx.lineWidth = 1;


        ctx.strokeRect(
            viewportX,
            viewportY,
            viewportW,
            viewportH
        );
    },


    /* =========================================================
       HEADER
       ========================================================= */

    _renderHeader(
        ctx,
        x,
        y,
        size
    ) {

        ctx.fillStyle =
            'rgba(5,8,14,0.78)';

        ctx.fillRect(
            x + 5,
            y + 5,
            size - 10,
            17
        );


        ctx.fillStyle =
            '#8fa1ad';

        ctx.font =
            'bold 8px Orbitron';

        ctx.textAlign =
            'left';

        ctx.fillText(
            'TACTICAL MAP',
            x + 10,
            y + 16
        );


        ctx.textAlign =
            'right';

        ctx.fillStyle =
            '#4e626e';

        ctx.fillText(
            'N',
            x + size - 10,
            y + 16
        );
    },


    /* =========================================================
       ROUNDED PATH
       ========================================================= */

    _roundedPath(
        ctx,
        x,
        y,
        w,
        h,
        r
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x + r,
            y
        );

        ctx.lineTo(
            x + w - r,
            y
        );

        ctx.quadraticCurveTo(
            x + w,
            y,
            x + w,
            y + r
        );

        ctx.lineTo(
            x + w,
            y + h - r
        );

        ctx.quadraticCurveTo(
            x + w,
            y + h,
            x + w - r,
            y + h
        );

        ctx.lineTo(
            x + r,
            y + h
        );

        ctx.quadraticCurveTo(
            x,
            y + h,
            x,
            y + h - r
        );

        ctx.lineTo(
            x,
            y + r
        );

        ctx.quadraticCurveTo(
            x,
            y,
            x + r,
            y
        );

        ctx.closePath();
    },


    /* =========================================================
       ROUNDED RECTANGLE
       ========================================================= */

    _roundRect(
        ctx,
        x,
        y,
        w,
        h,
        r
    ) {

        this._roundedPath(
            ctx,
            x,
            y,
            w,
            h,
            r
        );

        ctx.fill();
    }
};