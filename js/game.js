/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — Game Manager
   Main game loop, state management, initialization.
   ═══════════════════════════════════════════════════════════ */

const Game = {
    canvas: null,
    ctx: null,

    // Game states:
    // MAIN_MENU | PLAYING | PAUSED | ENDING | RESULTS
    state: 'MAIN_MENU',

    lastTime: 0,

    matchStartTime: 0,
    matchElapsedTime: 0,

    // Used to prevent an old match-ending timer
    // from affecting a newly started match.
    matchId: 0,

    /**
     * Initialize the game.
     */
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this._resizeCanvas();

        window.addEventListener('resize', () => {
            this._resizeCanvas();
        });

        // Initialize audio & assets
        AudioSystem.init();
        AssetManager.init();

        // ─────────────────────────────────────────────
        // UI BUTTONS
        // ─────────────────────────────────────────────

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

            this.state = 'MAIN_MENU';
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

        // ─────────────────────────────────────────────
        // PLAYER INPUT
        // ─────────────────────────────────────────────

        Player.bindInput(this.canvas);

        // Global keyboard controls
        window.addEventListener('keydown', (event) => {
            this._handleGlobalKey(event);
        });

        // ─────────────────────────────────────────────
        // MINIMAP
        // ─────────────────────────────────────────────

        MinimapSystem.init();

        // ─────────────────────────────────────────────
        // START GAME LOOP
        // ─────────────────────────────────────────────

        this.lastTime = performance.now();

        requestAnimationFrame((t) => {
            this._gameLoop(t);
        });
    },

    /**
     * Handle global keyboard controls.
     *
     * ESC / P = Pause / Resume
     */
    _handleGlobalKey(event) {
        const key = event.key.toLowerCase();

        // Pause / resume only while actually playing
        if (key === 'escape' || key === 'p') {
            if (this.state === 'PLAYING') {
                this.pauseGame();
            } else if (this.state === 'PAUSED') {
                this.resumeGame();
            }

            return;
        }
    },

    /**
     * Start a new match.
     */
    startMatch() {
        // Create a new match ID.
        // This protects against delayed callbacks
        // from a previous match.
        this.matchId++;

        // Hide menus
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('howToPlay').classList.add('hidden');
        document.getElementById('resultsScreen').classList.add('hidden');

        // ─────────────────────────────────────────────
        // GENERATE MAP
        // ─────────────────────────────────────────────

        MapSystem.generate();

        // ─────────────────────────────────────────────
        // RESET SYSTEMS
        // ─────────────────────────────────────────────

        ProjectileSystem.reset();
        LootSystem.reset();
        EnemySystem.reset();
        VFXSystem.reset();

        // ─────────────────────────────────────────────
        // SPAWN LOOT
        // ─────────────────────────────────────────────

        LootSystem.spawnInitialLoot();

        // ─────────────────────────────────────────────
        // SPAWN PLAYER
        // ─────────────────────────────────────────────

        const playerSpawn = Utils.randomPick(MapSystem.spawnPoints);

        Player.init(
            playerSpawn.x,
            playerSpawn.y
        );

        // ─────────────────────────────────────────────
        // INITIALIZE CAMERA
        // ─────────────────────────────────────────────

        CameraSystem.init(this.canvas);

        CameraSystem.follow(
            Player.x,
            Player.y
        );

        CameraSystem.x =
            Player.x - this.canvas.width / 2;

        CameraSystem.y =
            Player.y - this.canvas.height / 2;

        // ─────────────────────────────────────────────
        // SPAWN ENEMIES
        // ─────────────────────────────────────────────

        EnemySystem.spawnEnemies(
            GAME.ENEMY_COUNT
        );

        // ─────────────────────────────────────────────
        // START SAFE ZONE
        // ─────────────────────────────────────────────

        SafeZoneSystem.start();

        // ─────────────────────────────────────────────
        // RESET MATCH TIMER
        // ─────────────────────────────────────────────

        this.matchStartTime = performance.now();
        this.matchElapsedTime = 0;

        // ─────────────────────────────────────────────
        // START PLAYING
        // ─────────────────────────────────────────────

        this.state = 'PLAYING';

        // Reset frame timer so the first frame doesn't
        // accidentally get a large delta time.
        this.lastTime = performance.now();
    },

    /**
     * Pause the game.
     */
    pauseGame() {
        if (this.state !== 'PLAYING') {
            return;
        }

        this.state = 'PAUSED';

        AudioSystem.playUIClick();

        this._render();
    },

    /**
     * Resume the game.
     */
    resumeGame() {
        if (this.state !== 'PAUSED') {
            return;
        }

        this.state = 'PLAYING';

        // Reset lastTime so we don't get a large
        // delta-time jump after pausing.
        this.lastTime = performance.now();

        AudioSystem.resume();
        AudioSystem.playUIClick();
    },

    /**
     * Main game loop.
     */
    _gameLoop(timestamp) {
        const dt = Math.min(
            (timestamp - this.lastTime) / 1000,
            0.05
        );

        this.lastTime = timestamp;

        // ─────────────────────────────────────────────
        // PLAYING
        // ─────────────────────────────────────────────

        if (
            this.state === 'PLAYING' ||
            this.state === 'ENDING'
        ) {
            this._update(dt);
            this._render();
        }

        // ─────────────────────────────────────────────
        // PAUSED
        // ─────────────────────────────────────────────

        else if (this.state === 'PAUSED') {
            // Do NOT update the game world.
            // Only render the frozen game + pause screen.
            this._render();
            this._renderPauseOverlay();
        }

        // ─────────────────────────────────────────────
        // MAIN MENU
        // ─────────────────────────────────────────────

        else if (this.state === 'MAIN_MENU') {
            this._renderMenuBackground();
        }

        // ─────────────────────────────────────────────
        // CONTINUE LOOP
        // ─────────────────────────────────────────────

        requestAnimationFrame((t) => {
            this._gameLoop(t);
        });
    },

    /**
     * Update all game systems.
     */
    _update(dt) {
        this.matchElapsedTime += dt;

        // ─────────────────────────────────────────────
        // PLAYER
        // ─────────────────────────────────────────────

        Player.update(dt);

        // ─────────────────────────────────────────────
        // CAMERA
        // ─────────────────────────────────────────────

        if (Player.isAlive) {
            CameraSystem.follow(
                Player.x,
                Player.y
            );
        } else {
            let spectateTarget = null;

            // Try to spectate the enemy who killed player
            if (Player.killedBy) {
                spectateTarget =
                    EnemySystem.enemies.find(
                        e =>
                            e.id === Player.killedBy &&
                            e.healthComp.alive
                    );
            }

            // If killer isn't alive, spectate any living enemy
            if (!spectateTarget) {
                spectateTarget =
                    EnemySystem.enemies.find(
                        e => e.healthComp.alive
                    );
            }

            if (spectateTarget) {
                CameraSystem.follow(
                    spectateTarget.x,
                    spectateTarget.y
                );
            }
        }

        CameraSystem.update(dt);

        // ─────────────────────────────────────────────
        // ENEMIES
        // ─────────────────────────────────────────────

        EnemySystem.update(dt);

        // ─────────────────────────────────────────────
        // PROJECTILES
        // ─────────────────────────────────────────────

        ProjectileSystem.update(dt);

        // ─────────────────────────────────────────────
        // SAFE ZONE
        // ─────────────────────────────────────────────

        SafeZoneSystem.update(dt);

        // ─────────────────────────────────────────────
        // VISUAL EFFECTS
        // ─────────────────────────────────────────────

        VFXSystem.update(dt);

        // ─────────────────────────────────────────────
        // TRACK ENEMY DEATHS
        // ─────────────────────────────────────────────

        for (const enemy of EnemySystem.enemies) {

            if (
                !enemy.healthComp.alive &&
                !enemy._deathCounted
            ) {
                enemy._deathCounted = true;

                // Default killer
                let killerName = 'Zone';

                // Player killed enemy
                if (enemy.killedBy === Player.id) {
                    Player.kills++;
                    killerName = 'You';
                }

                // Another AI killed enemy
                else if (enemy.killedBy) {

                    const killerEnemy =
                        EnemySystem.enemies.find(
                            e => e.id === enemy.killedBy
                        );

                    killerName = killerEnemy
                        ? `Fighter ${enemy.killedBy.split('_')[1]}`
                        : 'Fighter';
                }

                const victimName =
                    `Fighter ${enemy.id.split('_')[1]}`;

                const weaponName =
                    enemy.weapon
                        ? enemy.weapon.name
                        : '';

                VFXSystem.addKillFeedEntry(
                    killerName,
                    victimName,
                    weaponName
                );
            }
        }

        // ─────────────────────────────────────────────
        // PLAYER DEATH
        // ─────────────────────────────────────────────

        if (
            !Player.isAlive &&
            this.state === 'PLAYING'
        ) {

            let killerName = 'Zone';

            if (Player.killedBy) {

                const killerEnemy =
                    EnemySystem.enemies.find(
                        e =>
                            e.id === Player.killedBy
                    );

                killerName =
                    killerEnemy
                        ? `Fighter ${Player.killedBy.split('_')[1]}`
                        : 'Fighter';
            }

            VFXSystem.addKillFeedEntry(
                killerName,
                'You',
                ''
            );

            // Change state so normal gameplay stops
            // while the death animation / delay plays.
            this.state = 'ENDING';

            const currentMatchId = this.matchId;

            setTimeout(() => {

                // Make sure this callback belongs
                // to the current match.
                if (
                    currentMatchId !== this.matchId
                ) {
                    return;
                }

                this._endMatch(false);

            }, 1500);
        }

        // ─────────────────────────────────────────────
        // WIN CONDITION
        // ─────────────────────────────────────────────

        if (
            Player.isAlive &&
            EnemySystem.aliveCount() === 0 &&
            this.state === 'PLAYING'
        ) {
            this._endMatch(true);
        }
    },

    /**
     * End the match and show results.
     */
    _endMatch(won) {
        // Prevent duplicate result screens
        if (this.state === 'RESULTS') {
            return;
        }

        this.state = 'RESULTS';

        const placement =
            won
                ? 1
                : EnemySystem.aliveCount() + 1;

        const timeStr =
            Utils.formatTime(
                this.matchElapsedTime
            );

        // ─────────────────────────────────────────────
        // UPDATE RESULT SCREEN
        // ─────────────────────────────────────────────

        document.getElementById(
            'resultTitle'
        ).textContent =
            won
                ? '🏆 WINNER WINNER!'
                : 'ELIMINATED';

        document.getElementById(
            'resultTitle'
        ).style.color =
            won
                ? '#00e676'
                : '#ff1744';

        document.getElementById(
            'resultPlacement'
        ).textContent =
            `#${placement}`;

        document.getElementById(
            'resultKills'
        ).textContent =
            Player.kills;

        document.getElementById(
            'resultTime'
        ).textContent =
            timeStr;

        // Show results screen
        document.getElementById(
            'resultsScreen'
        ).classList.remove('hidden');

        // ─────────────────────────────────────────────
        // RESULT AUDIO
        // ─────────────────────────────────────────────

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

        // ─────────────────────────────────────────────
        // CLEAR SCREEN
        // ─────────────────────────────────────────────

        ctx.fillStyle = '#0a0e17';

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        // ─────────────────────────────────────────────
        // WORLD SPACE
        // ─────────────────────────────────────────────

        CameraSystem.applyTransform(ctx);

        // Map
        MapSystem.render(
            ctx,
            CameraSystem
        );

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

        // World VFX
        VFXSystem.renderWorld(ctx);

        // Restore screen space
        CameraSystem.restore(ctx);

        // ─────────────────────────────────────────────
        // SCREEN SPACE / HUD
        // ─────────────────────────────────────────────

        HUDSystem.render(
            ctx,
            canvas
        );

        MinimapSystem.render(
            ctx,
            canvas
        );

        VFXSystem.renderScreen(
            ctx,
            canvas
        );

        Player.renderCrosshair(ctx);
    },

    /**
     * Render pause overlay.
     */
    _renderPauseOverlay() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Dark transparent layer
        ctx.save();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        // ─────────────────────────────────────────────
        // PAUSED TITLE
        // ─────────────────────────────────────────────

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font =
            'bold 52px Orbitron, Arial, sans-serif';

        ctx.fillStyle = '#00e5ff';

        ctx.fillText(
            'GAME PAUSED',
            canvas.width / 2,
            canvas.height / 2 - 45
        );

        // ─────────────────────────────────────────────
        // INSTRUCTION
        // ─────────────────────────────────────────────

        ctx.font =
            '20px Inter, Arial, sans-serif';

        ctx.fillStyle = '#ffffff';

        ctx.fillText(
            'Press ESC or P to resume',
            canvas.width / 2,
            canvas.height / 2 + 25
        );

        // ─────────────────────────────────────────────
        // SMALL STATUS
        // ─────────────────────────────────────────────

        ctx.font =
            '14px Inter, Arial, sans-serif';

        ctx.fillStyle =
            'rgba(255, 255, 255, 0.65)';

        ctx.fillText(
            'THE BATTLE IS FROZEN',
            canvas.width / 2,
            canvas.height / 2 + 65
        );

        ctx.restore();
    },

    /**
     * Render animated background for the main menu.
     */
    _renderMenuBackground() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        const t =
            performance.now() * 0.001;

        // ─────────────────────────────────────────────
        // BACKGROUND
        // ─────────────────────────────────────────────

        ctx.fillStyle = '#0a0e17';

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        // ─────────────────────────────────────────────
        // ANIMATED GRID
        // ─────────────────────────────────────────────

        ctx.strokeStyle =
            'rgba(0, 229, 255, 0.04)';

        ctx.lineWidth = 1;

        const gridSize = 60;

        const offset =
            (t * 20) % gridSize;

        for (
            let x = -gridSize + offset;
            x < canvas.width + gridSize;
            x += gridSize
        ) {
            ctx.beginPath();

            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);

            ctx.stroke();
        }

        for (
            let y = -gridSize + offset;
            y < canvas.height + gridSize;
            y += gridSize
        ) {
            ctx.beginPath();

            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);

            ctx.stroke();
        }

        // ─────────────────────────────────────────────
        // FLOATING PARTICLES
        // ─────────────────────────────────────────────

        for (let i = 0; i < 30; i++) {

            const px =
                (
                    Math.sin(
                        t * 0.3 + i * 2.1
                    ) * 0.5 + 0.5
                ) * canvas.width;

            const py =
                (
                    Math.cos(
                        t * 0.2 + i * 1.7
                    ) * 0.5 + 0.5
                ) * canvas.height;

            const size =
                1 + Math.sin(t + i) * 0.5;

            ctx.beginPath();

            ctx.arc(
                px,
                py,
                size,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                `rgba(
                    0,
                    229,
                    255,
                    ${0.1 + Math.sin(t + i) * 0.08}
                )`;

            ctx.fill();
        }
    },

    /**
     * Resize the canvas to fill the window.
     */
    _resizeCanvas() {
        if (!this.canvas) {
            return;
        }

        this.canvas.width =
            window.innerWidth;

        this.canvas.height =
            window.innerHeight;

        CameraSystem.resize(
            this.canvas
        );
    },
};


// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════

window.addEventListener(
    'DOMContentLoaded',
    () => {
        Game.init();
    }
);