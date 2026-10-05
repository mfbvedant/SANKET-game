/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Mini-Map System
   ═══════════════════════════════════════════════════════════ */

const MinimapSystem = {
    size: 160,
    padding: 16,
    scale: 0,

    init() {
        this.scale = this.size / GAME.MAP_WIDTH;
    },

    /**
     * Render the minimap in the top-right corner.
     */
    render(ctx, canvas) {
        const x = canvas.width - this.size - this.padding;
        const y = this.padding;

        // Background
        ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(x, y, this.size, this.size);
        ctx.fill();
        ctx.stroke();

        const s = this.scale;

        // ── Roads ──────────────────────────────────────────────
        ctx.fillStyle = 'rgba(80, 80, 80, 0.5)';
        for (const road of MapSystem.roads) {
            ctx.fillRect(
                x + road.x * s,
                y + road.y * s,
                Math.max(road.w * s, 1),
                Math.max(road.h * s, 1)
            );
        }

        // ── Buildings ──────────────────────────────────────────
        ctx.fillStyle = 'rgba(100, 100, 110, 0.6)';
        for (const b of MapSystem.buildings) {
            ctx.fillRect(x + b.x * s, y + b.y * s, b.w * s, b.h * s);
        }

        // ── Safe zone ─────────────────────────────────────────
        if (SafeZoneSystem.isActive) {
            // Current zone
            ctx.beginPath();
            ctx.arc(
                x + SafeZoneSystem.currentX * s,
                y + SafeZoneSystem.currentY * s,
                SafeZoneSystem.currentRadius * s,
                0, Math.PI * 2
            );
            ctx.strokeStyle = 'rgba(0, 180, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Next zone
            if (SafeZoneSystem.phaseState === 'waiting') {
                ctx.beginPath();
                ctx.arc(
                    x + SafeZoneSystem.targetX * s,
                    y + SafeZoneSystem.targetY * s,
                    SafeZoneSystem.targetRadius * s,
                    0, Math.PI * 2
                );
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // ── Player ─────────────────────────────────────────────
        if (Player.isAlive) {
            ctx.beginPath();
            ctx.arc(x + Player.x * s, y + Player.y * s, 3, 0, Math.PI * 2);
            ctx.fillStyle = GAME.COLORS.PLAYER;
            ctx.fill();

            // Direction indicator
            const dirLen = 6;
            ctx.beginPath();
            ctx.moveTo(x + Player.x * s, y + Player.y * s);
            ctx.lineTo(
                x + Player.x * s + Math.cos(Player.aimAngle) * dirLen,
                y + Player.y * s + Math.sin(Player.aimAngle) * dirLen
            );
            ctx.strokeStyle = GAME.COLORS.PLAYER;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // ── Camera viewport ────────────────────────────────────
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            x + CameraSystem.x * s,
            y + CameraSystem.y * s,
            CameraSystem.screenW * s,
            CameraSystem.screenH * s
        );

        // Label
        ctx.fillStyle = '#546e7a';
        ctx.font = '8px Orbitron';
        ctx.textAlign = 'right';
        ctx.fillText('MAP', x + this.size - 4, y + this.size - 4);
    },
};
