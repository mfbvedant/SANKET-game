/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Map System
   Generates a playable 2D map with buildings, roads, trees,
   rocks, and open areas.
   ═══════════════════════════════════════════════════════════ */

const MapSystem = {
    buildings: [],
    trees: [],
    rocks: [],
    roads: [],
    vehicles: [],
    walls: [],         // all solid collision rectangles
    spawnPoints: [],
    lootSpawnPoints: [],

    /**
     * Generate the entire map.
     */
    generate() {
        this.buildings = [];
        this.trees = [];
        this.rocks = [];
        this.roads = [];
        this.vehicles = [];
        this.walls = [];
        this.spawnPoints = [];
        this.lootSpawnPoints = [];

        const W = GAME.MAP_WIDTH;
        const H = GAME.MAP_HEIGHT;

        // ── Roads (cross pattern + ring) ─────────────────────
        const roadW = 60;
        // Horizontal road
        this.roads.push({ x: 0, y: H / 2 - roadW / 2, w: W, h: roadW });
        // Vertical road
        this.roads.push({ x: W / 2 - roadW / 2, y: 0, w: roadW, h: H });
        // Additional roads
        this.roads.push({ x: 0, y: H * 0.25 - roadW / 2, w: W, h: roadW });
        this.roads.push({ x: 0, y: H * 0.75 - roadW / 2, w: W, h: roadW });
        this.roads.push({ x: W * 0.25 - roadW / 2, y: 0, w: roadW, h: H });
        this.roads.push({ x: W * 0.75 - roadW / 2, y: 0, w: roadW, h: H });

        // ── Buildings / Compounds ────────────────────────────
        // Create building clusters in different areas
        const buildingAreas = [
            // Town center
            { cx: W * 0.5, cy: H * 0.5, count: 8, sizeMin: 60, sizeMax: 120 },
            // North compound
            { cx: W * 0.3, cy: H * 0.2, count: 5, sizeMin: 50, sizeMax: 100 },
            // East compound
            { cx: W * 0.75, cy: H * 0.3, count: 5, sizeMin: 50, sizeMax: 90 },
            // South town
            { cx: W * 0.5, cy: H * 0.8, count: 6, sizeMin: 55, sizeMax: 110 },
            // West area
            { cx: W * 0.15, cy: H * 0.6, count: 4, sizeMin: 50, sizeMax: 95 },
            // NE outpost
            { cx: W * 0.85, cy: H * 0.15, count: 3, sizeMin: 45, sizeMax: 80 },
            // SW shacks
            { cx: W * 0.2, cy: H * 0.85, count: 4, sizeMin: 40, sizeMax: 70 },
            // SE warehouse
            { cx: W * 0.8, cy: H * 0.75, count: 4, sizeMin: 70, sizeMax: 130 },
        ];

        for (const area of buildingAreas) {
            for (let i = 0; i < area.count; i++) {
                const bw = Utils.randInt(area.sizeMin, area.sizeMax);
                const bh = Utils.randInt(area.sizeMin, area.sizeMax);
                const bx = area.cx + Utils.randInt(-200, 200) - bw / 2;
                const by = area.cy + Utils.randInt(-200, 200) - bh / 2;

                // Check overlap with existing buildings
                const rect = { x: bx, y: by, w: bw, h: bh };
                let overlaps = false;
                for (const b of this.buildings) {
                    if (Utils.rectCollision(rect, { x: b.x - 15, y: b.y - 15, w: b.w + 30, h: b.h + 30 })) {
                        overlaps = true;
                        break;
                    }
                }
                if (overlaps) continue;

                // Ensure within map bounds
                if (bx < 50 || by < 50 || bx + bw > W - 50 || by + bh > H - 50) continue;

                const building = {
                    x: bx, y: by, w: bw, h: bh,
                    doorSide: Utils.randInt(0, 3), // 0=top, 1=right, 2=bottom, 3=left
                    hasDoor: true,
                    color: GAME.COLORS.BUILDING_WALL,
                    floorColor: GAME.COLORS.BUILDING_FLOOR,
                };
                this.buildings.push(building);

                // Create wall segments (with a gap for the door)
                this._createBuildingWalls(building);

                // Loot spawn inside building
                this.lootSpawnPoints.push({
                    x: bx + bw / 2 + Utils.randInt(-10, 10),
                    y: by + bh / 2 + Utils.randInt(-10, 10),
                    indoor: true,
                });
            }
        }

        // ── Trees ─────────────────────────────────────────────
        for (let i = 0; i < 200; i++) {
            const tx = Utils.randInt(80, W - 80);
            const ty = Utils.randInt(80, H - 80);
            const tr = Utils.randInt(12, 22);

            // Don't place on roads or buildings
            let blocked = false;
            for (const r of this.roads) {
                if (Utils.circleRectCollision(tx, ty, tr + 10, r.x, r.y, r.w, r.h)) {
                    blocked = true; break;
                }
            }
            for (const b of this.buildings) {
                if (Utils.circleRectCollision(tx, ty, tr + 15, b.x, b.y, b.w, b.h)) {
                    blocked = true; break;
                }
            }
            if (blocked) continue;

            this.trees.push({ x: tx, y: ty, radius: tr });
        }

        // ── Rocks ─────────────────────────────────────────────
        for (let i = 0; i < 80; i++) {
            const rx = Utils.randInt(60, W - 60);
            const ry = Utils.randInt(60, H - 60);
            const rr = Utils.randInt(10, 20);

            let blocked = false;
            for (const b of this.buildings) {
                if (Utils.circleRectCollision(rx, ry, rr + 10, b.x, b.y, b.w, b.h)) {
                    blocked = true; break;
                }
            }
            if (blocked) continue;

            this.rocks.push({ x: rx, y: ry, radius: rr });
            // Rocks are solid
            this.walls.push({
                x: rx - rr, y: ry - rr, w: rr * 2, h: rr * 2,
                isRock: true,
            });
        }

        // ── Vehicles (Cover Obstacles) ────────────────────────
        const vehicleTypes = ['jeep', 'truck', 'buggy', 'bike', 'sedan', 'boat'];
        for (let i = 0; i < 20; i++) {
            const vx = Utils.randInt(200, W - 200);
            const vy = Utils.randInt(200, H - 200);
            const type = Utils.randomPick(vehicleTypes);
            const angle = Utils.randFloat(0, Math.PI * 2);

            let blocked = false;
            for (const b of this.buildings) {
                if (Utils.circleRectCollision(vx, vy, 40, b.x, b.y, b.w, b.h)) {
                    blocked = true; break;
                }
            }
            if (blocked) continue;

            this.vehicles.push({ x: vx, y: vy, w: 60, h: 36, type, angle });
            this.walls.push({ x: vx - 30, y: vy - 18, w: 60, h: 36 });
        }

        // ── Outdoor loot spawn points ─────────────────────────
        for (let i = 0; i < 100; i++) {
            const lx = Utils.randInt(100, W - 100);
            const ly = Utils.randInt(100, H - 100);
            let blocked = false;
            for (const b of this.buildings) {
                if (lx > b.x && lx < b.x + b.w && ly > b.y && ly < b.y + b.h) {
                    blocked = true; break;
                }
            }
            if (!blocked) {
                this.lootSpawnPoints.push({ x: lx, y: ly, indoor: false });
            }
        }

        // ── Player/Enemy spawn points ─────────────────────────
        // Distribute around the map edges and mid-areas
        for (let i = 0; i < 40; i++) {
            const angle = (i / 40) * Math.PI * 2;
            const dist = Utils.randFloat(600, 1600);
            const sx = W / 2 + Math.cos(angle) * dist;
            const sy = H / 2 + Math.sin(angle) * dist;
            if (sx > 100 && sx < W - 100 && sy > 100 && sy < H - 100) {
                this.spawnPoints.push({ x: sx, y: sy });
            }
        }
    },

    /**
     * Create wall collision rectangles for a building (with door gap).
     */
    _createBuildingWalls(b) {
        const wallThick = 8;
        const doorSize = 30;

        // Each side: top, right, bottom, left
        const sides = [
            // Top wall
            { x: b.x, y: b.y, w: b.w, h: wallThick, side: 0 },
            // Right wall
            { x: b.x + b.w - wallThick, y: b.y, w: wallThick, h: b.h, side: 1 },
            // Bottom wall
            { x: b.x, y: b.y + b.h - wallThick, w: b.w, h: wallThick, side: 2 },
            // Left wall
            { x: b.x, y: b.y, w: wallThick, h: b.h, side: 3 },
        ];

        for (const wall of sides) {
            if (b.hasDoor && wall.side === b.doorSide) {
                // Split wall into two segments around the door gap
                if (wall.side === 0 || wall.side === 2) {
                    // Horizontal wall — gap in the middle
                    const gapStart = b.x + b.w / 2 - doorSize / 2;
                    // Left segment
                    if (gapStart - b.x > wallThick) {
                        this.walls.push({ x: b.x, y: wall.y, w: gapStart - b.x, h: wallThick });
                    }
                    // Right segment
                    const gapEnd = gapStart + doorSize;
                    if (b.x + b.w - gapEnd > wallThick) {
                        this.walls.push({ x: gapEnd, y: wall.y, w: b.x + b.w - gapEnd, h: wallThick });
                    }
                } else {
                    // Vertical wall — gap in the middle
                    const gapStart = b.y + b.h / 2 - doorSize / 2;
                    if (gapStart - b.y > wallThick) {
                        this.walls.push({ x: wall.x, y: b.y, w: wallThick, h: gapStart - b.y });
                    }
                    const gapEnd = gapStart + doorSize;
                    if (b.y + b.h - gapEnd > wallThick) {
                        this.walls.push({ x: wall.x, y: gapEnd, w: wallThick, h: b.y + b.h - gapEnd });
                    }
                }
            } else {
                this.walls.push({ x: wall.x, y: wall.y, w: wall.w, h: wall.h });
            }
        }
    },

    /**
     * Check if a circle entity collides with any wall. Returns push-out vector.
     */
    resolveCollision(cx, cy, radius) {
        let pushX = 0;
        let pushY = 0;

        for (const wall of this.walls) {
            if (!Utils.circleRectCollision(cx + pushX, cy + pushY, radius, wall.x, wall.y, wall.w, wall.h)) {
                continue;
            }
            // Find closest point on rect to circle
            const closestX = Utils.clamp(cx + pushX, wall.x, wall.x + wall.w);
            const closestY = Utils.clamp(cy + pushY, wall.y, wall.y + wall.h);
            const dx = (cx + pushX) - closestX;
            const dy = (cy + pushY) - closestY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < radius && dist > 0) {
                const overlap = radius - dist;
                pushX += (dx / dist) * overlap;
                pushY += (dy / dist) * overlap;
            }
        }

        return { x: pushX, y: pushY };
    },

    /**
     * Check if a point (bullet) is inside any wall.
     */
    pointInWall(px, py) {
        for (const wall of this.walls) {
            if (px >= wall.x && px <= wall.x + wall.w &&
                py >= wall.y && py <= wall.y + wall.h) {
                return true;
            }
        }
        return false;
    },

    /**
     * Check line of sight between two points.
     */
    hasLineOfSight(x1, y1, x2, y2) {
        // Bounding box of the line for quick rejection
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        for (const wall of this.walls) {
            // Quick AABB rejection — skip walls clearly outside the line's bounds
            if (wall.x + wall.w < minX || wall.x > maxX ||
                wall.y + wall.h < minY || wall.y > maxY) {
                continue;
            }
            if (Utils.lineRectIntersection(x1, y1, x2, y2, wall.x, wall.y, wall.w, wall.h)) {
                return false;
            }
        }
        return true;
    },

    /**
     * Render the map.
     */
    render(ctx, camera) {
        const W = GAME.MAP_WIDTH;
        const H = GAME.MAP_HEIGHT;

        // Viewport bounds for culling
        const vx = camera.x - 50;
        const vy = camera.y - 50;
        const vw = camera.screenW + 100;
        const vh = camera.screenH + 100;

        // ── Grass background ──────────────────────────────────
        ctx.fillStyle = GAME.COLORS.GRASS;
        ctx.fillRect(0, 0, W, H);

        // Grass texture pattern (only visible area)
        ctx.fillStyle = GAME.COLORS.GRASS_ALT;
        const gsX = Math.max(0, Math.floor(vx / 100) * 100);
        const gsY = Math.max(0, Math.floor(vy / 100) * 100);
        for (let gx = gsX; gx < Math.min(W, vx + vw + 100); gx += 100) {
            for (let gy = gsY; gy < Math.min(H, vy + vh + 100); gy += 100) {
                if ((gx + gy) % 200 === 0) {
                    ctx.fillRect(gx, gy, 100, 100);
                }
            }
        }

        // ── Roads ──────────────────────────────────────────────
        ctx.fillStyle = GAME.COLORS.ROAD;
        for (const road of this.roads) {
            ctx.fillRect(road.x, road.y, road.w, road.h);
        }
        // Road dashes
        ctx.strokeStyle = GAME.COLORS.ROAD_LINE;
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 15]);
        for (const road of this.roads) {
            ctx.beginPath();
            if (road.w > road.h) {
                // Horizontal road — center line
                ctx.moveTo(road.x, road.y + road.h / 2);
                ctx.lineTo(road.x + road.w, road.y + road.h / 2);
            } else {
                ctx.moveTo(road.x + road.w / 2, road.y);
                ctx.lineTo(road.x + road.w / 2, road.y + road.h);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // ── Buildings (culled) ─────────────────────────────────
        for (const b of this.buildings) {
            if (b.x + b.w < vx || b.x > vx + vw || b.y + b.h < vy || b.y > vy + vh) continue;

            // Floor
            ctx.fillStyle = b.floorColor;
            ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);

            // Walls
            ctx.fillStyle = b.color;
            ctx.lineWidth = 8;
            ctx.strokeStyle = b.color;
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            // Door indication
            ctx.fillStyle = GAME.COLORS.BUILDING_FLOOR;
            const doorSize = 30;
            switch (b.doorSide) {
                case 0: ctx.fillRect(b.x + b.w / 2 - doorSize / 2, b.y - 2, doorSize, 12); break;
                case 1: ctx.fillRect(b.x + b.w - 10, b.y + b.h / 2 - doorSize / 2, 12, doorSize); break;
                case 2: ctx.fillRect(b.x + b.w / 2 - doorSize / 2, b.y + b.h - 10, doorSize, 12); break;
                case 3: ctx.fillRect(b.x - 2, b.y + b.h / 2 - doorSize / 2, 12, doorSize); break;
            }
        }

        // ── Vehicles (culled) ──────────────────────────────────
        for (const v of this.vehicles) {
            if (v.x + 50 < vx || v.x - 50 > vx + vw ||
                v.y + 50 < vy || v.y - 50 > vy + vh) continue;

            const drawn = AssetManager.drawVehicle(ctx, v.type, v.x, v.y, v.w, v.h, v.angle);
            if (!drawn) {
                ctx.save();
                ctx.translate(v.x, v.y);
                ctx.rotate(v.angle);
                ctx.fillStyle = '#37474f';
                ctx.fillRect(-v.w / 2, -v.h / 2, v.w, v.h);
                ctx.strokeStyle = '#263238';
                ctx.lineWidth = 2;
                ctx.strokeRect(-v.w / 2, -v.h / 2, v.w, v.h);
                ctx.restore();
            }
        }

        // ── Rocks (culled) ─────────────────────────────────────
        for (const rock of this.rocks) {
            if (rock.x + rock.radius < vx || rock.x - rock.radius > vx + vw ||
                rock.y + rock.radius < vy || rock.y - rock.radius > vy + vh) continue;

            const drawn = AssetManager.drawRock(ctx, rock.x, rock.y, rock.radius);
            if (!drawn) {
                ctx.beginPath();
                ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2);
                ctx.fillStyle = GAME.COLORS.ROCK;
                ctx.fill();
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // ── Trees (culled) ─────────────────────────────────────
        for (const tree of this.trees) {
            if (tree.x + tree.radius < vx || tree.x - tree.radius > vx + vw ||
                tree.y + tree.radius < vy || tree.y - tree.radius > vy + vh) continue;

            const drawn = AssetManager.drawTree(ctx, tree.x, tree.y, tree.radius);
            if (!drawn) {
                // Trunk
                ctx.beginPath();
                ctx.arc(tree.x, tree.y, tree.radius * 0.35, 0, Math.PI * 2);
                ctx.fillStyle = GAME.COLORS.TREE_TRUNK;
                ctx.fill();
                // Canopy
                ctx.beginPath();
                ctx.arc(tree.x, tree.y, tree.radius, 0, Math.PI * 2);
                ctx.fillStyle = GAME.COLORS.TREE;
                ctx.globalAlpha = 0.85;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // ── Map border ────────────────────────────────────────
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 6;
        ctx.strokeRect(0, 0, W, H);
    },
};
