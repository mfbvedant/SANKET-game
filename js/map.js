/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Map System
   World generation, buildings, roads, cover, collision,
   line-of-sight and map rendering.
   ═══════════════════════════════════════════════════════════ */

const MapSystem = {
    buildings: [],
    trees: [],
    rocks: [],
    roads: [],
    vehicles: [],
    walls: [],
    spawnPoints: [],
    lootSpawnPoints: [],

    // Cached wall data for faster LOS checks
    _wallBounds: [],

    // ─────────────────────────────────────────────────────────
    // GENERATE MAP
    // ─────────────────────────────────────────────────────────

    generate() {
        this.buildings = [];
        this.trees = [];
        this.rocks = [];
        this.roads = [];
        this.vehicles = [];
        this.walls = [];
        this.spawnPoints = [];
        this.lootSpawnPoints = [];
        this._wallBounds = [];

        const W = GAME.MAP_WIDTH;
        const H = GAME.MAP_HEIGHT;

        // ─────────────────────────────────────────────────────
        // ROADS
        // ─────────────────────────────────────────────────────

        const roadW = 60;

        this.roads.push({
            x: 0,
            y: H / 2 - roadW / 2,
            w: W,
            h: roadW,
        });

        this.roads.push({
            x: W / 2 - roadW / 2,
            y: 0,
            w: roadW,
            h: H,
        });

        this.roads.push({
            x: 0,
            y: H * 0.25 - roadW / 2,
            w: W,
            h: roadW,
        });

        this.roads.push({
            x: 0,
            y: H * 0.75 - roadW / 2,
            w: W,
            h: roadW,
        });

        this.roads.push({
            x: W * 0.25 - roadW / 2,
            y: 0,
            w: roadW,
            h: H,
        });

        this.roads.push({
            x: W * 0.75 - roadW / 2,
            y: 0,
            w: roadW,
            h: H,
        });

        // ─────────────────────────────────────────────────────
        // BUILDING AREAS
        // ─────────────────────────────────────────────────────

        const buildingAreas = [
            {
                cx: W * 0.5,
                cy: H * 0.5,
                count: 8,
                sizeMin: 60,
                sizeMax: 120,
            },
            {
                cx: W * 0.3,
                cy: H * 0.2,
                count: 5,
                sizeMin: 50,
                sizeMax: 100,
            },
            {
                cx: W * 0.75,
                cy: H * 0.3,
                count: 5,
                sizeMin: 50,
                sizeMax: 90,
            },
            {
                cx: W * 0.5,
                cy: H * 0.8,
                count: 6,
                sizeMin: 55,
                sizeMax: 110,
            },
            {
                cx: W * 0.15,
                cy: H * 0.6,
                count: 4,
                sizeMin: 50,
                sizeMax: 95,
            },
            {
                cx: W * 0.85,
                cy: H * 0.15,
                count: 3,
                sizeMin: 45,
                sizeMax: 80,
            },
            {
                cx: W * 0.2,
                cy: H * 0.85,
                count: 4,
                sizeMin: 40,
                sizeMax: 70,
            },
            {
                cx: W * 0.8,
                cy: H * 0.75,
                count: 4,
                sizeMin: 70,
                sizeMax: 130,
            },
        ];

        for (const area of buildingAreas) {
            for (let i = 0; i < area.count; i++) {
                const bw = Utils.randInt(
                    area.sizeMin,
                    area.sizeMax
                );

                const bh = Utils.randInt(
                    area.sizeMin,
                    area.sizeMax
                );

                const bx =
                    area.cx +
                    Utils.randInt(-200, 200) -
                    bw / 2;

                const by =
                    area.cy +
                    Utils.randInt(-200, 200) -
                    bh / 2;

                const rect = {
                    x: bx,
                    y: by,
                    w: bw,
                    h: bh,
                };

                // Check overlap
                let overlaps = false;

                for (const b of this.buildings) {
                    if (
                        Utils.rectCollision(
                            rect,
                            {
                                x: b.x - 15,
                                y: b.y - 15,
                                w: b.w + 30,
                                h: b.h + 30,
                            }
                        )
                    ) {
                        overlaps = true;
                        break;
                    }
                }

                if (overlaps) continue;

                // Keep away from map border
                if (
                    bx < 50 ||
                    by < 50 ||
                    bx + bw > W - 50 ||
                    by + bh > H - 50
                ) {
                    continue;
                }

                const building = {
                    x: bx,
                    y: by,
                    w: bw,
                    h: bh,

                    doorSide:
                        Utils.randInt(0, 3),

                    hasDoor: true,

                    color:
                        GAME.COLORS.BUILDING_WALL,

                    floorColor:
                        GAME.COLORS.BUILDING_FLOOR,
                };

                this.buildings.push(building);

                this._createBuildingWalls(
                    building
                );

                // Interior loot point
                this.lootSpawnPoints.push({
                    x:
                        bx +
                        bw / 2 +
                        Utils.randInt(-10, 10),

                    y:
                        by +
                        bh / 2 +
                        Utils.randInt(-10, 10),

                    indoor: true,
                });
            }
        }

        // ─────────────────────────────────────────────────────
        // TREES
        // ─────────────────────────────────────────────────────

        for (let i = 0; i < 200; i++) {
            const tx =
                Utils.randInt(80, W - 80);

            const ty =
                Utils.randInt(80, H - 80);

            const tr =
                Utils.randInt(12, 22);

            if (
                this._positionBlocked(
                    tx,
                    ty,
                    tr + 10,
                    true
                )
            ) {
                continue;
            }

            this.trees.push({
                x: tx,
                y: ty,
                radius: tr,
            });

            // Trees now provide physical cover
            this.walls.push({
                x: tx - tr * 0.55,
                y: ty - tr * 0.55,
                w: tr * 1.1,
                h: tr * 1.1,
                isTree: true,
            });
        }

        // ─────────────────────────────────────────────────────
        // ROCKS
        // ─────────────────────────────────────────────────────

        for (let i = 0; i < 80; i++) {
            const rx =
                Utils.randInt(60, W - 60);

            const ry =
                Utils.randInt(60, H - 60);

            const rr =
                Utils.randInt(10, 20);

            if (
                this._positionBlocked(
                    rx,
                    ry,
                    rr + 10,
                    false
                )
            ) {
                continue;
            }

            this.rocks.push({
                x: rx,
                y: ry,
                radius: rr,
            });

            this.walls.push({
                x: rx - rr,
                y: ry - rr,
                w: rr * 2,
                h: rr * 2,

                isRock: true,
            });
        }

        // ─────────────────────────────────────────────────────
        // VEHICLES
        // ─────────────────────────────────────────────────────

        const vehicleTypes = [
            'jeep',
            'truck',
            'buggy',
            'bike',
            'sedan',
            'boat',
        ];

        for (let i = 0; i < 20; i++) {
            const vx =
                Utils.randInt(200, W - 200);

            const vy =
                Utils.randInt(200, H - 200);

            const type =
                Utils.randomPick(
                    vehicleTypes
                );

            const angle =
                Utils.randFloat(
                    0,
                    Math.PI * 2
                );

            if (
                this._positionBlocked(
                    vx,
                    vy,
                    40,
                    false
                )
            ) {
                continue;
            }

            this.vehicles.push({
                x: vx,
                y: vy,
                w: 60,
                h: 36,
                type,
                angle,
            });

            this.walls.push({
                x: vx - 30,
                y: vy - 18,
                w: 60,
                h: 36,

                isVehicle: true,
            });
        }

        // ─────────────────────────────────────────────────────
        // OUTDOOR LOOT
        // ─────────────────────────────────────────────────────

        for (let i = 0; i < 100; i++) {
            const lx =
                Utils.randInt(100, W - 100);

            const ly =
                Utils.randInt(100, H - 100);

            let blocked = false;

            for (const b of this.buildings) {
                if (
                    lx > b.x &&
                    lx < b.x + b.w &&
                    ly > b.y &&
                    ly < b.y + b.h
                ) {
                    blocked = true;
                    break;
                }
            }

            if (!blocked) {
                this.lootSpawnPoints.push({
                    x: lx,
                    y: ly,
                    indoor: false,
                });
            }
        }

        // ─────────────────────────────────────────────────────
        // SPAWN POINTS
        // ─────────────────────────────────────────────────────

        for (let i = 0; i < 40; i++) {
            const angle =
                (i / 40) *
                Math.PI *
                2;

            const dist =
                Utils.randFloat(
                    600,
                    1600
                );

            const sx =
                W / 2 +
                Math.cos(angle) *
                dist;

            const sy =
                H / 2 +
                Math.sin(angle) *
                dist;

            if (
                sx > 100 &&
                sx < W - 100 &&
                sy > 100 &&
                sy < H - 100 &&
                !this.pointInWall(sx, sy)
            ) {
                this.spawnPoints.push({
                    x: sx,
                    y: sy,
                });
            }
        }

        // Build cached bounds for LOS
        this._rebuildWallCache();
    },

    // ─────────────────────────────────────────────────────────
    // POSITION VALIDATION
    // ─────────────────────────────────────────────────────────

    _positionBlocked(
        x,
        y,
        radius,
        checkRoads
    ) {
        if (checkRoads) {
            for (const road of this.roads) {
                if (
                    Utils.circleRectCollision(
                        x,
                        y,
                        radius,
                        road.x,
                        road.y,
                        road.w,
                        road.h
                    )
                ) {
                    return true;
                }
            }
        }

        for (const b of this.buildings) {
            if (
                Utils.circleRectCollision(
                    x,
                    y,
                    radius,
                    b.x,
                    b.y,
                    b.w,
                    b.h
                )
            ) {
                return true;
            }
        }

        return false;
    },

    // ─────────────────────────────────────────────────────────
    // BUILDING WALLS
    // ─────────────────────────────────────────────────────────

    _createBuildingWalls(b) {
        const wallThick = 8;
        const doorSize = 30;

        const sides = [
            {
                x: b.x,
                y: b.y,
                w: b.w,
                h: wallThick,
                side: 0,
            },

            {
                x: b.x + b.w - wallThick,
                y: b.y,
                w: wallThick,
                h: b.h,
                side: 1,
            },

            {
                x: b.x,
                y: b.y + b.h - wallThick,
                w: b.w,
                h: wallThick,
                side: 2,
            },

            {
                x: b.x,
                y: b.y,
                w: wallThick,
                h: b.h,
                side: 3,
            },
        ];

        for (const wall of sides) {
            if (
                b.hasDoor &&
                wall.side === b.doorSide
            ) {
                // Horizontal wall
                if (
                    wall.side === 0 ||
                    wall.side === 2
                ) {
                    const gapStart =
                        b.x +
                        b.w / 2 -
                        doorSize / 2;

                    const gapEnd =
                        gapStart +
                        doorSize;

                    if (
                        gapStart -
                        b.x >
                        wallThick
                    ) {
                        this.walls.push({
                            x: b.x,
                            y: wall.y,
                            w:
                                gapStart -
                                b.x,
                            h: wallThick,
                        });
                    }

                    if (
                        b.x +
                        b.w -
                        gapEnd >
                        wallThick
                    ) {
                        this.walls.push({
                            x: gapEnd,
                            y: wall.y,
                            w:
                                b.x +
                                b.w -
                                gapEnd,
                            h: wallThick,
                        });
                    }
                }

                // Vertical wall
                else {
                    const gapStart =
                        b.y +
                        b.h / 2 -
                        doorSize / 2;

                    const gapEnd =
                        gapStart +
                        doorSize;

                    if (
                        gapStart -
                        b.y >
                        wallThick
                    ) {
                        this.walls.push({
                            x: wall.x,
                            y: b.y,
                            w: wallThick,
                            h:
                                gapStart -
                                b.y,
                        });
                    }

                    if (
                        b.y +
                        b.h -
                        gapEnd >
                        wallThick
                    ) {
                        this.walls.push({
                            x: wall.x,
                            y: gapEnd,
                            w: wallThick,
                            h:
                                b.y +
                                b.h -
                                gapEnd,
                        });
                    }
                }
            } else {
                this.walls.push({
                    x: wall.x,
                    y: wall.y,
                    w: wall.w,
                    h: wall.h,
                });
            }
        }
    },

    // ─────────────────────────────────────────────────────────
    // WALL CACHE
    // ─────────────────────────────────────────────────────────

    _rebuildWallCache() {
        this._wallBounds =
            this.walls.map(wall => ({
                x1: wall.x,
                y1: wall.y,
                x2: wall.x + wall.w,
                y2: wall.y + wall.h,
                wall,
            }));
    },

    // ─────────────────────────────────────────────────────────
    // COLLISION
    // ─────────────────────────────────────────────────────────

    resolveCollision(
        cx,
        cy,
        radius
    ) {
        let pushX = 0;
        let pushY = 0;

        // Multiple passes make corners more reliable
        for (let pass = 0; pass < 2; pass++) {
            for (const wall of this.walls) {
                const testX =
                    cx + pushX;

                const testY =
                    cy + pushY;

                if (
                    !Utils.circleRectCollision(
                        testX,
                        testY,
                        radius,
                        wall.x,
                        wall.y,
                        wall.w,
                        wall.h
                    )
                ) {
                    continue;
                }

                const closestX =
                    Utils.clamp(
                        testX,
                        wall.x,
                        wall.x + wall.w
                    );

                const closestY =
                    Utils.clamp(
                        testY,
                        wall.y,
                        wall.y + wall.h
                    );

                const dx =
                    testX - closestX;

                const dy =
                    testY - closestY;

                const dist =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );

                if (
                    dist < radius &&
                    dist > 0.0001
                ) {
                    const overlap =
                        radius - dist;

                    pushX +=
                        (dx / dist) *
                        overlap;

                    pushY +=
                        (dy / dist) *
                        overlap;
                } else if (
                    dist <= 0.0001
                ) {
                    // Entity is completely inside wall.
                    // Push toward closest wall edge.
                    const left =
                        Math.abs(
                            testX -
                            wall.x
                        );

                    const right =
                        Math.abs(
                            wall.x +
                            wall.w -
                            testX
                        );

                    const top =
                        Math.abs(
                            testY -
                            wall.y
                        );

                    const bottom =
                        Math.abs(
                            wall.y +
                            wall.h -
                            testY
                        );

                    const smallest =
                        Math.min(
                            left,
                            right,
                            top,
                            bottom
                        );

                    if (
                        smallest === left
                    ) {
                        pushX -=
                            radius;
                    } else if (
                        smallest === right
                    ) {
                        pushX +=
                            radius;
                    } else if (
                        smallest === top
                    ) {
                        pushY -=
                            radius;
                    } else {
                        pushY +=
                            radius;
                    }
                }
            }
        }

        return {
            x: pushX,
            y: pushY,
        };
    },

    // ─────────────────────────────────────────────────────────
    // POINT COLLISION
    // ─────────────────────────────────────────────────────────

    pointInWall(px, py) {
        for (const wall of this.walls) {
            if (
                px >= wall.x &&
                px <= wall.x + wall.w &&
                py >= wall.y &&
                py <= wall.y + wall.h
            ) {
                return true;
            }
        }

        return false;
    },

    // ─────────────────────────────────────────────────────────
    // LINE OF SIGHT
    // ─────────────────────────────────────────────────────────

    hasLineOfSight(
        x1,
        y1,
        x2,
        y2
    ) {
        // Same point
        if (
            Math.abs(x1 - x2) < 0.001 &&
            Math.abs(y1 - y2) < 0.001
        ) {
            return true;
        }

        const minX =
            Math.min(x1, x2);

        const maxX =
            Math.max(x1, x2);

        const minY =
            Math.min(y1, y2);

        const maxY =
            Math.max(y1, y2);

        for (const bounds of this._wallBounds) {
            // Fast AABB rejection
            if (
                bounds.x2 < minX ||
                bounds.x1 > maxX ||
                bounds.y2 < minY ||
                bounds.y1 > maxY
            ) {
                continue;
            }

            if (
                Utils.lineRectIntersection(
                    x1,
                    y1,
                    x2,
                    y2,
                    bounds.x1,
                    bounds.y1,
                    bounds.x2 -
                    bounds.x1,
                    bounds.y2 -
                    bounds.y1
                )
            ) {
                return false;
            }
        }

        return true;
    },

    // ─────────────────────────────────────────────────────────
    // FIND COVER
    // ─────────────────────────────────────────────────────────

    /**
     * Find a nearby position that is hidden from a target.
     * Useful for smarter AI later.
     */
    findCoverPosition(
        x,
        y,
        targetX,
        targetY,
        searchRadius = 180
    ) {
        const candidates = [];

        const steps = 12;

        for (let i = 0; i < steps; i++) {
            const angle =
                (i / steps) *
                Math.PI *
                2;

            const distance =
                Utils.randFloat(
                    searchRadius * 0.5,
                    searchRadius
                );

            const px =
                x +
                Math.cos(angle) *
                distance;

            const py =
                y +
                Math.sin(angle) *
                distance;

            if (
                px < 50 ||
                px > GAME.MAP_WIDTH - 50 ||
                py < 50 ||
                py > GAME.MAP_HEIGHT - 50
            ) {
                continue;
            }

            if (
                this.pointInWall(
                    px,
                    py
                )
            ) {
                continue;
            }

            const blocked =
                !this.hasLineOfSight(
                    px,
                    py,
                    targetX,
                    targetY
                );

            if (blocked) {
                candidates.push({
                    x: px,
                    y: py,
                });
            }
        }

        if (candidates.length === 0) {
            return null;
        }

        // Closest usable cover
        candidates.sort(
            (a, b) =>
                Utils.distance(
                    x,
                    y,
                    a.x,
                    a.y
                ) -
                Utils.distance(
                    x,
                    y,
                    b.x,
                    b.y
                )
        );

        return candidates[0];
    },

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────

    render(ctx, camera) {
        const W =
            GAME.MAP_WIDTH;

        const H =
            GAME.MAP_HEIGHT;

        // Viewport culling
        const vx =
            camera.x - 50;

        const vy =
            camera.y - 50;

        const vw =
            camera.screenW + 100;

        const vh =
            camera.screenH + 100;

        // ─────────────────────────────────────────────────────
        // GRASS
        // ─────────────────────────────────────────────────────

        ctx.fillStyle =
            GAME.COLORS.GRASS;

        ctx.fillRect(
            0,
            0,
            W,
            H
        );

        ctx.fillStyle =
            GAME.COLORS.GRASS_ALT;

        const gsX =
            Math.max(
                0,
                Math.floor(vx / 100) * 100
            );

        const gsY =
            Math.max(
                0,
                Math.floor(vy / 100) * 100
            );

        for (
            let gx = gsX;
            gx <
            Math.min(
                W,
                vx + vw + 100
            );
            gx += 100
        ) {
            for (
                let gy = gsY;
                gy <
                Math.min(
                    H,
                    vy + vh + 100
                );
                gy += 100
            ) {
                if (
                    (gx + gy) %
                    200 ===
                    0
                ) {
                    ctx.fillRect(
                        gx,
                        gy,
                        100,
                        100
                    );
                }
            }
        }

        // ─────────────────────────────────────────────────────
        // ROADS
        // ─────────────────────────────────────────────────────

        ctx.fillStyle =
            GAME.COLORS.ROAD;

        for (const road of this.roads) {
            ctx.fillRect(
                road.x,
                road.y,
                road.w,
                road.h
            );
        }

        ctx.strokeStyle =
            GAME.COLORS.ROAD_LINE;

        ctx.lineWidth = 2;

        ctx.setLineDash([
            15,
            15,
        ]);

        for (const road of this.roads) {
            ctx.beginPath();

            if (
                road.w >
                road.h
            ) {
                ctx.moveTo(
                    road.x,
                    road.y +
                    road.h / 2
                );

                ctx.lineTo(
                    road.x +
                    road.w,
                    road.y +
                    road.h / 2
                );
            } else {
                ctx.moveTo(
                    road.x +
                    road.w / 2,
                    road.y
                );

                ctx.lineTo(
                    road.x +
                    road.w / 2,
                    road.y +
                    road.h
                );
            }

            ctx.stroke();
        }

        ctx.setLineDash([]);

        // ─────────────────────────────────────────────────────
        // BUILDINGS
        // ─────────────────────────────────────────────────────

        for (const b of this.buildings) {
            if (
                b.x + b.w < vx ||
                b.x > vx + vw ||
                b.y + b.h < vy ||
                b.y > vy + vh
            ) {
                continue;
            }

            // Floor
            ctx.fillStyle =
                b.floorColor;

            ctx.fillRect(
                b.x + 8,
                b.y + 8,
                b.w - 16,
                b.h - 16
            );

            // Wall
            ctx.fillStyle =
                b.color;

            ctx.lineWidth = 8;

            ctx.strokeStyle =
                b.color;

            ctx.strokeRect(
                b.x,
                b.y,
                b.w,
                b.h
            );

            // Door
            ctx.fillStyle =
                GAME.COLORS.BUILDING_FLOOR;

            const doorSize = 30;

            switch (b.doorSide) {
                case 0:
                    ctx.fillRect(
                        b.x +
                        b.w / 2 -
                        doorSize / 2,
                        b.y - 2,
                        doorSize,
                        12
                    );
                    break;

                case 1:
                    ctx.fillRect(
                        b.x +
                        b.w -
                        10,
                        b.y +
                        b.h / 2 -
                        doorSize / 2,
                        12,
                        doorSize
                    );
                    break;

                case 2:
                    ctx.fillRect(
                        b.x +
                        b.w / 2 -
                        doorSize / 2,
                        b.y +
                        b.h -
                        10,
                        doorSize,
                        12
                    );
                    break;

                case 3:
                    ctx.fillRect(
                        b.x - 2,
                        b.y +
                        b.h / 2 -
                        doorSize / 2,
                        12,
                        doorSize
                    );
                    break;
            }
        }

        // ─────────────────────────────────────────────────────
        // VEHICLES
        // ─────────────────────────────────────────────────────

        for (const v of this.vehicles) {
            if (
                v.x + 50 < vx ||
                v.x - 50 > vx + vw ||
                v.y + 50 < vy ||
                v.y - 50 > vy + vh
            ) {
                continue;
            }

            const drawn =
                AssetManager.drawVehicle(
                    ctx,
                    v.type,
                    v.x,
                    v.y,
                    v.w,
                    v.h,
                    v.angle
                );

            if (!drawn) {
                ctx.save();

                ctx.translate(
                    v.x,
                    v.y
                );

                ctx.rotate(
                    v.angle
                );

                ctx.fillStyle =
                    '#37474f';

                ctx.fillRect(
                    -v.w / 2,
                    -v.h / 2,
                    v.w,
                    v.h
                );

                ctx.strokeStyle =
                    '#263238';

                ctx.lineWidth = 2;

                ctx.strokeRect(
                    -v.w / 2,
                    -v.h / 2,
                    v.w,
                    v.h
                );

                ctx.restore();
            }
        }

        // ─────────────────────────────────────────────────────
        // ROCKS
        // ─────────────────────────────────────────────────────

        for (const rock of this.rocks) {
            if (
                rock.x +
                rock.radius <
                vx ||
                rock.x -
                rock.radius >
                vx + vw ||
                rock.y +
                rock.radius <
                vy ||
                rock.y -
                rock.radius >
                vy + vh
            ) {
                continue;
            }

            const drawn =
                AssetManager.drawRock(
                    ctx,
                    rock.x,
                    rock.y,
                    rock.radius
                );

            if (!drawn) {
                ctx.beginPath();

                ctx.arc(
                    rock.x,
                    rock.y,
                    rock.radius,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    GAME.COLORS.ROCK;

                ctx.fill();

                ctx.strokeStyle =
                    '#555';

                ctx.lineWidth = 2;

                ctx.stroke();
            }
        }

        // ─────────────────────────────────────────────────────
        // TREES
        // ─────────────────────────────────────────────────────

        for (const tree of this.trees) {
            if (
                tree.x +
                tree.radius <
                vx ||
                tree.x -
                tree.radius >
                vx + vw ||
                tree.y +
                tree.radius <
                vy ||
                tree.y -
                tree.radius >
                vy + vh
            ) {
                continue;
            }

            const drawn =
                AssetManager.drawTree(
                    ctx,
                    tree.x,
                    tree.y,
                    tree.radius
                );

            if (!drawn) {
                // Trunk
                ctx.beginPath();

                ctx.arc(
                    tree.x,
                    tree.y,
                    tree.radius *
                    0.35,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    GAME.COLORS.TREE_TRUNK;

                ctx.fill();

                // Canopy
                ctx.beginPath();

                ctx.arc(
                    tree.x,
                    tree.y,
                    tree.radius,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    GAME.COLORS.TREE;

                ctx.globalAlpha = 0.85;

                ctx.fill();

                ctx.globalAlpha = 1;
            }
        }

        // ─────────────────────────────────────────────────────
        // MAP BORDER
        // ─────────────────────────────────────────────────────

        ctx.strokeStyle =
            '#ff1744';

        ctx.lineWidth = 6;

        ctx.strokeRect(
            0,
            0,
            W,
            H
        );
    },
};