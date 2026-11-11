// Game 6: Living Room Disaster Zone ("The Floor is Lava & More!") for EmiliaGO! (1P & 2P Support)
// Rotating action challenges with exact audio synchronization:
// 1. 🌋 FloorIsLava (22.0s) & FloorIsLava2 (21.0s): Climb up / lift feet out of bottom lava zone!
// 2. 🌊 FloorIsWater (31.0s): Water pushes down to screen MIDDLE (50%); player must keep splashing to keep it there!
// 3. ❄️ Freeze (6.674s): Hold completely still like an ice statue!
// 4. 🌨️ Blizzard (13.0s): Sky blizzard with growing & dropping snowballs to dodge! (flashes yellow if hit)
// 5. 🏃 Run (3.26s looped 3x = ~10.3s): High-speed anime speed lines & run in place!
// Before each event: Transition.wav (~1.46s). After each event: Done1/Done2/Done3 (~2.3s) at random!
// Top-corner compact countdown widget (no giant banner blocking the video view).
import { sound } from './sound.js';
import { settings } from './settings.js';

export const DISASTER_HAZARDS = [
  { id: 'blizzard', title: 'BLIZZARD STORM!', icon: '🌨️', soundKey: 'blizzard', defaultDuration: 13.69, loopCount: 1 },
  { id: 'lava1', title: 'THE FLOOR IS LAVA!', icon: '🌋', soundKey: 'lava1', defaultDuration: 23.14, loopCount: 1 },
  { id: 'lava2', title: 'THE FLOOR IS LAVA 2!', icon: '🌋', soundKey: 'lava2', defaultDuration: 22.07, loopCount: 1 },
  { id: 'water', title: 'THE FLOOR IS WATER!', icon: '🌊', soundKey: 'water', defaultDuration: 31.76, loopCount: 1 },
  { id: 'freeze', title: 'BLIZZARD FREEZE!', icon: '❄️', soundKey: 'freeze', defaultDuration: 6.84, loopCount: 1 },
  { id: 'run', title: 'RUN IN PLACE!', icon: '🏃', soundKey: 'run', defaultDuration: 10.34, loopCount: 3 },
];

