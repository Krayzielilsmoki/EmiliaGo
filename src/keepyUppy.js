// Game 1: Keepy Uppy Balloon Physics for EmiliaGO! (1P & 2P Support)
// Featuring:
// - Nimble, responsive cartoon balloons with animated faces (smiles, blinks, gasp when near floor/cactus!)
// - Waddling Cartoon Potted Cactus Hazard that patrols the floor - keep the balloon away or it POPS!
// - Turbo Leaf Blower with swirling autumn wind leaves & real aerodynamic updraft!
// - Floor proximity warning ("⚠️ SAVE IT! ⚠️") for dramatic last-second saves!
// - Rare Golden Star Balloons (worth +3 points with glitter burst)!
// 100% 60fps locked, lightweight 2D canvas primitives with 0 runtime allocations!

import { sound } from './sound.js';
import { settings } from './settings.js';
import { ParticlePool, FloatingTextPool } from './particlePool.js';

const BALLOON_PALETTE = [
  { main: '#EF4444', highlight: '#FCA5A5', rim: '#991B1B', name: 'Red' },
  { main: '#38BDF8', highlight: '#BAE6FD', rim: '#0369A1', name: 'Bluey Blue' },
  { main: '#FB923C', highlight: '#FED7AA', rim: '#C2410C', name: 'Bingo Orange' },
  { main: '#FACC15', highlight: '#FEF08A', rim: '#A16207', name: 'Sunshine Yellow' },
  { main: '#EC4899', highlight: '#FBCFE8', rim: '#9D174D', name: 'Peppa Pink' },
  { main: '#4ADE80', highlight: '#BBF7D0', rim: '#15803D', name: 'Emerald Green' },
  { main: '#A855F7', highlight: '#E9D5FF', rim: '#6B21A8', name: 'Royal Purple' },
  { main: '#2DD4BF', highlight: '#99F6E4', rim: '#0F766E', name: 'Aqua Mint' },
];

const GOLD_PALETTE = {
  main: '#FACC15',
  highlight: '#FFFBEB',
  rim: '#B45309',
  name: 'Golden Star',
};

const BALLOON_SIZES = [
  { label: 'Classic', sizeMult: 1.0, gravityMult: 1.0 },
  { label: 'Jumbo Floaty', sizeMult: 1.20, gravityMult: 0.85 },
  { label: 'Mini Zippy', sizeMult: 0.78, gravityMult: 1.15 },
];

export class KeepyUppyGame {
  constructor() {
    this.balloons = [];
    this.particlePool = new ParticlePool(48);
    this.textPool = new FloatingTextPool(16);

    // Pre-rendered 2x offscreen sprite caches for locked 30-60 FPS
    this._balloonCanvasCache = new Map();
    this._cactusCanvas = null;
    this._puppyCanvasCache = new Map();

    this.score = 0;
    this.bestScore = settings.data.bestKeepyUppy || 0;
    this.totalHits = 0;
    this._colorCounter = 0;
    this._cachedColliders = [];

    this.gravityScale = settings.data.gravityScale || 0.9;
    this.balloonSizeScale = 1.0;
    this.forgivingFloor = settings.data.forgivingFloor ?? true;

    // Waddling Cartoon Cactus Hazard that patrols the floor!
    this.cactus = {
      x: 640,
      y: 600,
      vx: 65,
      w: 48,
      h: 66,
      bounceAnim: 0,
      wobbleTime: 0,
    };

    // Cartoon Puppy Breeze event (Bluey & Bingo blowing joyful wind & bubbles!)
    this.windEvent = null;
    this.windCooldown = 3.0;
    this.animTime = 0;

    this.mouseCollider = {
      name: 'Pointer',
      x: -1000,
      y: -1000,
      vx: 0,
      vy: 0,
      r: 38,
      active: false,
    };

    this.onMilestone = null;
  }

  setBalloonCount(count, safeBounds) {
    const target = Math.max(1, Math.min(4, count));
    while (this.balloons.length < target) {
      this.balloons.push(this.createBalloon(safeBounds));
    }
    while (this.balloons.length > target) {
      this.balloons.pop();
    }
  }

  createBalloon(safeBounds, forceSizeIdx = null, dropFromTop = false) {
    const isGold = this.score >= 12 && Math.random() < 0.22;
    let palette;
    if (isGold) {
      palette = GOLD_PALETTE;
    } else {
      const colorIdx = this._colorCounter % BALLOON_PALETTE.length;
      this._colorCounter++;
      palette = BALLOON_PALETTE[colorIdx];
    }

    const sizeObj =
      forceSizeIdx !== null
        ? BALLOON_SIZES[forceSizeIdx % BALLOON_SIZES.length]
        : this.balloons.length === 0
        ? BALLOON_SIZES[0]
        : BALLOON_SIZES[Math.floor(Math.random() * BALLOON_SIZES.length)];

    const spread = (Math.random() - 0.5) * 240;
    const startX = safeBounds
      ? (safeBounds.left + safeBounds.right) / 2 + spread
      : 640 + spread;
    const startY = safeBounds
      ? dropFromTop
        ? safeBounds.top + 65
        : safeBounds.top + 110
      : 160;

    return {
      id: Date.now() + Math.random(),
      palette,
      isGold,
      sizeMult: sizeObj.sizeMult,
      gravityMult: sizeObj.gravityMult,
      x: startX,
      y: startY,
      vx: (Math.random() - 0.5) * 90,
      vy: dropFromTop ? 55 : -60,
      baseRadius: 46, // Scaled down ~20% for nimble, satisfying agility!
      angle: 0,
      angularVel: 0,
      squash: 0,
      hitCooldown: 0,
      stringPhase: Math.random() * Math.PI * 2,
    };
  }

  resetBalloons(safeBounds) {
    this.score = 0;
    this.windEvent = null;
    this.windCooldown = 3.2; // Appears shortly after starting Keepy Uppy!
    this.particlePool.clear();
    this.textPool.clear();
    if (safeBounds) {
      this.cactus.x = (safeBounds.left + safeBounds.right) / 2;
      this.cactus.y = safeBounds.bottom - 36;
      this.cactus.vx = (Math.random() < 0.5 ? 1 : -1) * 65;
      this.cactus.bounceAnim = 0;
    }
    const startCount = Math.max(1, Math.min(4, settings.data.balloonCount || 1));
    this.balloons = [];
    for (let i = 0; i < startCount; i++) {
      this.balloons.push(this.createBalloon(safeBounds, i === 0 ? 0 : null));
    }
  }

