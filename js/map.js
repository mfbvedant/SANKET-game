/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Map System

   World generation:
   - Roads
   - Buildings
   - Trees
   - Rocks
   - Vehicles
   - Loot locations
   - Spawn locations

   Gameplay:
   - Collision
   - Line of sight
   - Cover detection
   - Wall cache

   Rendering:
   - Tactical terrain
   - Buildings
   - Vehicles
   - Rocks
   - Trees
   - Map border
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

    _wallBounds: [],


    // ═════════════════════════════════════════════════════
    // GENERATE MAP
    // ═════════════════════════════════════════════════════

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


        const W =
            GAME.MAP_WIDTH;

        const H =
            GAME.MAP_HEIGHT;


        // ═════════════════════════════════════════════
        // ROADS
        // ═════════════════════════════════════════════

        const roadW = 64;


        // Main horizontal
        this.roads.push({
            x: 0,
            y: H / 2 - roadW / 2,
            w: W,
            h: roadW,
        });


        // Main vertical
        this.roads.push({
            x: W / 2 - roadW / 2,
            y: 0,
            w: roadW,
            h: H,
        });


        // Secondary roads
        const horizontalRoads = [
            H * 0.25,
            H * 0.75,
        ];


        for (
            const y of horizontalRoads
        ) {

            this.roads.push({
                x: 0,
                y: y - roadW / 2,
                w: W,
                h: roadW,
            });
        }


        const verticalRoads = [
            W * 0.25,
            W * 0.75,
        ];


        for (
            const x of verticalRoads
        ) {

            this.roads.push({
                x: x - roadW / 2,
                y: 0,
                w: roadW,
                h: H,
            });
        }


        // ═════════════════════════════════════════════
        // BUILDING DISTRICTS
        // ═════════════════════════════════════════════

        const districts = [

            {
                cx: W * 0.50,
                cy: H * 0.50,
                count: 9,
                min: 65,
                max: 125,
            },

            {
                cx: W * 0.30,
                cy: H * 0.20,
                count: 6,
                min: 55,
                max: 105,
            },

            {
                cx: W * 0.75,
                cy: H * 0.30,
                count: 6,
                min: 50,
                max: 100,
            },

            {
                cx: W * 0.50,
                cy: H * 0.80,
                count: 6,
                min: 55,
                max: 115,
            },

            {
                cx: W * 0.15,
                cy: H * 0.60,
                count: 5,
                min: 50,
                max: 100,
            },

            {
                cx: W * 0.85,
                cy: H * 0.15,
                count: 4,
                min: 45,
                max: 90,
            },

            {
                cx: W * 0.20,
                cy: H * 0.85,
                count: 4,
                min: 45,
                max: 85,
            },

            {
                cx: W * 0.80,
                cy: H * 0.75,
                count: 5,
                min: 65,
                max: 130,
            },
        ];


        for (
            const district of districts
        ) {

            for (
                let i = 0;
                i < district.count;
                i++
            ) {

                const bw =
                    Utils.randInt(
                        district.min,
                        district.max
                    );


                const bh =
                    Utils.randInt(
                        district.min,
                        district.max
                    );


                const bx =
                    district.cx +
                    Utils.randInt(
                        -210,
                        210
                    ) -
                    bw / 2;


                const by =
                    district.cy +
                    Utils.randInt(
                        -210,
                        210
                    ) -
                    bh / 2;


                if (
                    bx < 60 ||
                    by < 60 ||
                    bx + bw >
                        W - 60 ||
                    by + bh >
                        H - 60
                ) {

                    continue;
                }


                const building = {

                    x: bx,
                    y: by,
                    w: bw,
                    h: bh,

                    doorSide:
                        Utils.randInt(
                            0,
                            3
                        ),

                    hasDoor: true,

                    color:
                        GAME.COLORS.BUILDING_WALL,

                    floorColor:
                        GAME.COLORS.BUILDING_FLOOR,
                };


                // Keep buildings separated
                let overlap =
                    false;


                for (
                    const existing
                    of this.buildings
                ) {

                    if (
                        Utils.rectCollision(
                            {
                                x:
                                    bx - 18,
                                y:
                                    by - 18,
                                w:
                                    bw + 36,
                                h:
                                    bh + 36,
                            },
                            {
                                x:
                                    existing.x,
                                y:
                                    existing.y,
                                w:
                                    existing.w,
                                h:
                                    existing.h,
                            }
                        )
                    ) {

                        overlap = true;

                        break;
                    }
                }


                if (overlap) {
                    continue;
                }


                this.buildings.push(
                    building
                );


                this._createBuildingWalls(
                    building
                );


                // Interior loot
                this.lootSpawnPoints.push({

                    x:
                        bx +
                        bw / 2 +
                        Utils.randInt(
                            -15,
                            15
                        ),

                    y:
                        by +
                        bh / 2 +
                        Utils.randInt(
                            -15,
                            15
                        ),

                    indoor: true,
                });
            }
        }


        // ═════════════════════════════════════════════
        // TREES
        // ═════════════════════════════════════════════

        for (
            let i = 0;
            i < 220;
            i++
        ) {

            const radius =
                Utils.randInt(
                    12,
                    23
                );


            const x =
                Utils.randInt(
                    70,
                    W - 70
                );


            const y =
                Utils.randInt(
                    70,
                    H - 70
                );


            if (
                this._positionBlocked(
                    x,
                    y,
                    radius + 12,
                    true
                )
            ) {

                continue;
            }


            this.trees.push({

                x,
                y,
                radius,
            });


            this.walls.push({

                x:
                    x -
                    radius * 0.55,

                y:
                    y -
                    radius * 0.55,

                w:
                    radius * 1.1,

                h:
                    radius * 1.1,

                isTree: true,
            });
        }


        // ═════════════════════════════════════════════
        // ROCKS
        // ═════════════════════════════════════════════

        for (
            let i = 0;
            i < 90;
            i++
        ) {

            const radius =
                Utils.randInt(
                    10,
                    21
                );


            const x =
                Utils.randInt(
                    60,
                    W - 60
                );


            const y =
                Utils.randInt(
                    60,
                    H - 60
                );


            if (
                this._positionBlocked(
                    x,
                    y,
                    radius + 8,
                    false
                )
            ) {

                continue;
            }


            this.rocks.push({

                x,
                y,
                radius,
            });


            this.walls.push({

                x:
                    x - radius,

                y:
                    y - radius,

                w:
                    radius * 2,

                h:
                    radius * 2,

                isRock: true,
            });
        }


        // ═════════════════════════════════════════════
        // VEHICLES
        // ═════════════════════════════════════════════

        const vehicleTypes = [

            'jeep',

            'truck',

            'buggy',

            'bike',

            'sedan',

            'boat',
        ];


        for (
            let i = 0;
            i < 24;
            i++
        ) {

            const x =
                Utils.randInt(
                    180,
                    W - 180
                );


            const y =
                Utils.randInt(
                    180,
                    H - 180
                );


            if (
                this._positionBlocked(
                    x,
                    y,
                    45,
                    false
                )
            ) {

                continue;
            }


            const type =
                Utils.randomPick(
                    vehicleTypes
                );


            const angle =
                Utils.randFloat(
                    0,
                    Math.PI * 2
                );


            this.vehicles.push({

                x,
                y,

                w: 62,
                h: 38,

                type,

                angle,
            });


            this.walls.push({

                x:
                    x - 31,

                y:
                    y - 19,

                w: 62,

                h: 38,

                isVehicle: true,
            });
        }


        // ═════════════════════════════════════════════
        // OUTDOOR LOOT
        // ═════════════════════════════════════════════

        for (
            let i = 0;
            i < 120;
            i++
        ) {

            const x =
                Utils.randInt(
                    100,
                    W - 100
                );


            const y =
                Utils.randInt(
                    100,
                    H - 100
                );


            if (
                this.pointInBuilding(
                    x,
                    y
                )
            ) {

                continue;
            }


            if (
                this.pointInWall(
                    x,
                    y
                )
            ) {

                continue;
            }


            this.lootSpawnPoints.push({

                x,
                y,

                indoor: false,
            });
        }


        // ═════════════════════════════════════════════
        // SPAWN POINTS
        // ═════════════════════════════════════════════

        for (
            let i = 0;
            i < 60;
            i++
        ) {

            const angle =
                (
                    i / 60
                ) *
                Math.PI *
                2;


            const distance =
                Utils.randFloat(
                    650,
                    1750
                );


            const x =
                W / 2 +
                Math.cos(angle) *
                distance;


            const y =
                H / 2 +
                Math.sin(angle) *
                distance;


            if (
                x < 100 ||
                x > W - 100 ||
                y < 100 ||
                y > H - 100
            ) {

                continue;
            }


            if (
                this.pointInWall(
                    x,
                    y
                )
            ) {

                continue;
            }


            this.spawnPoints.push({

                x,
                y,
            });
        }


        // Emergency spawn fallback
        if (
            this.spawnPoints.length === 0
        ) {

            this.spawnPoints.push({

                x: W / 2,
                y: H / 2,
            });
        }


        this._rebuildWallCache();
    },


    // ═════════════════════════════════════════════════════
    // POSITION BLOCKED
    // ═════════════════════════════════════════════════════

    _positionBlocked(
        x,
        y,
        radius,
        checkRoads = false
    ) {

        if (
            checkRoads
        ) {

            for (
                const road of this.roads
            ) {

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


        for (
            const building
            of this.buildings
        ) {

            if (
                Utils.circleRectCollision(
                    x,
                    y,
                    radius,
                    building.x,
                    building.y,
                    building.w,
                    building.h
                )
            ) {

                return true;
            }
        }


        return false;
    },


    // ═════════════════════════════════════════════════════
    // BUILDING WALLS
    // ═════════════════════════════════════════════════════

    _createBuildingWalls(building) {

        const thickness = 8;

        const doorSize = 30;


        const walls = [

            {
                side: 0,

                x:
                    building.x,

                y:
                    building.y,

                w:
                    building.w,

                h:
                    thickness,
            },

            {
                side: 1,

                x:
                    building.x +
                    building.w -
                    thickness,

                y:
                    building.y,

                w:
                    thickness,

                h:
                    building.h,
            },

            {
                side: 2,

                x:
                    building.x,

                y:
                    building.y +
                    building.h -
                    thickness,

                w:
                    building.w,

                h:
                    thickness,
            },

            {
                side: 3,

                x:
                    building.x,

                y:
                    building.y,

                w:
                    thickness,

                h:
                    building.h,
            },
        ];


        for (
            const wall of walls
        ) {

            if (
                !building.hasDoor ||
                wall.side !==
                building.doorSide
            ) {

                this.walls.push({
                    x: wall.x,
                    y: wall.y,
                    w: wall.w,
                    h: wall.h,
                });

                continue;
            }


            // Horizontal wall
            if (
                wall.side === 0 ||
                wall.side === 2
            ) {

                const gapStart =
                    building.x +
                    building.w / 2 -
                    doorSize / 2;


                const gapEnd =
                    gapStart +
                    doorSize;


                if (
                    gapStart >
                    building.x
                ) {

                    this.walls.push({

                        x:
                            building.x,

                        y:
                            wall.y,

                        w:
                            gapStart -
                            building.x,

                        h:
                            thickness,
                    });
                }


                if (
                    gapEnd <
                    building.x +
                    building.w
                ) {

                    this.walls.push({

                        x:
                            gapEnd,

                        y:
                            wall.y,

                        w:
                            building.x +
                            building.w -
                            gapEnd,

                        h:
                            thickness,
                    });
                }

            } else {

                // Vertical wall

                const gapStart =
                    building.y +
                    building.h / 2 -
                    doorSize / 2;


                const gapEnd =
                    gapStart +
                    doorSize;


                if (
                    gapStart >
                    building.y
                ) {

                    this.walls.push({

                        x:
                            wall.x,

                        y:
                            building.y,

                        w:
                            thickness,

                        h:
                            gapStart -
                            building.y,
                    });
                }


                if (
                    gapEnd <
                    building.y +
                    building.h
                ) {

                    this.walls.push({

                        x:
                            wall.x,

                        y:
                            gapEnd,

                        w:
                            thickness,

                        h:
                            building.y +
                            building.h -
                            gapEnd,
                    });
                }
            }
        }
    },


    // ═════════════════════════════════════════════════════
    // WALL CACHE
    // ═════════════════════════════════════════════════════

    _rebuildWallCache() {

        this._wallBounds =
            this.walls.map(
                wall => ({

                    x1:
                        wall.x,

                    y1:
                        wall.y,

                    x2:
                        wall.x +
                        wall.w,

                    y2:
                        wall.y +
                        wall.h,

                    wall,
                })
            );
    },


    // ═════════════════════════════════════════════════════
    // COLLISION
    // ═════════════════════════════════════════════════════

    resolveCollision(
        cx,
        cy,
        radius
    ) {

        let pushX = 0;
        let pushY = 0;


        // Two passes help with corners
        for (
            let pass = 0;
            pass < 2;
            pass++
        ) {

            for (
                const wall of this.walls
            ) {

                const x =
                    cx + pushX;

                const y =
                    cy + pushY;


                if (
                    !Utils.circleRectCollision(
                        x,
                        y,
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
                        x,
                        wall.x,
                        wall.x +
                        wall.w
                    );


                const closestY =
                    Utils.clamp(
                        y,
                        wall.y,
                        wall.y +
                        wall.h
                    );


                const dx =
                    x -
                    closestX;


                const dy =
                    y -
                    closestY;


                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );


                if (
                    distance > 0.0001 &&
                    distance < radius
                ) {

                    const overlap =
                        radius -
                        distance;


                    pushX +=
                        (
                            dx /
                            distance
                        ) *
                        overlap;


                    pushY +=
                        (
                            dy /
                            distance
                        ) *
                        overlap;

                } else {

                    // Entity is inside a wall.
                    const left =
                        Math.abs(
                            x -
                            wall.x
                        );


                    const right =
                        Math.abs(
                            wall.x +
                            wall.w -
                            x
                        );


                    const top =
                        Math.abs(
                            y -
                            wall.y
                        );


                    const bottom =
                        Math.abs(
                            wall.y +
                            wall.h -
                            y
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


    // ═════════════════════════════════════════════════════
    // POINT IN WALL
    // ═════════════════════════════════════════════════════

    pointInWall(
        px,
        py
    ) {

        for (
            const wall of this.walls
        ) {

            if (
                px >= wall.x &&
                px <=
                    wall.x +
                    wall.w &&
                py >= wall.y &&
                py <=
                    wall.y +
                    wall.h
            ) {

                return true;
            }
        }


        return false;
    },


    // ═════════════════════════════════════════════════════
    // POINT IN BUILDING
    // ═════════════════════════════════════════════════════

    pointInBuilding(
        px,
        py
    ) {

        for (
            const building
            of this.buildings
        ) {

            if (
                px >= building.x &&
                px <=
                    building.x +
                    building.w &&
                py >= building.y &&
                py <=
                    building.y +
                    building.h
            ) {

                return true;
            }
        }


        return false;
    },


    // ═════════════════════════════════════════════════════
    // LINE OF SIGHT
    // ═════════════════════════════════════════════════════

    hasLineOfSight(
        x1,
        y1,
        x2,
        y2
    ) {

        if (
            Math.abs(x1 - x2) <
                0.001 &&
            Math.abs(y1 - y2) <
                0.001
        ) {

            return true;
        }


        const minX =
            Math.min(
                x1,
                x2
            );


        const maxX =
            Math.max(
                x1,
                x2
            );


        const minY =
            Math.min(
                y1,
                y2
            );


        const maxY =
            Math.max(
                y1,
                y2
            );


        for (
            const bounds
            of this._wallBounds
        ) {

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


    // ═════════════════════════════════════════════════════
    // FIND COVER
    // ═════════════════════════════════════════════════════

    findCoverPosition(
        x,
        y,
        targetX,
        targetY,
        searchRadius = 180
    ) {

        const candidates = [];

        const samples = 16;


        for (
            let i = 0;
            i < samples;
            i++
        ) {

            const angle =
                (
                    i /
                    samples
                ) *
                Math.PI *
                2;


            const distance =
                Utils.randFloat(
                    searchRadius *
                        0.45,
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
                px >
                    GAME.MAP_WIDTH -
                    50 ||
                py < 50 ||
                py >
                    GAME.MAP_HEIGHT -
                    50
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


            if (
                !this.hasLineOfSight(
                    px,
                    py,
                    targetX,
                    targetY
                )
            ) {

                candidates.push({

                    x: px,

                    y: py,

                    distance:
                        Utils.distance(
                            x,
                            y,
                            px,
                            py
                        ),
                });
            }
        }


        if (
            candidates.length === 0
        ) {

            return null;
        }


        candidates.sort(
            (
                a,
                b
            ) =>
                a.distance -
                b.distance
        );


        return {

            x:
                candidates[0].x,

            y:
                candidates[0].y,
        };
    },


    // ═════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════

    render(
        ctx,
        camera
    ) {

        const W =
            GAME.MAP_WIDTH;

        const H =
            GAME.MAP_HEIGHT;


        // Viewport
        const vx =
            camera.x - 100;

        const vy =
            camera.y - 100;

        const vw =
            camera.screenW + 200;

        const vh =
            camera.screenH + 200;


        // ═════════════════════════════════════════════
        // BASE GRASS
        // ═════════════════════════════════════════════

        ctx.fillStyle =
            GAME.COLORS.GRASS;


        ctx.fillRect(
            0,
            0,
            W,
            H
        );


        // Grass pattern
        ctx.fillStyle =
            GAME.COLORS.GRASS_ALT;


        const startX =
            Math.max(
                0,
                Math.floor(
                    vx / 100
                ) * 100
            );


        const startY =
            Math.max(
                0,
                Math.floor(
                    vy / 100
                ) * 100
            );


        for (
            let x = startX;
            x <
                Math.min(
                    W,
                    vx + vw + 100
                );
            x += 100
        ) {

            for (
                let y = startY;
                y <
                    Math.min(
                        H,
                        vy + vh + 100
                    );
                y += 100
            ) {

                if (
                    (
                        x / 100 +
                        y / 100
                    ) %
                    2 ===
                    0
                ) {

                    ctx.fillRect(
                        x,
                        y,
                        100,
                        100
                    );
                }
            }
        }


        // ═════════════════════════════════════════════
        // ROADS
        // ═════════════════════════════════════════════

        ctx.fillStyle =
            GAME.COLORS.ROAD;


        for (
            const road of this.roads
        ) {

            if (
                road.x +
                    road.w <
                    vx ||
                road.x >
                    vx + vw ||
                road.y +
                    road.h <
                    vy ||
                road.y >
                    vy + vh
            ) {

                continue;
            }


            ctx.fillRect(
                road.x,
                road.y,
                road.w,
                road.h
            );
        }


        // Road center markings
        ctx.save();

        ctx.strokeStyle =
            GAME.COLORS.ROAD_LINE;

        ctx.lineWidth = 2;

        ctx.setLineDash([
            18,
            18,
        ]);


        for (
            const road of this.roads
        ) {

            ctx.beginPath();


            if (
                road.w >=
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

        ctx.restore();


        // ═════════════════════════════════════════════
        // BUILDINGS
        // ═════════════════════════════════════════════

        for (
            const building
            of this.buildings
        ) {

            if (
                building.x +
                    building.w <
                    vx ||
                building.x >
                    vx + vw ||
                building.y +
                    building.h <
                    vy ||
                building.y >
                    vy + vh
            ) {

                continue;
            }


            // Shadow
            ctx.fillStyle =
                'rgba(0,0,0,0.20)';


            ctx.fillRect(
                building.x + 5,
                building.y + 7,
                building.w,
                building.h
            );


            // Floor
            ctx.fillStyle =
                building.floorColor;


            ctx.fillRect(
                building.x + 8,
                building.y + 8,
                building.w - 16,
                building.h - 16
            );


            // Wall
            ctx.fillStyle =
                building.color;


            ctx.strokeStyle =
                building.color;


            ctx.lineWidth = 8;


            ctx.strokeRect(
                building.x,
                building.y,
                building.w,
                building.h
            );


            // Door
            const doorSize = 30;


            ctx.fillStyle =
                GAME.COLORS.BUILDING_FLOOR;


            switch (
                building.doorSide
            ) {

                case 0:

                    ctx.fillRect(
                        building.x +
                            building.w / 2 -
                            doorSize / 2,

                        building.y - 4,

                        doorSize,

                        12
                    );

                    break;


                case 1:

                    ctx.fillRect(
                        building.x +
                            building.w -
                            8,

                        building.y +
                            building.h / 2 -
                            doorSize / 2,

                        12,

                        doorSize
                    );

                    break;


                case 2:

                    ctx.fillRect(
                        building.x +
                            building.w / 2 -
                            doorSize / 2,

                        building.y +
                            building.h -
                            8,

                        doorSize,

                        12
                    );

                    break;


                case 3:

                    ctx.fillRect(
                        building.x - 4,

                        building.y +
                            building.h / 2 -
                            doorSize / 2,

                        12,

                        doorSize
                    );

                    break;
            }


            // Small rooftop detail
            ctx.fillStyle =
                'rgba(0,0,0,0.10)';


            ctx.fillRect(
                building.x + 14,
                building.y + 14,
                Math.max(
                    8,
                    building.w - 28
                ),
                3
            );
        }


        // ═════════════════════════════════════════════
        // VEHICLES
        // ═════════════════════════════════════════════

        for (
            const vehicle
            of this.vehicles
        ) {

            if (
                vehicle.x + 55 <
                    vx ||
                vehicle.x - 55 >
                    vx + vw ||
                vehicle.y + 55 <
                    vy ||
                vehicle.y - 55 >
                    vy + vh
            ) {

                continue;
            }


            const drawn =
                AssetManager.drawVehicle(
                    ctx,
                    vehicle.type,
                    vehicle.x,
                    vehicle.y,
                    vehicle.w,
                    vehicle.h,
                    vehicle.angle
                );


            if (
                !drawn
            ) {

                ctx.save();


                ctx.translate(
                    vehicle.x,
                    vehicle.y
                );


                ctx.rotate(
                    vehicle.angle
                );


                ctx.fillStyle =
                    '#37474f';


                ctx.fillRect(
                    -vehicle.w / 2,
                    -vehicle.h / 2,
                    vehicle.w,
                    vehicle.h
                );


                ctx.strokeStyle =
                    '#263238';


                ctx.lineWidth = 2;


                ctx.strokeRect(
                    -vehicle.w / 2,
                    -vehicle.h / 2,
                    vehicle.w,
                    vehicle.h
                );


                ctx.restore();
            }
        }


        // ═════════════════════════════════════════════
        // ROCKS
        // ═════════════════════════════════════════════

        for (
            const rock
            of this.rocks
        ) {

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


            if (
                !drawn
            ) {

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


        // ═════════════════════════════════════════════
        // TREES
        // ═════════════════════════════════════════════

        for (
            const tree
            of this.trees
        ) {

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


            if (
                !drawn
            ) {

                // Trunk
                ctx.beginPath();


                ctx.arc(
                    tree.x,
                    tree.y,
                    tree.radius * 0.35,
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


                ctx.globalAlpha =
                    0.85;


                ctx.fill();


                ctx.globalAlpha =
                    1;
            }
        }


        // ═════════════════════════════════════════════
        // MAP BORDER
        // ═════════════════════════════════════════════

        ctx.save();


        ctx.strokeStyle =
            '#ff1744';


        ctx.lineWidth = 6;


        ctx.strokeRect(
            0,
            0,
            W,
            H
        );


        ctx.restore();
    },
};