export class DisasterZoneGame {
  constructor() {
    this.score = 0;
    this.bestScore = settings.data.bestDisasterZone || 0;

    // Challenge Rounds: 10 events total per session!
    this.totalRounds = 10;
    this.currentRound = 0;

    // Phases: 'transition' -> 'active' -> 'done' -> 'transition' ... -> 'victory'
    this.phase = 'transition';
    this.phaseStartTime = performance.now();
    this.phaseDuration = 1.46;
    this.currentHazard = DISASTER_HAZARDS[1]; // default lava1
    this.hazardDeck = [];
    this.animTime = 0;

    // Victory Celebration System (Fireworks, Confetti, Rockets & Play Again)
    this.victoryFireworks = [];
    this.victoryRockets = [];
    this.victoryConfetti = [];
    this.rocketSpawnTimer = 0;
    this._lavaGrad = null;
    this._lavaGradKey = '';
    this._waterGrad = null;
    this._waterGradKey = '';
    this.playAgainHoldProgress = 0;
    this.playAgainTickStep = -1;

    // Adaptive standing baseline per player
    this.baselineShoulderY = 340;
    this.baselineHipY = 480;

    // Water height ratio: 0.50 (middle of screen) to 0.85 (shoulders/neck)
    this.waterRatio = 0.55;
    this.waterSplashes = [];
    this.waterRipples = [];

    // Blizzard snowball count & flying snowman dodge obstacle
    this.blizzardSnowballCount = 0;
    this.flyingSnowman = null;

    // Freeze cracked glass effect
    this.freezeCracks = null;
    this.freezeShards = [];

    this.lavaBubbles = [];
    this.snowFlurries = [];
    this.snowballs = [];
    this.snowballSpawnTimer = 0.6;
    this.speedLines = [];
    this.particles = [];
    this.floatingTexts = [];
    this.hazardFailed = false;
    this.isPlayerSafe = true;

    this.avatar = null;
    this.onMilestone = null;
    this.onReturnToHub = null;

    // Game Over Tracking & 5-Second Failure Timers
    this.waterDangerTimer = 0;
    this.lavaDangerTimer = 0;
    this.gameOverReason = null; // 'water' | 'lava' | 'trex'
    this.gameOverHoldProgress = 0; // Try Again button hold progress
    this.gameOverTickStep = -1;
    this.gameOverHomeHoldProgress = 0; // Return to Hub button hold progress
    this.gameOverHomeTickStep = -1;

    // Zero-GC Pre-Allocated Typed Buffers for High-Performance Water Rendering
    this._wavePointsX = new Float32Array(160);
    this._wavePointsY = new Float32Array(160);
    this._wavePointCount = 0;

    // Initialize decorative speed lines
    for (let i = 0; i < 36; i++) {
      this.speedLines.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        len: 80 + Math.random() * 160,
        speed: 800 + Math.random() * 700,
        thick: 2 + Math.random() * 3,
        color: '#FFFFFF',
      });
    }

    // Initialize snow flurries
    for (let i = 0; i < 45; i++) {
      this.snowFlurries.push({
        x: Math.random() * 1280,
        y: Math.random() * 260,
        vx: -180 - Math.random() * 220,
        vy: 40 + Math.random() * 60,
        r: 2 + Math.random() * 4,
        alpha: 0.4 + Math.random() * 0.5,
      });
    }
  }

  _nextHazard() {
    if (this.hazardDeck.length === 0) {
      this.hazardDeck = [...DISASTER_HAZARDS];
      for (let i = this.hazardDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.hazardDeck[i], this.hazardDeck[j]] = [this.hazardDeck[j], this.hazardDeck[i]];
      }
    }
    this.currentHazard = this.hazardDeck.pop();
    return this.currentHazard;
  }

  reset() {
    this.score = 0;
    sound.stopLavaClip();
    this.totalRounds = 10;
    this.currentRound = 0;
    this.waterRatio = 0.55;
    this.waterDangerTimer = 0;
    this.lavaDangerTimer = 0;
    this.gameOverReason = null;
    this.gameOverHoldProgress = 0;
    this.gameOverTickStep = -1;
    this.gameOverHomeHoldProgress = 0;
    this.gameOverHomeTickStep = -1;
    this.waterSplashes = [];
    this.waterRipples = [];
    this.blizzardSnowballCount = 0;
    this.flyingSnowman = null;
    this.freezeCracks = null;
    this.freezeShards = [];
    this.lavaBubbles = [];
    this.snowballs = [];
    this.snowballSpawnTimer = 0.5;
    this.tRex = null;
    this.particles = [];
    this.floatingTexts = [];
    this.victoryFireworks = [];
    this.victoryRockets = [];
    this.victoryConfetti = [];
    this.rocketSpawnTimer = 0;
    this._lavaGrad = null;
    this._lavaGradKey = '';
    this._waterGrad = null;
    this._waterGradKey = '';
    this.playAgainHoldProgress = 0;
    this.playAgainTickStep = -1;
    this.hazardFailed = false;
    this.isPlayerSafe = true;

    this.startTransitionPhase();
  }

  stop() {
    this.phase = 'idle';
    sound.stopLavaClip();
    this.tRex = null;
    this.snowballs = [];
    this.waterSplashes = [];
    this.waterRipples = [];
    this.waterDangerTimer = 0;
    this.lavaDangerTimer = 0;
    this.gameOverReason = null;
    this.gameOverHoldProgress = 0;
    this.gameOverHomeHoldProgress = 0;
    this.freezeCracks = null;
    this.freezeShards = [];
    this.lavaBubbles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.victoryFireworks = [];
    this.victoryRockets = [];
    this.victoryConfetti = [];
    this.playAgainHoldProgress = 0;
  }

  triggerGameOver(reason) {
    if (this.phase === 'gameover') return;
    sound.stopLavaClip();
    sound.playFailClip(true);
    this.phase = 'gameover';
    this.gameOverReason = reason;
    this.phaseStartTime = performance.now();
    this.phaseDuration = 999;
    this.gameOverHoldProgress = 0;
    this.gameOverTickStep = -1;
    this.gameOverHomeHoldProgress = 0;
    this.gameOverHomeTickStep = -1;

    // Trigger visual avatar sadness / yellow aura
    if (this.avatar && this.avatar.triggerYellowFlash) {
      this.avatar.triggerYellowFlash(3.5, reason);
    }
  }

  startTransitionPhase() {
    this.phase = 'transition';
    this.phaseStartTime = performance.now();
    this.phaseDuration = 1.46; // Transition.wav length

    sound.playLavaClip('transition', 1, () => {
      this.startActiveHazardPhase();
    }).then((res) => {
      if (res && res.duration) {
        this.phaseDuration = res.duration;
      }
    });
  }

  startActiveHazardPhase() {
    this.currentRound++;
    this._nextHazard();
    this.phase = 'active';
    this.phaseStartTime = performance.now();
    this.phaseDuration = this.currentHazard.defaultDuration;
    this.hazardFailed = false;
    this.isPlayerSafe = true;
    this.waterDangerTimer = 0;
    this.lavaDangerTimer = 0;
    this.waterRatio = 0.55;
    this.waterSplashes = [];
    this.waterRipples = [];
    this.snowballs = [];
    this.snowballSpawnTimer = 0.5;
    this.blizzardSnowballCount = 0;
    this.flyingSnowman = null;
    this.freezeCracks = null;
    this.freezeShards = [];

    if (this.currentHazard.id === 'run') {
      const sb = this._lastSafeBounds;
      const startX = sb ? sb.left + 50 : 85;
      const groundY = sb ? sb.bottom - 45 : 660;
      this.tRex = {
        x: startX,
        targetX: startX,
        y: groundY,
        legPhase: 0,
        mouthPhase: 0,
        caughtPlayer: false,
        flashTimer: 0,
        runSpeedSmooth: 0,
        dustParticles: [],
      };
    } else {
      this.tRex = null;
    }

    // Trigger audio with exact onEnded callback to guarantee 0ms timing drift!
    sound.playLavaClip(this.currentHazard.soundKey, this.currentHazard.loopCount, () => {
      this.startDoneCelebrationPhase();
    }).then((res) => {
      if (res && res.duration) {
        this.phaseDuration = res.duration;
      }
    });
  }

  startDoneCelebrationPhase() {
    sound.stopLavaClip();
    this.phase = 'done';
    this.phaseStartTime = performance.now();
    this.phaseDuration = 2.4;

    // Play Done1, Done2, or Done3 at random!
    sound.playLavaClip('done', 1, () => {
      if (this.currentRound >= this.totalRounds) {
        this.startGrandVictoryPhase();
      } else {
        this.startTransitionPhase();
      }
    }).then((res) => {
      if (res && res.duration) {
        this.phaseDuration = res.duration;
      }
    });

    // Award points & celebration
    this.score += 3;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      settings.data.bestDisasterZone = this.bestScore;
      settings.save();
    }

    this.spawnCelebrateBurst(640, 260);
    this.spawnFloatingText(640, 140, `🎉 ${this.currentHazard.title} COMPLETE! +3 POINTS! 🌟`, '#4ADE80');

    const everyN = settings.data.soundboardEveryN || 10;
    const milestoneCb = this.onMilestone;
    if (this.score > 0 && this.score % everyN === 0 && milestoneCb) {
      milestoneCb(this.score);
    }
  }

  startGrandVictoryPhase() {
    sound.stopLavaClip();
    this.phase = 'victory';
    this.phaseStartTime = performance.now();
    this.phaseDuration = 15.70; // YouDidIt.mp3 duration
    this.playAgainHoldProgress = 0;
    this.playAgainTickStep = -1;

    // Grand completion bonus (+15 points for clearing 15 challenges!)
    this.score += 15;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      settings.data.bestDisasterZone = this.bestScore;
      settings.save();
    }

    this.spawnVictoryCelebrationInitial();

    // Play YouDidIt.mp3!
    sound.playLavaClip('youdidit', 1, null, 1.6).then((res) => {
      if (res && res.duration) {
        this.phaseDuration = res.duration;
      }
    });

    if (this.onMilestone) {
      this.onMilestone(this.score);
    }
  }

  spawnVictoryCelebrationInitial() {
    this.victoryFireworks = [];
    this.victoryRockets = [];
    this.victoryConfetti = [];
    this.rocketSpawnTimer = 0.3;

    // Confetti pieces across the entire screen
    const confettiColors = ['#FACC15', '#EC4899', '#38BDF8', '#4ADE80', '#A855F7', '#FB923C', '#FFFFFF'];
    for (let i = 0; i < 70; i++) {
      this.victoryConfetti.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        w: 9 + Math.random() * 8,
        h: 6 + Math.random() * 6,
        vx: (Math.random() - 0.5) * 50,
        vy: 75 + Math.random() * 95,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 6,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        oscSpeed: 2.2 + Math.random() * 3.0,
        oscPhase: Math.random() * Math.PI * 2,
      });
    }

    // Immediate initial firework bursts
    const initialBursts = [
      { x: 360, y: 220, color: '#FACC15' },
      { x: 640, y: 170, color: '#38BDF8' },
      { x: 920, y: 230, color: '#EC4899' },
    ];
    for (const b of initialBursts) {
      this.spawnFireworkSparks(b.x, b.y, b.color);
    }
  }

  spawnFireworkSparks(x, y, burstColor = null) {
    const palette = ['#FACC15', '#EC4899', '#38BDF8', '#4ADE80', '#A855F7', '#FB923C', '#FFFFFF'];
    const chosenColor = burstColor || palette[Math.floor(Math.random() * palette.length)];
    const count = 28;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.18;
      const speed = 120 + Math.random() * 230;
      this.victoryFireworks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 4.5 + Math.random() * 4,
        color: Math.random() < 0.75 ? chosenColor : '#FFFFFF',
        gravity: 140,
        friction: 0.965,
        life: 0.9 + Math.random() * 0.45,
        maxLife: 1.25,
      });
    }
  }

  _generateFreezeCracks(originX, originY, cw, ch) {
    const cracks = [];
    const shards = [];

    // 10 main fracture lines radiating outwards to the screen boundaries
    const numRays = 10;
    for (let i = 0; i < numRays; i++) {
      const baseAngle = (Math.PI * 2 * i) / numRays + (Math.random() - 0.5) * 0.35;
      let cx = originX;
      let cy = originY;
      const points = [{ x: cx, y: cy }];

      let totalDist = 0;
      const maxDist = Math.hypot(cw, ch);
      while (totalDist < maxDist) {
        const step = 35 + Math.random() * 45;
        totalDist += step;
        const angDev = baseAngle + (Math.random() - 0.5) * 0.45;
        cx += Math.cos(angDev) * step;
        cy += Math.sin(angDev) * step;
        points.push({ x: cx, y: cy });

        // Branching hairline cracks
        if (Math.random() < 0.45 && points.length > 2) {
          const branchAng = angDev + (Math.random() < 0.5 ? 0.75 : -0.75);
          const bStep = 25 + Math.random() * 35;
          cracks.push({
            isBranch: true,
            points: [
              { x: cx, y: cy },
              { x: cx + Math.cos(branchAng) * bStep, y: cy + Math.sin(branchAng) * bStep },
              {
                x: cx + Math.cos(branchAng) * (bStep + 20) + (Math.random() - 0.5) * 15,
                y: cy + Math.sin(branchAng) * (bStep + 20) + (Math.random() - 0.5) * 15,
              },
            ],
          });
        }
      }
      cracks.push({ isBranch: false, points });
    }

    // Concentric spiderweb arcs connecting rays at radii 65, 140, 240, 370
    const ringRadii = [65, 140, 240, 370];
    const spiderwebRings = [];
    for (const r of ringRadii) {
      const ringPoints = [];
      for (let i = 0; i <= numRays; i++) {
        const idx = i % numRays;
        const ang = (Math.PI * 2 * idx) / numRays + (Math.random() - 0.5) * 0.22;
        const dist = r + (Math.random() - 0.5) * 25;
        ringPoints.push({
          x: originX + Math.cos(ang) * dist,
          y: originY + Math.sin(ang) * dist,
        });
      }
      spiderwebRings.push(ringPoints);
    }

    // Floating polygon glass shards near the impact center
    for (let s = 0; s < 14; s++) {
      const sAng = Math.random() * Math.PI * 2;
      const sDist = 30 + Math.random() * 140;
      const sx = originX + Math.cos(sAng) * sDist;
      const sy = originY + Math.sin(sAng) * sDist;
      const poly = [];
      const numPts = 3 + Math.floor(Math.random() * 3); // 3 to 5 vertices
      const pR = 12 + Math.random() * 20;
      for (let p = 0; p < numPts; p++) {
        const pAng = (Math.PI * 2 * p) / numPts + (Math.random() - 0.5) * 0.4;
        poly.push({
          x: sx + Math.cos(pAng) * pR,
          y: sy + Math.sin(pAng) * pR,
        });
      }
      shards.push({
        poly,
        alpha: 0.85,
        driftX: (Math.random() - 0.5) * 24,
        driftY: (Math.random() - 0.5) * 24,
      });
    }

    this.freezeCracks = {
      originX,
      originY,
      cracks,
      spiderwebRings,
    };
    this.freezeShards = shards;
  }

  _collectHandColliders(player, pointer) {
    const hands = [];
    const activePlayers =
      player && player.allPlayers && player.allPlayers.length > 0
        ? player.allPlayers
        : player && player.detected
        ? [player]
        : [];

    for (const pObj of activePlayers) {
      if (!pObj.colliders) continue;
      if (pObj.colliders.leftHand && pObj.colliders.leftHand.visibility > 0.3) {
        hands.push(pObj.colliders.leftHand);
      }
      if (pObj.colliders.rightHand && pObj.colliders.rightHand.visibility > 0.3) {
        hands.push(pObj.colliders.rightHand);
      }
    }
    if (pointer && pointer.active) {
      hands.push(pointer);
    }
    return hands;
  }

  _updateVictoryPhase(dt, safeBounds, player, pointer) {
    // 1. Confetti
    for (const c of this.victoryConfetti) {
      c.y += c.vy * dt;
      c.x += Math.sin(this.animTime * c.oscSpeed + c.oscPhase) * 45 * dt;
      c.rot += c.rotSpeed * dt;
      if (c.y > safeBounds.bottom + 15) {
        c.y = safeBounds.top - 20;
        c.x = safeBounds.left + Math.random() * safeBounds.width;
      }
    }

    // 2. Rockets & Fireworks
    this.rocketSpawnTimer -= dt;
    if (this.rocketSpawnTimer <= 0) {
      this.rocketSpawnTimer = 0.36 + Math.random() * 0.36;
      const startX = safeBounds.left + 90 + Math.random() * (safeBounds.width - 180);
      const targetY = safeBounds.top + safeBounds.height * (0.16 + Math.random() * 0.34);
      const colors = ['#FACC15', '#EC4899', '#38BDF8', '#4ADE80', '#A855F7', '#FB923C'];
      this.victoryRockets.push({
        x: startX,
        y: safeBounds.bottom + 10,
        targetY,
        vy: -580 - Math.random() * 120,
        trailTimer: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // Update rockets
    for (let i = this.victoryRockets.length - 1; i >= 0; i--) {
      const r = this.victoryRockets[i];
      r.y += r.vy * dt;
      r.trailTimer -= dt;
      if (r.trailTimer <= 0) {
        r.trailTimer = 0.04;
        if (this.particles.length < 40) {
          this.particles.push({
            x: r.x + (Math.random() - 0.5) * 6,
            y: r.y + 6,
            vx: (Math.random() - 0.5) * 30,
            vy: 50,
            r: 3 + Math.random() * 3,
            color: r.color,
            gravity: 80,
            life: 0.3,
            maxLife: 0.3,
          });
        }
      }
      if (r.y <= r.targetY) {
        this.spawnFireworkSparks(r.x, r.targetY, r.color);
        this.victoryRockets.splice(i, 1);
      }
    }

    // Update sparks
    for (let i = this.victoryFireworks.length - 1; i >= 0; i--) {
      const sp = this.victoryFireworks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vx *= sp.friction;
      sp.vy = sp.vy * sp.friction + sp.gravity * dt;
      sp.life -= dt;
      if (sp.life <= 0) {
        this.victoryFireworks.splice(i, 1);
      }
    }

    // 3. Play Again Button Interaction
    this._updatePlayAgainButton(dt, safeBounds, player, pointer);
  }

  _updatePlayAgainButton(dt, safeBounds, player, pointer) {
    const btnR = 52;
    const btnX = safeBounds.right - 95;
    const btnY = safeBounds.top + safeBounds.height * 0.52;

    const hands = this._collectHandColliders(player, pointer);
    let inside = false;
    for (const h of hands) {
      const dist = Math.hypot(btnX - h.x, btnY - h.y);
      if (dist < btnR + (h.r || 35) * 0.45) {
        inside = true;
        break;
      }
    }

    // Click/tap directly on button with pointer/remote
    if (pointer && pointer.clicked) {
      const pDist = Math.hypot(btnX - pointer.x, btnY - pointer.y);
      if (pDist < btnR * 1.3) {
        sound.playFanfare();
        this.reset();
        return;
      }
    }

    if (inside) {
      this.playAgainHoldProgress = Math.min(1.0, this.playAgainHoldProgress + dt / 1.8);
      const step = Math.floor(this.playAgainHoldProgress * 5);
      if (step > this.playAgainTickStep) {
        this.playAgainTickStep = step;
        sound.playCalibrationTick(this.playAgainHoldProgress);
      }
    } else {
      this.playAgainHoldProgress = Math.max(0, this.playAgainHoldProgress - dt * 2.0);
      if (this.playAgainHoldProgress === 0) {
        this.playAgainTickStep = -1;
      }
    }

    if (this.playAgainHoldProgress >= 1.0) {
      sound.playFanfare();
      this.reset();
    }
  }

  update(dt, safeBounds, player, pointer, onMilestone, avatar) {
    if (this.phase === 'idle') return;
    this._lastSafeBounds = safeBounds;
    this.animTime += dt;
    if (avatar) this.avatar = avatar;
    if (onMilestone) this.onMilestone = onMilestone;

    // Update general particles & floating texts
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity ?? 260) * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 45 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    const activePlayers =
      player && player.allPlayers && player.allPlayers.length > 0
        ? player.allPlayers
        : player && player.detected
        ? [player]
        : [];

    const cx = (safeBounds.left + safeBounds.right) / 2;

    // 0. GRAND VICTORY CELEBRATION PHASE
    if (this.phase === 'victory') {
      this._updateVictoryPhase(dt, safeBounds, player, pointer);
      return;
    }

    // 0.5. GAME OVER PHASE
    if (this.phase === 'gameover') {
      this._updateGameOverPhase(dt, safeBounds, player, pointer);
      return;
    }

    // 1. TRANSITION PHASE (Player calibration)
    if (this.phase === 'transition') {
      if (activePlayers.length > 0) {
        const lms = activePlayers[0].landmarksCanvas;
        if (lms && lms[11] && lms[12] && lms[23] && lms[24]) {
          const sY = (lms[11].y + lms[12].y) / 2;
          const hY = (lms[23].y + lms[24].y) / 2;
          this.baselineShoulderY = this.baselineShoulderY * 0.85 + sY * 0.15;
          this.baselineHipY = this.baselineHipY * 0.85 + hY * 0.15;
        }
      }
      return;
    }

    // 2. DONE CELEBRATION PHASE
    if (this.phase === 'done') {
      return;
    }

    // 3. ACTIVE HAZARD PHASE
    if (this.phase === 'active') {

      // ----------------------------------------------------
      // A) LAVA 1 & LAVA 2 (Floor is Lava - 22s and 21s)
      // ----------------------------------------------------
      if (this.currentHazard.id === 'lava1' || this.currentHazard.id === 'lava2') {
        const lavaLineY = safeBounds.bottom - safeBounds.height * 0.24;
        if (Math.random() < 0.35 && this.lavaBubbles.length < 18) {
          this.lavaBubbles.push({
            x: safeBounds.left + Math.random() * safeBounds.width,
            y: safeBounds.bottom - Math.random() * 35,
            r: 10 + Math.random() * 18,
            vy: -40 - Math.random() * 40,
            life: 0.8,
          });
        }
        for (let i = this.lavaBubbles.length - 1; i >= 0; i--) {
          const b = this.lavaBubbles[i];
          b.y += b.vy * dt;
          b.life -= dt;
          if (b.life <= 0) this.lavaBubbles.splice(i, 1);
        }

        // Active Jumping Detection (vertical hip / body oscillation)
        let isJumping = false;
        if (activePlayers.length > 0) {
          for (const pObj of activePlayers) {
            const lms = pObj.landmarksCanvas;
            if (!lms) continue;
            const hipY = lms[23] && lms[24] ? (lms[23].y + lms[24].y) / 2 : 0;
            if (this._lastHipY !== undefined && hipY > 0) {
              const dy = Math.abs(hipY - this._lastHipY);
              // Moving up and down vigorously or active motion speed
              if (dy > 4.2 || (pObj.motionSpeed && pObj.motionSpeed > 22)) {
                this._jumpGraceTimer = 0.55; // Grace window per jump bounce
              }
            }
            this._lastHipY = hipY;
          }
        }
        if (this._jumpGraceTimer > 0) {
          this._jumpGraceTimer -= dt;
          isJumping = true;
        }

        // Safe if:
        // 1. Actively jumping up and down (trying to get out of the lava), OR
        // 2. Completely out of the lava (feet above lava line / tucked on couch / hips raised)!
        let inLavaWithoutJumping = false;
        if (activePlayers.length > 0) {
          for (const pObj of activePlayers) {
            const lms = pObj.landmarksCanvas;
            if (!lms) continue;
            const hipY = lms[23] && lms[24] ? (lms[23].y + lms[24].y) / 2 : 0;
            const hipRaised = hipY < this.baselineHipY - 24;
            const lFoot = lms[27];
            const rFoot = lms[28];
            const feetOutOfLava =
              (lFoot && lFoot.y < lavaLineY && rFoot && rFoot.y < lavaLineY) ||
              ((!lFoot || lFoot.visibility < 0.45) && (!rFoot || rFoot.visibility < 0.45));

            const completelyOut = hipRaised || feetOutOfLava;
            if (!completelyOut && !isJumping) {
              inLavaWithoutJumping = true;
            }
          }
        }

        this.isPlayerSafe = !inLavaWithoutJumping;

        // Visual Feedback & 5-Second Failure Timer:
        if (inLavaWithoutJumping) {
          this.lavaDangerTimer += dt;
          if (this.avatar) {
            this.avatar.triggerYellowFlash(0.3, 'lava');
          }
          if (this.lavaDangerTimer >= 5.0) {
            this.triggerGameOver('lava');
            return;
          }
        } else {
          // If jumping or on couch, smoothly clear lava danger timer
          this.lavaDangerTimer = Math.max(0, this.lavaDangerTimer - dt * 3.5);
          if (this.avatar && this.avatar.sadReason === 'lava') {
            this.avatar.sadTimer = 0;
          }
        }

      // ----------------------------------------------------
      // B) WATER (Floor is Water - 31s)
      // Moving hands automatically clamps water BELOW player's head level!
      // ----------------------------------------------------
      } else if (this.currentHazard.id === 'water') {
        // Track player's chin/neck level so water stays below player's head without tilting camera
        let playerNeckY = safeBounds.top + safeBounds.height * 0.42;
        if (activePlayers.length > 0) {
          const p0 = activePlayers[0];
          if (p0.colliders?.head && p0.colliders.head.visibility > 0.25) {
            playerNeckY = p0.colliders.head.y + p0.colliders.head.r * 1.05;
          } else if (p0.landmarksCanvas && p0.landmarksCanvas[11] && p0.landmarksCanvas[12]) {
            playerNeckY = (p0.landmarksCanvas[11].y + p0.landmarksCanvas[12].y) / 2;
          }
        }
        this._lastPlayerNeckY = playerNeckY;

        const waterTop = safeBounds.bottom - safeBounds.height * this.waterRatio;

        let wavePower = 0;
        for (const pObj of activePlayers) {
          const cols = pObj.colliders;
          if (!cols) continue;
          for (const hk of ['leftHand', 'rightHand']) {
            const h = cols[hk];
            if (h && h.visibility > 0.3) {
              const spd = Math.hypot(h.vx || 0, h.vy || 0);
              wavePower += spd;

              // Moving hands trigger dynamic water ripples and energetic splash droplets!
              if (spd > 5) {
                // Expanding water surface ripples
                if (Math.random() < 0.38 && this.waterRipples.length < 18) {
                  this.waterRipples.push({
                    x: h.x + (Math.random() - 0.5) * 35,
                    y: waterTop,
                    r: 8,
                    maxR: 35 + Math.random() * 30,
                    alpha: 0.9,
                    life: 0.45,
                  });
                }

                // Upward splashing droplets
                const count = spd > 14 ? 3 : 2;
                for (let k = 0; k < count; k++) {
                  if (this.waterSplashes.length >= 50) break;
                  const spreadX = (Math.random() - 0.5) * 160 + (h.vx || 0) * 0.45;
                  const shootVy = -180 - Math.random() * 220 - Math.min(220, spd * 12);
                  this.waterSplashes.push({
                    x: h.x + (Math.random() - 0.5) * 20,
                    y: Math.min(h.y, waterTop + 15),
                    vx: spreadX,
                    vy: shootVy,
                    r: 4 + Math.random() * 5,
                    color: Math.random() < 0.35 ? '#FFFFFF' : '#38BDF8',
                    gravity: 440,
                    life: 0.5 + Math.random() * 0.25,
                    maxLife: 0.65,
                  });
                }
              }
            }
          }
        }
        if (pointer && pointer.active) wavePower += 24;

        // Calculate safe water ratio (holding water 25px below player's chin)
        const targetSafeWaterTop = playerNeckY + 25;
        const maxSafeWaterRatio = Math.max(0.20, (safeBounds.bottom - targetSafeWaterTop) / safeBounds.height);

        const waterSpeed = 0.13;
        if (wavePower <= 5) {
          // If NOT splashing, water rises up towards the head/room top (up to 85%)!
          this.waterRatio = Math.min(0.85, this.waterRatio + waterSpeed * dt);
        } else {
          // Splashing actively drives water down and locks it safely below the player's head!
          const targetWaterRatio = Math.min(0.42, maxSafeWaterRatio);
          if (this.waterRatio > targetWaterRatio) {
            this.waterRatio = Math.max(targetWaterRatio, this.waterRatio - waterSpeed * 1.8 * dt);
          }
        }

        // Player is safe whenever the water surface stays below chin/head level!
        const currentWaterTop = safeBounds.bottom - safeBounds.height * this.waterRatio;
        const isSubmerged = currentWaterTop < playerNeckY;
        this.isPlayerSafe = !isSubmerged;

        if (isSubmerged) {
          this.waterDangerTimer += dt;
          if (this.avatar) {
            this.avatar.triggerYellowFlash(0.3, 'water');
          }
          if (this.waterDangerTimer >= 5.0) {
            this.triggerGameOver('water');
            return;
          }
        } else {
          this.waterDangerTimer = Math.max(0, this.waterDangerTimer - dt * 3.0);
          if (this.avatar && this.avatar.sadReason === 'water') {
            this.avatar.sadTimer = 0;
          }
        }

        // Update active splashes
        for (let i = this.waterSplashes.length - 1; i >= 0; i--) {
          const sp = this.waterSplashes[i];
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          sp.vy += sp.gravity * dt;
          sp.life -= dt;
          if (sp.life <= 0 || (sp.y >= waterTop && sp.vy > 0)) {
            this.waterSplashes.splice(i, 1);
          }
        }

        // Update active ripples
        for (let i = this.waterRipples.length - 1; i >= 0; i--) {
          const rp = this.waterRipples[i];
          rp.r += (rp.maxR - rp.r) * 6 * dt;
          rp.life -= dt;
          rp.alpha = Math.max(0, rp.life / 0.45);
          if (rp.life <= 0) {
            this.waterRipples.splice(i, 1);
          }
        }

      // ----------------------------------------------------
      // C) FREEZE (Blizzard Freeze - 6.674s)
      // Shattered cracked glass effect when player moves!
      // ----------------------------------------------------
      } else if (this.currentHazard.id === 'freeze') {
        let totalMotion = 0;
        let originX = cx;
        let originY = (safeBounds.top + safeBounds.bottom) / 2;

        if (activePlayers.length > 0) {
          const p0 = activePlayers[0];
          totalMotion = p0.motionSpeed || 0;
          if (p0.landmarksCanvas && p0.landmarksCanvas[11] && p0.landmarksCanvas[12]) {
            originX = (p0.landmarksCanvas[11].x + p0.landmarksCanvas[12].x) / 2;
            originY = (p0.landmarksCanvas[11].y + p0.landmarksCanvas[12].y) / 2;
          }
        }

        const elapsedHazard = (performance.now() - this.phaseStartTime) / 1000;
        const isGracePeriod = elapsedHazard < 2.8;

        if (isGracePeriod) {
          // Leniency grace window (2.8s): Emilia is actively striking her fun statue pose!
          this.isPlayerSafe = true;
          this.freezeAnchorX = originX;
          this.freezeAnchorY = originY;
        } else if (totalMotion > 35 && !this.hazardFailed) {
          // Motion detected AFTER grace window -> Ice shatters!
          this.hazardFailed = true;
          this.isPlayerSafe = false;
          sound.playIceSlipAndCrack();
          this._generateFreezeCracks(originX, originY, safeBounds.width + safeBounds.left * 2, safeBounds.bottom + 40);
          this.spawnFloatingText(cx, safeBounds.top + 180, '💥 CRACK! YOU MOVED! 🧊', '#FCA5A5');
        } else if (!this.hazardFailed) {
          this.isPlayerSafe = true;
        }

      // ----------------------------------------------------
      // D) BLIZZARD (Sky Blizzard & Dropping Snowballs - 13.0s)
      // Snowballs originate above player's head (3 drops per phase)!
      // ----------------------------------------------------
      } else if (this.currentHazard.id === 'blizzard') {
        // Wind flurries
        for (const sf of this.snowFlurries) {
          sf.x += sf.vx * dt;
          sf.y += sf.vy * dt;
          if (sf.x < safeBounds.left - 20) {
            sf.x = safeBounds.right + 20;
            sf.y = safeBounds.top + Math.random() * (safeBounds.height * 0.28);
          }
        }

        // Spawn growing snowball in blizzard directly above player's head (3 drops total)
        this.snowballSpawnTimer -= dt;
        if (this.snowballSpawnTimer <= 0 && this.blizzardSnowballCount < 3) {
          this.blizzardSnowballCount++;
          this.snowballSpawnTimer = 2.6;

          // Target directly above player's head so they must move to dodge every time!
          let targetHeadX = cx;
          if (activePlayers.length > 0) {
            const p0 = activePlayers[0];
            if (p0.colliders?.head && p0.colliders.head.visibility > 0.25) {
              targetHeadX = p0.colliders.head.x;
            } else if (p0.landmarksCanvas && p0.landmarksCanvas[0]) {
              targetHeadX = p0.landmarksCanvas[0].x;
            }
          }
          const spawnX = Math.max(safeBounds.left + 95, Math.min(safeBounds.right - 95, targetHeadX));

          this.snowballs.push({
            x: spawnX,
            y: safeBounds.top + 65,
            state: 'growing', // 'growing' (1.1s) -> 'falling' (~0.75s)
            growTimer: 1.1,
            r: 16,
            maxR: 54,
            vy: 0,
            hitPlayer: false,
          });
        }

        // Check for Flying Snowman event towards the end of Blizzard (at ~8.8s when audio shouts "DUCK!")
        const elapsedBlizzard = (performance.now() - this.phaseStartTime) / 1000;
        if (elapsedBlizzard >= 8.8 && !this.flyingSnowman && this.blizzardSnowballCount >= 3) {
          // Moved lower (at 40% height) directly across standing head/chest level so player must duck!
          const spawnY = safeBounds.top + safeBounds.height * 0.40;
          this.flyingSnowman = {
            x: safeBounds.right + 180,
            y: spawnY,
            speed: (safeBounds.width + 360) / 2.7, // crosses screen in 2.7 seconds!
            animTime: 0,
            dodged: false,
            hitPlayer: false,
          };
        }

        // Update Flying Snowman
        if (this.flyingSnowman) {
          const sm = this.flyingSnowman;
          sm.animTime += dt;
          sm.x -= sm.speed * dt;

          // Frost / snow sparkle particle trail behind flying snowman
          if (this.particles.length < 45 && Math.random() < 0.65) {
            this.particles.push({
              x: sm.x + 55 + (Math.random() - 0.5) * 20,
              y: sm.y + (Math.random() - 0.5) * 35,
              vx: 130 + Math.random() * 90,
              vy: -20 + (Math.random() - 0.5) * 45,
              r: 4 + Math.random() * 5,
              color: Math.random() < 0.5 ? '#BAE6FD' : '#FFFFFF',
              gravity: 40,
              life: 0.45,
              maxLife: 0.45,
            });
          }

          // Detect Ducking under the Snowman
          // Flying snowman travels horizontally across at altitude sm.y = safeBounds.top + safeBounds.height * 0.40.
          // Bottom boundary of snowman is sm.y + 65.
          let playerHeadX = cx;
          let playerHeadY = 999;

          if (activePlayers.length > 0) {
            for (const pObj of activePlayers) {
              const head = pObj.colliders?.head;
              const lms = pObj.landmarksCanvas;
              if (head && head.visibility > 0.25) {
                playerHeadX = head.x;
                playerHeadY = head.y;
              } else if (lms && lms[0]) {
                playerHeadX = lms[0].x;
                playerHeadY = lms[0].y;
              }
            }
          }
          if (pointer && pointer.active) {
            playerHeadX = pointer.x;
            playerHeadY = pointer.y;
          }

          // Horizontal collision overlap window with snowman
          const overlapDist = Math.abs(sm.x - playerHeadX);
          if (overlapDist < 85) {
            // Player's head is UP in the snowman's trajectory (she did NOT duck under):
            if (playerHeadY < sm.y + 65) {
              if (!sm.hitPlayer && !sm.dodged) {
                sm.hitPlayer = true;
                this.hazardFailed = true;
                if (this.avatar?.triggerYellowFlash) {
                  this.avatar.triggerYellowFlash(2.0, 'snowball');
                }
                sound.playIceSlipAndCrack();
                this.spawnSnowBurst(sm.x, sm.y, 40);
                this.spawnFloatingText(sm.x, sm.y - 75, '❄️ BONK! DUCK NEXT TIME! 🤪', '#FACC15');
              }
            }
          } else if (sm.x < playerHeadX - 85) {
            // Snowman has flown cleanly past player:
            if (!sm.dodged && !sm.hitPlayer) {
              sm.dodged = true;
              this.score += 2;
              sound.playWindGust();
              this.spawnFloatingText(playerHeadX, sm.y - 75, '💨 DUCKED UNDER! ⛄ +2 ⭐', '#4ADE80');
            }
          }
        }

        // Update Snowballs & Collisions
        for (let i = this.snowballs.length - 1; i >= 0; i--) {
          const sb = this.snowballs[i];

          if (sb.state === 'growing') {
            sb.growTimer -= dt;
            const progress = 1.0 - Math.max(0, sb.growTimer / 1.3);
            sb.r = 16 + progress * (sb.maxR - 16);

            if (sb.growTimer <= 0) {
              sb.state = 'falling';
              sb.vy = 720; // Fast plunge downward!
            }
          } else if (sb.state === 'falling') {
            sb.y += sb.vy * dt;

            // Frost trail behind falling snowball
            if (this.particles.length < 35 && Math.random() < 0.6) {
              this.particles.push({
                x: sb.x + (Math.random() - 0.5) * sb.r * 0.8,
                y: sb.y - sb.r * 0.8,
                vx: (Math.random() - 0.5) * 40,
                vy: -60,
                r: 4 + Math.random() * 4,
                color: '#E0F2FE',
                gravity: 60,
                life: 0.35,
                maxLife: 0.35,
              });
            }

            // Check collision with player's head / torso / shoulders
            let hit = false;
            for (const pObj of activePlayers) {
              const head = pObj.colliders?.head;
              const lms = pObj.landmarksCanvas;

              if (head && Math.hypot(sb.x - head.x, sb.y - head.y) < sb.r + head.r * 0.75) {
                hit = true;
                break;
              }
              if (lms && lms[11] && lms[12]) {
                const chestX = (lms[11].x + lms[12].x) / 2;
                const chestY = (lms[11].y + lms[12].y) / 2;
                if (Math.hypot(sb.x - chestX, sb.y - chestY) < sb.r + 45) {
                  hit = true;
                  break;
                }
              }
            }

            if (hit && !sb.hitPlayer) {
              sb.hitPlayer = true;
              this.hazardFailed = true;

              // Player flashes yellow!
              if (this.avatar && this.avatar.triggerYellowFlash) {
                this.avatar.triggerYellowFlash(2.0, 'snowball');
              }

              this.spawnSnowBurst(sb.x, sb.y, 22);
              this.spawnFloatingText(sb.x, sb.y - 40, '❄️ SPLAT! DODGE NEXT TIME! 🤪', '#FACC15');
              this.snowballs.splice(i, 1);
              continue;
            }

            // Reaches floor: dodge success!
            if (sb.y >= safeBounds.bottom - 35) {
              this.spawnSnowBurst(sb.x, safeBounds.bottom - 20, 16);
              this.spawnFloatingText(sb.x, safeBounds.bottom - 60, '💨 GREAT DODGE! 🌟', '#4ADE80');
              this.snowballs.splice(i, 1);
              continue;
            }
          }
        }

      // ----------------------------------------------------
      // E) RUN AWAY FROM THE T-REX! (Friendly Dinosaur Chase & Run in place)
      // ----------------------------------------------------
      } else if (this.currentHazard.id === 'run') {
        if (!this.tRex) {
          const startX = safeBounds.left - 40;
          this.tRex = {
            x: startX,
            targetX: startX,
            y: safeBounds.bottom - 45,
            legPhase: 0,
            mouthPhase: 0,
            caughtPlayer: false,
            flashTimer: 0,
            runSpeedSmooth: 0,
            dustParticles: [],
          };
        }

        let runSpeed = 0;
        let minPlayerX = safeBounds.right;

        for (const pObj of activePlayers) {
          const cols = pObj.colliders;
          if (cols) {
            for (const key of ['head', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot']) {
              const col = cols[key];
              if (col && col.visibility > 0.25) {
                minPlayerX = Math.min(minPlayerX, col.x - col.r);
                const rawSp = Math.hypot(col.vx || 0, col.vy || 0);
                // Deadband filter camera sensor jitter (1-3px natural noise)
                if (rawSp > 3.0) {
                  runSpeed += (rawSp - 3.0) * 1.5;
                }
              }
            }
          }
          // Vertical hip oscillation from running in place
          const lms = pObj.landmarksCanvas;
          if (lms && lms[23] && lms[24]) {
            const hipY = (lms[23].y + lms[24].y) / 2;
            if (this._lastTRexHipY !== undefined) {
              const dHip = Math.abs(hipY - this._lastTRexHipY);
              // Deadband filter slight postural sway
              if (dHip > 3.0) {
                runSpeed += (dHip - 3.0) * 4.5;
              }
            }
            this._lastTRexHipY = hipY;
          }
        }
        if (pointer && pointer.active && pointer.speed > 80) {
          runSpeed += Math.min(60, pointer.speed * 0.15);
        }

        if (minPlayerX > safeBounds.right - 40) {
          minPlayerX = (safeBounds.left + safeBounds.right) * 0.55;
        }

        // Smooth running speed detection
        this.tRex.runSpeedSmooth = this.tRex.runSpeedSmooth * 0.82 + runSpeed * 0.18;
        const spd = this.tRex.runSpeedSmooth;
        // Require energetic continuous running (spd >= 75) to be considered safe
        const isRunning = spd >= 75;
        this.isPlayerSafe = isRunning;

        // Ground level for T-Rex
        this.tRex.y = safeBounds.bottom - 45;

        // Animate legs, mouth chomping, and flash timer
        this.tRex.legPhase += dt * (spd < 20 ? 16 : isRunning ? 14 : 10);
        this.tRex.mouthPhase += dt * (spd < 20 ? 16 : 9);

        if (this.tRex.flashTimer > 0) {
          this.tRex.flashTimer = Math.max(0, this.tRex.flashTimer - dt);
        }

        // Dynamic T-Rex Movement:
        // - Inactive / standing still (< 25): T-Rex charges fast towards player (+260 px/s)
        // - Minimal movement / walking (25 <= spd < 50): T-Rex still advances steadily (+150 to +60 px/s)
        // - Moderate movement / jogging (50 <= spd < 85): T-Rex creeps closer or holds ground (+40 to +5 px/s) - DOES NOT RETREAT!
        // - Energetic running in place (85 <= spd < 140): Player is actively running! T-Rex begins steady retreat (-25 to -90 px/s)
        // - Full sprint (spd >= 140): T-Rex is driven backwards rapidly (-90 to -170 px/s)
        const retreatX = safeBounds.left - 30;
        const snoutOffset = 135; // Snout tip reach relative to T-Rex anchor

        let dinoVelocity = 0;
        if (spd < 25) {
          dinoVelocity = 260;
        } else if (spd < 50) {
          const t = (spd - 25) / 25;
          dinoVelocity = 260 * (1 - t) + 80 * t; // +260 down to +80
        } else if (spd < 85) {
          const t = (spd - 50) / 35;
          dinoVelocity = 80 * (1 - t) + 10 * t; // +80 down to +10 (still closing in!)
        } else if (spd < 140) {
          const t = (spd - 85) / 55;
          dinoVelocity = -25 - 65 * t; // -25 to -90 (pushing back!)
        } else {
          const boost = Math.min(80, (spd - 140) * 1.8);
          dinoVelocity = -90 - boost; // -90 to -170 px/s
        }

        this.tRex.x += dinoVelocity * dt;
        if (this.tRex.x < retreatX) {
          this.tRex.x = retreatX;
          this.tRex.caughtPlayer = false;
        }

        // Snout collision check with player -> GAME OVER!
        const tRexSnoutX = this.tRex.x + snoutOffset;
        if (tRexSnoutX >= minPlayerX - 10) {
          this.tRex.caughtPlayer = true;
          this.tRex.x = minPlayerX - snoutOffset;
          this.triggerGameOver('trex');
          return;
        }

        // Running dust puffs kicked up by T-Rex stomping feet
        if (this.tRex.dustParticles.length < 20 && Math.random() < 0.35) {
          this.tRex.dustParticles.push({
            x: this.tRex.x - 30 + (Math.random() - 0.5) * 20,
            y: this.tRex.y - 10,
            vx: -60 - Math.random() * 60,
            vy: -20 - Math.random() * 30,
            r: 8 + Math.random() * 8,
            life: 0.35,
            maxLife: 0.35,
          });
        }

        // Update T-Rex dust puffs
        for (let i = this.tRex.dustParticles.length - 1; i >= 0; i--) {
          const dp = this.tRex.dustParticles[i];
          dp.life -= dt;
          if (dp.life <= 0) {
            this.tRex.dustParticles.splice(i, 1);
            continue;
          }
          dp.x += dp.vx * dt;
          dp.y += dp.vy * dt;
          dp.r += dt * 15;
        }

        // Update anime speed lines
        for (const sl of this.speedLines) {
          sl.x -= sl.speed * dt * (isRunning ? 1.5 : 0.9);
          if (sl.x < -sl.len) {
            sl.x = 1280 + Math.random() * 200;
            sl.y = Math.random() * 720;
            sl.color = isRunning
              ? Math.random() < 0.5 ? '#FACC15' : '#38BDF8'
              : '#FFFFFF';
          }
        }

        // Player foot dust
        if (isRunning && activePlayers.length > 0 && this.particles.length < 35) {
          for (const pObj of activePlayers) {
            const cols = pObj.colliders;
            if (!cols) continue;
            for (const fk of ['leftFoot', 'rightFoot']) {
              const foot = cols[fk];
              if (foot && Math.random() < 0.4) {
                this.particles.push({
                  x: foot.x + (Math.random() - 0.5) * 30,
                  y: foot.y - 10,
                  vx: (Math.random() - 0.5) * 120,
                  vy: -40 - Math.random() * 60,
                  r: 6 + Math.random() * 6,
                  color: Math.random() < 0.5 ? '#F59E0B' : '#FDE68A',
                  gravity: -40,
                  life: 0.35,
                  maxLife: 0.35,
                });
              }
            }
          }
        }
      }
    }
  }

  spawnSnowBurst(x, y, count = 18) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 40) break;
      const angle = (Math.PI * 2 * i) / count;
      const spd = 70 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        r: 3 + Math.random() * 4,
        color: Math.random() < 0.5 ? '#FFFFFF' : '#BAE6FD',
        gravity: 120,
        life: 0.5,
        maxLife: 0.5,
      });
    }
  }

  spawnCelebrateBurst(x, y) {
    const colors = ['#4ADE80', '#FACC15', '#38BDF8', '#EC4899', '#FFFFFF'];
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= 40) break;
      const a = (Math.PI * 2 * i) / 20;
      const spd = 120 + Math.random() * 180;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 60,
        r: 6 + Math.random() * 5,
        color: colors[i % colors.length],
        gravity: 240,
        life: 0.7,
        maxLife: 0.7,
      });
    }
  }

  spawnFloatingText(x, y, text, color = '#FFFFFF') {
    this.floatingTexts.push({ x, y, text, color, life: 1.4, maxLife: 1.4 });
  }

  render(ctx, canvasWidth, canvasHeight, safeBounds) {
    const elapsed = (performance.now() - this.phaseStartTime) / 1000;
    const remaining = Math.max(0, this.phaseDuration - elapsed);

    // 0. Grand Victory Celebration Screen
    if (this.phase === 'victory') {
      this._drawGrandVictoryScreen(ctx, canvasWidth, canvasHeight, safeBounds);

    // 0.5. Kid-Friendly Game Over Screen
    } else if (this.phase === 'gameover') {
      this._drawGameOverScreen(ctx, canvasWidth, canvasHeight, safeBounds);

    // 1. Render Active Hazard Visuals
    } else if (this.phase === 'active') {
      if (this.currentHazard.id === 'lava1' || this.currentHazard.id === 'lava2') {
        this._drawLavaFloor(ctx, canvasWidth, canvasHeight, safeBounds);
        if (this.lavaDangerTimer > 0.5) {
          this._drawHazardDangerAlert(ctx, safeBounds, 'lava', this.lavaDangerTimer, 5.0);
        }
      } else if (this.currentHazard.id === 'water') {
        this._drawRisingFlood(ctx, canvasWidth, canvasHeight);
        if (this.waterDangerTimer > 0.5) {
          this._drawHazardDangerAlert(ctx, safeBounds, 'water', this.waterDangerTimer, 5.0);
        }
      } else if (this.currentHazard.id === 'freeze') {
        this._drawBlizzardFreeze(ctx, canvasWidth, canvasHeight);
      } else if (this.currentHazard.id === 'blizzard') {
        this._drawBlizzardSky(ctx, canvasWidth, safeBounds);
      } else if (this.currentHazard.id === 'run') {
        this._drawSpeedLines(ctx, canvasWidth, canvasHeight);
        if (this.tRex) {
          this._drawFriendlyTRex(ctx, safeBounds);
          this._drawTRexChaseAlert(ctx, safeBounds);
        }
      }

      // Yellow warning edge flash when T-Rex tags player!
      if (this.tRex && this.tRex.flashTimer > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(250, 204, 21, ${Math.min(0.28, this.tRex.flashTimer * 0.18)})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      }

      // Compact Top-Corner Countdown Widget (Zero obstruction of camera view)
      this._drawTopCornerCountdown(ctx, safeBounds, remaining);

    // 2. Transition Phase (Pill at top center)
    } else if (this.phase === 'transition') {
      ctx.save();
      const cx = (safeBounds.left + safeBounds.right) / 2;
      const pillW = 440;
      const pillH = 46;
      const pillY = safeBounds.top + 16;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#FEF08A';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.fillText(`⚡ NEXT CHALLENGE (${this.currentRound + 1}/${this.totalRounds}) INCOMING... ⚡`, cx, pillY + 29);
      ctx.restore();

    // 3. Done Celebration Phase
    } else if (this.phase === 'done') {
      ctx.save();
      const cx = (safeBounds.left + safeBounds.right) / 2;
      const pillW = 480;
      const pillH = 48;
      const pillY = safeBounds.top + 16;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.strokeStyle = '#4ADE80';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#4ADE80';
      ctx.font = '900 20px system-ui, sans-serif';
      ctx.fillText(`🌟 CHALLENGE ${this.currentRound}/${this.totalRounds} COMPLETE! +3 POINTS! 🎉`, cx, pillY + 31);
      ctx.restore();
    }

    // 4. Particles & Floating Texts
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.font = '900 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 6;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // Sleek, compact top-corner countdown widget (leaves whole camera view open)
  _drawTopCornerCountdown(ctx, safeBounds, remaining) {
    const badgeX = safeBounds.right - 55;
    const badgeY = safeBounds.top + 65;
    const badgeR = 34;

    ctx.save();
    // Dark translucent background circle
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#38BDF8';
    ctx.stroke();

    // Circular Countdown Sweep Ring
    const progress = this.phaseDuration > 0 ? remaining / this.phaseDuration : 0;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Icon & Seconds remaining
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(this.currentHazard.icon, badgeX, badgeY - 11);

    ctx.fillStyle = '#FEF08A';
    ctx.font = '900 17px system-ui, sans-serif';
    ctx.fillText(`${Math.ceil(remaining)}s`, badgeX, badgeY + 11);

    // Compact Round Indicator Pill right underneath
    const pillW = 86;
    const pillH = 22;
    const pillY = badgeY + badgeR + 9;
    ctx.beginPath();
    ctx.roundRect(badgeX - pillW / 2, pillY, pillW, pillH, 11);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FACC15';
    ctx.stroke();

    ctx.fillStyle = '#FEF08A';
    ctx.font = '900 12px system-ui, sans-serif';
    ctx.fillText(`${this.currentRound} / ${this.totalRounds}`, badgeX, pillY + pillH / 2);

    ctx.restore();
  }

  _drawGrandVictoryScreen(ctx, cw, ch, safeBounds) {
    const cx = (safeBounds.left + safeBounds.right) / 2;

    // 1. Confetti
    for (const c of this.victoryConfetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }

    // 2. Firework Sparks
    for (const sp of this.victoryFireworks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle cross glint on larger sparks
      if (sp.r > 5) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sp.x - sp.r * 1.5, sp.y);
        ctx.lineTo(sp.x + sp.r * 1.5, sp.y);
        ctx.moveTo(sp.x, sp.y - sp.r * 1.5);
        ctx.lineTo(sp.x, sp.y + sp.r * 1.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Grand Victory Banner at Top Center
    ctx.save();
    const bannerW = Math.min(680, safeBounds.width * 0.85);
    const bannerH = 110;
    const bannerY = safeBounds.top + 28;
    const pulseScale = 1.0 + Math.sin(this.animTime * 3) * 0.02;

    ctx.translate(cx, bannerY + bannerH / 2);
    ctx.scale(pulseScale, pulseScale);
    ctx.translate(-cx, -(bannerY + bannerH / 2));

    // Outer glow
    ctx.fillStyle = 'rgba(250, 204, 21, 0.20)';
    ctx.beginPath();
    ctx.roundRect(cx - bannerW / 2 - 10, bannerY - 8, bannerW + 20, bannerH + 16, 28);
    ctx.fill();

    // Dark glass body
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(cx - bannerW / 2, bannerY, bannerW, bannerH, 22);
    ctx.fill();
    ctx.stroke();

    // Banner Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Trophy + Main text
    ctx.font = '900 32px system-ui, sans-serif';
    ctx.fillStyle = '#FEF08A';
    ctx.fillText('🏆 YOU DID IT, EMILIA! 🏆', cx, bannerY + 36);

    // Subtitle
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.fillStyle = '#4ADE80';
    ctx.fillText('🌟 ALL 10 CHALLENGES CLEARED! 🌟', cx, bannerY + 70);

    // Score pill
    ctx.font = '800 15px system-ui, sans-serif';
    ctx.fillStyle = '#BAE6FD';
    ctx.fillText(`🎉 FINAL SCORE: ${this.score} POINTS! 🎉`, cx, bannerY + 94);

    ctx.restore();

    // 4. Play Again Button (Off to the right side)
    this._drawPlayAgainButton(ctx, safeBounds);

    // 5. Bottom Navigation Prompt Pill
    ctx.save();
    const hintW = Math.min(620, safeBounds.width * 0.80);
    const hintH = 42;
    const hintY = safeBounds.bottom - 52;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(cx - hintW / 2, hintY, hintW, hintH, 21);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FEF08A';
    ctx.font = '900 16px system-ui, sans-serif';
    ctx.fillText('✋ REACH RIGHT TO PLAY AGAIN  •  🏠 HOLD MENU TO EXIT', cx, hintY + 21);
    ctx.restore();
  }

  _drawPlayAgainButton(ctx, safeBounds) {
    const btnR = 52;
    const btnX = safeBounds.right - 95;
    const btnY = safeBounds.top + safeBounds.height * 0.52;
    const isHovered = this.playAgainHoldProgress > 0;

    ctx.save();
    ctx.translate(btnX, btnY);

    // Glowing outer ring aura
    const pulse = 1.0 + Math.sin(this.animTime * 4) * 0.05;
    ctx.beginPath();
    ctx.arc(0, 0, (btnR + 10) * pulse, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? 'rgba(34, 197, 94, 0.38)' : 'rgba(34, 197, 94, 0.16)';
    ctx.fill();

    // Main button background disc
    ctx.beginPath();
    ctx.arc(0, 0, btnR, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? 'rgba(21, 128, 61, 0.95)' : 'rgba(15, 23, 42, 0.90)';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = isHovered ? '#4ADE80' : '#22C55E';
    ctx.stroke();

    // Center icon: 🔄 (rotate slightly when hovered)
    ctx.save();
    if (isHovered) {
      ctx.rotate(this.playAgainHoldProgress * Math.PI * 2);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '30px system-ui, sans-serif';
    ctx.fillText('🔄', 0, -12);
    ctx.restore();

    // Text: PLAY AGAIN
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 13px system-ui, sans-serif';
    ctx.fillText('PLAY AGAIN', 0, 16);

    // Sub-text / instruction
    ctx.fillStyle = isHovered ? '#FEF08A' : '#86EFAC';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.fillText(isHovered ? 'HOLDING...' : 'HOLD ✋', 0, 30);

    // Circular Hold Progress Ring
    if (this.playAgainHoldProgress > 0) {
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        btnR + 7,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * this.playAgainHoldProgress
      );
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawLavaFloor(ctx, cw, ch, safeBounds) {
    const lavaHeight = safeBounds.height * 0.24;
    const lavaTop = ch - lavaHeight;

    ctx.save();
    const gradKey = `${Math.round(lavaTop)}_${ch}`;
    if (this._lavaGradKey !== gradKey || !this._lavaGrad) {
      this._lavaGradKey = gradKey;
      const grad = ctx.createLinearGradient(0, lavaTop, 0, ch);
      grad.addColorStop(0, 'rgba(250, 204, 21, 0.90)');
      grad.addColorStop(0.35, 'rgba(249, 115, 22, 0.94)');
      grad.addColorStop(1, 'rgba(185, 28, 28, 0.96)');
      this._lavaGrad = grad;
    }

    ctx.fillStyle = this._lavaGrad;
    ctx.beginPath();
    ctx.moveTo(0, ch);
    for (let x = 0; x <= cw; x += 40) {
      const waveY = lavaTop + Math.sin(this.animTime * 5 + x * 0.025) * 12;
      ctx.lineTo(x, waveY);
    }
    ctx.lineTo(cw, ch);
    ctx.closePath();
    ctx.fill();

    for (const b of this.lavaBubbles) {
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Water event: Submerges lower half of screen (minimum 50% middle height)
  // Player must continuously wave/splash to hold it at the middle!
  _drawRisingFlood(ctx, cw, ch) {
    const waterH = ch * this.waterRatio;
    const waterTop = ch - waterH;

    ctx.save();

    // 1. Underwater Caustic Sunlight Beams
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 6; i++) {
      const rx = (cw * (0.12 + i * 0.16) + Math.sin(this.animTime * 1.5 + i) * 35);
      ctx.beginPath();
      ctx.moveTo(rx - 20, waterTop);
      ctx.lineTo(rx + 25, waterTop);
      ctx.lineTo(rx + 75, ch);
      ctx.lineTo(rx + 15, ch);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Back Wave Layer (Rolling deep ocean blue spanning 100% full width past screen edges)
    ctx.beginPath();
    ctx.moveTo(-120, ch + 50);
    const step = 16;
    for (let x = -120; x <= cw + 120; x += step) {
      const bwy = (waterTop + 14) + Math.sin(this.animTime * 3.8 + x * 0.015) * 12 + Math.cos(this.animTime * 2.2 + x * 0.025) * 6;
      ctx.lineTo(x, bwy);
    }
    ctx.lineTo(cw + 120, ch + 50);
    ctx.lineTo(-120, ch + 50);
    ctx.closePath();
    ctx.fillStyle = 'rgba(2, 132, 199, 0.38)';
    ctx.fill();

    // 3. Foreground Main Wave Layer (Vibrant tropical water across full screen width - zero heap allocations!)
    const gradKey = `${Math.round(waterTop)}_${ch}`;
    if (this._waterGradKey !== gradKey || !this._waterGrad) {
      this._waterGradKey = gradKey;
      const frontGrad = ctx.createLinearGradient(0, waterTop, 0, ch);
      frontGrad.addColorStop(0, 'rgba(56, 189, 248, 0.84)');
      frontGrad.addColorStop(0.35, 'rgba(14, 116, 144, 0.92)');
      frontGrad.addColorStop(1, 'rgba(15, 23, 42, 0.96)');
      this._waterGrad = frontGrad;
    }

    ctx.beginPath();
    ctx.moveTo(-120, ch + 50);
    let ptIdx = 0;
    for (let x = -120; x <= cw + 120; x += step) {
      const fwy = waterTop + Math.sin(this.animTime * 5.4 + x * 0.018) * 13 + Math.cos(this.animTime * 3.8 + x * 0.028) * 6;
      if (ptIdx < this._wavePointsX.length) {
        this._wavePointsX[ptIdx] = x;
        this._wavePointsY[ptIdx] = fwy;
        ptIdx++;
      }
      ctx.lineTo(x, fwy);
    }
    this._wavePointCount = ptIdx;
    ctx.lineTo(cw + 120, ch + 50);
    ctx.lineTo(-120, ch + 50);
    ctx.closePath();
    ctx.fillStyle = this._waterGrad;
    ctx.fill();

    // 4. Pure Surface Wave Stroke (Spanning beyond both left and right screen borders)
    ctx.beginPath();
    for (let i = 0; i < this._wavePointCount; i++) {
      if (i === 0) ctx.moveTo(this._wavePointsX[i], this._wavePointsY[i]);
      else ctx.lineTo(this._wavePointsX[i], this._wavePointsY[i]);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 5. Sparkling Foam Bubbles on Wave Peaks
    ctx.fillStyle = '#FFFFFF';
    for (let i = 1; i < this._wavePointCount - 1; i += 3) {
      const px = this._wavePointsX[i];
      const py = this._wavePointsY[i];
      if (py < waterTop + 2) {
        ctx.beginPath();
        ctx.arc(px, py - 1, 3.5, 0, Math.PI * 2);
        ctx.arc(px + 6, py + 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Swimming Cartoon Tropical Fish
    this._drawCartoonWaterFish(ctx, cw, ch, waterTop, waterH);

    // 7. Bobbing Cartoon Rubber Ducky
    this._drawRubberDucky(ctx, cw, waterTop);

    // 8. Expanding surface ripples from active hand splashing (batched save/restore!)
    if (this.waterRipples.length > 0) {
      ctx.save();
      ctx.lineWidth = 3;
      for (const rp of this.waterRipples) {
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.32, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${rp.alpha})`;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 9. Dynamic upward splashing droplets (batched save/restore!)
    if (this.waterSplashes.length > 0) {
      ctx.save();
      for (const sp of this.waterSplashes) {
        ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight on droplet
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sp.x - sp.r * 0.3, sp.y - sp.r * 0.3, sp.r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 10. Floating water air bubbles
    for (let i = 0; i < 10; i++) {
      const bx = (cw * 0.10 * i + this.animTime * 35) % cw;
      const by = waterTop + 35 + Math.sin(this.animTime * 3 + i) * 35;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(bx, by, 5 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawRubberDucky(ctx, cw, waterTop) {
    const duckX = cw * 0.74 + Math.sin(this.animTime * 1.4) * 35;
    const waveY = waterTop + Math.sin(this.animTime * 5.4 + duckX * 0.018) * 13 + Math.cos(this.animTime * 3.8 + duckX * 0.028) * 6;
    const duckRot = Math.cos(this.animTime * 5.4 + duckX * 0.018) * 0.18;

    ctx.save();
    ctx.translate(duckX, waveY - 8);
    ctx.rotate(duckRot);

    // Ducky body
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 16, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ducky tail
    ctx.beginPath();
    ctx.moveTo(14, 4);
    ctx.lineTo(26, -10);
    ctx.lineTo(16, -2);
    ctx.closePath();
    ctx.fillStyle = '#FACC15';
    ctx.fill();
    ctx.stroke();

    // Ducky wing
    ctx.fillStyle = '#EAB308';
    ctx.beginPath();
    ctx.ellipse(2, -1, 10, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ducky head
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(-14, -14, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cute beak (facing left)
    ctx.fillStyle = '#EA580C';
    ctx.strokeStyle = '#9A3412';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-25, -17);
    ctx.lineTo(-37, -13);
    ctx.lineTo(-24, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Big shiny cartoon eye
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(-18, -16, 3.2, 0, Math.PI * 2);
    ctx.fill();
    // Catchlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-19, -17.5, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawCartoonWaterFish(ctx, cw, ch, waterTop, waterH) {
    const fishList = [
      // Fish 1: Clownfish (Orange / White stripes, swimming Left)
      {
        x: ((cw + 120) - ((this.animTime * 90) % (cw + 240))) - 60,
        y: waterTop + waterH * 0.45 + Math.sin(this.animTime * 2.5) * 16,
        size: 1.0,
        dir: -1,
        bodyColor: '#EA580C',
        stripeColor: '#FFFFFF',
      },
      // Fish 2: Blue Tang (Royal Blue / Yellow Tail, swimming Right)
      {
        x: ((this.animTime * 110) % (cw + 240)) - 60,
        y: waterTop + waterH * 0.68 + Math.cos(this.animTime * 2.8) * 18,
        size: 1.15,
        dir: 1,
        bodyColor: '#2563EB',
        stripeColor: '#FACC15',
      },
      // Fish 3: Baby Goldfish (Golden Yellow, swimming Left)
      {
        x: ((cw + 120) - ((this.animTime * 70 + 500) % (cw + 240))) - 60,
        y: waterTop + waterH * 0.28 + Math.sin(this.animTime * 3.2) * 12,
        size: 0.85,
        dir: -1,
        bodyColor: '#FBBF24',
        stripeColor: '#F59E0B',
      },
    ];

    for (const f of fishList) {
      if (f.y < waterTop + 20 || f.y > ch - 10) continue;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(f.dir * f.size, f.size);

      const tailWag = Math.sin(this.animTime * 15 + f.x * 0.1) * 0.35;

      // Swishing tail fin
      ctx.save();
      ctx.translate(16, 0);
      ctx.rotate(tailWag);
      ctx.fillStyle = f.stripeColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(16, -12);
      ctx.lineTo(12, 0);
      ctx.lineTo(16, 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // Fish body
      ctx.fillStyle = f.bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // White or accent stripes
      ctx.fillStyle = f.stripeColor;
      ctx.beginPath();
      ctx.ellipse(-2, 0, 4, 10.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Top dorsal fin
      ctx.beginPath();
      ctx.moveTo(-4, -10);
      ctx.lineTo(4, -15);
      ctx.lineTo(8, -10);
      ctx.closePath();
      ctx.fill();

      // Cartoon eye
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-11, -3, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-12, -3, 2.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  _drawBlizzardFreeze(ctx, cw, ch) {
    ctx.save();

    if (!this.hazardFailed) {
      // Intact Frozen State: Ice blue frost overlay with glowing border & snowflakes
      ctx.fillStyle = 'rgba(125, 211, 252, 0.22)';
      ctx.fillRect(0, 0, cw, ch);

      // Frosty ice border
      ctx.strokeStyle = '#BAE6FD';
      ctx.lineWidth = 14;
      ctx.strokeRect(8, 8, cw - 16, ch - 16);

      // Subtle ice crystal glints in 4 corners
      ctx.font = '36px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❄️', 38, 38);
      ctx.fillText('❄️', cw - 38, 38);
      ctx.fillText('❄️', 38, ch - 38);
      ctx.fillText('❄️', cw - 38, ch - 38);

      // Grace period prompt (2.8s) vs frozen solid status
      const elapsed = (performance.now() - this.phaseStartTime) / 1000;
      if (elapsed < 2.8) {
        const pulse = 1 + Math.sin(elapsed * 12) * 0.08;
        ctx.save();
        ctx.translate(cw / 2, 72);
        ctx.scale(pulse, pulse);
        // Glowing pill
        ctx.fillStyle = 'rgba(14, 165, 233, 0.90)';
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(-170, -22, 340, 44, 22);
        ctx.fill();
        ctx.stroke();
        ctx.font = '900 20px system-ui, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('⭐ STRIKE A POSE! ⭐', 0, 0);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(cw / 2, 68);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#7DD3FC';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-160, -18, 320, 36, 18);
        ctx.fill();
        ctx.stroke();
        ctx.font = '900 16px system-ui, sans-serif';
        ctx.fillStyle = '#E0F2FE';
        ctx.fillText('🧊 FROZEN SOLID! HOLD STILL! 🥶', 0, 0);
        ctx.restore();
      }

      ctx.restore();
      return;
    }

    // FAILED: SHATTERED CRACKED GLASS / BROKEN ICE!
    // 1. Red warning edge flash
    ctx.fillStyle = 'rgba(239, 68, 68, 0.26)';
    ctx.fillRect(0, 0, cw, ch);

    if (this.freezeCracks) {
      const { originX, originY, cracks, spiderwebRings } = this.freezeCracks;

      // 2. Central impact crater
      ctx.beginPath();
      ctx.arc(originX, originY, 45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
      ctx.fill();

      // 3. Spiderweb concentric rings (dark backline + glowing white/cyan line)
      for (const ring of spiderwebRings) {
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let i = 0; i < ring.length; i++) {
          if (i === 0) ctx.moveTo(ring[i].x, ring[i].y);
          else ctx.lineTo(ring[i].x, ring[i].y);
        }
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // 4. Major fracture rays & branches
      for (const c of cracks) {
        if (!c.points || c.points.length < 2) continue;

        ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = c.isBranch ? 3.5 : 6;
        ctx.beginPath();
        ctx.moveTo(c.points[0].x, c.points[0].y);
        for (let i = 1; i < c.points.length; i++) {
          ctx.lineTo(c.points[i].x, c.points[i].y);
        }
        ctx.stroke();

        ctx.strokeStyle = c.isBranch ? '#BAE6FD' : '#FFFFFF';
        ctx.lineWidth = c.isBranch ? 1.8 : 3.0;
        ctx.stroke();
      }

      // 5. Shattered Glass Shards
      for (const shard of this.freezeShards) {
        if (!shard.poly || shard.poly.length < 3) continue;
        ctx.save();
        ctx.translate(shard.driftX, shard.driftY);
        ctx.beginPath();
        ctx.moveTo(shard.poly[0].x, shard.poly[0].y);
        for (let i = 1; i < shard.poly.length; i++) {
          ctx.lineTo(shard.poly[i].x, shard.poly[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(224, 242, 254, 0.48)';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Heavy red fractured border
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 14;
    ctx.strokeRect(8, 8, cw - 16, ch - 16);

    ctx.restore();
  }

  _drawBlizzardSky(ctx, cw, safeBounds) {
    const skyHeight = safeBounds.height * 0.28;

    ctx.save();
    // Swirling blizzard clouds gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, skyHeight);
    skyGrad.addColorStop(0, 'rgba(186, 230, 253, 0.65)');
    skyGrad.addColorStop(0.7, 'rgba(125, 211, 252, 0.45)');
    skyGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, cw, skyHeight + 30);

    // Wind flurries
    for (const sf of this.snowFlurries) {
      ctx.fillStyle = `rgba(255, 255, 255, ${sf.alpha})`;
      ctx.beginPath();
      ctx.arc(sf.x, sf.y, sf.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Snowballs (Growing or Dropping)
    for (const sb of this.snowballs) {
      if (sb.state === 'growing') {
        // Warning drop line & ground reticle
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(sb.x, sb.y);
        ctx.lineTo(sb.x, safeBounds.bottom - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.ellipse(sb.x, safeBounds.bottom - 20, sb.r * 1.2, sb.r * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fill();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.font = '900 20px system-ui, sans-serif';
        ctx.fillStyle = '#FEF08A';
        ctx.fillText('⚠️ HEADS UP! DODGE! 🏃💨', sb.x, safeBounds.bottom - 32);

        // Growing vibrating snowball
        const wobbleX = (Math.random() - 0.5) * 4;
        const wobbleY = (Math.random() - 0.5) * 4;
        ctx.save();
        ctx.translate(sb.x + wobbleX, sb.y + wobbleY);

        ctx.beginPath();
        ctx.arc(0, 0, sb.r + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, sb.r, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#38BDF8';
        ctx.stroke();

        ctx.font = `${Math.round(sb.r * 1.1)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❄️', 0, 0);
        ctx.restore();

      } else if (sb.state === 'falling') {
        ctx.save();
        ctx.translate(sb.x, sb.y);

        ctx.beginPath();
        ctx.arc(0, 0, sb.r + 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, sb.r, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0284C7';
        ctx.stroke();

        ctx.font = `${Math.round(sb.r * 1.2)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❄️', 0, 0);
        ctx.restore();
      }
    }

    // 3. Flying Snowman Dodge Obstacle
    if (this.flyingSnowman) {
      this._drawFlyingSnowman(ctx, this.flyingSnowman, safeBounds);
    }

    ctx.restore();
  }

  _drawFlyingSnowman(ctx, sm, safeBounds) {
    if (!sm) return;
    const cx = (safeBounds.left + safeBounds.right) / 2;

    // 1. Duck Warning Pill (Pulsing at top center)
    if (!sm.dodged && !sm.hitPlayer && sm.x > safeBounds.left - 50) {
      const pulse = 0.5 + Math.sin(this.animTime * 14) * 0.5;
      ctx.save();
      ctx.fillStyle = `rgba(239, 68, 68, ${0.88 + pulse * 0.12})`;
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(cx - 190, safeBounds.top + 20, 380, 50, 25);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 22px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('👇 DUCK! QUICK! ⛄👇', cx, safeBounds.top + 45);
      ctx.restore();
    }

    // 2. Flying Snowman (Scaled 2.0x Bigger!)
    ctx.save();
    ctx.translate(sm.x, sm.y);
    ctx.scale(2.0, 2.0);
    ctx.rotate(-0.08 + Math.sin(sm.animTime * 14) * 0.05);

    // Wind speedlines behind him
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let s = 0; s < 3; s++) {
      const sy = (s - 1) * 26;
      const sx = 40 + ((sm.animTime * 450 + s * 70) % 180);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 60, sy);
      ctx.stroke();
    }

    // Trailing fluttering winter scarf
    const wave = Math.sin(sm.animTime * 18);
    ctx.fillStyle = '#EF4444';
    ctx.strokeStyle = '#B91C1C';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.quadraticCurveTo(25, -16 + wave * 8, 55, -10 + wave * 12);
    ctx.lineTo(52, -2 + wave * 12);
    ctx.quadraticCurveTo(25, -6 + wave * 8, 0, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Yellow stripe on scarf
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.roundRect(24, -14 + wave * 8, 8, 9, 3);
    ctx.fill();

    // Outstretched Twig Airplane Arms
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    // Left Wing
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(-30, -38);
    ctx.lineTo(-38, -44);
    ctx.stroke();
    // Right Wing
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.lineTo(-26, 36);
    ctx.lineTo(-34, 42);
    ctx.stroke();

    // Body Snowball (White with light ice-blue cel shading)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Soft ice-blue underside shadow
    ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
    ctx.beginPath();
    ctx.arc(4, 8, 24, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.fill();

    // Coal buttons on body
    ctx.fillStyle = '#1E293B';
    [-8, 4, 16].forEach((bx) => {
      ctx.beginPath();
      ctx.arc(bx, 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Head Snowball (Tilted forward to the left)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(-34, -10, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rosy pink blush on cheek
    ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
    ctx.beginPath();
    ctx.ellipse(-34, -6, 6, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Coal Eyes (Squinting happily into the blizzard!)
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.ellipse(-38, -16, 2.5, 4.0, 0.2, 0, Math.PI * 2);
    ctx.ellipse(-46, -14, 2.5, 4.0, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Catchlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-39, -17.5, 1.2, 0, Math.PI * 2);
    ctx.arc(-47, -15.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Bright Orange Carrot Nose (Facing Forward / Left!)
    ctx.fillStyle = '#EA580C';
    ctx.strokeStyle = '#9A3412';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-44, -11);
    ctx.lineTo(-64, -8);
    ctx.lineTo(-44, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Coal bead smile
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-39, -8, 6.5, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Blown-back Top Hat perched on head
    ctx.save();
    ctx.translate(-30, -31);
    ctx.rotate(0.25);
    // Hat brim
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(-16, 0, 32, 6, 3);
    ctx.fill();
    ctx.stroke();
    // Hat crown
    ctx.beginPath();
    ctx.roundRect(-11, -22, 22, 22, [4, 4, 0, 0]);
    ctx.fill();
    ctx.stroke();
    // Crimson band
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(-11, -8, 22, 7);
    ctx.restore();

    ctx.restore();
  }

  _drawSpeedLines(ctx, cw, ch) {
    ctx.save();
    for (const sl of this.speedLines) {
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = sl.thick;
      ctx.beginPath();
      ctx.moveTo(sl.x, sl.y);
      ctx.lineTo(sl.x + sl.len, sl.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawFriendlyTRex(ctx, safeBounds) {
    if (!this.tRex) return;
    const tRex = this.tRex;

    ctx.save();

    // 1. Draw Running Dust Puffs
    for (const dp of tRex.dustParticles) {
      const alpha = Math.max(0, dp.life / dp.maxLife);
      ctx.fillStyle = `rgba(253, 230, 138, ${alpha * 0.55})`;
      ctx.beginPath();
      ctx.arc(dp.x, dp.y, dp.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Anchor T-Rex with energetic running bob
    const bobY = Math.abs(Math.sin(tRex.legPhase)) * 8;
    ctx.translate(tRex.x, tRex.y - bobY);
    ctx.scale(1.15, 1.15);

    const legL = Math.sin(tRex.legPhase) * 0.42;
    const legR = -Math.sin(tRex.legPhase) * 0.42;
    const tailWag = Math.sin(tRex.legPhase * 0.7) * 12;
    const jawOpen = Math.sin(tRex.mouthPhase) * 0.5 + 0.5; // 0 (closed) to 1 (open)
    const jawAngle = jawOpen * 0.28; // Hinged lower jaw angle
    const armWave = Math.cos(tRex.legPhase) * 0.35;

    // A. Back Leg (Left Leg)
    ctx.save();
    ctx.translate(-15, -42);
    ctx.rotate(legL);
    // Thigh
    ctx.fillStyle = '#16A34A';
    ctx.strokeStyle = '#14532D';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, 15, 14, 20, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Foot with 3 cute toes
    ctx.fillStyle = '#15803D';
    ctx.beginPath();
    ctx.roundRect(-6, 32, 28, 12, 5);
    ctx.fill();
    ctx.stroke();
    // Claws
    ctx.fillStyle = '#FFFFFF';
    [-2, 6, 14].forEach((cx) => {
      ctx.beginPath();
      ctx.arc(cx + 4, 43, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // B. Tail (Swaying with cute yellow dorsal ridge bumps)
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-35, -55);
    ctx.quadraticCurveTo(-75, -65, -115, -75 + tailWag);
    ctx.quadraticCurveTo(-70, -35, -25, -35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dorsal scales along tail
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 2;
    [[-55, -66], [-80, -73 + tailWag * 0.5], [-105, -78 + tailWag]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // C. Chubby Cartoon Body & Belly
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -60, 42, 34, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Light Lime Belly Patch
    ctx.fillStyle = '#86EFAC';
    ctx.beginPath();
    ctx.ellipse(14, -54, 24, 22, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Yellow dinosaur back spots
    ctx.fillStyle = '#FACC15';
    [[-18, -75], [-6, -82], [-24, -58]].forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // D. Front Leg (Right Leg)
    ctx.save();
    ctx.translate(6, -42);
    ctx.rotate(legR);
    // Thigh
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, 15, 15, 22, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Foot
    ctx.fillStyle = '#16A34A';
    ctx.beginPath();
    ctx.roundRect(-6, 34, 30, 13, 5);
    ctx.fill();
    ctx.stroke();
    // Claws
    ctx.fillStyle = '#FFFFFF';
    [-2, 6, 14].forEach((cx) => {
      ctx.beginPath();
      ctx.arc(cx + 4, 46, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // E. Little Cute Waving T-Rex Arm
    ctx.save();
    ctx.translate(28, -65);
    ctx.rotate(armWave);
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(0, -5, 18, 9, 4);
    ctx.fill();
    ctx.stroke();
    // Claws
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(18, -3, 2.5, 0, Math.PI * 2);
    ctx.arc(18, 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // F. Neck & Head Base
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(12, -75);
    ctx.lineTo(26, -112);
    ctx.lineTo(52, -100);
    ctx.lineTo(34, -65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // G. Upper Head & Snout
    ctx.beginPath();
    ctx.moveTo(22, -110);
    ctx.quadraticCurveTo(24, -145, 48, -145); // Crown/brow
    ctx.lineTo(100, -142);                    // Top of snout
    ctx.quadraticCurveTo(116, -142, 116, -128); // Snout tip
    ctx.lineTo(112, -114);                    // Upper mouth roof
    ctx.lineTo(54, -114);                     // Back of mouth
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Nostril dot
    ctx.fillStyle = '#15803D';
    ctx.beginPath();
    ctx.arc(106, -135, 3, 0, Math.PI * 2);
    ctx.fill();

    // Upper white cartoon teeth
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 1.5;
    [64, 78, 92, 104].forEach((tx) => {
      ctx.beginPath();
      ctx.moveTo(tx, -114);
      ctx.lineTo(tx + 4, -106);
      ctx.lineTo(tx + 8, -114);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // H. Animated Hinged Lower Jaw (Opens & Closes Chomp-Chomp!)
    ctx.save();
    ctx.translate(50, -112); // Jaw hinge pivot
    ctx.rotate(jawAngle);

    // Mouth inside (pink)
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(58, 0);
    ctx.lineTo(54, 12);
    ctx.lineTo(4, 8);
    ctx.closePath();
    ctx.fill();

    // Cute pink tongue
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.ellipse(32, 6, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lower Jaw bone
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.lineTo(58, 2);
    ctx.quadraticCurveTo(64, 4, 60, 14);
    ctx.lineTo(4, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lower white teeth
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 1.5;
    [14, 28, 42].forEach((tx) => {
      ctx.beginPath();
      ctx.moveTo(tx, 2);
      ctx.lineTo(tx + 4, -5);
      ctx.lineTo(tx + 8, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore(); // End jaw

    // I. Big Friendly Cartoon Eye
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(52, -132, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pupil
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(55, -132, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // Sparkles
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(58, -135, 3.8, 0, Math.PI * 2);
    ctx.arc(53, -129, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Cheerful happy eyebrow
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(52, -142, 11, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Rosy pink blush cheek
    ctx.fillStyle = 'rgba(244, 114, 182, 0.42)';
    ctx.beginPath();
    ctx.arc(58, -118, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ----------------------------------------------------
  // KID-FRIENDLY GAME OVER SCREEN & RESTART INTERACTION
  // ----------------------------------------------------
  _updateGameOverPhase(dt, safeBounds, player, pointer) {
    // 1. Update ambient floating text and particles
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 35 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    const hands = this._collectHandColliders(player, pointer);
    const cx = (safeBounds.left + safeBounds.right) / 2;
    const cy = (safeBounds.top + safeBounds.bottom) / 2;
    const cardY = cy - 430 / 2 - 10;
    const btnY = cardY + 340;
    const btnRadius = 50;

    // A. TRY AGAIN BUTTON (Left)
    const btnTryX = cx - 140;
    let insideTry = false;
    for (const h of hands) {
      if (Math.hypot(btnTryX - h.x, btnY - h.y) < btnRadius + (h.r || 35) * 0.45) {
        insideTry = true;
        break;
      }
    }
    if (pointer && pointer.clicked && Math.hypot(btnTryX - pointer.x, btnY - pointer.y) < btnRadius * 1.3) {
      sound.playFanfare();
      this.reset();
      return;
    }

    if (insideTry) {
      this.gameOverHoldProgress = Math.min(1.0, this.gameOverHoldProgress + dt / 1.8);
      const step = Math.floor(this.gameOverHoldProgress * 5);
      if (step > this.gameOverTickStep) {
        this.gameOverTickStep = step;
        sound.playCalibrationTick(this.gameOverHoldProgress);
      }
    } else {
      this.gameOverHoldProgress = Math.max(0, this.gameOverHoldProgress - dt * 2.2);
      if (this.gameOverHoldProgress === 0) this.gameOverTickStep = -1;
    }

    if (this.gameOverHoldProgress >= 1.0) {
      sound.playFanfare();
      this.reset();
      return;
    }

    // B. HOME HUB BUTTON (Right)
    const btnHomeX = cx + 140;
    let insideHome = false;
    for (const h of hands) {
      if (Math.hypot(btnHomeX - h.x, btnY - h.y) < btnRadius + (h.r || 35) * 0.45) {
        insideHome = true;
        break;
      }
    }
    if (pointer && pointer.clicked && Math.hypot(btnHomeX - pointer.x, btnY - pointer.y) < btnRadius * 1.3) {
      sound.playFanfare();
      if (this.onReturnToHub) this.onReturnToHub();
      return;
    }

    if (insideHome) {
      this.gameOverHomeHoldProgress = Math.min(1.0, this.gameOverHomeHoldProgress + dt / 1.8);
      const step = Math.floor(this.gameOverHomeHoldProgress * 5);
      if (step > this.gameOverHomeTickStep) {
        this.gameOverHomeTickStep = step;
        sound.playCalibrationTick(this.gameOverHomeHoldProgress);
      }
    } else {
      this.gameOverHomeHoldProgress = Math.max(0, this.gameOverHomeHoldProgress - dt * 2.2);
      if (this.gameOverHomeHoldProgress === 0) this.gameOverHomeTickStep = -1;
    }

    if (this.gameOverHomeHoldProgress >= 1.0) {
      sound.playFanfare();
      if (this.onReturnToHub) this.onReturnToHub();
    }
  }

  _drawGameOverScreen(ctx, cw, ch, safeBounds) {
    const cx = (safeBounds.left + safeBounds.right) / 2;
    const cy = (safeBounds.top + safeBounds.bottom) / 2;

    ctx.save();

    // 1. Dark Vignette Scrim Backdrop
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, cw, ch);

    // 2. Rounded Main Card
    const cardW = 680;
    const cardH = 430;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2 - 10;
    const cardR = 28;

    // Card shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(cardX + 6, cardY + 8, cardW, cardH, cardR);
    ctx.fill();

    // Card fill
    ctx.fillStyle = 'rgba(30, 41, 59, 0.96)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
    ctx.fill();

    // Border tint based on hazard
    let borderColor = '#FACC15';
    if (this.gameOverReason === 'water') borderColor = '#38BDF8';
    else if (this.gameOverReason === 'lava') borderColor = '#F97316';
    else if (this.gameOverReason === 'trex') borderColor = '#4ADE80';

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // 3. Top Banner Header
    const bannerW = 340;
    const bannerH = 46;
    const bannerY = cardY - 22;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cx - bannerW / 2, bannerY, bannerW, bannerH, bannerH / 2);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FEF08A';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.fillText('🍪 OH, BISCUITS! 🍪', cx, bannerY + 23);

    // 4. Hazard Specific Headline & Tip
    let headline = 'NICE TRY, EMILIA!';
    let tip = 'You did great! Let\'s give it another go!';
    if (this.gameOverReason === 'water') {
      headline = '🌊 SPLOOSH! WATER GOT TOO HIGH!';
      tip = 'Splash your hands faster to keep the water below your chin!';
    } else if (this.gameOverReason === 'lava') {
      headline = '🔥 SIZZLE! FEET IN THE LAVA!';
      tip = 'Keep jumping up and down or climb high on the couch!';
    } else if (this.gameOverReason === 'trex') {
      headline = '🦖 TAG! THE FRIENDLY DINO CAUGHT YA!';
      tip = 'Run super fast in place to keep the dinosaur far away!';
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.fillText(headline, cx, cardY + 54);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(tip, cx, cardY + 82);

    // 5. Center Cartoon Defeat Art
    const artY = cardY + 165;
    if (this.gameOverReason === 'water') {
      this._drawGameOverWaterArt(ctx, cx, artY);
    } else if (this.gameOverReason === 'lava') {
      this._drawGameOverLavaArt(ctx, cx, artY);
    } else {
      this._drawGameOverTRexArt(ctx, cx, artY);
    }

    // 6. Score & Round Reached Pill
    const pillY = cardY + 252;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 210, pillY, 420, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.font = '900 16px system-ui, sans-serif';
    ctx.fillText(
      `⭐ ROUND ${this.currentRound} / ${this.totalRounds} • ${this.score} STARS ⭐`,
      cx,
      pillY + 18
    );

    // 7. Interactive Buttons
    const btnY = cardY + 340;
    const btnRadius = 50;

    // TRY AGAIN BUTTON (Left)
    const btnTryX = cx - 140;
    const isTryHovered = this.gameOverHoldProgress > 0;
    const tryPulse = 1.0 + Math.sin(this.animTime * 4) * 0.05;

    // Outer glow
    ctx.beginPath();
    ctx.arc(btnTryX, btnY, (btnRadius + 8) * tryPulse, 0, Math.PI * 2);
    ctx.fillStyle = isTryHovered ? 'rgba(34, 197, 94, 0.40)' : 'rgba(34, 197, 94, 0.16)';
    ctx.fill();

    // Button disc
    ctx.beginPath();
    ctx.arc(btnTryX, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fillStyle = isTryHovered ? 'rgba(21, 128, 61, 0.96)' : 'rgba(15, 23, 42, 0.92)';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = isTryHovered ? '#4ADE80' : '#22C55E';
    ctx.stroke();

    // Icon
    ctx.save();
    ctx.translate(btnTryX, btnY - 11);
    if (isTryHovered) ctx.rotate(this.gameOverHoldProgress * Math.PI * 2);
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText('🔄', 0, 0);
    ctx.restore();

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 12px system-ui, sans-serif';
    ctx.fillText('TRY AGAIN', btnTryX, btnY + 16);
    ctx.fillStyle = isTryHovered ? '#FEF08A' : '#86EFAC';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.fillText(isTryHovered ? 'HOLDING...' : 'HOLD ✋', btnTryX, btnY + 29);

    // Hold Progress Ring
    if (this.gameOverHoldProgress > 0) {
      ctx.beginPath();
      ctx.arc(
        btnTryX,
        btnY,
        btnRadius + 6,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * this.gameOverHoldProgress
      );
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 7;
      ctx.stroke();
    }

    // HOME HUB BUTTON (Right)
    const btnHomeX = cx + 140;
    const isHomeHovered = this.gameOverHomeHoldProgress > 0;
    const homePulse = 1.0 + Math.sin(this.animTime * 4 + 1) * 0.05;

    // Outer glow
    ctx.beginPath();
    ctx.arc(btnHomeX, btnY, (btnRadius + 8) * homePulse, 0, Math.PI * 2);
    ctx.fillStyle = isHomeHovered ? 'rgba(56, 189, 248, 0.40)' : 'rgba(56, 189, 248, 0.16)';
    ctx.fill();

    // Button disc
    ctx.beginPath();
    ctx.arc(btnHomeX, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fillStyle = isHomeHovered ? 'rgba(14, 116, 144, 0.96)' : 'rgba(15, 23, 42, 0.92)';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = isHomeHovered ? '#38BDF8' : '#0284C7';
    ctx.stroke();

    // Icon
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText('🏠', btnHomeX, btnY - 11);

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 12px system-ui, sans-serif';
    ctx.fillText('HOME HUB', btnHomeX, btnY + 16);
    ctx.fillStyle = isHomeHovered ? '#FEF08A' : '#7DD3FC';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.fillText(isHomeHovered ? 'HOLDING...' : 'HOLD ✋', btnHomeX, btnY + 29);

    // Hold Progress Ring
    if (this.gameOverHomeHoldProgress > 0) {
      ctx.beginPath();
      ctx.arc(
        btnHomeX,
        btnY,
        btnRadius + 6,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * this.gameOverHomeHoldProgress
      );
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 7;
      ctx.stroke();
    }

    ctx.restore();
  }

  // Cartoon Water Defeat Art
  _drawGameOverWaterArt(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    // Water pool
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 32, 110, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Floating rubber ducky
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 3;
    // Duck body
    ctx.beginPath();
    ctx.ellipse(0, 16, 32, 22, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Duck head
    ctx.beginPath();
    ctx.arc(-18, -2, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Orange bill
    ctx.fillStyle = '#FB923C';
    ctx.strokeStyle = '#EA580C';
    ctx.beginPath();
    ctx.ellipse(-36, 1, 10, 6, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cute duck eye
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-22, -6, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Silly swim goggles over duck
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
    ctx.beginPath();
    ctx.arc(-18, -6, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bubbles rising
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    [[-45, -20, 6], [28, -26, 8], [42, -44, 5], [-12, -48, 7]].forEach(([bx, by, br]) => {
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }

  // Cartoon Lava Defeat Art
  _drawGameOverLavaArt(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    // Lava pool
    ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 32, 110, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Couch cushion
    ctx.fillStyle = '#DC2626';
    ctx.strokeStyle = '#991B1B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-42, 6, 84, 26, 8);
    ctx.fill();
    ctx.stroke();

    // Toasted marshmallow on stick
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(35, 20);
    ctx.lineTo(-15, -45);
    ctx.stroke();

    // Marshmallow cylinder
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-24, -40, 28, 24, 6);
    ctx.fill();
    ctx.stroke();

    // Toasted top
    ctx.fillStyle = '#92400E';
    ctx.beginPath();
    ctx.roundRect(-24, -40, 28, 7, 3);
    ctx.fill();

    // Silly face on marshmallow
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-16, -26, 2.5, 0, Math.PI * 2);
    ctx.arc(-4, -26, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-10, -20, 4, 0, Math.PI);
    ctx.stroke();

    // Friendly little spark flame
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(38, -10, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Cartoon T-Rex Defeat Art
  _drawGameOverTRexArt(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    // Baby T-Rex body
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 3.5;

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 12, 28, 22, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cute tail
    ctx.beginPath();
    ctx.moveTo(-20, 14);
    ctx.quadraticCurveTo(-45, 10, -50, -4);
    ctx.quadraticCurveTo(-40, 20, -14, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.roundRect(4, -30, 36, 28, 10);
    ctx.fill();
    ctx.stroke();

    // Big happy eye
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(26, -20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(28, -20, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Cheerful mouth & cute teeth
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(28, -8, 6, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    // Little arms holding a giant cookie
    ctx.fillStyle = '#D97706';
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(14, 8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Chocolate chips on cookie
    ctx.fillStyle = '#451A03';
    [[-4, -2], [3, -5], [1, 4], [-5, 5], [6, 1]].forEach(([ox, oy]) => {
      ctx.beginPath();
      ctx.arc(14 + ox, 8 + oy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Party hat on baby T-Rex
    ctx.fillStyle = '#EC4899';
    ctx.strokeStyle = '#BE185D';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(12, -28);
    ctx.lineTo(20, -50);
    ctx.lineTo(28, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Yellow pom-pom on hat
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(20, -52, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Overhead danger alert pill with 5-second countdown & progress meter
  _drawHazardDangerAlert(ctx, safeBounds, type, elapsed, maxTime) {
    const remain = Math.max(0, maxTime - elapsed);
    const progress = Math.min(1.0, elapsed / maxTime);
    const cx = (safeBounds.left + safeBounds.right) / 2;
    const pillW = 460;
    const pillH = 46;
    const pillY = safeBounds.top + 72;

    ctx.save();

    // Pulsing danger aura
    const pulse = Math.sin(this.animTime * 14) * 0.15;
    ctx.fillStyle = `rgba(239, 68, 68, ${0.82 + pulse})`;
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.stroke();

    // Danger fill bar inside bottom of pill
    const barW = (pillW - 36) * progress;
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.roundRect(cx - (pillW - 36) / 2, pillY + pillH - 8, barW, 4, 2);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 18px system-ui, sans-serif';
    if (type === 'water') {
      ctx.fillText(`⚠️ WATER ABOVE CHIN! SPLASH! ${remain.toFixed(1)}s 🌊`, cx, pillY + 21);
    } else {
      ctx.fillText(`🔥 FEET IN LAVA! JUMP OR CLIMB! ${remain.toFixed(1)}s 🦘`, cx, pillY + 21);
    }

    ctx.restore();
  }

  // Dynamic T-Rex chase prompt pill
  _drawTRexChaseAlert(ctx, safeBounds) {
    if (!this.tRex) return;
    const spd = this.tRex.runSpeedSmooth;
    const cx = (safeBounds.left + safeBounds.right) / 2;
    const pillW = 480;
    const pillH = 46;
    const pillY = safeBounds.top + 72;

    ctx.save();
    if (spd < 15) {
      // Urgent red alert: T-Rex is charging!
      const pulse = Math.sin(this.animTime * 14) * 0.15;
      ctx.fillStyle = `rgba(239, 68, 68, ${0.85 + pulse})`;
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.fillText('🦖 T-REX IS CHARGING! RUN IN PLACE! 🏃‍♀️💨', cx, pillY + 22);

    } else if (spd < 85) {
      // Yellow alert: Dino is stalking / held at bay, but NOT retreating!
      ctx.fillStyle = 'rgba(217, 119, 6, 0.90)';
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.roundRect(cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 17px system-ui, sans-serif';
      ctx.fillText('⚡ DINO CREEPING CLOSER! RUN FASTER TO PUSH IT BACK! 🦖', cx, pillY + 22);

    } else {
      // Green encouragement: Player running fast enough to push dino back!
      ctx.fillStyle = 'rgba(22, 101, 52, 0.88)';
      ctx.strokeStyle = '#4ADE80';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.roundRect(cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#86EFAC';
      ctx.font = '900 17px system-ui, sans-serif';
      ctx.fillText('💨 GREAT RUNNING! PUSHING DINO BACK! 🦖💨', cx, pillY + 22);
    }
    ctx.restore();
  }
}
