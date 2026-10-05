/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Asset Manager
   Preloads and manages all uploaded graphic assets.
   ═══════════════════════════════════════════════════════════ */

const AssetManager = {
    images: {},
    loadedCount: 0,
    totalCount: 0,
    isLoaded: false,

    // List of uploaded picture files
    SOURCES: {
        hero: 'pictures/Tactical Operative with Orange Scarf.png',
        weaponsLineup: 'pictures/Tactical Firearms Game Asset Lineup.png',
        lootIcons: 'pictures/Tactical Survival Loot Icon Collection.png',
        mapAssets: 'pictures/Top-Down Tactical Battle Royale Asset Sheet.png',
        soldierSprite: 'pictures/Tactical Soldier Animation Sprite Sheet.png',
        vehicles: 'pictures/Rugged Vehicle Asset Sheet.png',
        hudKit: 'pictures/Battle Royale Military HUD UI Kit.png',
        mercenarySquad: 'pictures/Tactical Mercenary Squad Lineup.png',
    },

    /**
     * Preload all images. Returns a promise.
     */
    init() {
        const keys = Object.keys(this.SOURCES);
        this.totalCount = keys.length;

        return new Promise((resolve) => {
            keys.forEach((key) => {
                const img = new Image();
                img.onload = () => {
                    this.loadedCount++;
                    if (this.loadedCount >= this.totalCount) {
                        this.isLoaded = true;
                        resolve();
                    }
                };
                img.onerror = () => {
                    console.warn(`Failed to load asset: ${this.SOURCES[key]}`);
                    this.loadedCount++;
                    if (this.loadedCount >= this.totalCount) {
                        this.isLoaded = true;
                        resolve();
                    }
                };
                img.src = this.SOURCES[key];
                this.images[key] = img;
            });
        });
    },

    /**
     * Draw weapon icon from Tactical Firearms Game Asset Lineup.png
     * The lineup has 5 weapons horizontally:
     * 0: Pistol, 1: SMG, 2: Assault Rifle, 3: Shotgun, 4: Sniper
     */
    drawWeaponIcon(ctx, weaponKey, x, y, width, height) {
        const img = this.images.weaponsLineup;
        if (!img || !img.complete) return false;

        const indexMap = {
            pistol: 0,
            smg: 1,
            ar: 2,
            shotgun: 3,
            sniper: 4,
        };

        const idx = indexMap[weaponKey] !== undefined ? indexMap[weaponKey] : 0;
        const totalWeapons = 5;
        const srcW = img.width / totalWeapons;
        const srcH = img.height;
        const srcX = idx * srcW;

        ctx.drawImage(img, srcX, 0, srcW, srcH, x - width / 2, y - height / 2, width, height);
        return true;
    },

    /**
     * Draw loot icon from Tactical Survival Loot Icon Collection.png
     */
    drawLootIcon(ctx, type, subKey, x, y, size) {
        const img = this.images.lootIcons;
        if (!img || !img.complete) return false;

        // Grid coordinates inside the 7x5 icon sheet
        let col = 0, row = 0;
        if (type === 'health') {
            col = 0; row = 0; // Medkit icon (top-left)
        } else if (type === 'armor') {
            col = 0; row = 1; // Helmet / Armor (row 1)
        } else if (type === 'ammo') {
            if (subKey === 'light') { col = 0; row = 2; }
            else if (subKey === 'medium') { col = 1; row = 2; }
            else { col = 2; row = 2; }
        } else if (type === 'weapon') {
            col = 0; row = 4; // Attachment/weapon detail
        }

        const cols = 7;
        const rows = 5;
        const cellW = img.width / cols;
        const cellH = img.height / rows;
        const srcX = col * cellW;
        const srcY = row * cellH;

        ctx.drawImage(img, srcX, srcY, cellW, cellH, x - size / 2, y - size / 2, size, size);
        return true;
    },

    /**
     * Draw top-down vehicle obstacle from Top-Down Tactical Battle Royale Asset Sheet.png
     */
    drawVehicle(ctx, type, x, y, width, height, angle = 0) {
        const img = this.images.mapAssets;
        if (!img || !img.complete) return false;

        const vehicleMap = {
            jeep: 0,
            truck: 1,
            buggy: 2,
            bike: 3,
            sedan: 4,
            boat: 5,
        };
        const idx = vehicleMap[type] !== undefined ? vehicleMap[type] : 0;

        // Vehicle row is located at y: 42%..58% of the mapAssets image
        const totalVehicles = 7;
        const srcW = img.width / totalVehicles;
        const srcH = img.height * 0.16;
        const srcX = idx * srcW;
        const srcY = img.height * 0.42;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.drawImage(img, srcX, srcY, srcW, srcH, -width / 2, -height / 2, width, height);
        ctx.restore();
        return true;
    },

    /**
     * Draw top-down character skin from top row of mapAssets
     */
    drawTopDownCharacter(ctx, skinIdx, x, y, size, angle = 0) {
        const img = this.images.mapAssets;
        if (!img || !img.complete) return false;

        const totalSkins = 8;
        const idx = Math.abs(skinIdx || 0) % totalSkins;
        const srcW = img.width / totalSkins;
        const srcH = img.height * 0.20;
        const srcX = idx * srcW;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2); // align forward facing
        ctx.drawImage(img, srcX, 0, srcW, srcH, -size / 2, -size / 2, size, size);
        ctx.restore();
        return true;
    },

    /**
     * Draw environmental tree/foliage from mapAssets
     */
    drawTree(ctx, x, y, radius) {
        const img = this.images.mapAssets;
        if (!img || !img.complete) return false;

        // Tree region: x: 55%..75%, y: 60%..95%
        const srcX = img.width * 0.56;
        const srcY = img.height * 0.60;
        const srcW = img.width * 0.18;
        const srcH = img.height * 0.25;

        const diameter = radius * 2.2;
        ctx.drawImage(img, srcX, srcY, srcW, srcH, x - diameter / 2, y - diameter / 2, diameter, diameter);
        return true;
    },

    /**
     * Draw rock prop from mapAssets
     */
    drawRock(ctx, x, y, radius) {
        const img = this.images.mapAssets;
        if (!img || !img.complete) return false;

        // Rock region: x: 65%..78%, y: 80%..98%
        const srcX = img.width * 0.65;
        const srcY = img.height * 0.80;
        const srcW = img.width * 0.12;
        const srcH = img.height * 0.16;

        const size = radius * 2.2;
        ctx.drawImage(img, srcX, srcY, srcW, srcH, x - size / 2, y - size / 2, size, size);
        return true;
    }
};