  spawnWindEvent(safeBounds) {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const isBluey = Math.random() < 0.65; // 65% Bluey, 35% Bingo
    const particlePool = ['bubbles', 'bubbles', 'leaves', 'stars'];
    const pType = particlePool[Math.floor(Math.random() * particlePool.length)];
    const isCloud = Math.random() < 0.45; // 45% floating on fluffy cloud
    const hasWand = Math.random() < 0.70; // 70% holding bubble wand

    this.windEvent = {
      side,
      palette: isBluey ? 'bluey' : 'bingo',
      pType,
      isCloud,
      hasWand,
      timer: 5.6,
      maxTimer: 5.6,
      inAnim: 0,
      x: side === 'left' ? safeBounds.left + 50 : safeBounds.right - 50,
      y: safeBounds.top + safeBounds.height * (0.34 + Math.random() * 0.22),
      particles: [],
    };

    sound.playPuppyBark();
    setTimeout(() => sound.playWindGust(), 180);

    const isHalloween = Boolean(settings.data.halloweenTheme);
    const nameStr = isBluey ? (isHalloween ? 'VAMPIRE BLUEY' : 'BLUEY') : (isHalloween ? 'WITCH BINGO' : 'BINGO');
    const iconStr = isHalloween ? '🎃' : '🐶';
    this.spawnFloatingText(
      (safeBounds.left + safeBounds.right) / 2,
      safeBounds.top + 80,
      side === 'left' ? `${iconStr} ${nameStr} BREEZE! 👉` : `👈 ${iconStr} ${nameStr} BREEZE!`,
      isBluey ? '#7DD3FC' : '#FDBA74'
    );
  }

  updatePointer(x, y, active = true) {
    if (active) {
      this.mouseCollider.vx = x - this.mouseCollider.x;
      this.mouseCollider.vy = y - this.mouseCollider.y;
      this.mouseCollider.x = x;
      this.mouseCollider.y = y;
      this.mouseCollider.active = true;
    } else {
      this.mouseCollider.active = false;
    }
  }

