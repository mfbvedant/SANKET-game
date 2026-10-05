/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — HUD SYSTEM
   Polished in-game heads-up display.
   ═══════════════════════════════════════════════════════════ */

const HUDSystem = {

    /* =========================================================
       MAIN HUD
       ========================================================= */

    render(ctx, canvas) {
        if (typeof Player === 'undefined' || !Player.healthComp) return;

        const W = canvas.width;
        const H = canvas.height;

        // Main HUD
        this._renderHealthArmor(ctx, 20, H - 92, Math.min(230, W * 0.22));
        this._renderWeaponInfo(ctx, W / 2, H - 48);
        this._renderWeaponSlots(ctx, W - 220, H - 92);

        // Top information
        this._renderMatchInfo(ctx, 20, 20);
        this._renderZoneTimer(ctx, W / 2, 20);

        // Center feedback
        this._renderCrosshair(ctx, W / 2, H / 2);
        this._renderPickupPrompt(ctx, W / 2, H / 2 + 82);

        // Inventory
        if (Player.showInventory) {
            this._renderInventory(ctx, W, H);
        }

        // Spectator
        if (!Player.isAlive) {
            this._renderSpectatorOverlay(ctx, W, H);
        }

        // Drop-in
        if (
            typeof GameManager !== 'undefined' &&
            GameManager.matchElapsedTime < 3.0
        ) {
            this._renderDropInOverlay(
                ctx,
                W,
                H,
                GameManager.matchElapsedTime
            );
        }

        // Safe-zone warning
        if (
            Player.isAlive &&
            typeof SafeZoneSystem !== 'undefined' &&
            SafeZoneSystem.isActive &&
            !SafeZoneSystem.isInsideZone(Player.x, Player.y)
        ) {
            this._renderZoneWarning(ctx, W, H);
        }
    },


    /* =========================================================
       HEALTH + ARMOR
       ========================================================= */

    _renderHealthArmor(ctx, x, y, width) {

        const height = 64;

        // Panel
        ctx.fillStyle = 'rgba(10, 14, 23, 0.92)';
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;

        this._roundRect(
            ctx,
            x,
            y,
            width,
            height,
            8
        );

        const barX = x + 12;
        const barW = width - 24;
        const barH = 13;

        /* ---------- HEALTH ---------- */

        const hp = Math.max(
            0,
            Math.min(
                1,
                HealthSystem.healthPercent(Player.healthComp)
            )
        );

        // Background
        ctx.fillStyle = '#20242b';

        this._roundRect(
            ctx,
            barX,
            y + 11,
            barW,
            barH,
            4
        );

        // Health color
        ctx.fillStyle =
            hp <= 0.25
                ? GAME.COLORS.HEALTH_BAR_LOW
                : GAME.COLORS.HEALTH_BAR;

        if (hp > 0) {
            this._roundRect(
                ctx,
                barX,
                y + 11,
                barW * hp,
                barH,
                4
            );
        }

        // HP text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';

        ctx.fillText(
            `${Math.ceil(Player.healthComp.health)} HP`,
            barX + barW / 2,
            y + 21
        );


        /* ---------- ARMOR ---------- */

        const armor = Math.max(
            0,
            Math.min(
                1,
                HealthSystem.armorPercent(Player.healthComp)
            )
        );

        ctx.fillStyle = '#20242b';

        this._roundRect(
            ctx,
            barX,
            y + 35,
            barW,
            barH,
            4
        );

        ctx.fillStyle = GAME.COLORS.ARMOR_BAR;

        if (armor > 0) {
            this._roundRect(
                ctx,
                barX,
                y + 35,
                barW * armor,
                barH,
                4
            );
        }

        ctx.fillStyle = '#d7dce0';
        ctx.font = 'bold 10px Inter';

        ctx.fillText(
            `${Math.ceil(Player.healthComp.armor)} AR`,
            barX + barW / 2,
            y + 45
        );
    },


    /* =========================================================
       WEAPON INFORMATION
       ========================================================= */

    _renderWeaponInfo(ctx, cx, cy) {

        const weapon =
            InventorySystem.getActiveWeapon(
                Player.inventory
            );

        if (!weapon) {

            ctx.fillStyle = 'rgba(10,14,23,0.85)';
            this._roundRect(
                ctx,
                cx - 110,
                cy - 20,
                220,
                40,
                8
            );

            ctx.fillStyle = '#8b949e';
            ctx.font = 'bold 11px Inter';
            ctx.textAlign = 'center';

            ctx.fillText(
                'NO WEAPON — FIND ONE',
                cx,
                cy + 4
            );

            return;
        }


        const panelW = 250;
        const panelH = 58;

        ctx.fillStyle = 'rgba(10,14,23,0.94)';
        ctx.strokeStyle =
            weapon.rarityColor || GAME.COLORS.HUD_BORDER;

        ctx.lineWidth = 1;

        this._roundRect(
            ctx,
            cx - panelW / 2,
            cy - panelH / 2,
            panelW,
            panelH,
            8
        );


        // Weapon name
        ctx.fillStyle =
            weapon.rarityColor || '#ffffff';

        ctx.font = 'bold 12px Orbitron';
        ctx.textAlign = 'center';

        ctx.fillText(
            weapon.name,
            cx,
            cy - 10
        );


        // Ammo
        const reserve =
            InventorySystem.getAmmoReserve(
                Player.inventory
            );

        if (weapon.isReloading) {

            ctx.fillStyle = '#ffab00';
            ctx.font = 'bold 13px Orbitron';

            ctx.fillText(
                'RELOADING...',
                cx,
                cy + 15
            );

        } else {

            const ammoColor =
                weapon.currentAmmo <= 0
                    ? '#ff1744'
                    : weapon.currentAmmo <=
                        Math.ceil(weapon.magSize * 0.25)
                        ? '#ffab00'
                        : '#ffffff';

            ctx.fillStyle = ammoColor;
            ctx.font = 'bold 17px Orbitron';

            ctx.fillText(
                `${weapon.currentAmmo} / ${reserve}`,
                cx,
                cy + 16
            );
        }
    },


    /* =========================================================
       WEAPON SLOTS
       ========================================================= */

    _renderWeaponSlots(ctx, x, y) {

        const slotW = 62;
        const slotH = 62;
        const gap = 8;

        for (let i = 0; i < 3; i++) {

            const sx =
                x + i * (slotW + gap);

            const weapon =
                Player.inventory.weapons[i];

            const active =
                Player.inventory.activeSlot === i;


            // Active glow
            if (active) {

                ctx.fillStyle =
                    'rgba(0,229,255,0.08)';

                this._roundRect(
                    ctx,
                    sx - 2,
                    y - 2,
                    slotW + 4,
                    slotH + 4,
                    8
                );
            }


            // Slot
            ctx.fillStyle =
                active
                    ? 'rgba(0,229,255,0.14)'
                    : 'rgba(10,14,23,0.92)';

            ctx.strokeStyle =
                active
                    ? '#00e5ff'
                    : 'rgba(255,255,255,0.12)';

            ctx.lineWidth = active ? 2 : 1;

            this._roundRect(
                ctx,
                sx,
                y,
                slotW,
                slotH,
                7
            );


            // Number
            ctx.fillStyle =
                active ? '#00e5ff' : '#68727c';

            ctx.font = 'bold 10px Orbitron';
            ctx.textAlign = 'left';

            ctx.fillText(
                `${i + 1}`,
                sx + 6,
                y + 13
            );


            if (weapon) {

                // Weapon icon
                const drawn =
                    AssetManager.drawWeaponIcon(
                        ctx,
                        weapon.type,
                        sx + slotW / 2,
                        y + 29,
                        44,
                        24
                    );


                if (!drawn) {

                    ctx.fillStyle =
                        weapon.rarityColor || '#ffffff';

                    ctx.font = 'bold 8px Inter';
                    ctx.textAlign = 'center';

                    ctx.fillText(
                        weapon.type.toUpperCase(),
                        sx + slotW / 2,
                        y + 31
                    );
                }


                // Ammo
                ctx.fillStyle =
                    weapon.currentAmmo <= 0
                        ? '#ff1744'
                        : '#b8c0c7';

                ctx.font = '9px Inter';
                ctx.textAlign = 'center';

                ctx.fillText(
                    `${weapon.currentAmmo}/${weapon.magSize}`,
                    sx + slotW / 2,
                    y + 51
                );

            } else {

                ctx.fillStyle = '#454b52';
                ctx.font = '9px Inter';
                ctx.textAlign = 'center';

                ctx.fillText(
                    'EMPTY',
                    sx + slotW / 2,
                    y + 35
                );
            }
        }
    },


    /* =========================================================
       MATCH INFORMATION
       ========================================================= */

    _renderMatchInfo(ctx, x, y) {

        const width = 185;
        const height = 58;

        ctx.fillStyle = 'rgba(10,14,23,0.92)';
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;

        this._roundRect(
            ctx,
            x,
            y,
            width,
            height,
            8
        );


        const alive =
            EnemySystem.aliveCount() +
            (Player.isAlive ? 1 : 0);


        // Kills
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Orbitron';
        ctx.textAlign = 'left';

        ctx.fillText(
            `☠ ${Player.kills}`,
            x + 14,
            y + 23
        );


        ctx.fillStyle = '#7f8b95';
        ctx.font = '9px Orbitron';

        ctx.fillText(
            'KILLS',
            x + 14,
            y + 40
        );


        // Alive
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 15px Orbitron';

        ctx.fillText(
            `${alive}`,
            x + 108,
            y + 23
        );


        ctx.fillStyle = '#7f8b95';
        ctx.font = '9px Orbitron';

        ctx.fillText(
            'ALIVE',
            x + 108,
            y + 40
        );
    },


    /* =========================================================
       SAFE ZONE
       ========================================================= */

    _renderZoneTimer(ctx, cx, y) {

        if (
            typeof SafeZoneSystem === 'undefined' ||
            !SafeZoneSystem.isActive
        ) {
            return;
        }


        const width = 220;
        const height = 52;

        const shrinking =
            SafeZoneSystem.phaseState === 'shrinking';


        ctx.fillStyle =
            'rgba(10,14,23,0.94)';

        ctx.strokeStyle =
            shrinking
                ? 'rgba(255,23,68,0.75)'
                : 'rgba(255,255,255,0.12)';

        ctx.lineWidth = shrinking ? 2 : 1;

        this._roundRect(
            ctx,
            cx - width / 2,
            y,
            width,
            height,
            8
        );


        // Status
        ctx.fillStyle =
            shrinking
                ? '#ff1744'
                : '#8b979f';

        ctx.font = 'bold 9px Orbitron';
        ctx.textAlign = 'center';

        ctx.fillText(
            SafeZoneSystem
                .getStatusText()
                .toUpperCase(),
            cx,
            y + 16
        );


        // Timer
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Orbitron';

        ctx.fillText(
            SafeZoneSystem.getTimerDisplay(),
            cx,
            y + 39
        );
    },


    /* =========================================================
       CROSSHAIR
       ========================================================= */

    _renderCrosshair(ctx, cx, cy) {

        // Don't show crosshair during inventory
        if (Player.showInventory) return;

        const weapon =
            InventorySystem.getActiveWeapon(
                Player.inventory
            );

        const gap =
            weapon && weapon.isReloading
                ? 7
                : 5;

        const size = 7;

        ctx.save();

        ctx.strokeStyle =
            weapon && weapon.isReloading
                ? 'rgba(255,171,0,0.85)'
                : 'rgba(255,255,255,0.85)';

        ctx.lineWidth = 1.5;

        ctx.beginPath();

        // Top
        ctx.moveTo(cx, cy - gap - size);
        ctx.lineTo(cx, cy - gap);

        // Bottom
        ctx.moveTo(cx, cy + gap);
        ctx.lineTo(cx, cy + gap + size);

        // Left
        ctx.moveTo(cx - gap - size, cy);
        ctx.lineTo(cx - gap, cy);

        // Right
        ctx.moveTo(cx + gap, cy);
        ctx.lineTo(cx + gap + size, cy);

        ctx.stroke();

        ctx.restore();
    },


    /* =========================================================
       PICKUP PROMPT
       ========================================================= */

    _renderPickupPrompt(ctx, cx, cy) {

        if (!Player.isAlive) return;

        const nearest =
            LootSystem.findNearestPickup(
                Player.x,
                Player.y
            );

        if (!nearest) return;


        const distance =
            Utils.distance(
                Player.x,
                Player.y,
                nearest.x,
                nearest.y
            );


        if (
            distance >
            GAME.LOOT_PICKUP_RANGE * 1.5
        ) {
            return;
        }


        const rarity =
            nearest.rarity
                ? ` • ${nearest.rarity.toUpperCase()}`
                : '';


        const text =
            `[E] ${nearest.name}${rarity}`;


        ctx.font = 'bold 12px Inter';

        const textWidth =
            ctx.measureText(text).width;


        const boxW = textWidth + 32;
        const boxH = 30;


        ctx.fillStyle =
            'rgba(8,11,18,0.92)';

        ctx.strokeStyle =
            nearest.color ||
            GAME.COLORS.HUD_BORDER;

        ctx.lineWidth = 1.5;

        this._roundRect(
            ctx,
            cx - boxW / 2,
            cy - boxH / 2,
            boxW,
            boxH,
            7
        );


        ctx.fillStyle =
            nearest.color || '#ffffff';

        ctx.textAlign = 'center';

        ctx.fillText(
            text,
            cx,
            cy + 4
        );
    },


    /* =========================================================
       INVENTORY
       ========================================================= */

    _renderInventory(ctx, W, H) {

        // Background
        ctx.fillStyle =
            'rgba(4,6,11,0.78)';

        ctx.fillRect(
            0,
            0,
            W,
            H
        );


        const panelW =
            Math.min(360, W - 40);

        const panelH =
            Math.min(430, H - 40);

        const px =
            W / 2 - panelW / 2;

        const py =
            H / 2 - panelH / 2;


        ctx.fillStyle =
            'rgba(10,14,23,0.98)';

        ctx.strokeStyle =
            '#00e5ff';

        ctx.lineWidth = 1.5;

        this._roundRect(
            ctx,
            px,
            py,
            panelW,
            panelH,
            12
        );


        // Header
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 15px Orbitron';
        ctx.textAlign = 'center';

        ctx.fillText(
            'INVENTORY',
            W / 2,
            py + 28
        );


        ctx.fillStyle = '#596771';
        ctx.font = '9px Inter';

        ctx.fillText(
            'TAB TO CLOSE',
            W / 2,
            py + 43
        );


        let currentY = py + 65;


        /* ---------- WEAPONS ---------- */

        this._renderSectionTitle(
            ctx,
            'WEAPONS',
            px + 18,
            currentY
        );

        currentY += 18;


        for (let i = 0; i < 3; i++) {

            const weapon =
                Player.inventory.weapons[i];

            const active =
                Player.inventory.activeSlot === i;


            ctx.fillStyle =
                active
                    ? 'rgba(0,229,255,0.10)'
                    : 'rgba(255,255,255,0.025)';

            this._roundRect(
                ctx,
                px + 12,
                currentY,
                panelW - 24,
                30,
                5
            );


            ctx.fillStyle =
                weapon
                    ? weapon.rarityColor || '#ffffff'
                    : '#444c54';

            ctx.font = '11px Inter';
            ctx.textAlign = 'left';

            ctx.fillText(
                `${i + 1}. ${weapon
                    ? weapon.name
                    : '(empty)'
                }`,
                px + 20,
                currentY + 20
            );


            if (weapon) {

                ctx.fillStyle = '#8b949e';
                ctx.textAlign = 'right';

                ctx.fillText(
                    `${weapon.currentAmmo}/${weapon.magSize}`,
                    px + panelW - 20,
                    currentY + 20
                );
            }


            currentY += 36;
        }


        /* ---------- AMMUNITION ---------- */

        currentY += 8;

        this._renderSectionTitle(
            ctx,
            'AMMUNITION',
            px + 18,
            currentY
        );

        currentY += 18;


        const ammo =
            Player.inventory.ammo || {};


        for (const [type, count]
            of Object.entries(ammo)) {

            ctx.fillStyle = '#c7cdd2';
            ctx.font = '11px Inter';
            ctx.textAlign = 'left';

            ctx.fillText(
                `${this._formatAmmoName(type)}: ${count}`,
                px + 20,
                currentY
            );

            currentY += 19;
        }


        /* ---------- HEAL ---------- */

        currentY += 6;

        this._renderSectionTitle(
            ctx,
            'HEALS [4]',
            px + 18,
            currentY
        );

        currentY += 18;

        ctx.fillStyle = '#c7cdd2';
        ctx.font = '11px Inter';
        ctx.textAlign = 'left';

        ctx.fillText(
            `Med Kits: ${Player.inventory.healItems.length
            }`,
            px + 20,
            currentY
        );


        /* ---------- ARMOR ---------- */

        currentY += 28;

        this._renderSectionTitle(
            ctx,
            'ARMOR [5]',
            px + 18,
            currentY
        );

        currentY += 18;

        ctx.fillStyle = '#c7cdd2';

        ctx.fillText(
            `Armor Plates: ${Player.inventory.armorItems.length
            }`,
            px + 20,
            currentY
        );
    },


    /* =========================================================
       SECTION TITLE
       ========================================================= */

    _renderSectionTitle(ctx, text, x, y) {

        ctx.fillStyle = '#71808a';
        ctx.font = 'bold 9px Orbitron';
        ctx.textAlign = 'left';

        ctx.fillText(
            text,
            x,
            y
        );
    },


    /* =========================================================
       SAFE ZONE WARNING
       ========================================================= */

    _renderZoneWarning(ctx, W, H) {

        const pulse =
            0.18 +
            Math.sin(Date.now() * 0.005) * 0.10;


        // Vignette
        const gradient =
            ctx.createRadialGradient(
                W / 2,
                H / 2,
                W * 0.28,
                W / 2,
                H / 2,
                W * 0.72
            );


        gradient.addColorStop(
            0,
            'rgba(255,23,68,0)'
        );

        gradient.addColorStop(
            1,
            `rgba(255,23,68,${pulse})`
        );


        ctx.fillStyle = gradient;

        ctx.fillRect(
            0,
            0,
            W,
            H
        );


        // Warning banner
        const bannerW = 270;
        const bannerH = 34;

        ctx.fillStyle =
            'rgba(10,14,23,0.90)';

        ctx.strokeStyle =
            '#ff1744';

        ctx.lineWidth = 1.5;

        this._roundRect(
            ctx,
            W / 2 - bannerW / 2,
            78,
            bannerW,
            bannerH,
            7
        );


        ctx.fillStyle = '#ff1744';

        ctx.font = 'bold 12px Orbitron';
        ctx.textAlign = 'center';

        ctx.fillText(
            '⚠ OUTSIDE SAFE ZONE ⚠',
            W / 2,
            100
        );
    },


    /* =========================================================
       SPECTATOR
       ========================================================= */

    _renderSpectatorOverlay(ctx, W, H) {

        const width = 300;
        const height = 40;


        ctx.fillStyle =
            'rgba(8,11,18,0.90)';

        ctx.strokeStyle =
            '#ffab00';

        ctx.lineWidth = 1;

        this._roundRect(
            ctx,
            W / 2 - width / 2,
            72,
            width,
            height,
            8
        );


        ctx.fillStyle = '#ffab00';
        ctx.font = 'bold 13px Orbitron';
        ctx.textAlign = 'center';

        ctx.fillText(
            '👁 SPECTATING MATCH',
            W / 2,
            97
        );
    },


    /* =========================================================
       DROP-IN
       ========================================================= */

    _renderDropInOverlay(ctx, W, H, elapsed) {

        const remaining =
            Math.max(
                0,
                3.0 - elapsed
            );

        const count =
            Math.ceil(remaining);


        // Dark overlay
        ctx.fillStyle =
            'rgba(4,6,11,0.40)';

        ctx.fillRect(
            0,
            0,
            W,
            H
        );


        const bannerY =
            H * 0.32;


        const boxW = 440;
        const boxH = 112;


        ctx.fillStyle =
            'rgba(8,11,18,0.92)';

        ctx.strokeStyle =
            '#00e5ff';

        ctx.lineWidth = 1.5;

        this._roundRect(
            ctx,
            W / 2 - boxW / 2,
            bannerY - 30,
            boxW,
            boxH,
            12
        );


        // Header
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 15px Orbitron';
        ctx.textAlign = 'center';

        ctx.fillText(
            '🪂 DEPLOYING TO COMBAT ZONE',
            W / 2,
            bannerY
        );


        // Countdown
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Orbitron';

        ctx.fillText(
            count > 0
                ? `00:0${count}`
                : 'FIGHT!',
            W / 2,
            bannerY + 50
        );


        // Pulse ring
        const progress =
            elapsed % 1.0;

        const radius =
            progress * 60 + 20;

        const alpha =
            1 - progress;


        ctx.strokeStyle =
            `rgba(0,229,255,${alpha})`;

        ctx.lineWidth = 2;

        ctx.beginPath();

        ctx.arc(
            W / 2,
            bannerY + 38,
            radius,
            0,
            Math.PI * 2
        );

        ctx.stroke();
    },


    /* =========================================================
       AMMO NAME FORMATTER
       ========================================================= */

    _formatAmmoName(type) {

        if (!type) return 'Ammo';

        return type
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    },


    /* =========================================================
       ROUNDED RECTANGLE
       ========================================================= */

    _roundRect(ctx, x, y, w, h, r) {

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

        ctx.fill();

        if (
            ctx.lineWidth > 0 &&
            ctx.strokeStyle
        ) {
            ctx.stroke();
        }
    }
};