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
      const startX = sb ? sb.left - 40 : 40;
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

        // Safe if: ankles/feet are above lava line, OR feet tucked on couch, OR hip height raised!
        let safe = true;
        if (activePlayers.length > 0) {
          for (const pObj of activePlayers) {
            const lms = pObj.landmarksCanvas;
            if (!lms) continue;
            const hipY = lms[23] && lms[24] ? (lms[23].y + lms[24].y) / 2 : 0;
            const hipRaised = hipY < this.baselineHipY - 22;
            const lFoot = lms[27];
            const rFoot = lms[28];
            const feetHiddenOrUp =
              !lFoot ||
              !rFoot ||
              (lFoot.visibility < 0.45 && rFoot.visibility < 0.45) ||
              (lFoot.y < lavaLineY && rFoot.y < lavaLineY);

            if (!hipRaised && !feetHiddenOrUp) {
              safe = false;
            }
          }
        }
        this.isPlayerSafe = safe;

      // ----------------------------------------------------
      // B) WATER (Floor is Water - 31s)
      // Water rises up to 85% of screen; splashing pushes it down to MIDDLE (50%)!
      // ----------------------------------------------------
      } else if (this.currentHazard.id === 'water') {
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
              if (spd > 6) {
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

        // Rise and recess at the same steady, balanced speed!
        const waterSpeed = 0.11; // ~3.3s sweep between 0.48 (middle) and 0.85 (high)
        if (wavePower <= 6) {
          this.waterRatio = Math.min(0.85, this.waterRatio + waterSpeed * dt);
        } else {
          // Splashing actively drives water down to middle of screen (0.48) at the exact same rate!
          this.waterRatio = Math.max(0.48, this.waterRatio - waterSpeed * dt);
        }
        this.isPlayerSafe = this.waterRatio < 0.74;

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
        const isGracePeriod = elapsedHazard < 1.2;

        if (isGracePeriod) {
          // Leniency grace window: Emilia is actively striking her fun statue pose!
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

        // Check for Flying Snowman event towards the end of Blizzard (at ~9.0s when audio shouts "DUCK!")
        const elapsedBlizzard = (performance.now() - this.phaseStartTime) / 1000;
        if (elapsedBlizzard >= 8.8 && !this.flyingSnowman && this.blizzardSnowballCount >= 3) {
          const spawnY = safeBounds.top + safeBounds.height * 0.26;
          this.flyingSnowman = {
            x: safeBounds.right + 140,
            y: spawnY,
            speed: (safeBounds.width + 320) / 2.7, // crosses screen in 2.7 seconds!
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
              x: sm.x + 35 + (Math.random() - 0.5) * 15,
              y: sm.y + (Math.random() - 0.5) * 25,
              vx: 110 + Math.random() * 80,
              vy: -20 + (Math.random() - 0.5) * 40,
              r: 3 + Math.random() * 4,
              color: Math.random() < 0.5 ? '#BAE6FD' : '#FFFFFF',
              gravity: 40,
              life: 0.45,
              maxLife: 0.45,
            });
          }

          // Detect Ducking
          let isDucking = false;
          let playerHeadX = cx;

          if (activePlayers.length > 0) {
            for (const pObj of activePlayers) {
              const head = pObj.colliders?.head;
              const lms = pObj.landmarksCanvas;
              if (head) playerHeadX = head.x;
              else if (lms && lms[0]) playerHeadX = lms[0].x;

              // If head or shoulders drop significantly below standing baseline
              if (lms && lms[11] && lms[12]) {
                const shoulderY = (lms[11].y + lms[12].y) / 2;
                if (shoulderY > this.baselineShoulderY + 30) {
                  isDucking = true;
                }
              }
              if (head && head.y > this.baselineShoulderY - 15) {
                isDucking = true;
              }
            }
          }
          if (pointer && pointer.active && pointer.y > safeBounds.top + safeBounds.height * 0.42) {
            isDucking = true;
          }

          // Proximity collision / dodge check
          const distToPlayer = Math.abs(sm.x - playerHeadX);
          if (distToPlayer < 90) {
            if (isDucking) {
              if (!sm.dodged && !sm.hitPlayer) {
                sm.dodged = true;
                this.score += 2;
                sound.playWindGust();
                this.spawnFloatingText(sm.x, sm.y - 45, '💨 DUCKED UNDER! ⛄ +2 ⭐', '#4ADE80');
              }
            } else {
              if (!sm.hitPlayer && !sm.dodged) {
                sm.hitPlayer = true;
                this.hazardFailed = true;
                if (this.avatar?.triggerYellowFlash) {
                  this.avatar.triggerYellowFlash(2.0, 'snowball');
                }
                sound.playIceSlipAndCrack();
                this.spawnSnowBurst(sm.x, sm.y, 25);
                this.spawnFloatingText(sm.x, sm.y - 45, '❄️ BONK! DUCK NEXT TIME! 🤪', '#FACC15');
              }
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
          runSpeed += pObj.motionSpeed || 0;
          const cols = pObj.colliders;
          if (cols) {
            for (const key of ['head', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot']) {
              const col = cols[key];
              if (col && col.visibility > 0.25) {
                minPlayerX = Math.min(minPlayerX, col.x - col.r);
              }
            }
          }
        }

        if (minPlayerX > safeBounds.right - 40) {
          minPlayerX = (safeBounds.left + safeBounds.right) * 0.55;
        }

        // Smooth running speed detection
        this.tRex.runSpeedSmooth = this.tRex.runSpeedSmooth * 0.82 + runSpeed * 0.18;
        const isRunning = this.tRex.runSpeedSmooth > 20;
        this.isPlayerSafe = isRunning;

        // Ground level for T-Rex
        this.tRex.y = safeBounds.bottom - 45;

        // Animate legs, mouth chomping, and flash timer
        this.tRex.legPhase += dt * (isRunning ? 13 : 9);
        this.tRex.mouthPhase += dt * (this.tRex.caughtPlayer ? 16 : 8);

        if (this.tRex.flashTimer > 0) {
          this.tRex.flashTimer = Math.max(0, this.tRex.flashTimer - dt);
        }

        // T-Rex Position Dynamics:
        // - When player keeps moving: T-Rex recesses back towards the left screen edge!
        // - When player slows down or stops: T-Rex charges closer towards the player!
        // Recessing speed matches progression speed identically so he doesn't instantly snap back!
        const retreatX = safeBounds.left - 40;
        const snoutOffset = 135; // Snout tip reach relative to T-Rex anchor
        const attackTargetX = minPlayerX - snoutOffset;
        const dinoSpeed = 175; // Exact same steady speed forward and backward!

        if (isRunning) {
          this.tRex.targetX = retreatX;
          this.tRex.x = Math.max(retreatX, this.tRex.x - dinoSpeed * dt);
          if (this.tRex.x < safeBounds.left + 80) {
            this.tRex.caughtPlayer = false; // Player escaped T-Rex!
          }
        } else {
          this.tRex.targetX = attackTargetX;
          if (this.tRex.x < attackTargetX) {
            this.tRex.x = Math.min(attackTargetX, this.tRex.x + dinoSpeed * dt);
          } else {
            this.tRex.x = attackTargetX;
          }
        }

        // Snout collision check with player
        const tRexSnoutX = this.tRex.x + snoutOffset;
        if (tRexSnoutX >= minPlayerX - 10) {
          if (!this.tRex.caughtPlayer) {
            this.tRex.caughtPlayer = true;
            this.tRex.flashTimer = 1.6;
            this.hazardFailed = true;

            // Flash player yellow on tag!
            if (this.avatar && this.avatar.triggerYellowFlash) {
              this.avatar.triggerYellowFlash(1.8, 'dino');
            }

            this.spawnFloatingText(
              Math.min(safeBounds.right - 120, minPlayerX + 60),
              safeBounds.bottom - 220,
              '🦖 CHOMP! KEEP RUNNING! 🏃‍♀️💨',
              '#FACC15'
            );
          }
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

    // 1. Render Active Hazard Visuals
    } else if (this.phase === 'active') {
      if (this.currentHazard.id === 'lava1' || this.currentHazard.id === 'lava2') {
        this._drawLavaFloor(ctx, canvasWidth, canvasHeight, safeBounds);
      } else if (this.currentHazard.id === 'water') {
        this._drawRisingFlood(ctx, canvasWidth, canvasHeight);
      } else if (this.currentHazard.id === 'freeze') {
        this._drawBlizzardFreeze(ctx, canvasWidth, canvasHeight);
      } else if (this.currentHazard.id === 'blizzard') {
        this._drawBlizzardSky(ctx, canvasWidth, safeBounds);
      } else if (this.currentHazard.id === 'run') {
        this._drawSpeedLines(ctx, canvasWidth, canvasHeight);
        if (this.tRex) {
          this._drawFriendlyTRex(ctx, safeBounds);
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
    ctx.fillText('🌟 ALL 12 CHALLENGES CLEARED! 🌟', cx, bannerY + 70);

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
    const grad = ctx.createLinearGradient(0, lavaTop, 0, ch);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.90)');
    grad.addColorStop(0.35, 'rgba(249, 115, 22, 0.94)');
    grad.addColorStop(1, 'rgba(185, 28, 28, 0.96)');

    ctx.fillStyle = grad;
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
    for (let i = 0; i < 6; i++) {
      const rx = (cw * (0.12 + i * 0.16) + Math.sin(this.animTime * 1.5 + i) * 35);
      const rGrad = ctx.createLinearGradient(rx, waterTop, rx + 45, ch);
      rGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
      rGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = rGrad;
      ctx.beginPath();
      ctx.moveTo(rx - 20, waterTop);
      ctx.lineTo(rx + 25, waterTop);
      ctx.lineTo(rx + 75, ch);
      ctx.lineTo(rx + 15, ch);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Back Wave Layer (Rolling deep ocean blue across 100% of screen)
    ctx.beginPath();
    ctx.moveTo(-40, ch + 20);
    const step = 16;
    for (let x = -40; x <= cw + 40; x += step) {
      const bwy = (waterTop + 14) + Math.sin(this.animTime * 3.8 + x * 0.015) * 12 + Math.cos(this.animTime * 2.2 + x * 0.025) * 6;
      ctx.lineTo(x, bwy);
    }
    ctx.lineTo(cw + 40, ch + 20);
    ctx.closePath();
    ctx.fillStyle = 'rgba(2, 132, 199, 0.38)';
    ctx.fill();

    // 3. Foreground Main Wave Layer (Vibrant tropical water)
    const frontGrad = ctx.createLinearGradient(0, waterTop, 0, ch);
    frontGrad.addColorStop(0, 'rgba(56, 189, 248, 0.82)');
    frontGrad.addColorStop(0.35, 'rgba(14, 116, 144, 0.90)');
    frontGrad.addColorStop(1, 'rgba(15, 23, 42, 0.96)');

    ctx.beginPath();
    ctx.moveTo(-40, ch + 20);
    const wavePoints = [];
    for (let x = -40; x <= cw + 40; x += step) {
      const fwy = waterTop + Math.sin(this.animTime * 5.4 + x * 0.018) * 13 + Math.cos(this.animTime * 3.8 + x * 0.028) * 6;
      wavePoints.push({ x, y: fwy });
      ctx.lineTo(x, fwy);
    }
    ctx.lineTo(cw + 40, ch + 20);
    ctx.closePath();
    ctx.fillStyle = frontGrad;
    ctx.fill();

    // 4. Pure Surface Wave Stroke (Only top line - never strokes corners or bottom!)
    ctx.beginPath();
    for (let i = 0; i < wavePoints.length; i++) {
      if (i === 0) ctx.moveTo(wavePoints[i].x, wavePoints[i].y);
      else ctx.lineTo(wavePoints[i].x, wavePoints[i].y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 5. Sparkling Foam Bubbles on Wave Peaks
    ctx.fillStyle = '#FFFFFF';
    for (let i = 1; i < wavePoints.length - 1; i += 3) {
      const p = wavePoints[i];
      if (p.y < waterTop + 2) {
        ctx.beginPath();
        ctx.arc(p.x, p.y - 1, 3.5, 0, Math.PI * 2);
        ctx.arc(p.x + 6, p.y + 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Swimming Cartoon Tropical Fish
    this._drawCartoonWaterFish(ctx, cw, ch, waterTop, waterH);

    // 7. Bobbing Cartoon Rubber Ducky
    this._drawRubberDucky(ctx, cw, waterTop);

    // 8. Expanding surface ripples from active hand splashing
    for (const rp of this.waterRipples) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.32, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${rp.alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // 9. Dynamic upward splashing droplets
    for (const sp of this.waterSplashes) {
      ctx.save();
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

    // 11. Water Height Gauge & Safe-Line Callout (at 50% screen height)
    const safeLineY = ch * 0.50;
    const isSafe = waterTop >= safeLineY;
    ctx.save();
    ctx.strokeStyle = isSafe ? 'rgba(74, 222, 128, 0.85)' : 'rgba(239, 68, 68, 0.90)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(35, safeLineY);
    ctx.lineTo(cw - 35, safeLineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Badge on Left side
    ctx.fillStyle = isSafe ? 'rgba(22, 101, 52, 0.92)' : 'rgba(153, 27, 27, 0.92)';
    ctx.strokeStyle = isSafe ? '#4ADE80' : '#FCA5A5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(40, safeLineY - 20, 240, 40, 20);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 15px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(isSafe ? '✅ SAFE ZONE (50%)' : '⚠️ KEEP SPLASHING! 💦', 160, safeLineY);
    ctx.restore();

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

      // Grace period prompt vs frozen solid status
      const elapsed = (performance.now() - this.phaseStartTime) / 1000;
      if (elapsed < 1.2) {
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

    // 2. Flying Snowman
    ctx.save();
    ctx.translate(sm.x, sm.y);
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
}