  update(dt, safeBounds, player, onMilestone) {
    this.animTime += dt;
    if (this.balloons.length === 0) {
      this.balloons.push(this.createBalloon(safeBounds, 0, true));
    }

    // 1. Update Waddling Cactus Hazard (slides back and forth along the floor)
    this.cactus.y = safeBounds.bottom - 36;
    this.cactus.x += this.cactus.vx * dt;
    this.cactus.wobbleTime += dt * 4.5;
    const minCactusX = safeBounds.left + 75;
    const maxCactusX = safeBounds.right - 75;
    if (this.cactus.x < minCactusX) {
      this.cactus.x = minCactusX;
      this.cactus.vx = Math.abs(this.cactus.vx);
    } else if (this.cactus.x > maxCactusX) {
      this.cactus.x = maxCactusX;
      this.cactus.vx = -Math.abs(this.cactus.vx);
    }
    if (this.cactus.bounceAnim > 0) {
      this.cactus.bounceAnim = Math.max(0, this.cactus.bounceAnim - dt * 2.8);
    }

    // 2. Update Cartoon Puppy Breeze Wind Gusts
    if (!this.windEvent) {
      this.windCooldown -= dt;
      if (this.windCooldown <= 0) {
        this.spawnWindEvent(safeBounds);
        this.windCooldown = 8.5 + Math.random() * 4.5;
      }
    } else {
      const we = this.windEvent;
      we.timer -= dt;
      we.inAnim = Math.min(1.0, we.inAnim + dt * 2.8);

      // Emit swirling bubbles, autumn leaves, or magic stars
      if (Math.random() < 0.44 && we.particles.length < 22) {
        const dir = we.side === 'left' ? 1 : -1;
        const leafColors = ['#F97316', '#EF4444', '#EAB308', '#84CC16', '#F59E0B'];
        we.particles.push({
          type: we.pType,
          x: we.x + dir * (we.hasWand ? 75 : 55),
          y: we.y + (Math.random() - 0.5) * 52,
          vx: dir * (310 + Math.random() * 160),
          vy: -35 + (Math.random() - 0.5) * 80,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 7,
          color: leafColors[Math.floor(Math.random() * leafColors.length)],
          size: we.pType === 'bubbles' ? 10 + Math.random() * 14 : 9 + Math.random() * 6,
          life: 0.95,
          maxLife: 0.95,
        });
      }

      for (let g = we.particles.length - 1; g >= 0; g--) {
        const p = we.particles[g];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.rotSpeed * dt;
        p.life -= dt;
        if (p.life <= 0) we.particles.splice(g, 1);
      }

      if (we.timer <= 0) {
        this.windEvent = null;
      }
    }

    // 3. Collect Colliders from detected players & pointer (0 runtime allocations)
    const baseAutoRadius = 46 * this.balloonSizeScale;
    this._cachedColliders.length = 0;
    const colliders = this._cachedColliders;

    if (player) {
      const activeList =
        player.allPlayers && player.allPlayers.length > 0
          ? player.allPlayers
          : player.detected
          ? [player]
          : null;
      if (activeList) {
        for (let p = 0; p < activeList.length; p++) {
          const pCols = activeList[p].colliders;
          if (!pCols) continue;
          for (const k in pCols) {
            const col = pCols[k];
            if (col && col.visibility > 0.3) {
              colliders.push(col);
            }
          }
        }
      }
    }
    if (this.mouseCollider.active) {
      colliders.push(this.mouseCollider);
    }

    const baseGravity = 230 * this.gravityScale;
    const airDrag = 0.988;

    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      b.radius = baseAutoRadius * (b.sizeMult || 1.0);
      if (b.hitCooldown > 0) b.hitCooldown -= dt;
      if (b.squash > 0) b.squash = Math.max(0, b.squash - dt * 3.2);
      b.stringPhase += dt * 5;

      const gMult = b.gravityMult || 1.0;
      const maxFallSpeed = 230 * this.gravityScale * gMult;

      b.vy += baseGravity * gMult * dt;

      // Apply tangible aerodynamic wind force from Leaf Blower
      if (this.windEvent) {
        const windDir = this.windEvent.side === 'left' ? 1 : -1;
        b.vx += windDir * (300 / (b.sizeMult || 1.0)) * dt;
        b.vy -= 90 * dt; // exciting uplifting breeze!
      }

      b.vx *= airDrag;
      if (b.vy > maxFallSpeed) {
        b.vy = maxFallSpeed;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      const targetAngle = Math.max(-0.35, Math.min(0.35, b.vx * 0.0012));
      b.angle = b.angle * 0.9 + targetAngle * 0.1;

      // Player Collision Check (Optimized squared-distance before sqrt)
      if (b.hitCooldown <= 0) {
        for (const col of colliders) {
          const dx = b.x - col.x;
          const dy = b.y - col.y;
          const minDist = b.radius + col.r;
          const distSq = dx * dx + dy * dy;

          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            const nx = dist > 0.001 ? dx / dist : 0;
            const ny = dist > 0.001 ? dy / dist : -1;

            b.x = col.x + nx * (minDist + 4);
            b.y = col.y + ny * (minDist + 4);

            const handSpeedX = (col.vx || 0) * 18;
            const handSpeedY = Math.min(0, (col.vy || 0) * 16);

            b.vx = nx * 240 + handSpeedX * 0.65 + (Math.random() - 0.5) * 40;
            b.vy = -Math.max(380, 425 * Math.sqrt(this.gravityScale)) + handSpeedY * 0.45;

            b.hitCooldown = 0.22;
            b.squash = 1.0;

            const points = b.isGold ? 3 : 1;
            this.score += points;
            this.totalHits++;
            if (this.score > this.bestScore) {
              this.bestScore = this.score;
              settings.data.bestKeepyUppy = this.bestScore;
              settings.save();
            }

            sound.playBalloonHit(this.score);
            this.spawnHitEffect(b.x, b.y, b.palette.main, col.name, this.score, b.isGold, b.y > safeBounds.bottom - 110);

            // Auto-spawn an extra balloon every 15 points (up to 4 balloons!)
            if (this.score > 0 && this.score % 15 === 0 && this.balloons.length < 4) {
              const newBalloon = this.createBalloon(safeBounds, null, true);
              this.balloons.push(newBalloon);
              sound.playFanfare();
              const isHw = Boolean(settings.data.halloweenTheme);
              this.spawnFloatingText(
                newBalloon.x,
                newBalloon.y + 40,
                isHw
                  ? `BONUS JACK-O'-LANTERN! (${this.balloons.length} PUMPKINS!) 🎃`
                  : `BONUS BALLOON! (${this.balloons.length} BALLOONS!) 🎈`,
                isHw ? '#FB923C' : '#4ADE80'
              );
            }

            // Trigger Character Soundboard every N hits (default 10)
            const everyN = settings.data.soundboardEveryN || 10;
            const milestoneCb = onMilestone || this.onMilestone;
            if (this.score > 0 && this.score % everyN === 0 && milestoneCb) {
              milestoneCb(this.score);
            }
            break;
          }
        }
      }

      // Safe-Zone Wall Bounces
      if (b.x - b.radius < safeBounds.left) {
        b.x = safeBounds.left + b.radius;
        b.vx = Math.abs(b.vx) * 0.85 + 30;
        b.squash = 0.45;
      } else if (b.x + b.radius > safeBounds.right) {
        b.x = safeBounds.right - b.radius;
        b.vx = -Math.abs(b.vx) * 0.85 - 30;
        b.squash = 0.45;
      }

      if (b.y - b.radius < safeBounds.top) {
        b.y = safeBounds.top + b.radius;
        b.vy = Math.abs(b.vy) * 0.55 + 40;
        b.squash = 0.4;
      }

      // 4. Waddling Cactus Hazard Collision Check!
      const cactusHitX = this.cactus.x;
      const cactusHitY = this.cactus.y - 22;
      const cactusHitR = 28;
      const cdx = b.x - cactusHitX;
      const cdy = b.y - cactusHitY;
      const cMinDist = b.radius + cactusHitR;

      if (cdx * cdx + cdy * cdy < cMinDist * cMinDist) {
        sound.playBalloonPop();
        this.spawnFloorPopBurst(b.x, b.y, b.palette.main, b.palette.highlight);
        this.cactus.bounceAnim = 1.0;
        this.spawnFloatingText(this.cactus.x, this.cactus.y - 65, '🌵 CACTUS POP! OUCH! 💥', '#EF4444');
        this.balloons.splice(i, 1);

        if (this.balloons.length >= 1) {
          this.spawnFloatingText(b.x, b.y - 35, `POP! 💥 (${this.balloons.length} LEFT!)`, '#FCA5A5');
        } else {
          if (!this.forgivingFloor && this.score > 0) {
            if (this.score >= 3) sound.playFailClip(false);
            this.spawnFloatingText(b.x, b.y - 40, `STREAK RESET (${this.score})`, '#FB7185');
            this.score = 0;
          } else {
            const isHw = Boolean(settings.data.halloweenTheme);
            this.spawnFloatingText(b.x, b.y - 40, isHw ? 'SPLAT! 💥 NEW PUMPKIN! 🎃' : 'POP! 💥 NEW BALLOON!', '#FDE047');
          }
          const fresh = this.createBalloon(safeBounds, 0, true);
          this.balloons.push(fresh);
        }
        continue;
      }

      // 5. Floor Check: Balloon touching the floor POPS with loud pop sound & confetti!
      if (b.y + b.radius > safeBounds.bottom) {
        sound.playBalloonPop();
        this.spawnFloorPopBurst(b.x, safeBounds.bottom - 20, b.palette.main, b.palette.highlight);
        this.balloons.splice(i, 1);

        if (this.balloons.length >= 1) {
          this.spawnFloatingText(
            b.x,
            safeBounds.bottom - 55,
            `POP! 💥 (${this.balloons.length} LEFT!)`,
            '#FCA5A5'
          );
        } else {
          const isHw = Boolean(settings.data.halloweenTheme);
          if (!this.forgivingFloor && this.score > 0) {
            if (this.score >= 3) {
              sound.playFailClip(false);
            }
            this.spawnFloatingText(
              b.x,
              safeBounds.bottom - 60,
              `POP! 💥 STREAK RESET (${this.score})`,
              '#FB7185'
            );
            this.score = 0;
          } else {
            this.spawnFloatingText(
              b.x,
              safeBounds.bottom - 60,
              isHw ? 'POP! 💥 NEW JACK-O\'-LANTERN! 🎃' : 'POP! 💥 NEW BALLOON!',
              '#FDE047'
            );
          }
          const fresh = this.createBalloon(safeBounds, 0, true);
          this.balloons.push(fresh);
          this.spawnFloatingText(
            fresh.x,
            fresh.y + 45,
            isHw ? 'NEW JACK-O\'-LANTERN! 🎃' : 'NEW BALLOON! 🎈',
            isHw ? '#FDBA74' : '#7DD3FC'
          );
        }
      }
    }

