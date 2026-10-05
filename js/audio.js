/* ═══════════════════════════════════════════════════════════
   SURVIVOR ZONE — AUDIO SYSTEM
   Procedural Web Audio API sound engine.
   No external audio files required.
   ═══════════════════════════════════════════════════════════ */

const AudioSystem = {

    ctx: null,
    masterGain: null,
    enabled: true,
    volume: 0.32,

    _footstepCooldown: 0,
    _zoneWarningCooldown: 0,


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    init() {

        try {

            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContext) {
                this.enabled = false;
                return;
            }

            this.ctx = new AudioContext();

            this.masterGain =
                this.ctx.createGain();

            this.masterGain.gain.value =
                this.volume;

            this.masterGain.connect(
                this.ctx.destination
            );

        } catch (error) {

            console.warn(
                'Audio initialization failed:',
                error
            );

            this.enabled = false;
        }
    },


    /* =========================================================
       RESUME AUDIO
       Browsers normally require user interaction before audio.
       ========================================================= */

    resume() {

        if (!this.enabled || !this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => { });
        }
    },


    /* =========================================================
       MASTER VOLUME
       ========================================================= */

    setVolume(value) {

        if (!this.masterGain) return;

        this.volume =
            Math.max(
                0,
                Math.min(1, value)
            );

        this.masterGain.gain.setTargetAtTime(
            this.volume,
            this.ctx.currentTime,
            0.02
        );
    },


    mute() {

        if (!this.masterGain || !this.ctx) return;

        this.masterGain.gain.setTargetAtTime(
            0,
            this.ctx.currentTime,
            0.02
        );
    },


    unmute() {

        if (!this.masterGain || !this.ctx) return;

        this.masterGain.gain.setTargetAtTime(
            this.volume,
            this.ctx.currentTime,
            0.02
        );
    },


    /* =========================================================
       INTERNAL HELPERS
       ========================================================= */

    _canPlay() {

        return (
            this.enabled &&
            this.ctx &&
            this.masterGain
        );
    },


    _oscillator(
        type,
        frequency,
        startTime,
        duration,
        volume,
        endFrequency = null
    ) {

        if (!this._canPlay()) return;

        const ctx = this.ctx;

        const osc =
            ctx.createOscillator();

        const gain =
            ctx.createGain();


        osc.type = type;

        osc.frequency.setValueAtTime(
            frequency,
            startTime
        );


        if (endFrequency !== null) {

            osc.frequency.exponentialRampToValueAtTime(
                Math.max(1, endFrequency),
                startTime + duration
            );
        }


        gain.gain.setValueAtTime(
            volume,
            startTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            startTime + duration
        );


        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + duration);
    },


    _noise(
        duration,
        volume,
        filterFrequency,
        startTime = null
    ) {

        if (!this._canPlay()) return;

        const ctx = this.ctx;

        const now =
            startTime !== null
                ? startTime
                : ctx.currentTime;


        const bufferSize =
            Math.max(
                1,
                Math.floor(
                    ctx.sampleRate * duration
                )
            );


        const buffer =
            ctx.createBuffer(
                1,
                bufferSize,
                ctx.sampleRate
            );


        const data =
            buffer.getChannelData(0);


        for (let i = 0; i < bufferSize; i++) {

            const progress =
                i / bufferSize;

            data[i] =
                (Math.random() * 2 - 1) *
                Math.pow(
                    1 - progress,
                    3
                );
        }


        const source =
            ctx.createBufferSource();

        source.buffer = buffer;


        const filter =
            ctx.createBiquadFilter();

        filter.type = 'lowpass';

        filter.frequency.setValueAtTime(
            filterFrequency,
            now
        );


        const gain =
            ctx.createGain();

        gain.gain.setValueAtTime(
            volume,
            now
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            now + duration
        );


        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);


        source.start(now);
        source.stop(now + duration);
    },


    /* =========================================================
       GUNSHOT
       ========================================================= */

    playGunshot(type = 'rifle') {

        if (!this._canPlay()) return;

        const ctx = this.ctx;
        const now = ctx.currentTime;


        let duration = 0.09;
        let filter = 2200;
        let volume = 0.30;


        if (type === 'sniper') {

            duration = 0.28;
            filter = 1300;
            volume = 0.48;

        } else if (type === 'shotgun') {

            duration = 0.17;
            filter = 1800;
            volume = 0.42;

        } else if (type === 'pistol') {

            duration = 0.075;
            filter = 3200;
            volume = 0.26;

        } else if (type === 'smg') {

            duration = 0.065;
            filter = 2800;
            volume = 0.23;
        }


        // Main gunshot
        this._noise(
            duration,
            volume,
            filter
        );


        // Short low-frequency punch
        this._oscillator(
            'sine',
            type === 'shotgun'
                ? 85
                : type === 'sniper'
                    ? 65
                    : 110,
            now,
            0.12,
            type === 'sniper'
                ? 0.18
                : 0.11,
            35
        );
    },


    /* =========================================================
       RELOAD
       ========================================================= */

    playReload() {

        if (!this._canPlay()) return;

        const ctx = this.ctx;
        const now = ctx.currentTime;


        // Magazine removal
        this._oscillator(
            'square',
            520,
            now,
            0.07,
            0.055,
            300
        );


        // Magazine insertion
        this._oscillator(
            'square',
            300,
            now + 0.10,
            0.08,
            0.07,
            620
        );


        // Final chambering click
        this._oscillator(
            'square',
            900,
            now + 0.22,
            0.055,
            0.065,
            500
        );
    },


    /* =========================================================
       EMPTY MAGAZINE
       ========================================================= */

    playEmpty() {

        if (!this._canPlay()) return;

        const now = this.ctx.currentTime;

        this._oscillator(
            'square',
            180,
            now,
            0.06,
            0.055,
            120
        );
    },


    /* =========================================================
       BULLET HIT
       ========================================================= */

    playHit() {

        if (!this._canPlay()) return;

        const now = this.ctx.currentTime;


        this._oscillator(
            'sawtooth',
            220,
            now,
            0.10,
            0.16,
            70
        );


        this._noise(
            0.045,
            0.055,
            1400,
            now
        );
    },


    /* =========================================================
       HEADSHOT / CRITICAL HIT
       ========================================================= */

    playCriticalHit() {

        if (!this._canPlay()) return;

        const now = this.ctx.currentTime;


        this._oscillator(
            'square',
            700,
            now,
            0.08,
            0.09,
            1100
        );


        this._oscillator(
            'sine',
            1100,
            now + 0.05,
            0.14,
            0.08,
            500
        );
    },


    /* =========================================================
       PLAYER DAMAGE
       ========================================================= */

    playPlayerDamage() {

        if (!this._canPlay()) return;

        const now = this.ctx.currentTime;

        this._oscillator(
            'sawtooth',
            130,
            now,
            0.16,
            0.13,
            55
        );
    },


    /* =========================================================
       PICKUP
       ========================================================= */

    playPickup() {

        if (!this._canPlay()) return;

        const now = this.ctx.currentTime;


        this._oscillator(
            'sine',
            520,
            now,
            0.10,
            0.10,
            800
        );


        this._oscillator(
            'sine',
            800,
            now + 0.08,
            0.14,
            0.10,
            1250
        );
    },


    /* =========================================================
       ARMOR PICKUP
       ========================================================= */

    playArmorPickup() {

        if (!this._canPlay()) return;

        const now = this.ctx.currentTime;


        this._oscillator(
            'triangle',
            300,
            now,
            0.12,
            0.08,
            500
        );


        this._oscillator(
            'triangle',
            500,
            now + 0.07,
            0.14,
            0.08,
            800
        );
    },


    /* =========================================================
       HEAL
       ========================================================= */

    playHeal() {

        if (!this._canPlay()) return;

        const now = this.ctx.currentTime;


        this._oscillator(
            'sine',
            400,
            now,
            0.18,
            0.10,
            700
        );


        this._oscillator(
            'sine',
            700,
            now + 0.15,
            0.20,
            0.10,
            1000
        );


        this._oscillator(
            'sine',
            1000,
            now + 0.30,
            0.18,
            0.08,
            1300
        );
    },


    /* =========================================================
       ELIMINATION
       ========================================================= */

    playElimination() {

        if (!this._canPlay()) return;

        const ctx = this.ctx;
        const now = ctx.currentTime;


        // Impact
        this._oscillator(
            'sine',
            110,
            now,
            0.45,
            0.25,
            30
        );


        // Metallic impact
        this._noise(
            0.16,
            0.08,
            900,
            now
        );


        // Small confirmation tone
        this._oscillator(
            'square',
            260,
            now + 0.12,
            0.10,
            0.06,
            420
        );
    },


    /* =========================================================
       KILL CONFIRMATION
       ========================================================= */

    playKillConfirm() {

        if (!this._canPlay()) return;

        const now = this.ctx.currentTime;


        this._oscillator(
            'square',
            650,
            now,
            0.08,
            0.07,
            900
        );


        this._oscillator(
            'square',
            900,
            now + 0.07,
            0.11,
            0.07,
            1200
        );
    },


    /* =========================================================
       SAFE ZONE WARNING
       ========================================================= */

    playZoneWarning() {

        if (!this._canPlay()) return;

        const ctx = this.ctx;
        const now = ctx.currentTime;


        // Prevent accidental spam
        if (
            now - this._zoneWarningCooldown <
            1.5
        ) {
            return;
        }

        this._zoneWarningCooldown = now;


        for (let i = 0; i < 3; i++) {

            const time =
                now + i * 0.20;


            this._oscillator(
                'square',
                i === 2 ? 520 : 440,
                time,
                0.11,
                0.065,
                350
            );
        }
    },


    /* =========================================================
       UI CLICK
       ========================================================= */

    playUIClick() {

        if (!this._canPlay()) return;

        this._oscillator(
            'sine',
            1000,
            this.ctx.currentTime,
            0.055,
            0.055,
            700
        );
    },


    /* =========================================================
       UI HOVER
       ========================================================= */

    playUIHover() {

        if (!this._canPlay()) return;

        this._oscillator(
            'sine',
            750,
            this.ctx.currentTime,
            0.035,
            0.025,
            900
        );
    },


    /* =========================================================
       FOOTSTEPS
       ========================================================= */

    playFootstep() {

        if (!this._canPlay()) return;

        const now = this.ctx.currentTime;


        if (
            now - this._footstepCooldown <
            0.27
        ) {
            return;
        }

        this._footstepCooldown = now;


        this._noise(
            0.045,
            0.045,
            430,
            now
        );
    },


    /* =========================================================
       MENU / MATCH START
       ========================================================= */

    playMatchStart() {

        if (!this._canPlay()) return;

        const now = this.ctx.currentTime;


        const notes = [
            330,
            440,
            660,
            880
        ];


        notes.forEach(
            (frequency, index) => {

                this._oscillator(
                    'sine',
                    frequency,
                    now + index * 0.11,
                    0.20,
                    0.08,
                    frequency * 1.02
                );
            }
        );
    },


    /* =========================================================
       VICTORY
       ========================================================= */

    playWin() {

        if (!this._canPlay()) return;

        const ctx = this.ctx;
        const now = ctx.currentTime;


        const notes = [
            523,
            659,
            784,
            1047,
            1319
        ];


        notes.forEach(
            (frequency, index) => {

                this._oscillator(
                    'sine',
                    frequency,
                    now + index * 0.14,
                    0.35,
                    0.10,
                    frequency * 1.01
                );
            }
        );
    },


    /* =========================================================
       DEFEAT
       ========================================================= */

    playLose() {

        if (!this._canPlay()) return;

        const now = this.ctx.currentTime;


        this._oscillator(
            'sawtooth',
            300,
            now,
            0.35,
            0.08,
            150
        );


        this._oscillator(
            'sine',
            180,
            now + 0.25,
            0.50,
            0.09,
            55
        );
    }
};