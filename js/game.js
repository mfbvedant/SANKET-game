/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Game Manager
   Main game loop, state management, and initialization.
   ═══════════════════════════════════════════════════════════ */

const Game = {
    canvas: null,
    ctx: null,
    state: 'MAIN_MENU',  // MAIN_MENU | PLAYING | RESULTS
    lastTime: 0,
    matchStartTime: 0,
    matchElapsedTime: 0,

    /**
     * Initialize the game.
     */
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());

        // Initialize audio & assets
        AudioSystem.init();
        AssetManager.init();

        // Bind UI buttons
        document.getElementById('btnPlay').addEventListener('click', () => {
            AudioSystem.resume();
            AudioSystem.playUIClick();
            this.startMatch();
        });
        document.getElementById('btnHowTo').addEventListener('click', () => {
            AudioSystem.playUIClick();
            document.getElementById('mainMenu').classList.add('hidden');
            document.getElementById('howToPlay').classList.remove('hidden');
        });
        document.getElementById('btnBackMenu').addEventListener('click', () => {
            AudioSystem.playUIClick();
            document.getElementById('howToPlay').classList.add('hidden');
            document.getElementById('mainMenu').classList.remove('hidden');
        });
        document.getElementById('btnPlayAgain').addEventListener('click', () => {
            AudioSystem.playUIClick();
            this.startMatch();
        });
        document.getElementById('btnMainMenu').addEventListener('click', () => {
            AudioSystem.playUIClick();
            document.getElementById('resultsScreen').classList.add('hidden');
            document.getElementById('mainMenu').classList.remove('hidden');
            this.state = 'MAIN_MENU';
        });

        // Bind player input
        Player.bindInput(this.canvas);

        // Initialize minimap
        MinimapSystem.init();

        // Start render loop
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this._gameLoop(t));
    },

    /**
     * Start a new match.
     */
    startMatch() {
        // Hide menus
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('howToPlay').classList.add('hidden');
        document.getElementById('resultsScreen').classList.add('hidden');

        // Generate map
        MapSystem.generate();

        // Reset systems
        ProjectileSystem.reset();
        LootSystem.reset();
        EnemySystem.reset();
        VFXSystem.reset();

        // Spawn loot
        LootSystem.spawnInitialLoot();

        // Spawn player at a random spawn point
        const playerSpawn = Utils.randomPick(MapSystem.spawnPoints);
        Player.init(playerSpawn.x, playerSpawn.y);

        // Initialize camera on player
        CameraSystem.init(this.canvas);
        CameraSystem.follow(Player.x, Player.y);
        CameraSystem.x = Player.x - this.canvas.width / 2;
        CameraSystem.y = Player.y - this.canvas.height / 2;

        // Spawn enemies
        EnemySystem.spawnEnemies(GAME.ENEMY_COUNT);

        // Start safe zone
        SafeZoneSystem.start();

        // Set game state
        this.state = 'PLAYING';
        this.matchStartTime = performance.now();
        this.matchElapsedTime = 0;
    },

    /**
     * Main game loop.
     */
    _gameLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // cap delta time
        this.lastTime = timestamp;

        if (this.state === 'PLAYING' || this.state === 'ENDING') {
            this._update(dt);
            this._render();
        } else if (this.state === 'MAIN_MENU') {
            this._renderMenuBackground();
        }

        requestAnimationFrame((t) => this._gameLoop(t));
    },

    /**
     * Update all game systems.
     */
    _update(dt) {
        this.matchElapsedTime += dt;

        // Update player
        Player.update(dt);

        // Update camera to follow player or spectate killer / remaining AI
        if (Player.isAlive) {
            CameraSystem.follow(Player.x, Player.y);
        } else {
            let spectateTarget = null;
            if (Player.killedBy) {
                spectateTarget = EnemySystem.enemies.find(e => e.id === Player.killedBy && e.healthComp.alive);
            }
            if (!spectateTarget) {
                spectateTarget = EnemySystem.enemies.find(e => e.healthComp.alive);
            }
            if (spectateTarget) {
                CameraSystem.follow(spectateTarget.x, spectateTarget.y);
            }
        }
        CameraSystem.update(dt);

        // Update enemies
        EnemySystem.update(dt);

        // Update projectiles
        ProjectileSystem.update(dt);

        // Update safe zone
        SafeZoneSystem.update(dt);

        // Update VFX
        VFXSystem.update(dt);

        // Track kills — check which enemies just died and who killed them
        for (const enemy of EnemySystem.enemies) {
            if (!enemy.healthComp.alive && !enemy._deathCounted) {
                enemy._deathCounted = true;
                // Determine killer name for kill feed
                let killerName = 'Zone';
                if (enemy.killedBy === Player.id) {
                    Player.kills++;
                    killerName = 'You';
                } else if (enemy.killedBy) {
                    // Another AI killed this enemy
                    const killerEnemy = EnemySystem.enemies.find(e => e.id === enemy.killedBy);
                    killerName = killerEnemy ? `Fighter ${enemy.killedBy.split('_')[1]}` : 'Fighter';
                }
                const victimName = `Fighter ${enemy.id.split('_')[1]}`;
                const weaponName = enemy.weapon ? enemy.weapon.name : '';
                VFXSystem.addKillFeedEntry(killerName, victimName, weaponName);
            }
        }

        // ── Check game-over conditions ─────────────────────────
        if (!Player.isAlive && this.state === 'PLAYING') {
            // Add kill feed entry for player death
            let killerName = 'Zone';
            if (Player.killedBy) {
                const killerEnemy = EnemySystem.enemies.find(e => e.id === Player.killedBy);
                killerName = killerEnemy ? `Fighter ${Player.killedBy.split('_')[1]}` : 'Fighter';
            }
            VFXSystem.addKillFeedEntry(killerName, 'You', '');
            // Small delay so player sees the death
            this.state = 'ENDING';
            setTimeout(() => this._endMatch(false), 1500);
        }

        // Win condition: player alive, all enemies dead
        if (Player.isAlive && EnemySystem.aliveCount() === 0 && this.state === 'PLAYING') {
            this._endMatch(true);
        }
    },

    /**
     * End the match and show results.
     */
    _endMatch(won) {
        this.state = 'RESULTS';

        const placement = won ? 1 : EnemySystem.aliveCount() + 1;
        const timeStr = Utils.formatTime(this.matchElapsedTime);

        document.getElementById('resultTitle').textContent = won ? '🏆 WINNER WINNER!' : 'ELIMINATED';
        document.getElementById('resultTitle').style.color = won ? '#00e676' : '#ff1744';
        document.getElementById('resultPlacement').textContent = `#${placement}`;
        document.getElementById('resultKills').textContent = Player.kills;
        document.getElementById('resultTime').textContent = timeStr;

        document.getElementById('resultsScreen').classList.remove('hidden');

        if (won) {
            AudioSystem.playWin();
        } else {
            AudioSystem.playElimination();
        }
    },

    /**
     * Render the game world.
     */
    _render() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Clear
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ── World space rendering ──────────────────────────────
        CameraSystem.applyTransform(ctx);

        // Map
        MapSystem.render(ctx, CameraSystem);

        // Safe zone
        SafeZoneSystem.render(ctx);

        // Loot
        LootSystem.render(ctx);

        // Projectiles
        ProjectileSystem.render(ctx);

        // Enemies
        EnemySystem.render(ctx);

        // Player
        Player.render(ctx);

        // VFX (world space)
        VFXSystem.renderWorld(ctx);

        CameraSystem.restore(ctx);

        // ── Screen space rendering (HUD) ──────────────────────
        HUDSystem.render(ctx, canvas);
        MinimapSystem.render(ctx, canvas);
        VFXSystem.renderScreen(ctx, canvas);
        Player.renderCrosshair(ctx);
    },

    /**
     * Render animated background for the main menu.
     */
    _renderMenuBackground() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        const t = performance.now() * 0.001;

        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Animated grid
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
        ctx.lineWidth = 1;
        const gridSize = 60;
        const offset = (t * 20) % gridSize;
        for (let x = -gridSize + offset; x < canvas.width + gridSize; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = -gridSize + offset; y < canvas.height + gridSize; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Floating particles
        for (let i = 0; i < 30; i++) {
            const px = (Math.sin(t * 0.3 + i * 2.1) * 0.5 + 0.5) * canvas.width;
            const py = (Math.cos(t * 0.2 + i * 1.7) * 0.5 + 0.5) * canvas.height;
            const size = 1 + Math.sin(t + i) * 0.5;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 229, 255, ${0.1 + Math.sin(t + i) * 0.08})`;
            ctx.fill();
        }
    },

    /**
     * Resize the canvas to fill the window.
     */
    _resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        CameraSystem.resize(this.canvas);
    },
};

// ── Boot ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
