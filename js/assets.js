/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Asset Manager
   Loads and renders all visual game assets.
   ═══════════════════════════════════════════════════════════ */

const AssetManager = {
    images: {},

    loadedCount: 0,
    totalCount: 0,
    isLoaded: false,
    loadFailed: false,

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
     * Preload every game image.
     */
    init() {
        const keys = Object.keys(this.SOURCES);

        this.loadedCount = 0;
        this.totalCount = keys.length;
        this.isLoaded = false;
        this.loadFailed = false;
        this.images = {};

        if (this.totalCount === 0) {
            this.isLoaded = true;
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            let completed = 0;

            const finishAsset = (key, success) => {
                completed++;
                this.loadedCount = completed;

                if (!success) {
                    this.loadFailed = true;
                    console.warn(
                        `Failed to load asset: ${this.SOURCES[key]}`
                    );
                }

                if (completed >= this.totalCount) {
                    this.isLoaded = true;
                    resolve();
                }
            };

            keys.forEach((key) => {
                const img = new Image();

                img.onload = () => {
                    img.dataset.assetKey = key;
                    finishAsset(key, true);
                };

                img.onerror = () => {
                    finishAsset(key, false);
                };

                img.src = this.SOURCES[key];
                this.images[key] = img;
            });
        });
    },

    /**
     * Check whether an asset is ready for drawing.
     */
    isReady(key) {
        const img = this.images[key];

        return !!(
            img &&
            img.complete &&
            img.naturalWidth > 0 &&
            img.naturalHeight > 0
        );
    },

    /**
     * Get loading progress from 0 to 1.
     */
    getLoadProgress() {
        if (this.totalCount <= 0) return 1;

        return Math.min(
            1,
            this.loadedCount / this.totalCount
        );
    },

    /**
     * Generic centered image renderer.
     */
    drawCentered(
        ctx,
        img,
        x,
        y,
        width,
        height,
        angle = 0,
        alpha = 1
    ) {
        if (!img || !img.complete || img.naturalWidth <= 0) {
            return false;
        }

        ctx.save();

        ctx.globalAlpha *= alpha;
        ctx.translate(x, y);
        ctx.rotate(angle);

        ctx.drawImage(
            img,
            -width / 2,
            -height / 2,
            width,
            height
        );

        ctx.restore();

        return true;
    },

    /**
     * Draw weapon icon.
     *
     * Weapon lineup:
     * 0 = pistol
     * 1 = SMG
     * 2 = assault rifle
     * 3 = shotgun
     * 4 = sniper
     */
    drawWeaponIcon(ctx, weaponKey, x, y, width, height) {
        const img = this.images.weaponsLineup;

        if (!this.isReady('weaponsLineup')) {
            return false;
        }

        const indexMap = {
            pistol: 0,
            smg: 1,
            ar: 2,
            assault: 2,
            assault_rifle: 2,
            shotgun: 3,
            sniper: 4,
        };

        const idx =
            indexMap[weaponKey] !== undefined
                ? indexMap[weaponKey]
                : 0;

        const totalWeapons = 5;

        const srcW = img.naturalWidth / totalWeapons;
        const srcH = img.naturalHeight;
        const srcX = idx * srcW;

        ctx.save();

        ctx.imageSmoothingEnabled = true;

        ctx.drawImage(
            img,
            srcX,
            0,
            srcW,
            srcH,
            x - width / 2,
            y - height / 2,
            width,
            height
        );

        ctx.restore();

        return true;
    },

    /**
     * Draw loot icon from the loot icon sheet.
     */
    drawLootIcon(ctx, type, subKey, x, y, size) {
        const img = this.images.lootIcons;

        if (!this.isReady('lootIcons')) {
            return false;
        }

        let col = 0;
        let row = 0;

        if (type === 'health') {
            col = 0;
            row = 0;
        } else if (type === 'armor') {
            col = 0;
            row = 1;
        } else if (type === 'ammo') {
            if (subKey === 'light') {
                col = 0;
                row = 2;
            } else if (subKey === 'medium') {
                col = 1;
                row = 2;
            } else {
                col = 2;
                row = 2;
            }
        } else if (type === 'weapon') {
            col = 0;
            row = 4;
        }

        const cols = 7;
        const rows = 5;

        const cellW = img.naturalWidth / cols;
        const cellH = img.naturalHeight / rows;

        const srcX = col * cellW;
        const srcY = row * cellH;

        ctx.save();

        ctx.imageSmoothingEnabled = true;

        ctx.drawImage(
            img,
            srcX,
            srcY,
            cellW,
            cellH,
            x - size / 2,
            y - size / 2,
            size,
            size
        );

        ctx.restore();

        return true;
    },

    /**
     * Draw a vehicle from the tactical map sheet.
     */
    drawVehicle(
        ctx,
        type,
        x,
        y,
        width,
        height,
        angle = 0
    ) {
        const img = this.images.mapAssets;

        if (!this.isReady('mapAssets')) {
            return false;
        }

        const vehicleMap = {
            jeep: 0,
            truck: 1,
            buggy: 2,
            bike: 3,
            sedan: 4,
            boat: 5,
            armored: 6,
        };

        const idx =
            vehicleMap[type] !== undefined
                ? vehicleMap[type]
                : 0;

        const totalVehicles = 7;

        const srcW = img.naturalWidth / totalVehicles;

        /*
         * Vehicle strip occupies approximately
         * 42% to 58% of the source sheet.
         */
        const srcH = img.naturalHeight * 0.16;
        const srcX = idx * srcW;
        const srcY = img.naturalHeight * 0.42;

        ctx.save();

        ctx.translate(x, y);
        ctx.rotate(angle);

        ctx.drawImage(
            img,
            srcX,
            srcY,
            srcW,
            srcH,
            -width / 2,
            -height / 2,
            width,
            height
        );

        ctx.restore();

        return true;
    },

    /**
     * Draw a top-down character skin.
     */
    drawTopDownCharacter(
        ctx,
        skinIdx,
        x,
        y,
        size,
        angle = 0
    ) {
        const img = this.images.mapAssets;

        if (!this.isReady('mapAssets')) {
            return false;
        }

        const totalSkins = 8;

        const numericSkin =
            Number.isFinite(Number(skinIdx))
                ? Number(skinIdx)
                : 0;

        const idx =
            Math.abs(Math.floor(numericSkin)) % totalSkins;

        const srcW = img.naturalWidth / totalSkins;
        const srcH = img.naturalHeight * 0.20;

        const srcX = idx * srcW;

        ctx.save();

        ctx.translate(x, y);

        /*
         * Asset faces upward by default.
         * Rotate it to match the game's forward direction.
         */
        ctx.rotate(angle + Math.PI / 2);

        ctx.drawImage(
            img,
            srcX,
            0,
            srcW,
            srcH,
            -size / 2,
            -size / 2,
            size,
            size
        );

        ctx.restore();

        return true;
    },

    /**
     * Draw a tree.
     */
    drawTree(ctx, x, y, radius) {
        const img = this.images.mapAssets;

        if (!this.isReady('mapAssets')) {
            return false;
        }

        const srcX = img.naturalWidth * 0.56;
        const srcY = img.naturalHeight * 0.60;

        const srcW = img.naturalWidth * 0.18;
        const srcH = img.naturalHeight * 0.25;

        const diameter = Math.max(
            1,
            radius * 2.2
        );

        ctx.save();

        ctx.drawImage(
            img,
            srcX,
            srcY,
            srcW,
            srcH,
            x - diameter / 2,
            y - diameter / 2,
            diameter,
            diameter
        );

        ctx.restore();

        return true;
    },

    /**
     * Draw a rock.
     */
    drawRock(ctx, x, y, radius) {
        const img = this.images.mapAssets;

        if (!this.isReady('mapAssets')) {
            return false;
        }

        const srcX = img.naturalWidth * 0.65;
        const srcY = img.naturalHeight * 0.80;

        const srcW = img.naturalWidth * 0.12;
        const srcH = img.naturalHeight * 0.16;

        const size = Math.max(
            1,
            radius * 2.2
        );

        ctx.save();

        ctx.drawImage(
            img,
            srcX,
            srcY,
            srcW,
            srcH,
            x - size / 2,
            y - size / 2,
            size,
            size
        );

        ctx.restore();

        return true;
    },

    /**
     * Draw the hero character.
     */
    drawHero(
        ctx,
        x,
        y,
        width,
        height,
        angle = 0
    ) {
        const img = this.images.hero;

        if (!this.isReady('hero')) {
            return false;
        }

        return this.drawCentered(
            ctx,
            img,
            x,
            y,
            width,
            height,
            angle
        );
    },

    /**
     * Draw the soldier animation sprite sheet.
     *
     * This is a generic helper. The exact number of frames
     * can be overridden by the caller.
     */
    drawSpriteFrame(
        ctx,
        key,
        frame,
        frameCount,
        x,
        y,
        width,
        height,
        angle = 0
    ) {
        const img = this.images[key];

        if (
            !img ||
            !img.complete ||
            img.naturalWidth <= 0 ||
            img.naturalHeight <= 0
        ) {
            return false;
        }

        const frames = Math.max(
            1,
            Math.floor(frameCount)
        );

        const currentFrame =
            ((Math.floor(frame) % frames) + frames) % frames;

        const srcW = img.naturalWidth / frames;
        const srcH = img.naturalHeight;

        ctx.save();

        ctx.translate(x, y);
        ctx.rotate(angle);

        ctx.drawImage(
            img,
            currentFrame * srcW,
            0,
            srcW,
            srcH,
            -width / 2,
            -height / 2,
            width,
            height
        );

        ctx.restore();

        return true;
    },

    /**
     * Draw a simple fallback character when an asset
     * is unavailable.
     */
    drawFallbackCharacter(
        ctx,
        x,
        y,
        size,
        angle = 0,
        isEnemy = false
    ) {
        ctx.save();

        ctx.translate(x, y);
        ctx.rotate(angle);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(
            0,
            size * 0.28,
            size * 0.45,
            size * 0.20,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Body
        ctx.fillStyle = isEnemy
            ? '#8f3030'
            : '#d67b2c';

        ctx.beginPath();
        ctx.arc(
            0,
            0,
            size * 0.36,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Head
        ctx.fillStyle = '#c99a73';

        ctx.beginPath();
        ctx.arc(
            0,
            -size * 0.16,
            size * 0.22,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Direction indicator
        ctx.fillStyle = '#f2f2f2';

        ctx.beginPath();
        ctx.moveTo(
            0,
            -size * 0.52
        );
        ctx.lineTo(
            -size * 0.12,
            -size * 0.28
        );
        ctx.lineTo(
            size * 0.12,
            -size * 0.28
        );
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        return true;
    },
};