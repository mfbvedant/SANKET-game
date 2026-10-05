/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — HUD System
   Renders the in-game heads-up display.
   ═══════════════════════════════════════════════════════════ */

const HUDSystem = {
    /**
     * Render the full HUD (called in screen space, not world space).
     */
    render(ctx, canvas) {
        if (!Player.isAlive && !Player.healthComp) return;

        const W = canvas.width;
        const H = canvas.height;

        // ── Bottom-left: Health & Armor bars ──────────────────
        this._renderHealthArmor(ctx, 20, H - 90, 200);

        // ── Bottom-center: Weapon & Ammo ──────────────────────
        this._renderWeaponInfo(ctx, W / 2, H - 50);

        // ── Bottom-right: Weapon slots ────────────────────────
        this._renderWeaponSlots(ctx, W - 220, H - 90);

        // ── Top-left: Kill count & Alive count ────────────────
        this._renderMatchInfo(ctx, 20, 20);

        // ── Top-center: Zone timer ────────────────────────────
        this._renderZoneTimer(ctx, W / 2, 20);

        // ── Pickup prompt ─────────────────────────────────────
        this._renderPickupPrompt(ctx, W / 2, H / 2 + 80);

        // ── Inventory overlay ─────────────────────────────────
        if (Player.showInventory) {
            this._renderInventory(ctx, W, H);
        }

        // ── Spectator banner ──────────────────────────────────
        if (!Player.isAlive) {
            this._renderSpectatorOverlay(ctx, W, H);
        }

        // ── Drop-in animation overlay ─────────────────────────
        if (typeof GameManager !== 'undefined' && GameManager.matchElapsedTime < 3.0) {
            this._renderDropInOverlay(ctx, W, H, GameManager.matchElapsedTime);
        }

        // ── Outside zone warning ──────────────────────────────
        if (Player.isAlive && SafeZoneSystem.isActive && !SafeZoneSystem.isInsideZone(Player.x, Player.y)) {
            this._renderZoneWarning(ctx, W, H);
        }
    },

    _renderHealthArmor(ctx, x, y, width) {
        const bgH = 60;
        ctx.fillStyle = GAME.COLORS.HUD_BG;
        ctx.strokeStyle = GAME.COLORS.HUD_BORDER;
        ctx.lineWidth = 1;
        this._roundRect(ctx, x, y, width, bgH, 8);

        const barX = x + 12;
        const barW = width - 24;
        const barH = 12;

        // Health
        ctx.fillStyle = '#333';
        this._roundRect(ctx, barX, y + 12, barW, barH, 4);
        const hp = HealthSystem.healthPercent(Player.healthComp);
        ctx.fillStyle = hp > 0.3 ? GAME.COLORS.HEALTH_BAR : GAME.COLORS.HEALTH_BAR_LOW;
        if (hp > 0) this._roundRect(ctx, barX, y + 12, barW * hp, barH, 4);

        // Health text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(Player.healthComp.health)} HP`, barX + barW / 2, y + 22);

        // Armor
        ctx.fillStyle = '#333';
        this._roundRect(ctx, barX, y + 32, barW, barH, 4);
        const ap = HealthSystem.armorPercent(Player.healthComp);
        ctx.fillStyle = GAME.COLORS.ARMOR_BAR;
        if (ap > 0) this._roundRect(ctx, barX, y + 32, barW * ap, barH, 4);

        ctx.fillStyle = '#aaa';
        ctx.font = 'bold 10px Inter';
        ctx.fillText(`${Math.ceil(Player.healthComp.armor)} AR`, barX + barW / 2, y + 42);
    },

    _renderWeaponInfo(ctx, cx, cy) {
        const weapon = InventorySystem.getActiveWeapon(Player.inventory);
        if (!weapon) {
            ctx.fillStyle = '#888';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No Weapon — Find one!', cx, cy);
            return;
        }

        const bgW = 240;
        const bgH = 50;
        ctx.fillStyle = GAME.COLORS.HUD_BG;
        ctx.strokeStyle = GAME.COLORS.HUD_BORDER;
        ctx.lineWidth = 1;
        this._roundRect(ctx, cx - bgW / 2, cy - bgH / 2, bgW, bgH, 8);

        // Weapon name
        ctx.fillStyle = weapon.rarityColor;
        ctx.font = 'bold 11px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(weapon.name, cx, cy - 8);

        // Ammo display
        const reserve = InventorySystem.getAmmoReserve(Player.inventory);
        ctx.fillStyle = weapon.isReloading ? '#ffab00' : '#fff';
        ctx.font = 'bold 14px Orbitron';
        const ammoText = weapon.isReloading
            ? 'RELOADING...'
            : `${weapon.currentAmmo} / ${reserve}`;
        ctx.fillText(ammoText, cx, cy + 12);
    },

    _renderWeaponSlots(ctx, x, y) {
        const slotW = 60;
        const slotH = 60;
        const gap = 8;

        for (let i = 0; i < 3; i++) {
            const sx = x + i * (slotW + gap);
            const isActive = Player.inventory.activeSlot === i;
            const weapon = Player.inventory.weapons[i];

            // Slot background
            ctx.fillStyle = isActive ? 'rgba(0, 229, 255, 0.15)' : GAME.COLORS.HUD_BG;
            ctx.strokeStyle = isActive ? 'rgba(0, 229, 255, 0.6)' : GAME.COLORS.HUD_BORDER;
            ctx.lineWidth = isActive ? 2 : 1;
            this._roundRect(ctx, sx, y, slotW, slotH, 6);

            // Slot number
            ctx.fillStyle = isActive ? '#00e5ff' : '#666';
            ctx.font = 'bold 10px Orbitron';
            ctx.textAlign = 'left';
            ctx.fillText(`${i + 1}`, sx + 6, y + 14);

            if (weapon) {
                // Draw weapon icon asset
                const drawn = AssetManager.drawWeaponIcon(ctx, weapon.type, sx + slotW / 2, y + 28, 44, 24);
                if (!drawn) {
                    ctx.fillStyle = weapon.rarityColor;
                    ctx.font = 'bold 9px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText(weapon.type.toUpperCase(), sx + slotW / 2, y + 30);
                }

                // Ammo
                ctx.fillStyle = '#aaa';
                ctx.font = '9px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(`${weapon.currentAmmo}/${weapon.magSize}`, sx + slotW / 2, y + 50);
                ctx.fillText(`${weapon.currentAmmo}/${weapon.magSize}`, sx + slotW / 2, y + 48);
            } else {
                ctx.fillStyle = '#444';
                ctx.font = '10px Inter';
                ctx.textAlign = 'center';
                ctx.fillText('Empty', sx + slotW / 2, y + 35);
            }
        }
    },

    _renderMatchInfo(ctx, x, y) {
        const bgW = 180;
        const bgH = 50;
        ctx.fillStyle = GAME.COLORS.HUD_BG;
        ctx.strokeStyle = GAME.COLORS.HUD_BORDER;
        ctx.lineWidth = 1;
        this._roundRect(ctx, x, y, bgW, bgH, 8);

        // Alive count
        const alive = EnemySystem.aliveCount() + (Player.isAlive ? 1 : 0);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Orbitron';
        ctx.textAlign = 'left';
        ctx.fillText(`☠ ${Player.kills}`, x + 14, y + 22);

        ctx.fillStyle = '#90a4ae';
        ctx.font = '11px Orbitron';
        ctx.fillText(`${alive} ALIVE`, x + 14, y + 40);
    },

    _renderZoneTimer(ctx, cx, y) {
        if (!SafeZoneSystem.isActive) return;

        const bgW = 200;
        const bgH = 48;
        ctx.fillStyle = GAME.COLORS.HUD_BG;
        ctx.strokeStyle = SafeZoneSystem.phaseState === 'shrinking'
            ? 'rgba(255, 23, 68, 0.6)'
            : GAME.COLORS.HUD_BORDER;
        ctx.lineWidth = 1;
        this._roundRect(ctx, cx - bgW / 2, y, bgW, bgH, 8);

        // Status
        ctx.fillStyle = SafeZoneSystem.phaseState === 'shrinking' ? '#ff1744' : '#90a4ae';
        ctx.font = '9px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(SafeZoneSystem.getStatusText().toUpperCase(), cx, y + 16);

        // Timer
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Orbitron';
        ctx.fillText(SafeZoneSystem.getTimerDisplay(), cx, y + 38);
    },

    _renderPickupPrompt(ctx, cx, cy) {
        if (!Player.isAlive) return;
        const nearest = LootSystem.findNearestPickup(Player.x, Player.y);
        if (nearest) {
            const dist = Utils.distance(Player.x, Player.y, nearest.x, nearest.y);
            if (dist < GAME.LOOT_PICKUP_RANGE * 1.5) {
                const rarityLabel = nearest.rarity ? ` • ${nearest.rarity.toUpperCase()}` : '';
                const fullText = `[E] ${nearest.name}${rarityLabel}`;
                
                ctx.font = 'bold 12px Inter';
                const textW = ctx.measureText(fullText).width + 28;
                ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
                ctx.strokeStyle = nearest.color || GAME.COLORS.HUD_BORDER;
                ctx.lineWidth = 1.5;
                this._roundRect(ctx, cx - textW / 2, cy - 14, textW, 28, 6);

                ctx.fillStyle = nearest.color || '#fff';
                ctx.textAlign = 'center';
                ctx.fillText(fullText, cx, cy + 4);
            }
        }
    },

    _renderInventory(ctx, W, H) {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(6, 8, 14, 0.75)';
        ctx.fillRect(0, 0, W, H);

        const panelW = 320;
        const panelH = 400;
        const px = W / 2 - panelW / 2;
        const py = H / 2 - panelH / 2;

        ctx.fillStyle = GAME.COLORS.HUD_BG;
        ctx.strokeStyle = GAME.COLORS.HUD_BORDER;
        ctx.lineWidth = 2;
        this._roundRect(ctx, px, py, panelW, panelH, 12);

        // Title
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 14px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('INVENTORY', px + panelW / 2, py + 28);

        let yOff = py + 50;

        // Weapons
        ctx.fillStyle = '#90a4ae';
        ctx.font = '10px Orbitron';
        ctx.textAlign = 'left';
        ctx.fillText('WEAPONS', px + 16, yOff);
        yOff += 18;

        for (let i = 0; i < 3; i++) {
            const w = Player.inventory.weapons[i];
            const isActive = Player.inventory.activeSlot === i;
            ctx.fillStyle = isActive ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255,255,255,0.03)';
            this._roundRect(ctx, px + 12, yOff, panelW - 24, 28, 4);
            ctx.fillStyle = w ? (w.rarityColor || '#fff') : '#444';
            ctx.font = '11px Inter';
            ctx.fillText(`${i + 1}. ${w ? w.name : '(empty)'}`, px + 20, yOff + 18);
            if (w) {
                ctx.fillStyle = '#888';
                ctx.textAlign = 'right';
                ctx.fillText(`${w.currentAmmo}/${w.magSize}`, px + panelW - 20, yOff + 18);
                ctx.textAlign = 'left';
            }
            yOff += 34;
        }

        // Ammo
        yOff += 10;
        ctx.fillStyle = '#90a4ae';
        ctx.font = '10px Orbitron';
        ctx.fillText('AMMUNITION', px + 16, yOff);
        yOff += 18;

        const inv = Player.inventory;
        for (const [type, count] of Object.entries(inv.ammo)) {
            ctx.fillStyle = '#ccc';
            ctx.font = '11px Inter';
            ctx.fillText(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${count}`, px + 20, yOff);
            yOff += 20;
        }

        // Heal items
        yOff += 10;
        ctx.fillStyle = '#90a4ae';
        ctx.font = '10px Orbitron';
        ctx.fillText('HEALS [4]', px + 16, yOff);
        yOff += 18;
        ctx.fillStyle = '#ccc';
        ctx.font = '11px Inter';
        ctx.fillText(`Med Kits: ${inv.healItems.length}`, px + 20, yOff);
        yOff += 20;

        // Armor items
        ctx.fillStyle = '#90a4ae';
        ctx.font = '10px Orbitron';
        ctx.fillText('ARMOR [5]', px + 16, yOff);
        yOff += 18;
        ctx.fillStyle = '#ccc';
        ctx.font = '11px Inter';
        ctx.fillText(`Plates: ${inv.armorItems.length}`, px + 20, yOff);

        // Close hint
        ctx.fillStyle = '#546e7a';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Press Tab to close', px + panelW / 2, py + panelH - 16);
    },

    _renderZoneWarning(ctx, W, H) {
        const alpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.15;
        ctx.fillStyle = `rgba(255, 23, 68, ${alpha})`;
        // Vignette effect on edges
        const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.55);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, `rgba(255, 23, 68, ${alpha})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#ff1744';
        ctx.font = 'bold 14px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ OUTSIDE SAFE ZONE ⚠', W / 2, 80);
    },

    _renderSpectatorOverlay(ctx, W, H) {
        ctx.fillStyle = 'rgba(10, 14, 23, 0.8)';
        this._roundRect(ctx, W / 2 - 140, 75, 280, 36, 8);

        ctx.fillStyle = '#ffab00';
        ctx.font = 'bold 13px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('👁 SPECTATING MATCH', W / 2, 98);
    },

    _renderDropInOverlay(ctx, W, H, elapsed) {
        const remaining = Math.max(0, 3.0 - elapsed);
        const count = Math.ceil(remaining);

        ctx.fillStyle = 'rgba(6, 8, 14, 0.45)';
        ctx.fillRect(0, 0, W, H);

        const bannerY = H * 0.32;

        // Container
        ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.5;
        this._roundRect(ctx, W / 2 - 220, bannerY - 30, 440, 110, 12);

        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 16px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('🪂 DEPLOYING TO COMBAT ZONE', W / 2, bannerY);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Orbitron';
        ctx.fillText(count > 0 ? `00:0${count}` : 'FIGHT!', W / 2, bannerY + 50);

        // Pulse ring
        const progress = elapsed % 1.0;
        const radius = progress * 60 + 20;
        const alpha = 1.0 - progress;
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(W / 2, bannerY + 38, radius, 0, Math.PI * 2);
        ctx.stroke();
    },

    /**
     * Utility: draw a filled + stroked rounded rect.
     */
    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        if (ctx.lineWidth > 0 && ctx.strokeStyle) {
            ctx.stroke();
        }
    },
};
