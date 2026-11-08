/**
 * CIRCUS WEB EDITION — Engine & Renderer
 * Faithfully reverse-engineered from CIRCUS.BIN (Atari 2600, 4096 bytes)
 *
 * Key ROM structures preserved:
 * - 5 Jump Trajectory Curves ($F900-$F9C8)
 * - 3 Ceiling Rows of 20 Targets ($84-$95), rotating R / L / R ($F66F / $F694)
 * - Scoring ($F1B2-$F1DF & $F620-$F65E):
 *     Top Row (Gold):    10 pts/coin | Clear = +100 pts + 1 Extra Life (max 5)
 *     Middle Row (Cyan):  5 pts/coin | Clear = +50 pts
 *     Bottom Row (Ruby):  2 pts/coin | Clear = +20 pts
 * - Seesaw Landing Zones ($F514-$F544):
 *     Outer tip -> increases jump curve ($E1++)
 *     Sweet spot -> maintains jump curve
 *     Inner pivot -> decreases jump curve ($E1--) and reverses horizontal velocity ($D3)
 * - Side Trampolines ($F100-$F12A):
 *     Left & Right springboards bounce the acrobat back into the arena
 * - Game Variations ($F809):
 *     Bit 1 (0x02): Respawn only when ALL 3 rows are cleared
 *     Bit 2 (0x04): Pass through coins without bouncing down
 *     Bit 6 (0x40): Moving horizontal barriers below the coin rows
 */

// Exact 5 jump height curves extracted from CIRCUS.BIN ($F905-$F9C8)
// Values represent Atari scanline Y from ceiling (0x00) to seesaw level (0xA1 = 161)
const ROM_JUMP_CURVES = [
  // Curve 0 ($F905): Low warmup bounce (peaks at 0x24 = 36, just below bottom coin row)
  [
    0xA1, 0x98, 0x92, 0x8C, 0x87, 0x81, 0x7C, 0x77, 0x72, 0x6D,
    0x68, 0x64, 0x5F, 0x5B, 0x57, 0x53, 0x4F, 0x4B, 0x48, 0x45,
    0x42, 0x3F, 0x3C, 0x3A, 0x37, 0x35, 0x33, 0x31, 0x2F, 0x2D,
    0x2B, 0x2A, 0x29, 0x28, 0x27, 0x26, 0x25, 0x25, 0x24
  ],
  // Curve 1 ($F92D): Standard full-height jump (reaches ceiling 0x00 in 47 steps)
  [
    0xA1, 0x98, 0x92, 0x8C, 0x87, 0x81, 0x7B, 0x76, 0x71, 0x6C,
    0x67, 0x62, 0x5D, 0x59, 0x54, 0x50, 0x4B, 0x47, 0x43, 0x3F,
    0x3B, 0x38, 0x34, 0x31, 0x2D, 0x2A, 0x27, 0x24, 0x21, 0x1E,
    0x1C, 0x19, 0x17, 0x15, 0x12, 0x10, 0x0F, 0x0D, 0x0B, 0x0A,
    0x08, 0x07, 0x06, 0x04, 0x03, 0x02, 0x01, 0x00
  ],
  // Curve 2 ($F95D): Fast full-height jump (reaches ceiling 0x00 in 42 steps)
  [
    0xA1, 0x98, 0x91, 0x8A, 0x84, 0x7D, 0x77, 0x71, 0x6B, 0x65,
    0x60, 0x5A, 0x55, 0x50, 0x4B, 0x46, 0x41, 0x3D, 0x38, 0x34,
    0x30, 0x2C, 0x29, 0x25, 0x22, 0x1F, 0x1B, 0x18, 0x16, 0x13,
    0x11, 0x0F, 0x0C, 0x0B, 0x09, 0x07, 0x06, 0x04, 0x03, 0x02,
    0x01, 0x00
  ],
  // Curve 3 ($F988): Expert fast jump (reaches ceiling 0x00 in 35 steps)
  [
    0xA1, 0x98, 0x8F, 0x87, 0x7E, 0x76, 0x6E, 0x67, 0x60, 0x59,
    0x52, 0x4B, 0x45, 0x3F, 0x3A, 0x34, 0x2F, 0x2A, 0x26, 0x21,
    0x1D, 0x19, 0x16, 0x12, 0x0F, 0x0C, 0x0A, 0x08, 0x06, 0x04,
    0x03, 0x02, 0x01, 0x00
  ],
  // Curve 4 ($F9AC): Maximum turbo jump (reaches ceiling 0x00 in 28 steps)
  [
    0xA1, 0x98, 0x8E, 0x84, 0x7B, 0x73, 0x6A, 0x62, 0x5A, 0x52,
    0x4B, 0x44, 0x3E, 0x37, 0x31, 0x2C, 0x27, 0x22, 0x1D, 0x19,
    0x15, 0x11, 0x0E, 0x0B, 0x08, 0x06, 0x04, 0x02, 0x01, 0x00
  ]
];

// Exact 8x11 sprite bitmaps from CIRCUS.BIN ($FD00-$FD62) for Retro Mode
const ROM_SPRITES = {
  jumpArmsUp: [0x38, 0x38, 0x92, 0x54, 0x38, 0x10, 0x10, 0x38, 0x44, 0x82],
  jumpSwingR: [0x38, 0x38, 0x90, 0x50, 0x38, 0x14, 0x12, 0x38, 0x44, 0x82],
  jumpSwingL: [0x38, 0x38, 0x12, 0x14, 0x38, 0x50, 0x90, 0x38, 0x24, 0x22],
  standing:   [0x38, 0x38, 0x10, 0x10, 0x38, 0x54, 0x92, 0x38, 0x28, 0x28],
  splat1:     [0x82, 0x44, 0x38, 0x10, 0x10, 0xFF, 0xFF],
  splat2:     [0x28, 0x28, 0x38, 0x92, 0x54, 0xFF, 0xFF]
};

class CircusGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.W = this.canvas.width;   // 960
    this.H = this.canvas.height;  // 640

    // Arena geometry (mapped from Atari scanlines 0..176)
    this.arenaLeft = 66;
    this.arenaRight = this.W - 66;
    this.arenaTop = 68;
    this.seesawY = 548;
    this.groundY = 582;

    // Visual mode ('modern' or 'retro')
    this.visualMode = 'modern';

    // Game configuration
    this.variation = 1;       // 1, 3, 5, 7, 9, 11
    this.playerMode = '1';    // '1', '2', '2_coop'
    this.difficulty = 'normal';

    // Persistent high score
    this.highScore = parseInt(localStorage.getItem('circus_atari_hiscore') || '0', 10);

    // Input state
    this.keys = { left: false, right: false };
    this.pointerX = this.W / 2;
    this.usingPointer = false;

    // Decorative background elements
    this.stars = Array.from({ length: 42 }, () => ({
      x: Math.random() * this.W,
      y: Math.random() * (this.H * 0.75),
      r: 0.8 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2
    }));

    this.particles = [];
    this.floatingTexts = [];
    this.screenShake = 0;
    this.spotlightPhase = 0;

    // Springboards state
    this.leftSpring = { x: this.arenaLeft, y: 430, h: 110, compress: 0 };
    this.rightSpring = { x: this.arenaRight, y: 430, h: 110, compress: 0 };

    this.initGameData();
    this.bindEvents();
    this.updateHUD();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  /**
   * Decodes the variation flags just like $F809 in CIRCUS.BIN
   */
  getVariationFlags() {
    const v = Number(this.variation);
    return {
      clearAllToRespawn: v === 9 || v === 11,   // Bit 1 (0x02)
      passThroughCoins:  v === 5 || v === 7,    // Bit 2 (0x04)
      hasBarriers:       v === 3 || v === 7 || v === 11, // Bit 6 (0x40)
      sharedCoins:       this.playerMode === '2_coop',   // Bit 7 (0x80)
      twoPlayers:        this.playerMode !== '1'         // Bit 0 (0x01)
    };
  }

  createCoinRows() {
    // 3 rows of 20 coins each ($84-$89, $8A-$8F, $90-$95 in CIRCUS.BIN)
    const rowConfigs = [
      {
        index: 0,
        name: 'OURO',
        y: 112,
        points: 10,
        clearBonus: 100,
        extraLifeOnClear: true,
        dir: 1,         // Rotates right
        speed: 88,
        colorMain: '#fbbf24',
        colorGlow: '#fde047',
        retroColor: '#f59e0b'
      },
      {
        index: 1,
        name: 'PRATA',
        y: 156,
        points: 5,
        clearBonus: 50,
        extraLifeOnClear: false,
        dir: -1,        // Rotates left
        speed: 105,
        colorMain: '#38bdf8',
        colorGlow: '#bae6fd',
        retroColor: '#38bdf8'
      },
      {
        index: 2,
        name: 'BRONZE',
        y: 200,
        points: 2,
        clearBonus: 20,
        extraLifeOnClear: false,
        dir: 1,         // Rotates right
        speed: 74,
        colorMain: '#fb7185',
        colorGlow: '#fda4af',
        retroColor: '#f43f5e'
      }
    ];

    const spanWidth = this.arenaRight - this.arenaLeft;
    const spacing = spanWidth / 20;

    return rowConfigs.map((cfg) => ({
      ...cfg,
      offset: 0,
      coins: Array.from({ length: 20 }, (_, i) => ({
        slot: i,
        active: true,
        spinPhase: (i / 20) * Math.PI * 2
      })),
      spacing
    }));
  }

  createBarriers() {
    // Moving horizontal barriers below the bottom coin row ($F0A8-$F0D6)
    const spanWidth = this.arenaRight - this.arenaLeft;
    const gapCount = 4;
    const segmentSpan = spanWidth / gapCount;
    return {
      y: 242,
      offset: 0,
      speed: 135,
      segmentSpan,
      barWidth: segmentSpan * 0.56
    };
  }

  initGameData() {
    this.state = 'MENU'; // 'MENU' | 'PLAYING' | 'PAUSED' | 'SPLAT_DELAY' | 'GAMEOVER'
    this.flags = this.getVariationFlags();

    const sharedRows = this.createCoinRows();
    this.players = [
      {
        id: 0,
        score: 0,
        lives: 5,
        coinsCollected: 0,
        standardSpeedUnlocked: false,
        rows: sharedRows
      },
      {
        id: 1,
        score: 0,
        lives: this.flags.twoPlayers ? 5 : 0,
        coinsCollected: 0,
        standardSpeedUnlocked: false,
        rows: this.flags.sharedCoins ? sharedRows : this.createCoinRows()
      }
    ];

    this.currentPlayerIdx = 0;
    this.barriers = this.createBarriers();

    // Seesaw state ($D4 position, $D5 tilt direction: -1 = left down, +1 = right down)
    this.seesaw = {
      x: this.W / 2,
      y: this.seesawY,
      halfWidth: this.difficulty === 'expert' ? 56 : 70,
      tilt: -1, // -1: Left acrobat seated on left, Right end high (ready to catch)
      seatedAcrobatColor: 0 // 0 = Blue acrobat, 1 = Crimson/Gold acrobat
    };

    this.resetJumpers(true);
  }

  /**
   * Returns 0.68x speed during the first half of the coins (< 30 coins collected),
   * and advances to 1.0x (standard speed) once half of the 60 coins (30) are collected.
   */
  getSpeedMultiplier() {
    const p = this.activePlayer;
    if (!p) return 0.68;
    return p.standardSpeedUnlocked ? 1.0 : 0.68;
  }

  /**
   * Launches the active trapezist in the center of the screen
   */
  resetJumpers(initialServe = false) {
    this.energyLevel = 1; // Starts on Curve 1 (reaches ceiling)
    this.maxEnergyLevel = this.difficulty === 'expert' ? 4 : 2;

    // Position seesaw in the center so its raised/open side is aligned with the center of the screen
    if (initialServe || !this.usingPointer) {
      this.seesaw.x = this.W / 2;
      this.pointerX = this.W / 2;
    }

    // Always throw the jumper in the center of the screen with a gentle horizontal drift
    const dirSign = initialServe ? 1 : (Math.random() < 0.5 ? 1 : -1);
    this.jumper = {
      x: this.W / 2,
      y: this.atariYToCanvasY(0x64),
      vx: dirSign * 1.85,
      dirY: -1, // Launched upward from the center of the arena
      curveIdx: 1,
      stepIdx: 14, // Smooth mid-air launch in the center of the screen
      stepAccumulator: 0,
      colorId: 1 - this.seesaw.seatedAcrobatColor,
      rotation: 0,
      trail: [],
      splatTimer: 0
    };

    this.updateEnergyHUD();
  }

  atariYToCanvasY(atariY) {
    // Maps Atari Y [0x00 .. 0xA1 (161)] to [arenaTop .. seesawY - 18]
    const norm = Math.max(0, Math.min(1.08, atariY / 0xA1));
    return this.arenaTop + norm * (this.seesawY - 18 - this.arenaTop);
  }

  startGame() {
    this.variation = parseInt(document.getElementById('selectVariation').value, 10);
    this.playerMode = document.getElementById('selectPlayers').value;
    this.difficulty = document.getElementById('selectDifficulty').value;

    this.initGameData();
    this.state = 'PLAYING';

    document.getElementById('arenaOverlay').classList.add('hidden');
    document.getElementById('btnPause').disabled = false;
    document.getElementById('btnPause').textContent = '⏸️ Pausar';

    const modeNames = {
      1: 'Modo 1 • Clássico',
      3: 'Modo 3 • Barreiras',
      5: 'Modo 5 • Super Salto',
      7: 'Modo 7 • Super + Barreiras',
      9: 'Modo 9 • Limpeza Total',
      11: 'Modo 11 • Limpeza + Barreiras'
    };
    document.getElementById('activeModeLabel').textContent = modeNames[this.variation] || 'Modo Clássico';

    window.CircusAudio.startMusic();
    window.CircusAudio.playBounceSeesaw(1);
    this.updateHUD();
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      document.getElementById('btnPause').textContent = '▶️ Continuar';
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      document.getElementById('btnPause').textContent = '⏸️ Pausar';
    }
  }

  showMenuOverlay(title = 'CIRCUS', subtitle = null) {
    this.state = 'MENU';
    document.getElementById('overlayTitle').textContent = title;
    if (subtitle) {
      document.getElementById('overlaySubtitle').textContent = subtitle;
    }
    document.getElementById('arenaOverlay').classList.remove('hidden');
    document.getElementById('btnPause').disabled = true;
  }

  bindEvents() {
    // Mouse movement inside canvas
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.W / rect.width;
      this.pointerX = (e.clientX - rect.left) * scaleX;
      this.usingPointer = true;
    });

    // Touch drag support
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.W / rect.width;
        this.pointerX = (e.touches[0].clientX - rect.left) * scaleX;
        this.usingPointer = true;
      }
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.W / rect.width;
        this.pointerX = (e.touches[0].clientX - rect.left) * scaleX;
        this.usingPointer = true;
      }
    }, { passive: true });

    // Keyboard controls ($FA00 joystick patch in CIRCUS.BIN)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = true;
        this.usingPointer = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = true;
        this.usingPointer = false;
      }
      if (e.key === ' ' || e.code === 'Space') {
        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
          e.preventDefault();
          this.togglePause();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = false;
      }
    });

    // UI Buttons
    document.getElementById('btnStartGame').addEventListener('click', () => this.startGame());
    document.getElementById('btnPause').addEventListener('click', () => this.togglePause());
    document.getElementById('btnRestart').addEventListener('click', () => {
      this.showMenuOverlay(
        'CIRCUS',
        'Escolha a variação do jogo e clique em Iniciar Espetáculo!'
      );
    });

    const btnMusic = document.getElementById('btnMusic');
    btnMusic.addEventListener('click', () => {
      window.CircusAudio.musicEnabled = !window.CircusAudio.musicEnabled;
      btnMusic.classList.toggle('active', window.CircusAudio.musicEnabled);
    });

    const btnSfx = document.getElementById('btnSfx');
    btnSfx.addEventListener('click', () => {
      window.CircusAudio.sfxEnabled = !window.CircusAudio.sfxEnabled;
      btnSfx.classList.toggle('active', window.CircusAudio.sfxEnabled);
    });

    const btnVisual = document.getElementById('btnVisual');
    btnVisual.addEventListener('click', () => {
      this.visualMode = this.visualMode === 'modern' ? 'retro' : 'modern';
      document.getElementById('visualLabel').textContent =
        this.visualMode === 'modern' ? 'HD Moderno' : 'Retrô 2600';
      btnVisual.classList.toggle('active', this.visualMode === 'retro');
    });

    // Rules modal
    const rulesModal = document.getElementById('rulesModal');
    document.getElementById('btnRules').addEventListener('click', () => {
      rulesModal.classList.remove('hidden');
    });
    document.getElementById('btnCloseRules').addEventListener('click', () => {
      rulesModal.classList.add('hidden');
    });
    rulesModal.addEventListener('click', (e) => {
      if (e.target === rulesModal) rulesModal.classList.add('hidden');
    });
  }

  get activePlayer() {
    return this.players[this.currentPlayerIdx];
  }

  addScore(pts) {
    const p = this.activePlayer;
    p.score = Math.min(99999, p.score + pts);
    if (p.score > this.highScore) {
      this.highScore = p.score;
      localStorage.setItem('circus_atari_hiscore', String(this.highScore));
    }
    this.updateHUD();
  }

  spawnParticles(x, y, color, count = 14, speedScale = 1) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (1.2 + Math.random() * 4.2) * speedScale;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 0.8,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.025,
        size: 2.5 + Math.random() * 3.5,
        color
      });
    }
  }

  spawnFloatingText(x, y, text, color = '#fde047') {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 1.0
    });
  }

  update(dt) {
    this.spotlightPhase += dt * 0.9;
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 28);
    }

    // Spring decompression animation
    this.leftSpring.compress = Math.max(0, this.leftSpring.compress - dt * 4.5);
    this.rightSpring.compress = Math.max(0, this.rightSpring.compress - dt * 4.5);

    // Update particles & floating texts even during splat delay
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life -= pt.decay;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 42 * dt;
      ft.life -= dt * 1.15;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Speed multiplier: 0.68x at the start, advancing to 1.0x (standard) after half the coins (30) are collected
    const speedMult = this.getSpeedMultiplier();

    // Rotate ceiling coins continuously
    const rows = this.activePlayer.rows;
    const spanWidth = this.arenaRight - this.arenaLeft;
    rows.forEach((row) => {
      row.offset = (row.offset + row.dir * row.speed * speedMult * dt) % spanWidth;
      if (row.offset < 0) row.offset += spanWidth;
      row.coins.forEach((c) => {
        c.spinPhase += dt * 4.2 * speedMult;
      });
    });

    // Move barriers if active
    if (this.flags.hasBarriers) {
      this.barriers.offset =
        (this.barriers.offset + this.barriers.speed * speedMult * dt) % this.barriers.segmentSpan;
    }

    if (this.state !== 'PLAYING' && this.state !== 'SPLAT_DELAY') {
      return;
    }

    // Update Seesaw horizontal position (Mouse/Touch or Keyboard $FA00)
    const minSeesawX = this.arenaLeft + this.seesaw.halfWidth + 14;
    const maxSeesawX = this.arenaRight - this.seesaw.halfWidth - 14;

    if (this.usingPointer) {
      const targetX = Math.max(minSeesawX, Math.min(maxSeesawX, this.pointerX));
      this.seesaw.x += (targetX - this.seesaw.x) * Math.min(1, dt * 24);
    } else {
      const moveSpeed = 560;
      if (this.keys.left) this.seesaw.x -= moveSpeed * dt;
      if (this.keys.right) this.seesaw.x += moveSpeed * dt;
      this.seesaw.x = Math.max(minSeesawX, Math.min(maxSeesawX, this.seesaw.x));
    }

    if (this.state === 'SPLAT_DELAY') {
      this.jumper.splatTimer -= dt;
      if (this.jumper.splatTimer <= 0) {
        this.handleAfterSplat();
      }
      return;
    }

    // === Update Airborne Trapezist ($F320-$F343 in CIRCUS.BIN) ===
    const j = this.jumper;
    const curve = ROM_JUMP_CURVES[j.curveIdx];

    // Advance along the Atari trajectory table (slower at start, 60Hz standard after 30 coins)
    const stepRate = 60 * speedMult;
    j.stepAccumulator += dt * stepRate;

    while (j.stepAccumulator >= 1.0) {
      j.stepAccumulator -= 1.0;

      // Move horizontally
      j.x += j.vx;

      // Check arena wall / side trampoline bounces ($F080-$F0A4 & $F100-$F12A)
      this.checkWallAndSpringCollisions();

      // Step along jump curve ($F320-$F343)
      j.stepIdx += j.dirY === -1 ? 1 : -1;

      // Reached peak of curve or ceiling ($00)? Flip to falling ($F248)
      if (j.stepIdx >= curve.length - 1) {
        j.stepIdx = curve.length - 1;
        j.dirY = 1; // Now falling down
      }

      if (j.stepIdx < 0) {
        j.stepIdx = 0;
      }

      const atariY = curve[j.stepIdx];
      j.y = this.atariYToCanvasY(atariY);

      // Check coin collisions ($F130-$F225)
      this.checkCoinCollisions();

      // Check moving barrier collision ($F100: CXP0FB)
      if (this.flags.hasBarriers) {
        this.checkBarrierCollision();
      }

      // Check seesaw landing or ground splat when at the bottom of the arc (stepIdx === 0)
      if (j.dirY === 1 && j.stepIdx === 0) {
        this.checkSeesawOrSplat();
        break;
      }
    }

    // Update acrobat somersault rotation & motion trail
    if (j.dirY === -1 && j.stepIdx > 10 && j.stepIdx < curve.length - 4) {
      j.rotation += dt * 9.5 * Math.sign(j.vx || 1);
    } else {
      j.rotation *= 0.82;
    }

    j.trail.push({ x: j.x, y: j.y, colorId: j.colorId });
    if (j.trail.length > 9) j.trail.shift();
  }

  checkWallAndSpringCollisions() {
    const j = this.jumper;
    const margin = 16;

    // Left wall / Left springboard
    if (j.x <= this.arenaLeft + margin) {
      j.x = this.arenaLeft + margin;
      j.vx = Math.abs(j.vx);

      // If hitting in the springboard zone (lower wall), bounce upward like $F115
      if (j.y >= this.leftSpring.y - 12 && j.y <= this.leftSpring.y + this.leftSpring.h + 12) {
        this.leftSpring.compress = 1.0;
        j.dirY = -1;
        j.curveIdx = Math.max(1, this.energyLevel);
        // Sync stepIdx to current Y on the new curve
        j.stepIdx = this.findClosestStepOnCurve(ROM_JUMP_CURVES[j.curveIdx], j.y);
        window.CircusAudio.playBounceSpring();
        this.spawnParticles(this.arenaLeft + 8, j.y, '#38bdf8', 12);
      }
    }

    // Right wall / Right springboard
    if (j.x >= this.arenaRight - margin) {
      j.x = this.arenaRight - margin;
      j.vx = -Math.abs(j.vx);

      if (j.y >= this.rightSpring.y - 12 && j.y <= this.rightSpring.y + this.rightSpring.h + 12) {
        this.rightSpring.compress = 1.0;
        j.dirY = -1;
        j.curveIdx = Math.max(1, this.energyLevel);
        j.stepIdx = this.findClosestStepOnCurve(ROM_JUMP_CURVES[j.curveIdx], j.y);
        window.CircusAudio.playBounceSpring();
        this.spawnParticles(this.arenaRight - 8, j.y, '#38bdf8', 12);
      }
    }
  }

  findClosestStepOnCurve(curve, canvasY) {
    let bestIdx = 1;
    let bestDiff = Infinity;
    for (let i = 0; i < curve.length; i++) {
      const cy = this.atariYToCanvasY(curve[i]);
      const diff = Math.abs(cy - canvasY);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  checkCoinCollisions() {
    const j = this.jumper;
    const rows = this.activePlayer.rows;
    const spanWidth = this.arenaRight - this.arenaLeft;
    let hitAnyCoin = false;

    for (const row of rows) {
      if (Math.abs(j.y - row.y) > 22) continue;

      for (const coin of row.coins) {
        if (!coin.active) continue;
        const coinX =
          this.arenaLeft + ((coin.slot * row.spacing + row.offset) % spanWidth);

        if (Math.abs(j.x - coinX) <= 22) {
          coin.active = false;
          hitAnyCoin = true;

          const p = this.activePlayer;
          p.coinsCollected = (p.coinsCollected || 0) + 1;

          // Unlock standard 100% speed once half of the 60 coins (30 coins) are collected
          if (!p.standardSpeedUnlocked && p.coinsCollected >= 30) {
            p.standardSpeedUnlocked = true;
            this.spawnFloatingText(
              this.W / 2,
              270,
              '⚡ METADE DAS MOEDAS! VELOCIDADE PADRÃO!',
              '#38bdf8'
            );
          }

          this.addScore(row.points);
          window.CircusAudio.playCoinPickup(row.points);
          this.spawnParticles(coinX, row.y, row.colorMain, 16);
          this.spawnFloatingText(coinX, row.y - 10, `+${row.points}`, row.colorGlow);

          // Check row clear rules ($F5EA-$F65E)
          this.checkRowClearState(row);
          break;
        }
      }

      if (hitAnyCoin) {
        // In classic variations (Bit 2 == 0), hitting a coin reverses vertical motion ($D0 ^= $80)
        if (!this.flags.passThroughCoins) {
          j.dirY = j.dirY === -1 ? 1 : -1;
        }
        break;
      }
    }
  }

  checkRowClearState(clearedRow) {
    const rows = this.activePlayer.rows;

    if (this.flags.clearAllToRespawn) {
      // Game 9 / 11 ($F5EA): Only respawn when ALL 3 rows are completely empty
      const allEmpty = rows.every((r) => r.coins.every((c) => !c.active));
      if (allEmpty) {
        rows.forEach((r) => r.coins.forEach((c) => (c.active = true)));
        this.addScore(170); // 100 + 50 + 20 bonus ($B3 = $11 in ROM)
        window.CircusAudio.playRowClear(0);
        this.spawnFloatingText(this.W / 2, 160, 'LIMPEZA TOTAL! +170 PTS', '#fde047');

        if (this.activePlayer.lives < 5) {
          this.activePlayer.lives++;
          window.CircusAudio.playExtraLife();
          this.spawnFloatingText(this.W / 2, 195, '+1 VIDA EXTRA!', '#34d399');
        }
        this.updateHUD();
      }
    } else {
      // Standard mode ($F624-$F65E): Check if this individual row is empty
      const rowEmpty = clearedRow.coins.every((c) => !c.active);
      if (rowEmpty) {
        // Immediately respawn all 20 coins in this row ($F037)
        clearedRow.coins.forEach((c) => (c.active = true));
        this.addScore(clearedRow.clearBonus);
        window.CircusAudio.playRowClear(clearedRow.index);

        this.spawnFloatingText(
          this.W / 2,
          clearedRow.y,
          `FILEIRA ${clearedRow.name} LIMPA! +${clearedRow.clearBonus}`,
          clearedRow.colorGlow
        );

        // Clearing top row awards +1 extra life up to max 5 ($F634: ORA #$0B; STA $AD)
        if (clearedRow.extraLifeOnClear && this.activePlayer.lives < 5) {
          this.activePlayer.lives++;
          window.CircusAudio.playExtraLife();
          this.spawnFloatingText(this.W / 2, clearedRow.y + 28, '🎪 +1 TRAPEZISTA EXTRA!', '#34d399');
        }
        this.updateHUD();
      }
    }
  }

  checkBarrierCollision() {
    const j = this.jumper;
    const b = this.barriers;

    if (Math.abs(j.y - b.y) > 13) return;

    const relX = j.x - this.arenaLeft;
    const posInCycle =
      ((relX - b.offset) % b.segmentSpan + b.segmentSpan) % b.segmentSpan;

    if (posInCycle <= b.barWidth) {
      // Bounce vertically off the barrier ($F100-$F125)
      j.dirY = j.dirY === -1 ? 1 : -1;
      j.y += j.dirY * 14;
      window.CircusAudio.playBarrierHit();
      this.spawnParticles(j.x, b.y, '#e2e8f0', 10, 0.7);
    }
  }

  /**
   * Checks whether the falling acrobat lands on the open side of the seesaw
   * or misses and splats on the arena floor ($F500-$F566 & $F26A-$F2B2)
   */
  checkSeesawOrSplat() {
    const j = this.jumper;
    const s = this.seesaw;

    // The open (raised) side of the seesaw is opposite to s.tilt:
    // If s.tilt === -1 (left end down with seated partner), the right half [s.x .. s.x + s.halfWidth] is raised!
    // If s.tilt === +1 (right end down with seated partner), the left half [s.x - s.halfWidth .. s.x] is raised!
    const openSideSign = -s.tilt; // +1 = right side is open, -1 = left side is open
    const dxFromCenter = (j.x - s.x) * openSideSign;

    // Allow generous yet authentic landing window on the raised side of the seesaw
    if (dxFromCenter >= -8 && dxFromCenter <= s.halfWidth + 18) {
      // === SUCCESSFUL SEESAW LANDING ($F514-$F566) ===
      const normalizedZone = dxFromCenter / s.halfWidth; // 0.0 (pivot) .. 1.0+ (outer tip)

      if (normalizedZone >= 0.68) {
        // Outer tip of seesaw: increases jump energy ($E1++)
        this.energyLevel = Math.min(this.maxEnergyLevel, this.energyLevel + 1);
      } else if (normalizedZone <= 0.30) {
        // Inner pivot of seesaw: decreases jump energy ($E1--) and reverses horizontal velocity ($D3)
        this.energyLevel = Math.max(0, this.energyLevel - 1);
        j.vx = -j.vx;
      }

      // Slight horizontal velocity shaping based on landing spot
      const speedMag = 2.8 + this.energyLevel * 0.45;
      j.vx = Math.sign(j.vx || openSideSign) * speedMag;

      // Flip the seesaw ($F7D6): the landing acrobat is now seated, and the waiting partner launches!
      const landedColor = j.colorId;
      const launchingColor = s.seatedAcrobatColor;
      s.tilt = openSideSign; // The side that caught the jumper goes down!
      s.seatedAcrobatColor = landedColor;

      // Position the newly launched partner at the newly raised side of the seesaw
      j.colorId = launchingColor;
      j.x = s.x - s.tilt * (s.halfWidth * 0.72);
      j.y = this.atariYToCanvasY(0xA1);
      j.dirY = -1; // Rising!
      j.curveIdx = this.energyLevel;
      j.stepIdx = 1;
      j.rotation = 0;
      j.trail = [];

      window.CircusAudio.playBounceSeesaw(this.energyLevel);
      this.spawnParticles(j.x, s.y, '#fbbf24', 12, 0.8);
      this.updateEnergyHUD();
    } else {
      // === MISSED SEESAW -> GROUND SPLAT ($F26A-$F2B2) ===
      j.y = this.groundY;
      j.splatTimer = 1.35;
      this.state = 'SPLAT_DELAY';
      this.screenShake = 10;

      window.CircusAudio.playSplat();
      this.spawnParticles(j.x, this.groundY, '#f43f5e', 24, 1.2);
      this.spawnFloatingText(j.x, this.groundY - 24, '💥 OOPS!', '#fb7185');
    }
  }

  handleAfterSplat() {
    const p = this.activePlayer;
    p.lives--;

    // Switch players in 2-player mode if the other player still has lives ($F2DC-$F308)
    if (this.flags.twoPlayers) {
      const otherIdx = 1 - this.currentPlayerIdx;
      if (this.players[otherIdx].lives > 0) {
        this.currentPlayerIdx = otherIdx;
      }
    }

    this.updateHUD();

    // Check if any player still has lives left
    const anyLivesLeft = this.players.some((pl) => pl.lives > 0);
    if (!anyLivesLeft) {
      this.state = 'GAMEOVER';
      const winnerMsg = this.flags.twoPlayers
        ? `Fim de Jogo! J1: ${this.players[0].score} pts • J2: ${this.players[1].score} pts`
        : `Fim do Espetáculo! Pontuação Final: ${this.players[0].score} pontos`;
      this.showMenuOverlay('FIM DE JOGO', winnerMsg);
      return;
    }

    this.state = 'PLAYING';
    this.resetJumpers(false);
  }

  updateEnergyHUD() {
    const bars = document.querySelectorAll('#energyMeter .bar');
    bars.forEach((bar, idx) => {
      const active = idx <= this.energyLevel;
      bar.classList.toggle('active', active && idx < 3);
      bar.classList.toggle('turbo', active && idx >= 3);
    });
  }

  updateHUD() {
    const p1 = this.players[0];
    const p2 = this.players[1];

    document.getElementById('p1Score').textContent = String(p1.score).padStart(5, '0');
    document.getElementById('p2Score').textContent = String(p2.score).padStart(5, '0');
    document.getElementById('hiScore').textContent = String(this.highScore).padStart(5, '0');

    document.getElementById('p1Card').classList.toggle('active', this.currentPlayerIdx === 0);
    document.getElementById('p2Card').classList.toggle(
      'active',
      this.flags.twoPlayers && this.currentPlayerIdx === 1
    );

    // Render life dots
    const renderLives = (elId, count, isP2) => {
      const container = document.getElementById(elId);
      container.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const dot = document.createElement('span');
        dot.className = 'life-dot' + (isP2 ? ' p2' : '');
        container.appendChild(dot);
      }
    };
    renderLives('p1Lives', p1.lives, false);
    renderLives('p2Lives', p2.lives, true);

    // Count remaining coins for active player
    const remaining = this.activePlayer.rows.reduce(
      (acc, r) => acc + r.coins.filter((c) => c.active).length,
      0
    );
    document.getElementById('coinsRemaining').textContent = `${remaining} / 60`;
  }

  // =========================================================================
  // RENDERING (Modern HD Circus Arena + Retro Atari 2600 Mode)
  // =========================================================================

  render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.screenShake;
      const dy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(dx, dy);
    }

    if (this.visualMode === 'retro') {
      this.renderRetroMode(ctx);
    } else {
      this.renderModernMode(ctx);
    }

    ctx.restore();
  }

  renderModernMode(ctx) {
    // 1. Deep Circus Arena Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.H);
    bgGrad.addColorStop(0, '#120724');
    bgGrad.addColorStop(0.55, '#1d0c36');
    bgGrad.addColorStop(1, '#090412');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.W, this.H);

    // Twinkling stars in upper dome
    this.stars.forEach((s) => {
      const alpha = 0.35 + 0.45 * Math.sin(this.spotlightPhase * 2 + s.phase);
      ctx.fillStyle = `rgba(253, 224, 71, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Sweeping Circus Spotlights
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const spot1Angle = Math.sin(this.spotlightPhase) * 0.32;
    const spot2Angle = -Math.sin(this.spotlightPhase * 0.8 + 1.2) * 0.32;
    this.drawSpotlight(ctx, this.W * 0.28, 0, spot1Angle, 'rgba(251, 191, 36, 0.07)');
    this.drawSpotlight(ctx, this.W * 0.72, 0, spot2Angle, 'rgba(56, 189, 248, 0.07)');
    ctx.restore();

    // 2. Circus Tent Valance (Top Red & Gold Drapes)
    this.drawTentValance(ctx);

    // 3. Arena Side Pillars & Springboards (Trampolines)
    this.drawArenaWallsAndSprings(ctx);

    // 4. Arena Floor / Stage Ring
    this.drawArenaFloor(ctx);

    // 5. Ceiling Coin Rows (3 circulating rows of 20 coins)
    this.drawCeilingCoinsModern(ctx);

    // 6. Moving Barriers (if enabled in Game 3, 7, 11)
    if (this.flags.hasBarriers) {
      this.drawBarriersModern(ctx);
    }

    // 7. Seesaw (Gangorra) & Seated Trapezist
    this.drawSeesawModern(ctx);

    // 8. Airborne or Splatted Trapezist
    this.drawAirborneJumperModern(ctx);

    // 9. Particles & Floating Score Popups
    this.drawParticlesAndPopups(ctx);
  }

  drawSpotlight(ctx, originX, originY, angle, color) {
    ctx.save();
    ctx.translate(originX, originY);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.lineTo(-190, this.H);
    ctx.lineTo(190, this.H);
    ctx.lineTo(25, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawTentValance(ctx) {
    const scallopCount = 16;
    const scallopW = this.W / scallopCount;

    for (let i = 0; i < scallopCount; i++) {
      const x = i * scallopW;
      ctx.fillStyle = i % 2 === 0 ? '#be123c' : '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + scallopW, 0);
      ctx.lineTo(x + scallopW, 28);
      ctx.arc(x + scallopW / 2, 28, scallopW / 2, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  drawArenaWallsAndSprings(ctx) {
    // Left & Right Circus Pillars
    ctx.fillStyle = '#1e1035';
    ctx.fillRect(0, 0, this.arenaLeft, this.H);
    ctx.fillRect(this.arenaRight, 0, this.W - this.arenaRight, this.H);

    // Gold trim along walls
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.arenaLeft, 45);
    ctx.lineTo(this.arenaLeft, this.groundY);
    ctx.moveTo(this.arenaRight, 45);
    ctx.lineTo(this.arenaRight, this.groundY);
    ctx.stroke();

    // Draw Left & Right Springboards (Trampolines)
    this.drawSingleSpringboard(ctx, this.leftSpring, 1);
    this.drawSingleSpringboard(ctx, this.rightSpring, -1);
  }

  drawSingleSpringboard(ctx, spring, dir) {
    const { x, y, h, compress } = spring;
    const padOffset = (18 - compress * 11) * dir;

    ctx.save();
    // Metallic coils
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    const coils = 6;
    for (let i = 0; i <= coils; i++) {
      const cy = y + (i / coils) * h;
      ctx.beginPath();
      ctx.moveTo(x - 10 * dir, cy);
      ctx.lineTo(x + padOffset, cy + (i % 2 === 0 ? 4 : -4));
      ctx.stroke();
    }

    // Glowing elastic bumper pad
    ctx.strokeStyle = compress > 0.1 ? '#fde047' : '#38bdf8';
    ctx.shadowColor = compress > 0.1 ? '#fde047' : '#38bdf8';
    ctx.shadowBlur = compress > 0.1 ? 16 : 8;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + padOffset, y);
    ctx.lineTo(x + padOffset, y + h);
    ctx.stroke();
    ctx.restore();
  }

  drawArenaFloor(ctx) {
    // Stage floor gradient
    const floorGrad = ctx.createLinearGradient(0, this.groundY, 0, this.H);
    floorGrad.addColorStop(0, '#4c1d95');
    floorGrad.addColorStop(0.25, '#2e1065');
    floorGrad.addColorStop(1, '#090414');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, this.groundY, this.W, this.H - this.groundY);

    // Bright ring border line
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.arenaLeft, this.groundY);
    ctx.lineTo(this.arenaRight, this.groundY);
    ctx.stroke();
  }

  drawCeilingCoinsModern(ctx) {
    const rows = this.activePlayer.rows;
    const spanWidth = this.arenaRight - this.arenaLeft;

    rows.forEach((row) => {
      // Subtle track rail in ceiling
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.arenaLeft, row.y);
      ctx.lineTo(this.arenaRight, row.y);
      ctx.stroke();

      row.coins.forEach((coin) => {
        if (!coin.active) return;
        const cx =
          this.arenaLeft + ((coin.slot * row.spacing + row.offset) % spanWidth);
        const cy = row.y;

        // 3D spinning coin effect
        const scaleX = 0.35 + 0.65 * Math.abs(Math.cos(coin.spinPhase));
        const r = 11;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scaleX, 1);

        ctx.shadowColor = row.colorGlow;
        ctx.shadowBlur = 10;

        // Outer coin rim
        ctx.fillStyle = row.colorMain;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner shine
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
        ctx.stroke();

        // Star/gem center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    });
  }

  drawBarriersModern(ctx) {
    const b = this.barriers;
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.arenaLeft, b.y - 12, this.arenaRight - this.arenaLeft, 24);
    ctx.clip();

    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;

    for (let i = -1; i <= 5; i++) {
      const bx = this.arenaLeft + i * b.segmentSpan + b.offset;
      ctx.beginPath();
      ctx.roundRect(bx, b.y - 6, b.barWidth, 12, 6);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSeesawModern(ctx) {
    const s = this.seesaw;
    const tiltAngle = s.tilt * 0.19; // +0.19 rad when right end is down, -0.19 rad when left end is down

    ctx.save();
    ctx.translate(s.x, s.y);

    // Center fulcrum / circus pedestal
    const pedGrad = ctx.createLinearGradient(-18, 0, 18, 34);
    pedGrad.addColorStop(0, '#f59e0b');
    pedGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = pedGrad;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(20, 34);
    ctx.lineTo(-20, 34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tilted seesaw plank
    ctx.save();
    ctx.rotate(tiltAngle);

    const plankGrad = ctx.createLinearGradient(-s.halfWidth, 0, s.halfWidth, 0);
    plankGrad.addColorStop(0, '#38bdf8');
    plankGrad.addColorStop(0.5, '#f8fafc');
    plankGrad.addColorStop(1, '#fb7185');

    ctx.fillStyle = plankGrad;
    ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(-s.halfWidth, -6, s.halfWidth * 2, 11, 5);
    ctx.fill();

    // Outer launch pads highlight
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-s.halfWidth, -7, 18, 13);
    ctx.fillRect(s.halfWidth - 18, -7, 18, 13);

    // Center pivot cap
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw the seated partner waiting on the lower end of the seesaw!
    const seatedX = s.tilt * (s.halfWidth * 0.72);
    ctx.translate(seatedX, -8);
    ctx.rotate(-tiltAngle); // Keep acrobat upright!
    this.drawAcrobatCharacter(ctx, 0, 0, s.seatedAcrobatColor, 'standing', 0);

    ctx.restore();
    ctx.restore();
  }

  drawAirborneJumperModern(ctx) {
    const j = this.jumper;

    // Motion trail
    j.trail.forEach((pt, idx) => {
      const alpha = ((idx + 1) / j.trail.length) * 0.25;
      ctx.fillStyle =
        pt.colorId === 0
          ? `rgba(56, 189, 248, ${alpha})`
          : `rgba(251, 113, 133, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y - 14, 5 + idx * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    if (this.state === 'SPLAT_DELAY') {
      // Comical upside-down splat animation ($FD30-$FD58 in CIRCUS.BIN)
      const kickFrame = Math.floor(performance.now() / 110) % 2;
      this.drawAcrobatCharacter(ctx, j.x, this.groundY, j.colorId, 'splat', kickFrame);
    } else {
      ctx.save();
      ctx.translate(j.x, j.y - 16);
      ctx.rotate(j.rotation);
      const pose = j.dirY === -1 ? 'jumpUp' : 'fallDown';
      this.drawAcrobatCharacter(ctx, 0, 16, j.colorId, pose, 0);
      ctx.restore();
    }
  }

  /**
   * Draws an expressive modern circus trapezist
   * colorId 0: Cyan/Gold outfit | colorId 1: Crimson/Gold outfit
   */
  drawAcrobatCharacter(ctx, x, footY, colorId, pose, frame) {
    const suitColor = colorId === 0 ? '#38bdf8' : '#fb7185';
    const capeColor = colorId === 0 ? '#2563eb' : '#e11d48';

    ctx.save();
    ctx.translate(x, footY);

    if (pose === 'splat') {
      // Upside-down head-first on the floor with kicking legs!
      ctx.strokeStyle = suitColor;
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';

      // Shoulders flat on floor
      ctx.beginPath();
      ctx.moveTo(-14, -3);
      ctx.lineTo(14, -3);
      ctx.stroke();

      // Head squished at bottom
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(0, -8, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Torso inverted
      ctx.fillStyle = suitColor;
      ctx.beginPath();
      ctx.roundRect(-6, -24, 12, 15, 4);
      ctx.fill();

      // Kicking legs in the air
      const legSpread = frame === 0 ? 11 : 4;
      ctx.beginPath();
      ctx.moveTo(-4, -24);
      ctx.lineTo(-legSpread, -38);
      ctx.moveTo(4, -24);
      ctx.lineTo(legSpread, -38);
      ctx.stroke();

      ctx.restore();
      return;
    }

    // Normal upright or airborne pose
    ctx.strokeStyle = suitColor;
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';

    // Cape / ribbon flutter
    ctx.fillStyle = capeColor;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(-12, -12);
    ctx.lineTo(12, -12);
    ctx.closePath();
    ctx.fill();

    // Legs
    const legAngle = pose === 'jumpUp' ? 7 : pose === 'fallDown' ? 11 : 5;
    ctx.beginPath();
    ctx.moveTo(-3, -13);
    ctx.lineTo(-legAngle, 0);
    ctx.moveTo(3, -13);
    ctx.lineTo(legAngle, 0);
    ctx.stroke();

    // Torso with gold belt
    ctx.fillStyle = suitColor;
    ctx.beginPath();
    ctx.roundRect(-6, -27, 12, 15, 4);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-6, -17, 12, 3);

    // Arms
    const armY = pose === 'jumpUp' ? -36 : pose === 'fallDown' ? -31 : -20;
    ctx.beginPath();
    ctx.moveTo(-5, -25);
    ctx.lineTo(-14, armY);
    ctx.moveTo(5, -25);
    ctx.lineTo(14, armY);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(0, -34, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Circus headband
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-6, -37, 12, 2.5);

    ctx.restore();
  }

  drawParticlesAndPopups(ctx) {
    this.particles.forEach((pt) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    this.floatingTexts.forEach((ft) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.font = '900 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  // =========================================================================
  // RETRO ATARI 2600 RENDERER (Uses exact bitmaps from $FD00-$FD62)
  // =========================================================================

  renderRetroMode(ctx) {
    // Classic Atari 2600 black background & blue playfield walls
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.W, this.H);

    // Playfield walls & top bar
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 40, this.arenaLeft, this.groundY - 40);
    ctx.fillRect(this.arenaRight, 40, this.W - this.arenaRight, this.groundY - 40);

    // Side springboards
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(this.arenaLeft - 8, this.leftSpring.y, 12, this.leftSpring.h);
    ctx.fillRect(this.arenaRight - 4, this.rightSpring.y, 12, this.rightSpring.h);

    // 3 Rows of blocky Atari playfield targets
    const rows = this.activePlayer.rows;
    const spanWidth = this.arenaRight - this.arenaLeft;
    rows.forEach((row) => {
      ctx.fillStyle = row.retroColor;
      row.coins.forEach((coin) => {
        if (!coin.active) return;
        const cx =
          this.arenaLeft + ((coin.slot * row.spacing + row.offset) % spanWidth);
        ctx.fillRect(cx - 12, row.y - 6, 24, 12);
      });
    });

    // Moving barriers
    if (this.flags.hasBarriers) {
      const b = this.barriers;
      ctx.fillStyle = '#a855f7';
      for (let i = -1; i <= 5; i++) {
        const bx = this.arenaLeft + i * b.segmentSpan + b.offset;
        ctx.fillRect(bx, b.y - 5, b.barWidth, 10);
      }
    }

    // Retro Seesaw & Seated Sprite
    const s = this.seesaw;
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(s.x - s.halfWidth, s.y - 4, s.halfWidth * 2, 8);
    ctx.fillRect(s.x - 8, s.y + 4, 16, 12);

    const seatedX = s.x + s.tilt * (s.halfWidth * 0.72);
    this.drawRomBitmap(
      ctx,
      ROM_SPRITES.standing,
      seatedX,
      s.y - 36,
      s.seatedAcrobatColor === 0 ? '#60a5fa' : '#f87171'
    );

    // Airborne or Splatted ROM Sprite
    const j = this.jumper;
    const jColor = j.colorId === 0 ? '#60a5fa' : '#f87171';
    if (this.state === 'SPLAT_DELAY') {
      const splatBmp =
        Math.floor(performance.now() / 120) % 2 === 0
          ? ROM_SPRITES.splat1
          : ROM_SPRITES.splat2;
      this.drawRomBitmap(ctx, splatBmp, j.x, this.groundY - 24, jColor);
    } else {
      const bmp =
        j.dirY === -1 ? ROM_SPRITES.jumpArmsUp : ROM_SPRITES.jumpSwingR;
      this.drawRomBitmap(ctx, bmp, j.x, j.y - 34, jColor);
    }
  }

  drawRomBitmap(ctx, bytes, centerX, topY, color) {
    const pixelW = 4;
    const pixelH = 3.2;
    const startX = centerX - 4 * pixelW;
    ctx.fillStyle = color;

    for (let row = 0; row < bytes.length; row++) {
      const b = bytes[row];
      for (let bit = 0; bit < 8; bit++) {
        if ((b >> (7 - bit)) & 1) {
          ctx.fillRect(
            startX + bit * pixelW,
            topY + row * pixelH,
            pixelW,
            pixelH
          );
        }
      }
    }
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.circusGame = new CircusGame();
});