    // 6. Update Confetti & Rubber Particles (zero-allocation pool!)
    this.particlePool.update(dt);
    this.textPool.update(dt);
  }

  spawnFloorPopBurst(x, y, mainColor, highlightColor) {
    const colors = [mainColor, highlightColor, '#FFFFFF', '#FACC15', '#EF4444'];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.25;
      const speed = 150 + Math.random() * 230;
      this.particlePool.spawn(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 90,
        6 + Math.random() * 7,
        colors[i % colors.length],
        0.6,
        'circle',
        320
      );
    }
  }

  spawnHitEffect(x, y, color, colliderName, currentScore, isGold = false, isClutchSave = false) {
    const colors = isGold
      ? ['#FACC15', '#FFFBEB', '#FEF08A', '#F59E0B', '#FFFFFF']
      : [color, '#FACC15', '#38BDF8', '#4ADE80', '#F472B6', '#FFFFFF'];

    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.3;
      const speed = 110 + Math.random() * 180;
      this.particlePool.spawn(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 60,
        5 + Math.random() * 6,
        colors[i % colors.length],
        0.5 + Math.random() * 0.2,
        'circle',
        320
      );
    }

    if (colliderName === 'Pop') return;

    let label = isGold ? `GOLDEN STAR BOP! ⭐ +3` : `+1 KEEPY UPPY!`;
    if (isClutchSave) label = `CLUTCH SAVE! 👟 +1`;
    else if (colliderName === 'Head') label = `SUPER HEADER! 👑 +1`;
    else if (colliderName?.includes('Foot')) label = `SUPER KICK! 👟 +1`;
    else if (currentScore > 0 && currentScore % 10 === 0) label = `STREAK ${currentScore}! ⭐`;

    this.spawnFloatingText(x, y - 45, label, isGold ? '#FDE047' : '#FEF08A');
  }

  spawnFloatingText(x, y, text, color = '#FFFFFF') {
    this.textPool.spawn(x, y, text, color, 0.95, -55);
  }

  render(ctx) {
    // 1. Draw Cartoon Puppy Wind Blower (if active)
    if (this.windEvent) {
      this.drawPuppyBlower(ctx, this.windEvent);
    }

    // 2. Draw Waddling Cactus Hazard
    this.drawCactus(ctx, this.cactus);

    // 3. Draw Confetti & Rubber Pop Particles (Batched single save/restore!)
    const pool = this.particlePool.pool;
    let hasParticles = false;
    for (let i = 0; i < this.particlePool.maxSize; i++) {
      if (pool[i].active) {
        hasParticles = true;
        break;
      }
    }
    if (hasParticles) {
      ctx.save();
      for (let i = 0; i < this.particlePool.maxSize; i++) {
        const p = pool[i];
        if (!p.active) continue;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Draw Balloons with Animated Expressions
    for (const b of this.balloons) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);

      const wobble = Math.sin(b.squash * Math.PI * 3) * b.squash * 0.18;
      ctx.scale(1 + wobble, 1 - wobble);

      const r = b.radius || 46;
      const isHalloween = Boolean(settings.data.halloweenTheme);

      // Balloon string (or curly green pumpkin vine in Halloween mode!)
      ctx.beginPath();
      ctx.moveTo(0, r * (isHalloween ? 0.96 : 1.12));
      for (let s = 1; s <= 4; s++) {
        const sy = r * (isHalloween ? 0.96 : 1.12) + s * (r * 0.26);
        const sx = Math.sin(b.stringPhase + s * 1.3) * (isHalloween ? 9 : 7);
        ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = isHalloween ? '#4ADE80' : 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = isHalloween ? 3.2 : 2.5;
      ctx.stroke();

      // Cached 2x pre-rendered balloon / jack-o'-lantern body
      const cachedB = this._getBalloonCanvas(b.palette, b.isGold);
      const scaleR = r / 50;
      ctx.drawImage(
        cachedB.canvas,
        -(cachedB.w / 2) * scaleR,
        (-cachedB.h / 2 + 4) * scaleR,
        cachedB.w * scaleR,
        cachedB.h * scaleR
      );

      // Animated Cartoon Eyes & Face
      const isHappy = b.hitCooldown > 0;
      const cdxFace = b.x - this.cactus.x;
      const cdyFace = b.y - this.cactus.y;
      const isScared = b.y > 580 || (cdxFace * cdxFace + cdyFace * cdyFace < 16900);
      this.drawBalloonFace(ctx, r, isHappy, isScared, b.vx, b.vy);

      ctx.restore();
    }

    // 5. Draw Floor "SAVE IT!" Suspense Warning Bar (if any balloon is dangerously low)
    const dangerouslyLow = this.balloons.some((b) => b.y + b.radius > 610);
    if (dangerouslyLow) {
      const pulse = 0.5 + Math.sin(Date.now() * 0.014) * 0.5;
      ctx.save();
      ctx.fillStyle = `rgba(239, 68, 68, ${0.22 + pulse * 0.28})`;
      ctx.fillRect(0, 688, ctx.canvas.width, 32);

      ctx.fillStyle = '#FEF08A';
      ctx.font = '900 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠️ SAVE IT! DON\'T LET IT TOUCH! ⚠️', ctx.canvas.width / 2, 704);
      ctx.restore();
    }

    // 6. Draw Floating Callout Texts (batched zero-allocation!)
    const textPool = this.textPool.pool;
    let hasTexts = false;
    for (let i = 0; i < this.textPool.maxSize; i++) {
      if (textPool[i].active) {
        hasTexts = true;
        break;
      }
    }
    if (hasTexts) {
      ctx.save();
      ctx.font = '900 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 5;
      for (let i = 0; i < this.textPool.maxSize; i++) {
        const ft = textPool[i];
        if (!ft.active) continue;
        ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.restore();
    }
  }

  // Pure 2D canvas drawing - zero allocations, silky smooth 60fps
  drawBalloonFace(ctx, r, isHappy, isScared, vx, vy) {
    ctx.save();
    const faceY = -r * 0.12;

    if (settings.data.halloweenTheme) {
      // 🎃 Carved Glowing Jack-o'-Lantern Face!
      const lookX = Math.max(-2.5, Math.min(2.5, vx * 0.015));
      const lookY = Math.max(-2.0, Math.min(2.0, vy * 0.015));

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // 1. Carved Jack-o'-Lantern Eyes (Glowing Candle-Lit Triangles)
      [-1, 1].forEach((dir) => {
        const eyeX = dir * r * 0.34;
        ctx.fillStyle = isHappy ? '#FEF08A' : '#FACC15';
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2.4;

        ctx.beginPath();
        if (isScared) {
          // Wide shocked diamond/oval carved eyes when near floor/cactus!
          ctx.ellipse(eyeX, faceY - 2, r * 0.18, r * 0.22, 0, 0, Math.PI * 2);
        } else {
          // Classic triangular Jack-o'-lantern carved eyes
          ctx.moveTo(eyeX - r * 0.20, faceY + 4);
          ctx.lineTo(eyeX, faceY - r * 0.24);
          ctx.lineTo(eyeX + r * 0.20, faceY + 4);
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();

        // Warm inner candle-flame pupil glint
        if (!isHappy) {
          ctx.fillStyle = '#EA580C';
          ctx.beginPath();
          ctx.arc(
            eyeX + (isScared ? 0 : lookX),
            faceY - 1 + (isScared ? 3 : lookY),
            r * 0.07,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(eyeX - 2, faceY - 5, r * 0.045, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Cute Carved Triangle Pumpkin Nose in center
      ctx.fillStyle = '#FEF08A';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.10, faceY + 10);
      ctx.lineTo(0, faceY + 1);
      ctx.lineTo(r * 0.10, faceY + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3. Carved Jack-o'-Lantern Mouth with Blocky Pumpkin Teeth!
      if (isScared) {
        // Gasping carved "O" pumpkin mouth
        ctx.fillStyle = '#FEF08A';
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, faceY + 23, r * 0.20, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Big cheerful carved Jack-o'-lantern grin
        const mouthW = r * (isHappy ? 0.58 : 0.50);
        const mouthTopY = faceY + 15;
        const mouthBotY = faceY + (isHappy ? 34 : 29);

        ctx.fillStyle = isHappy ? '#FEF08A' : '#FACC15';
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-mouthW, mouthTopY);
        ctx.quadraticCurveTo(0, mouthTopY + 5, mouthW, mouthTopY);
        ctx.quadraticCurveTo(mouthW * 0.65, mouthBotY, 0, mouthBotY);
        ctx.quadraticCurveTo(-mouthW * 0.65, mouthBotY, -mouthW, mouthTopY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Carved blocky orange pumpkin teeth (2 top teeth, 1 bottom center tooth)
        ctx.fillStyle = '#F97316';
        ctx.fillRect(-r * 0.22, mouthTopY, r * 0.13, r * 0.11);
        ctx.fillRect(r * 0.09, mouthTopY, r * 0.13, r * 0.11);
        ctx.fillRect(-r * 0.07, mouthBotY - r * 0.12, r * 0.14, r * 0.11);
      }

      ctx.restore();
      return;
    }

    // Rosy Pink Cheeks
    ctx.fillStyle = 'rgba(251, 113, 133, 0.45)';
    ctx.beginPath();
    ctx.arc(-r * 0.42, faceY + 10, 6, 0, Math.PI * 2);
    ctx.arc(r * 0.42, faceY + 10, 6, 0, Math.PI * 2);
    ctx.fill();

    if (isHappy) {
      // Joyful squinting eyes (^  ^)
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      [-1, 1].forEach((dir) => {
        const eyeX = dir * r * 0.28;
        ctx.beginPath();
        ctx.moveTo(eyeX - 7, faceY + 2);
        ctx.lineTo(eyeX, faceY - 5);
        ctx.lineTo(eyeX + 7, faceY + 2);
        ctx.stroke();
      });

      // Wide open happy smile with pink tongue
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(0, faceY + 11, 9, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.arc(0, faceY + 14, 5, 0, Math.PI);
      ctx.fill();
    } else if (isScared) {
      // Big shocked wide eyes (O  O) looking down
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2.2;
      [-1, 1].forEach((dir) => {
        const eyeX = dir * r * 0.28;
        ctx.beginPath();
        ctx.arc(eyeX, faceY, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupils looking down toward floor/cactus
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(eyeX, faceY + 3.2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
      });

      // Shivering "o" mouth
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(0, faceY + 14, 5.5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Friendly round glossy eyes glancing toward movement
      const lookX = Math.max(-3.5, Math.min(3.5, vx * 0.018));
      const lookY = Math.max(-2.5, Math.min(2.5, vy * 0.018));

      ctx.fillStyle = '#1E293B';
      [-1, 1].forEach((dir) => {
        const eyeX = dir * r * 0.28;
        ctx.beginPath();
        ctx.arc(eyeX + lookX, faceY + lookY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Cute white specular twinkle in eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(eyeX + lookX - 1.8, faceY + lookY - 1.8, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1E293B';
      });

      // Sweet curved smile
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, faceY + 7, 7, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // Pre-rendered 2x Offscreen Sprite Caches (60 FPS Performance)
  // -------------------------------------------------------------
  _getBalloonCanvas(palette, isGold) {
    const isHalloween = Boolean(settings.data.halloweenTheme);
    const key = `${palette.name}_${isGold ? 'gold' : 'std'}_hw${isHalloween ? 1 : 0}`;
    let cached = this._balloonCanvasCache.get(key);
    if (cached) return cached;

    const scale = 2;
    const r = 50;
    const cw = Math.ceil(r * 2.4);
    const ch = Math.ceil(r * 2.6);
    const c = document.createElement('canvas');
    c.width = cw * scale;
    c.height = ch * scale;
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    ctx.translate(cw / 2, ch / 2 - 4);

    if (isHalloween) {
      // 🎃 Plump Ribbed Cartoon Jack-o'-Lantern Pumpkin!
      const pMain = isGold ? '#FACC15' : '#F97316';
      const pMid = isGold ? '#FDE047' : '#FB923C';
      const pDark = isGold ? '#B45309' : '#C2410C';
      const pOutline = isGold ? '#FEF08A' : '#7C2D12';

      // 1. Curly Green Vine Tendril & Stem at Top
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(4, -r * 0.85);
      ctx.bezierCurveTo(18, -r * 1.10, 28, -r * 0.80, 20, -r * 0.70);
      ctx.stroke();

      // Chunky Curved Pumpkin Stem
      ctx.fillStyle = '#15803D';
      ctx.strokeStyle = '#14532D';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(-7, -r * 0.78);
      ctx.quadraticCurveTo(-5, -r * 1.15, 6, -r * 1.18);
      ctx.lineTo(11, -r * 1.10);
      ctx.quadraticCurveTo(3, -r * 1.02, 7, -r * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Colorful Trick-or-Treat Ribbon Bow at stem base (uses palette.main so each pumpkin has a unique color accent!)
      ctx.fillStyle = palette.main;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(-9, -r * 0.80, 7, 4, -0.3, 0, Math.PI * 2);
      ctx.ellipse(9, -r * 0.80, 7, 4, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2. Outer Left & Right Pumpkin Ribs
      ctx.fillStyle = pMain;
      ctx.strokeStyle = pDark;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.ellipse(-r * 0.42, 0, r * 0.62, r * 0.86, -0.08, 0, Math.PI * 2);
      ctx.ellipse(r * 0.42, 0, r * 0.62, r * 0.86, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 3. Mid Left & Right Pumpkin Ribs
      ctx.fillStyle = pMid;
      ctx.beginPath();
      ctx.ellipse(-r * 0.22, 0, r * 0.52, r * 0.91, -0.03, 0, Math.PI * 2);
      ctx.ellipse(r * 0.22, 0, r * 0.52, r * 0.91, 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4. Center Plump Pumpkin Rib
      ctx.fillStyle = pMain;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.38, r * 0.94, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Crisp outer pumpkin silhouette highlight ring
      ctx.strokeStyle = pOutline;
      ctx.lineWidth = isGold ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.02, r * 0.92, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Glossy Specular Highlight on upper-left pumpkin rib
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.46, -r * 0.34, r * 0.14, r * 0.28, -0.35, 0, Math.PI * 2);
      ctx.fill();

      const res = { canvas: c, w: cw, h: ch };
      this._balloonCanvasCache.set(key, res);
      return res;
    }

    // Knot
    ctx.fillStyle = palette.main;
    ctx.strokeStyle = palette.rim;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, r * 1.12);
    ctx.lineTo(6, r * 1.12);
    ctx.lineTo(0, r * 1.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Body
    ctx.fillStyle = palette.main;
    ctx.strokeStyle = isGold ? '#FEF08A' : '#FFFFFF';
    ctx.lineWidth = isGold ? 4 : 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.94, r * 1.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Top Highlight Crescent
    ctx.fillStyle = palette.highlight;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(-r * 0.22, -r * 0.26, r * 0.62, r * 0.68, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Specular Reflection Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.36, -r * 0.38, r * 0.16, r * 0.3, -0.45, 0, Math.PI * 2);
    ctx.fill();

    const res = { canvas: c, w: cw, h: ch };
    this._balloonCanvasCache.set(key, res);
    return res;
  }

  _getCactusCanvas() {
    if (this._cactusCanvas) return this._cactusCanvas;

    const scale = 2;
    const cw = 90;
    const ch = 100;
    const c = document.createElement('canvas');
    c.width = cw * scale;
    c.height = ch * scale;
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    ctx.translate(45, 75);

    // Terracotta Plant Pot
    const potW = 44;
    const potH = 26;
    ctx.fillStyle = '#EA580C';
    ctx.strokeStyle = '#9A3412';
    ctx.lineWidth = 2.5;

    // Pot Rim
    ctx.beginPath();
    ctx.roundRect(-potW * 0.55, -potH * 0.25, potW * 1.1, 8, 4);
    ctx.fill();
    ctx.stroke();

    // Pot Body
    ctx.beginPath();
    ctx.moveTo(-potW * 0.48, -potH * 0.25 + 8);
    ctx.lineTo(-potW * 0.36, potH * 0.75);
    ctx.lineTo(potW * 0.36, potH * 0.75);
    ctx.lineTo(potW * 0.48, -potH * 0.25 + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Soil
    ctx.fillStyle = '#451A03';
    ctx.beginPath();
    ctx.ellipse(0, -potH * 0.25 + 2.5, potW * 0.45, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Green Cactus Body (Ribbed Saguaro)
    const bodyW = 20;
    const bodyH = 44;
    ctx.fillStyle = '#16A34A';
    ctx.strokeStyle = '#14532D';
    ctx.lineWidth = 2.5;

    // Left Arm
    ctx.beginPath();
    ctx.roundRect(-bodyW * 1.25, -bodyH * 0.65, 11, 20, 5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.fillRect(-bodyW * 0.95, -bodyH * 0.45, 9, 7);
    ctx.fill();

    // Right Arm
    ctx.beginPath();
    ctx.roundRect(bodyW * 0.78, -bodyH * 0.78, 11, 22, 5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.fillRect(bodyW * 0.48, -bodyH * 0.55, 9, 7);
    ctx.fill();

    // Center Main Column
    ctx.beginPath();
    ctx.roundRect(-bodyW / 2, -bodyH, bodyW, bodyH, [10, 10, 3, 3]);
    ctx.fill();
    ctx.stroke();

    // Vertical ribbed highlights
    ctx.strokeStyle = '#4ADE80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -bodyH + 6);
    ctx.lineTo(-4, -3);
    ctx.moveTo(4, -bodyH + 6);
    ctx.lineTo(4, -3);
    ctx.stroke();

    // Cartoon spines / prickles
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2 - 2, -bodyH * 0.75); ctx.lineTo(-bodyW / 2 - 5.5, -bodyH * 0.75 - 2);
    ctx.moveTo(bodyW / 2 + 2, -bodyH * 0.6); ctx.lineTo(bodyW / 2 + 5.5, -bodyH * 0.6 - 2);
    ctx.moveTo(-bodyW / 2 - 2, -bodyH * 0.35); ctx.lineTo(-bodyW / 2 - 5.5, -bodyH * 0.35 - 2);
    ctx.moveTo(bodyW / 2 + 2, -bodyH * 0.2); ctx.lineTo(bodyW / 2 + 5.5, -bodyH * 0.2 - 2);
    ctx.moveTo(-bodyW * 1.25 - 2, -bodyH * 0.55); ctx.lineTo(-bodyW * 1.25 - 5.5, -bodyH * 0.55 - 2);
    ctx.moveTo(bodyW * 1.25 + 2, -bodyH * 0.7); ctx.lineTo(bodyW * 1.25 + 5.5, -bodyH * 0.7 - 2);
    ctx.stroke();

    // Yellow flower on top
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -bodyH - 2, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Friendly little face on cactus
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-3.5, -bodyH * 0.52, 2.2, 0, Math.PI * 2);
    ctx.arc(3.5, -bodyH * 0.52, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -bodyH * 0.42, 3, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    const res = { canvas: c, w: cw, h: ch };
    this._cactusCanvas = res;
    return res;
  }

  _getPuppyCanvas(isBluey, isCloud, hasWand) {
    const isHalloween = Boolean(settings.data.halloweenTheme);
    const key = `${isBluey ? 'bluey' : 'bingo'}_cloud${isCloud ? 1 : 0}_wand${hasWand ? 1 : 0}_hw${isHalloween ? 1 : 0}`;
    let cached = this._puppyCanvasCache.get(key);
    if (cached) return cached;

    const scale = 2;
    const cw = 140;
    const ch = 200;
    const c = document.createElement('canvas');
    c.width = cw * scale;
    c.height = ch * scale;
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    ctx.translate(55, 80);

    const colors = isBluey
      ? {
          body: '#88C9FA',
          bodyDark: '#2C3E6B',
          belly: '#BAE6FD',
          muzzle: '#F4C978',
          nose: '#1E2433',
          eyebrows: '#BAE6FD',
          cheeks: '#F687B3',
          wand: '#FB923C',
          outline: '#1E2433',
        }
      : {
          body: '#FB923C',
          bodyDark: '#C2410C',
          belly: '#FED7AA',
          muzzle: '#FEF08A',
          nose: '#1E2433',
          eyebrows: '#FED7AA',
          cheeks: '#F87171',
          wand: '#38BDF8',
          outline: '#1E2433',
        };

    // Soft Fluffy Cartoon Cloud under feet (if isCloud)
    if (isCloud) {
      ctx.fillStyle = isHalloween ? 'rgba(168, 85, 247, 0.55)' : 'rgba(186, 230, 253, 0.70)';
      ctx.beginPath();
      ctx.arc(-15, 82, 26, 0, Math.PI * 2);
      ctx.arc(12, 78, 30, 0, Math.PI * 2);
      ctx.arc(42, 84, 22, 0, Math.PI * 2);
      ctx.arc(-38, 86, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isHalloween ? '#F3E8FF' : '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-15, 78, 24, 0, Math.PI * 2);
      ctx.arc(12, 74, 28, 0, Math.PI * 2);
      ctx.arc(42, 80, 20, 0, Math.PI * 2);
      ctx.arc(-38, 82, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineWidth = 3.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = colors.outline;

    // Halloween Costume Back Cape (drawn behind body!)
    if (isHalloween) {
      if (isBluey) {
        // 🧛 Count Bluey Vampire Cape & Popped Dracula Collar (Back Layer)
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = colors.outline;
        ctx.beginPath();
        ctx.moveTo(-26, -6);
        ctx.quadraticCurveTo(-56, 18, -52, 62);
        ctx.lineTo(-34, 52);
        ctx.lineTo(-22, 62);
        ctx.lineTo(-12, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crimson inner cape lining
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.moveTo(-24, 0);
        ctx.quadraticCurveTo(-48, 22, -45, 56);
        ctx.lineTo(-30, 48);
        ctx.lineTo(-18, 10);
        ctx.closePath();
        ctx.fill();

        // High Popped Vampire Collar behind neck
        ctx.fillStyle = '#DC2626';
        ctx.strokeStyle = colors.outline;
        ctx.beginPath();
        ctx.moveTo(-36, 4);
        ctx.lineTo(-50, -24);
        ctx.lineTo(-18, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // 🧙‍♀️ Witch Bingo Starry Purple Cape behind back
        ctx.fillStyle = '#6B21A8';
        ctx.strokeStyle = colors.outline;
        ctx.beginPath();
        ctx.moveTo(-26, -2);
        ctx.quadraticCurveTo(-54, 22, -48, 60);
        ctx.lineTo(-16, 56);
        ctx.lineTo(-14, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Legs & Paws
    if (!isCloud) {
      ctx.fillStyle = colors.belly;
      // Back Leg
      ctx.beginPath();
      ctx.roundRect(-26, 62, 18, 30, [4, 4, 10, 10]);
      ctx.fill();
      ctx.stroke();
      // Back Paw 3 Toes
      ctx.beginPath();
      ctx.arc(-26 + 3, 90, 4, 0, Math.PI * 2);
      ctx.arc(-26 + 9, 90, 4.5, 0, Math.PI * 2);
      ctx.arc(-26 + 15, 90, 4, 0, Math.PI * 2);
      ctx.fill();

      // Front Leg
      ctx.beginPath();
      ctx.roundRect(8, 62, 18, 30, [4, 4, 10, 10]);
      ctx.fill();
      ctx.stroke();
      // Front Paw 3 Toes
      ctx.beginPath();
      ctx.arc(8 + 3, 90, 4, 0, Math.PI * 2);
      ctx.arc(8 + 9, 90, 4.5, 0, Math.PI * 2);
      ctx.arc(8 + 15, 90, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Iconic Rectangular Body & Head
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.roundRect(-38, -32, 68, 98, [18, 22, 14, 14]);
    ctx.fill();
    ctx.stroke();

    // Oval Belly Patch
    ctx.fillStyle = colors.belly;
    ctx.beginPath();
    ctx.roundRect(-16, -6, 44, 66, [18, 18, 14, 14]);
    ctx.fill();

    // Dark Spot on Back
    ctx.fillStyle = colors.bodyDark;
    ctx.beginPath();
    ctx.ellipse(-32, 16, 9, 14, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Halloween Costume Torso Outfit (Over Body & Belly!)
    if (isHalloween) {
      if (isBluey) {
        // 🧛 Count Bluey Tuxedo Vest & Golden Bat Medallion
        ctx.fillStyle = '#1E1B4B';
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.roundRect(-36, 12, 64, 48, [8, 8, 12, 12]);
        ctx.fill();
        ctx.stroke();

        // White tuxedo shirt V-front
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-4, 12);
        ctx.lineTo(22, 12);
        ctx.lineTo(10, 42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crimson ribbon & Gold Bat Medallion
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-14, 13);
        ctx.lineTo(10, 24);
        ctx.lineTo(26, 14);
        ctx.stroke();

        ctx.fillStyle = '#FACC15';
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(10, 25, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // 🧙‍♀️ Witch Bingo Starry Dress & Pumpkin Collar Bow
        ctx.fillStyle = '#7E22CE';
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.roundRect(-36, 14, 64, 46, [8, 8, 12, 12]);
        ctx.fill();
        ctx.stroke();

        // Scalloped Orange Pumpkin Trim along hem
        ctx.fillStyle = '#F97316';
        ctx.fillRect(-35, 52, 62, 7);

        // Little Gold Stars on Witch Dress
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(-14, 32, 3.5, 0, Math.PI * 2);
        ctx.arc(8, 38, 4, 0, Math.PI * 2);
        ctx.arc(-2, 24, 3, 0, Math.PI * 2);
        ctx.fill();

        // Cute Orange Bow at Neck
        ctx.fillStyle = '#FB923C';
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(2, 15, 8, 5, -0.2, 0, Math.PI * 2);
        ctx.ellipse(16, 15, 8, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(9, 15, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = colors.outline;
    }

    // Cattle Dog Ears
    // Left Ear
    ctx.save();
    ctx.translate(-14, -40);
    ctx.rotate(-0.10);
    ctx.fillStyle = colors.bodyDark;
    ctx.beginPath();
    ctx.moveTo(-11, 16);
    ctx.lineTo(2, -38);
    ctx.lineTo(18, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.muzzle;
    ctx.beginPath();
    ctx.moveTo(-5, 14);
    ctx.lineTo(2, -26);
    ctx.lineTo(11, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right Ear
    ctx.save();
    ctx.translate(16, -40);
    ctx.rotate(0.12);
    ctx.fillStyle = colors.bodyDark;
    ctx.beginPath();
    ctx.moveTo(-11, 16);
    ctx.lineTo(4, -40);
    ctx.lineTo(19, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.muzzle;
    ctx.beginPath();
    ctx.moveTo(-5, 14);
    ctx.lineTo(4, -28);
    ctx.lineTo(12, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Halloween Costume Hats (perched jauntily on head!)
    if (isHalloween) {
      if (isBluey) {
        // 🎩 Dapper Mini Vampire Top Hat with Crimson Band
        ctx.save();
        ctx.translate(2, -48);
        ctx.rotate(-0.08);
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 2.5;
        // Crown
        ctx.beginPath();
        ctx.roundRect(-14, -24, 28, 22, 4);
        ctx.fill();
        ctx.stroke();
        // Crimson Ribbon
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-13, -8, 26, 6);
        // Brim
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.ellipse(0, -1, 22, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        // 🧙‍♀️ Crooked Purple Witch Hat with Gold Buckle
        ctx.save();
        ctx.translate(2, -46);
        ctx.rotate(-0.06);
        ctx.fillStyle = '#581C87';
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 2.5;
        // Cone with crooked tip
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.quadraticCurveTo(-8, -22, 6, -34);
        ctx.quadraticCurveTo(18, -36, 16, -28);
        ctx.quadraticCurveTo(10, -18, 18, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Orange Hatband & Gold Buckle
        ctx.fillStyle = '#F97316';
        ctx.fillRect(-16, -7, 32, 6);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(-5, -8, 10, 8);
        // Wide Witch Hat Brim
        ctx.fillStyle = '#6B21A8';
        ctx.beginPath();
        ctx.ellipse(0, 1, 28, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = colors.outline;
    }

    // Navy Eye Patch Mask
    ctx.fillStyle = colors.bodyDark;
    ctx.beginPath();
    ctx.roundRect(-14, -38, 44, 30, [14, 18, 6, 6]);
    ctx.fill();

    // Eyebrows
    ctx.fillStyle = colors.eyebrows;
    ctx.beginPath();
    ctx.roundRect(-3, -42, 14, 6, 3);
    ctx.roundRect(17, -42, 14, 6, 3);
    ctx.fill();

    // Large Expressive Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(5, -23, 7.5, 11, 0.05, 0, Math.PI * 2);
    ctx.ellipse(22, -23, 7.5, 11, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(5, -23, 7.5, 11, 0.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(22, -23, 7.5, 11, 0.05, 0, Math.PI * 2);
    ctx.stroke();

    // Pupils
    ctx.fillStyle = '#1E2433';
    ctx.beginPath();
    ctx.ellipse(7.5, -23, 4.2, 5.8, 0, 0, Math.PI * 2);
    ctx.ellipse(24.5, -23, 4.2, 5.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Catchlights
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(6.5, -25, 1.8, 0, Math.PI * 2);
    ctx.arc(23.5, -25, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Cheek
    ctx.fillStyle = colors.belly;
    ctx.beginPath();
    ctx.arc(8, 6, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3.0;
    ctx.stroke();

    // Pink Blush
    ctx.fillStyle = colors.cheeks;
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.ellipse(10, 6, 8.5, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Golden-Tan Muzzle
    ctx.fillStyle = colors.muzzle;
    ctx.beginPath();
    ctx.roundRect(14, -13, 38, 29, [14, 16, 16, 14]);
    ctx.fill();
    ctx.stroke();

    // Cute Vampire Fangs on Muzzle (if Halloween)
    if (isHalloween) {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 1.8;
      [26, 38].forEach((fx) => {
        ctx.beginPath();
        ctx.moveTo(fx - 3, 15);
        ctx.lineTo(fx, 22);
        ctx.lineTo(fx + 3, 15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    }

    // Button Nose
    ctx.fillStyle = colors.nose;
    ctx.beginPath();
    ctx.roundRect(42, -15, 15, 13, 6.5);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(46, -12, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Bubble Wand or Paw
    if (hasWand) {
      ctx.strokeStyle = isHalloween ? '#A855F7' : colors.wand;
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(34, 38);
      ctx.lineTo(58, 4);
      ctx.stroke();

      if (isHalloween) {
        // 🎃 Cute Pumpkin / Magic Star Wand Ring!
        ctx.fillStyle = '#F97316';
        ctx.strokeStyle = '#7C2D12';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(62, 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Glowing yellow pumpkin wand eyes
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(59, 0, 2.2, 0, Math.PI * 2);
        ctx.arc(65, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.arc(62, 2, 9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(62, 2, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = colors.belly;
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.roundRect(30, 24, 16, 16, 8);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = colors.belly;
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.roundRect(14, 28, 16, 14, 7);
      ctx.fill();
      ctx.stroke();
    }

    const res = { canvas: c, w: cw, h: ch };
    this._puppyCanvasCache.set(key, res);
    return res;
  }

  // Draw Waddling Cartoon Potted Cactus Hazard
  drawCactus(ctx, cactus) {
    ctx.save();
    const bounce = Math.sin(cactus.bounceAnim * Math.PI * 4) * cactus.bounceAnim * 7;
    const wobble = Math.sin(cactus.wobbleTime) * 0.08;

    ctx.translate(cactus.x, cactus.y - bounce);
    ctx.rotate(wobble);

    // Blit pre-rendered 2x cactus sprite (0ms overhead)
    const cactusC = this._getCactusCanvas();
    ctx.drawImage(cactusC.canvas, -cactusC.w / 2, -cactusC.h + 25, cactusC.w, cactusC.h);

    ctx.restore();
  }

  // Draw Cartoon Puppy Wind Blower (Bluey & Bingo) & Swirling Breeze / Bubbles
  drawPuppyBlower(ctx, windEvent) {
    const isLeft = windEvent.side === 'left';
    const dir = isLeft ? 1 : -1;
    const slideOffset = (1.0 - (windEvent.inAnim || 1.0)) * (isLeft ? -190 : 190);
    const charX = windEvent.x + slideOffset;
    const charY = windEvent.y;
    const animTime = this.animTime || 0;

    // 1. Swirling Wind Speedlines & Air Stream
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.75)';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    const startX = charX + dir * (windEvent.hasWand ? 75 : 55);
    const startY = charY;

    for (let i = 0; i < 4; i++) {
      const offset = (i - 1.5) * 26;
      const progress = ((animTime * 2.2 + i * 0.28) % 1);
      const x1 = startX + dir * (progress * 260);
      const y1 = startY + offset + Math.sin(progress * 6) * 12;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(
        x1 + dir * 80,
        y1 - 18 + Math.cos(progress * 4) * 8,
        x1 + dir * 180,
        y1 + Math.sin(progress * 5) * 16
      );
      ctx.stroke();
    }

    // 2. Wind Gust Particles (Translucent Bubbles / Autumn Leaves / Sparkle Stars)
    for (const p of windEvent.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.translate(p.x, p.y);

      if (p.type === 'bubbles') {
        const r = p.size;
        ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.90)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-r * 0.38, -r * 0.38, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'leaves') {
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.rotate(p.rot);
        ctx.fillStyle = '#FDE047';
        ctx.strokeStyle = '#CA8A04';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let s = 0; s < 4; s++) {
          const a = (s * Math.PI) / 2;
          ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
          ctx.lineTo(Math.cos(a + Math.PI / 4) * (p.size * 0.35), Math.sin(a + Math.PI / 4) * (p.size * 0.35));
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();

    // 3. Draw Cartoon Puppy (Bluey / Bingo)
    this.drawCartoonPuppy(ctx, charX, charY, windEvent, animTime);
  }

  drawCartoonPuppy(ctx, x, y, we, animTime) {
    ctx.save();
    ctx.translate(x, y);
    const isLeft = we.side === 'left';
    ctx.scale(isLeft ? 1.25 : -1.25, 1.25);

    const isBluey = we.palette === 'bluey';
    const colors = isBluey
      ? {
          body: '#88C9FA',
          bodyDark: '#2C3E6B',
          outline: '#1E2433',
        }
      : {
          body: '#FB923C',
          bodyDark: '#C2410C',
          outline: '#1E2433',
        };

    ctx.lineWidth = 3.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = colors.outline;

    // Wagging Fluffy Tail (dynamic animation)
    const tailWag = Math.sin(animTime * 14) * 0.32;
    ctx.save();
    ctx.translate(-42, 34);
    ctx.rotate(-0.35 + tailWag);
    ctx.fillStyle = colors.bodyDark;
    ctx.beginPath();
    ctx.roundRect(-26, -9, 34, 18, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.roundRect(-10, -8, 18, 16, 8);
    ctx.fill();
    ctx.restore();

    // Blit pre-rendered 2x puppy sprite (0ms overhead)
    const puppy = this._getPuppyCanvas(isBluey, Boolean(we.isCloud), Boolean(we.hasWand));
    ctx.drawImage(puppy.canvas, -55, -80, 140, 200);

    // Dynamic Pursed Round Mouth (Blowing "O" Shape)
    ctx.fillStyle = '#1E2433';
    ctx.beginPath();
    const mouthOpen = 4.2 + Math.sin(animTime * 12) * 1.0;
    ctx.ellipse(49, 5, mouthOpen, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1E2433';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.restore();
  }
}
