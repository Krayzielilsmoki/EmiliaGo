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
    this.particles = [];
    this.floatingTexts = [];

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
    this.particles = [];
    this.floatingTexts = [];
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

    const nameStr = isBluey ? 'BLUEY' : 'BINGO';
    this.spawnFloatingText(
      (safeBounds.left + safeBounds.right) / 2,
      safeBounds.top + 80,
      side === 'left' ? `🐶 ${nameStr} BREEZE! 👉` : `👈 🐶 ${nameStr} BREEZE!`,
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
              this.spawnFloatingText(
                newBalloon.x,
                newBalloon.y + 40,
                `BONUS BALLOON! (${this.balloons.length} BALLOONS!) 🎈`,
                '#4ADE80'
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
            this.spawnFloatingText(b.x, b.y - 40, 'POP! 💥 NEW BALLOON!', '#FDE047');
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
            this.spawnFloatingText(b.x, safeBounds.bottom - 60, 'POP! 💥 NEW BALLOON!', '#FDE047');
          }
          const fresh = this.createBalloon(safeBounds, 0, true);
          this.balloons.push(fresh);
          this.spawnFloatingText(fresh.x, fresh.y + 45, 'NEW BALLOON! 🎈', '#7DD3FC');
        }
      }
    }

    // 6. Update Confetti & Rubber Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 7. Update Floating Callout Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 55 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  spawnFloorPopBurst(x, y, mainColor, highlightColor) {
    const colors = [mainColor, highlightColor, '#FFFFFF', '#FACC15', '#EF4444'];
    for (let i = 0; i < 16; i++) {
      if (this.particles.length >= 42) break;
      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.25;
      const speed = 150 + Math.random() * 230;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 90,
        r: 6 + Math.random() * 7,
        color: colors[i % colors.length],
        life: 0.6,
        maxLife: 0.6,
      });
    }
  }

  spawnHitEffect(x, y, color, colliderName, currentScore, isGold = false, isClutchSave = false) {
    const colors = isGold
      ? ['#FACC15', '#FFFBEB', '#FEF08A', '#F59E0B', '#FFFFFF']
      : [color, '#FACC15', '#38BDF8', '#4ADE80', '#F472B6', '#FFFFFF'];

    for (let i = 0; i < 12; i++) {
      if (this.particles.length >= 40) break;
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.3;
      const speed = 110 + Math.random() * 180;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        r: 5 + Math.random() * 6,
        color: colors[i % colors.length],
        life: 0.5 + Math.random() * 0.2,
        maxLife: 0.7,
      });
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
    this.floatingTexts.push({ x, y, text, color, life: 0.95, maxLife: 0.95 });
  }

  render(ctx) {
    // 1. Draw Cartoon Puppy Wind Blower (if active)
    if (this.windEvent) {
      this.drawPuppyBlower(ctx, this.windEvent);
    }

    // 2. Draw Waddling Cactus Hazard
    this.drawCactus(ctx, this.cactus);

    // 3. Draw Confetti & Rubber Pop Particles
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
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

      // Balloon string
      ctx.beginPath();
      ctx.moveTo(0, r * 1.12);
      for (let s = 1; s <= 4; s++) {
        const sy = r * 1.12 + s * (r * 0.28);
        const sx = Math.sin(b.stringPhase + s * 1.3) * 7;
        ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Balloon knot
      ctx.fillStyle = b.palette.main;
      ctx.strokeStyle = b.palette.rim;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-6, r * 1.12);
      ctx.lineTo(6, r * 1.12);
      ctx.lineTo(0, r * 1.0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Shiny Cartoon Balloon Body (Cel-shaded with crisp Disney/Bluey style - 0 GPU gradient overhead!)
      ctx.fillStyle = b.palette.main;
      ctx.strokeStyle = b.isGold ? '#FEF08A' : '#FFFFFF';
      ctx.lineWidth = b.isGold ? 4 : 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.94, r * 1.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Soft Cartoon Top Highlight Crescent
      ctx.fillStyle = b.palette.highlight;
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

    // 6. Draw Floating Callout Texts
    for (const ft of this.floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '900 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 5;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // Pure 2D canvas drawing - zero allocations, silky smooth 60fps
  drawBalloonFace(ctx, r, isHappy, isScared, vx, vy) {
    ctx.save();
    const faceY = -r * 0.12;

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

  // Draw Waddling Cartoon Potted Cactus Hazard
  drawCactus(ctx, cactus) {
    ctx.save();
    const bounce = Math.sin(cactus.bounceAnim * Math.PI * 4) * cactus.bounceAnim * 7;
    const wobble = Math.sin(cactus.wobbleTime) * 0.08;

    ctx.translate(cactus.x, cactus.y - bounce);
    ctx.rotate(wobble);

    // 1. Terracotta Plant Pot
    const potW = cactus.w;
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

    // 2. Green Cactus Body (Ribbed Saguaro)
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

    // Cartoon spines / prickles (fixed coordinates, 0 allocations)
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
          body: '#88C9FA', // Authentic Bluey Light Sky Blue
          bodyDark: '#2C3E6B', // Deep Navy Blue Eye Mask & Ear Outer
          belly: '#BAE6FD', // Pastel Belly / Cheek / Eyebrows
          muzzle: '#F4C978', // Warm Golden Yellow Tan
          nose: '#1E2433', // Dark Charcoal Nose
          eyebrows: '#BAE6FD',
          cheeks: '#F687B3', // Glowing soft pink blush
          wand: '#FB923C', // Bright orange bubble wand
          outline: '#1E2433', // Clean dark cartoon outline
        }
      : {
          body: '#FB923C', // Bingo Orange
          bodyDark: '#C2410C', // Deep reddish orange
          belly: '#FED7AA', // Soft apricot
          muzzle: '#FEF08A', // Warm yellow
          nose: '#1E2433',
          eyebrows: '#FED7AA',
          cheeks: '#F87171',
          wand: '#38BDF8',
          outline: '#1E2433',
        };

    // Soft Fluffy Cartoon Cloud under feet (if isCloud - 0 shadowBlur Gaussian overhead!)
    if (we.isCloud) {
      // Soft light-blue cartoon cloud base
      ctx.fillStyle = 'rgba(186, 230, 253, 0.70)';
      ctx.beginPath();
      ctx.arc(-15, 82, 26, 0, Math.PI * 2);
      ctx.arc(12, 78, 30, 0, Math.PI * 2);
      ctx.arc(42, 84, 22, 0, Math.PI * 2);
      ctx.arc(-38, 86, 20, 0, Math.PI * 2);
      ctx.fill();

      // Fluffy crisp white cloud puffs
      ctx.fillStyle = '#FFFFFF';
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

    // Wagging Fluffy Tail
    const tailWag = Math.sin(animTime * 14) * 0.32;
    ctx.save();
    ctx.translate(-42, 34);
    ctx.rotate(-0.35 + tailWag);
    // Dark Navy Outer/Tip
    ctx.fillStyle = colors.bodyDark;
    ctx.beginPath();
    ctx.roundRect(-26, -9, 34, 18, 9);
    ctx.fill();
    ctx.stroke();
    // Light Blue Base
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.roundRect(-10, -8, 18, 16, 8);
    ctx.fill();
    ctx.restore();

    // Rectangular Legs & Paws (Standing upright on two legs with 3 cute rounded toes!)
    if (!we.isCloud) {
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

    // Iconic Bluey Rectangular Body & Head (One unified cuboid silhouette!)
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.roundRect(-38, -32, 68, 98, [18, 22, 14, 14]);
    ctx.fill();
    ctx.stroke();

    // Oval Light Blue Belly Patch
    ctx.fillStyle = colors.belly;
    ctx.beginPath();
    ctx.roundRect(-16, -6, 44, 66, [18, 18, 14, 14]);
    ctx.fill();

    // Dark Navy Spot on Back/Flank
    ctx.fillStyle = colors.bodyDark;
    ctx.beginPath();
    ctx.ellipse(-32, 16, 9, 14, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Tall Pointed Cattle Dog Ears
    // Left Ear (Back)
    ctx.save();
    ctx.translate(-14, -40);
    ctx.rotate(-0.10 + Math.sin(animTime * 6) * 0.04);
    ctx.fillStyle = colors.bodyDark;
    ctx.beginPath();
    ctx.moveTo(-11, 16);
    ctx.lineTo(2, -38);
    ctx.lineTo(18, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Inner tan ear
    ctx.fillStyle = colors.muzzle;
    ctx.beginPath();
    ctx.moveTo(-5, 14);
    ctx.lineTo(2, -26);
    ctx.lineTo(11, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right Ear (Front)
    ctx.save();
    ctx.translate(16, -40);
    ctx.rotate(0.12 + Math.sin(animTime * 6 + 1) * 0.04);
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

    // Navy Eye Patch Mask (Classic Bluey face marking!)
    ctx.fillStyle = colors.bodyDark;
    ctx.beginPath();
    ctx.roundRect(-14, -38, 44, 30, [14, 18, 6, 6]);
    ctx.fill();

    // Light Floating Pill Eyebrows
    ctx.fillStyle = colors.eyebrows;
    ctx.beginPath();
    ctx.roundRect(-3, -42, 14, 6, 3);
    ctx.roundRect(17, -42, 14, 6, 3);
    ctx.fill();

    // Large Expressive Oval Eyes (Just like the reference image!)
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

    // Black Pupils looking gently forward toward the wand/bubbles!
    ctx.fillStyle = '#1E2433';
    ctx.beginPath();
    ctx.ellipse(7.5, -23, 4.2, 5.8, 0, 0, Math.PI * 2);
    ctx.ellipse(24.5, -23, 4.2, 5.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // White Catchlights
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(6.5, -25, 1.8, 0, Math.PI * 2);
    ctx.arc(23.5, -25, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Moderate Light-Blue Puffed Cheek (Natural & faithful to reference image!)
    const cheekExpand = 14 + Math.sin(animTime * 10) * 1.2;
    ctx.fillStyle = colors.belly;
    ctx.beginPath();
    ctx.arc(8, 6, cheekExpand, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3.0;
    ctx.stroke();

    // Glowing Soft Pink Blush on Cheek
    ctx.fillStyle = colors.cheeks;
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.ellipse(10, 6, 8.5, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Golden-Tan Muzzle / Snout (Drawn cleanly on top!)
    ctx.fillStyle = colors.muzzle;
    ctx.beginPath();
    ctx.roundRect(14, -13, 38, 29, [14, 16, 16, 14]);
    ctx.fill();
    ctx.stroke();

    // Big Black Button Nose with Crescent Highlight
    ctx.fillStyle = colors.nose;
    ctx.beginPath();
    ctx.roundRect(42, -15, 15, 13, 6.5);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(46, -12, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Pursed Round Mouth (Blowing "O" Shape)
    ctx.fillStyle = '#1E2433';
    ctx.beginPath();
    const mouthOpen = 4.2 + Math.sin(animTime * 12) * 1.0;
    ctx.ellipse(49, 5, mouthOpen, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1E2433';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Front Paw Holding Orange Bubble Wand (Straight from the reference photo!)
    if (we.hasWand) {
      ctx.strokeStyle = colors.wand;
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(34, 38);
      ctx.lineTo(58, 4);
      ctx.stroke();

      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.arc(62, 2, 9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(62, 2, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.belly;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.roundRect(30, 24, 16, 16, 8);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = colors.belly;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.roundRect(14, 28, 16, 14, 7);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}
