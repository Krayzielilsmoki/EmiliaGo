// Game 2: Silly Hat Stacker for EmiliaGO! (1P & 2P Support)
// Stack 5 hats to have the Friendly Bird chirp & carry them away and upgrade your Chest Badges (Bronze->Silver->Gold->Bottom Diamond)!
// Watch out for the Cheeky Monkey peeking & swinging in with monkey chatter!
import { sound } from './sound.js';
import { settings } from './settings.js';
import { ParticlePool, FloatingTextPool } from './particlePool.js';

const HAT_TYPES = [
  { id: 'crown', name: 'Princess Crown', maskName: "Jack-O'-Lantern Mask", height: 42, color: '#FACC15', maskColor: '#F97316' },
  { id: 'sheriff', name: 'Sheriff Labrador Cap', maskName: 'Frankenstein Mask', height: 44, color: '#1E3A8A', maskColor: '#4ADE80' },
  { id: 'fire', name: 'Paw Patrol Fire Helmet', maskName: 'Dracula Vampire Mask', height: 44, color: '#EF4444', maskColor: '#A855F7' },
  { id: 'party', name: 'Birthday Party Hat', maskName: 'Spooky Black Cat Mask', height: 52, color: '#EC4899', maskColor: '#38BDF8' },
  { id: 'chef', name: 'Puffy Chef Hat', maskName: 'Glowing Skull Mask', height: 48, color: '#F8FAFC', maskColor: '#F8FAFC' },
  { id: 'wizard', name: 'Magic Wizard Hat', maskName: 'Wicked Witch Mask', height: 54, color: '#7C3AED', maskColor: '#84CC16' },
];

const HATS_PER_LEVEL = 5;

export class HatStackerGame {
  constructor() {
    this.fallingHats = [];
    this.stackedHats = [];
    this.tumblingHats = [];
    this.particlePool = new ParticlePool(48);
    this.textPool = new FloatingTextPool(16);
    this._hatCanvases = {};

    this.score = 0;
    this.bestScore = settings.data.bestHatStack || 0;
    this.spawnTimer = 0;
    this.swayPhase = 0;
    this.lastHeadX = 640;
    this.headTilt = 0;

    // Friendly Bird that swoops in with a cheerful chirping song to collect a completed 5-hat tower!
    this.bird = null;

    // Cheeky Monkey that peeks in from one side, then swings in to grab hats!
    this.monkey = null;
    this.monkeyCooldown = 11.0;

    // Callback when a 5-hat tower is completed (awards/upgrades Chest Badge & Bottom Diamond!)
    this.onLevelComplete = null;
    this.onMilestone = null;
  }

  reset() {
    this.fallingHats = [];
    this.stackedHats = [];
    this.tumblingHats = [];
    this.particlePool.clear();
    this.textPool.clear();
    this.bird = null;
    this.monkey = null;
    this.monkeyCooldown = 11.0;
    this.score = 0;
    this.spawnTimer = 0.5;
  }

  spawnFallingHat(safeBounds) {
    const template = HAT_TYPES[Math.floor(Math.random() * HAT_TYPES.length)];
    const margin = 90;
    const x =
      safeBounds.left +
      margin +
      Math.random() * Math.max(80, safeBounds.width - margin * 2);

    this.fallingHats.push({
      ...template,
      x,
      y: safeBounds.top + 30,
      vx: (Math.random() - 0.5) * 40,
      vy: 85 + Math.random() * 35,
      swayOffset: Math.random() * Math.PI * 2,
      scale: 1.0,
      bopCooldown: 0,
    });
  }

  startBirdDelivery(safeBounds, targetX, targetY) {
    this.bird = {
      x: safeBounds.left - 80,
      y: safeBounds.top + 70,
      targetX,
      targetY,
      phase: 'swooping_in',
      carriedHats: [],
      wingPhase: 0,
      facingDir: 1,
    };
    sound.playBirdChirp();
    const isHw = Boolean(settings.data.halloweenTheme);
    this.spawnFloatingText(
      targetX,
      targetY - 50,
      isHw ? '5 MASKS! BIRD DELIVERY! 🐦🎃' : '5 HATS! BIRD DELIVERY! 🐦🎵',
      '#FACC15'
    );
  }

  spawnMonkey(safeBounds) {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    this.monkey = {
      side,
      state: 'peeking', // 'peeking' (2.4s warning) -> 'swinging' (3.0s reach) -> 'leaving'
      timer: 2.4,
      swingAngle: 0,
      pivotX:
        side === 'left'
          ? safeBounds.left + safeBounds.width * 0.22
          : safeBounds.right - safeBounds.width * 0.22,
      pivotY: safeBounds.top - 20,
      ropeLen: Math.min(340, safeBounds.height * 0.52),
      x: side === 'left' ? safeBounds.left + 36 : safeBounds.right - 36,
      y: safeBounds.top + safeBounds.height * 0.38,
      stoleHats: false,
    };
    // Play playful monkey chatter sound when monkey appears!
    sound.playMonkeySound();
  }

  getHeadCrown(pObj) {
    if (!pObj) return null;
    const lms = pObj.landmarks;
    let lEye = null;
    let rEye = null;
    if (lms) {
      for (const idx of [2, 1, 3]) {
        if (lms[idx] && (lms[idx].visibility === undefined || lms[idx].visibility > 0.15)) {
          lEye = lms[idx];
          break;
        }
      }
      for (const idx of [5, 4, 6]) {
        if (lms[idx] && (lms[idx].visibility === undefined || lms[idx].visibility > 0.15)) {
          rEye = lms[idx];
          break;
        }
      }
    }
    if (lEye && rEye) {
      const eyeSpan = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y);
      const eyeCenterX = (lEye.x + rEye.x) * 0.5;
      const eyeCenterY = (lEye.y + rEye.y) * 0.5;
      const headAngle = Math.atan2(rEye.y - lEye.y, rEye.x - lEye.x);
      const upX = Math.sin(headAngle);
      const upY = -Math.cos(headAngle);
      // Eye span * 2.10 places the base right at the crown/hairline of the head, well above eyes!
      const crownDist = eyeSpan * 2.10;
      const r = pObj.colliders && pObj.colliders.head ? pObj.colliders.head.r : eyeSpan * 1.1;
      return {
        x: eyeCenterX + upX * crownDist,
        y: eyeCenterY + upY * crownDist,
        r,
        tilt: headAngle,
      };
    }
    if (pObj.colliders && pObj.colliders.head && pObj.colliders.head.visibility > 0.25) {
      const h = pObj.colliders.head;
      return {
        x: h.x,
        y: h.y - h.r * 0.95, // Top crown of head, clear of forehead and eyes
        r: h.r,
        tilt: 0,
      };
    }
    return null;
  }

  update(dt, safeBounds, player, pointer, onMilestone) {
    this.safeBounds = safeBounds;
    this.swayPhase += dt * 3.2;
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0 && this.fallingHats.length < 2 && !this.bird) {
      this.spawnFallingHat(safeBounds);
      this.spawnTimer = 2.3;
    }

    const activePlayers =
      player && player.allPlayers && player.allPlayers.length > 0
        ? player.allPlayers
        : player && player.detected
        ? [player]
        : [];

    // Determine primary Head anchor (plus all player head anchors for 2P catching!)
    const headAnchors = [];
    for (const pObj of activePlayers) {
      const crown = this.getHeadCrown(pObj);
      if (crown) {
        headAnchors.push({
          x: crown.x,
          y: crown.y,
          r: crown.r * 1.15,
          tilt: crown.tilt,
        });
      }
    }
    if (headAnchors.length === 0 && pointer && pointer.active) {
      headAnchors.push({ x: pointer.x, y: pointer.y - 45, r: 58, tilt: 0 });
    }

    const headAnchor = headAnchors[0] || null;

    if (headAnchor) {
      const dx = headAnchor.x - this.lastHeadX;
      this.lastHeadX = headAnchor.x;
      const targetTilt = Math.max(-0.28, Math.min(0.28, dx * 0.008));
      const combinedTilt = Math.max(-0.35, Math.min(0.35, (headAnchor.tilt || 0) * 0.75 + targetTilt));
      this.headTilt = this.headTilt * 0.85 + combinedTilt * 0.15;
    }

    // Compute the top of the current hat stack
    let stackTopX = headAnchor ? headAnchor.x : (safeBounds.left + safeBounds.right) / 2;
    let stackTopY = headAnchor ? headAnchor.y : safeBounds.bottom - 200;
    for (const sh of this.stackedHats) {
      stackTopY -= sh.height * 0.72;
    }
    stackTopY = Math.max(safeBounds.top + 95, stackTopY);

    // Update Friendly Bird Delivery animation
    if (this.bird) {
      this.bird.wingPhase += dt * 16;
      if (this.bird.phase === 'swooping_in') {
        if (headAnchor) {
          this.bird.targetX = headAnchor.x;
          this.bird.targetY = Math.max(safeBounds.top + 90, stackTopY);
        }
        const dx = this.bird.targetX - this.bird.x;
        const dy = this.bird.targetY - this.bird.y;
        const dist = Math.hypot(dx, dy);
        const speed = 580;
        this.bird.facingDir = dx >= 0 ? 1 : -1;
        if (dist < 45) {
          this.bird.carriedHats = [...this.stackedHats];
          this.stackedHats = [];
          this.bird.phase = 'carrying_away';
          this.bird.facingDir = 1; // Always face forward toward flight exit
          this.spawnParticles(this.bird.x, this.bird.y, '#FACC15');
          sound.playBirdChirp();
          sound.playFanfare();
          if (this.onLevelComplete) {
            const badge = this.onLevelComplete();
            if (badge) {
              this.spawnFloatingText(
                this.bird.x,
                this.bird.y - 30,
                `${badge.icon} ${badge.name}!`,
                badge.color || '#FACC15'
              );
            }
          }
        } else {
          this.bird.x += (dx / dist) * speed * dt;
          this.bird.y += (dy / dist) * speed * dt;
        }
      } else {
        this.bird.facingDir = 1; // Keep facing forward while carrying away
        this.bird.x += 480 * dt;
        this.bird.y -= 140 * dt;
        if (this.bird.x > safeBounds.right + 140) {
          this.bird = null;
        }
      }
    }

    // Update Cheeky Monkey Hazard
    if (!this.monkey && !this.bird && this.stackedHats.length >= 1) {
      this.monkeyCooldown -= dt;
      if (this.monkeyCooldown <= 0) {
        this.spawnMonkey(safeBounds);
        this.monkeyCooldown = 14 + Math.random() * 5;
      }
    }

    if (this.monkey) {
      this.monkey.timer -= dt;
      if (this.monkey.state === 'peeking') {
        const screenW = (safeBounds.left * 2 + safeBounds.width) || 1280;
        this.monkey.bezelX = this.monkey.side === 'left' ? 0 : screenW;
        this.monkey.y = safeBounds.top + safeBounds.height * 0.36;
        this.monkey.x = this.monkey.side === 'left' ? 38 : screenW - 38;
        if (this.monkey.timer <= 0) {
          this.monkey.state = 'swinging';
          this.monkey.timer = 3.2;
          this.monkey.swingAngle = 0;
          sound.playMonkeySound();
        }
      } else if (this.monkey.state === 'swinging') {
        this.monkey.swingAngle += dt * 3.4;
        const maxSwing = 0.65;
        const ang = Math.sin(this.monkey.swingAngle) * maxSwing;
        this.monkey.x = this.monkey.pivotX + Math.sin(ang) * this.monkey.ropeLen;
        this.monkey.y = this.monkey.pivotY + Math.cos(ang) * this.monkey.ropeLen;

        if (!this.monkey.stoleHats && headAnchor && this.stackedHats.length > 0) {
          const dist = Math.hypot(
            this.monkey.x - headAnchor.x,
            this.monkey.y - (headAnchor.y - 40)
          );
          if (dist < headAnchor.r + 75) {
            this.monkey.stoleHats = true;
            for (let k = 0; k < this.stackedHats.length; k++) {
              const sh = this.stackedHats[k];
              this.tumblingHats.push({
                ...sh,
                x: headAnchor.x + (Math.random() - 0.5) * 40,
                y: headAnchor.y - k * 30,
                vx: (Math.random() - 0.5) * 260,
                vy: -180 - Math.random() * 120,
                angle: 0,
                va: (Math.random() - 0.5) * 8,
              });
            }
            this.stackedHats = [];
            sound.playFloorDrop(false);
            sound.playFailClip(false);
            const isHw = Boolean(settings.data.halloweenTheme);
            this.spawnFloatingText(
              headAnchor.x,
              headAnchor.y - 60,
              isHw ? 'OH NO! MONKEY KNOCKED THE MASKS! 🐒' : 'OH NO! MONKEY KNOCKED THE HATS! 🐒',
              '#FB7185'
            );
          }
        }

        if (this.monkey.timer <= 0) {
          if (!this.monkey.stoleHats && this.stackedHats.length > 0) {
            this.spawnFloatingText(
              stackTopX,
              stackTopY - 30,
              'SAFE FROM MONKEY! GREAT DODGE! 🌟',
              '#4ADE80'
            );
          }
          this.monkey = null;
        }
      }
    }

    // Update tumbling hats knocked off by monkey
    for (let i = this.tumblingHats.length - 1; i >= 0; i--) {
      const th = this.tumblingHats[i];
      th.x += th.vx * dt;
      th.y += th.vy * dt;
      th.vy += 480 * dt;
      th.angle += th.va * dt;
      if (th.y > safeBounds.bottom + 100) {
        this.tumblingHats.splice(i, 1);
      }
    }

    // Update falling hats
    for (let i = this.fallingHats.length - 1; i >= 0; i--) {
      const hat = this.fallingHats[i];
      if (hat.bopCooldown > 0) hat.bopCooldown -= dt;

      hat.x += (hat.vx + Math.sin(this.swayPhase + hat.swayOffset) * 35) * dt;
      hat.y += hat.vy * dt;
      hat.vy = Math.min(135, hat.vy + 45 * dt);

      if (hat.x < safeBounds.left + 60) {
        hat.x = safeBounds.left + 60;
        hat.vx = Math.abs(hat.vx);
      } else if (hat.x > safeBounds.right - 60) {
        hat.x = safeBounds.right - 60;
        hat.vx = -Math.abs(hat.vx);
      }

      // 1. Check if caught on Head or Top of Hat Stack (supports P1 or P2 head!)
      let caught = false;
      if (headAnchors.length > 0 && !this.bird) {
        const catchRadius = (headAnchor ? headAnchor.r : 58) * 1.25;
        const distToTop = Math.hypot(hat.x - stackTopX, hat.y - stackTopY);
        if (distToTop < catchRadius) {
          caught = true;
        } else {
          for (const ha of headAnchors) {
            if (Math.hypot(hat.x - ha.x, hat.y - ha.y) < ha.r * 1.25) {
              caught = true;
              break;
            }
          }
        }
      }

      if (caught) {
        this.stackedHats.push({
          id: hat.id,
          name: hat.name,
          height: hat.height,
          color: hat.color,
          squash: 1.0,
        });
        this.fallingHats.splice(i, 1);

        this.score++;
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          settings.data.bestHatStack = this.bestScore;
          settings.save();
        }

        sound.playHatCatch(this.stackedHats.length);
        const isHw = Boolean(settings.data.halloweenTheme);
        const displayColor = isHw && hat.maskColor ? hat.maskColor : hat.color;
        const displayName = isHw && hat.maskName ? hat.maskName : hat.name;
        this.spawnParticles(stackTopX, stackTopY, displayColor);
        this.spawnFloatingText(
          stackTopX,
          stackTopY - 40,
          `${displayName.toUpperCase()}! (${this.stackedHats.length}/${HATS_PER_LEVEL}) ${isHw ? '🎭' : '🎩'}`,
          '#FEF08A'
        );

        if (this.stackedHats.length >= HATS_PER_LEVEL) {
          this.startBirdDelivery(safeBounds, stackTopX, stackTopY);
        }

        const everyN = settings.data.soundboardEveryN || 10;
        const milestoneCb = onMilestone || this.onMilestone;
        if (this.score > 0 && this.score % everyN === 0 && milestoneCb) {
          milestoneCb(this.score);
        }
        continue;
      }

      // 2. Allow either player to swat/bounce a falling hat UP with their hands!
      if (hat.bopCooldown <= 0 && activePlayers.length > 0) {
        let bounced = false;
        for (const pObj of activePlayers) {
          if (!pObj.colliders) continue;
          for (const hk of ['leftHand', 'rightHand']) {
            const hand = pObj.colliders[hk];
            if (hand && hand.visibility > 0.3) {
              const d = Math.hypot(hat.x - hand.x, hat.y - hand.y);
              if (d < hand.r + 38) {
                hat.vy = -190;
                hat.vx = (hat.x - hand.x) * 2.2;
                hat.bopCooldown = 0.35;
                sound.playBalloonHit(1);
                this.spawnFloatingText(hat.x, hat.y - 25, 'HAND BOUNCE! ✋', '#7DD3FC');
                bounced = true;
                break;
              }
            }
          }
          if (bounced) break;
        }
      }

      if (hat.y > safeBounds.bottom + 40) {
        this.fallingHats.splice(i, 1);
      }
    }

    for (const sh of this.stackedHats) {
      if (sh.squash > 0) {
        sh.squash = Math.max(0, sh.squash - dt * 3.5);
      }
    }

    // Update zero-allocation pools
    this.particlePool.update(dt);
    this.textPool.update(dt);
  }

  spawnParticles(x, y, color) {
    const palette = [color, '#FACC15', '#38BDF8', '#4ADE80', '#FFFFFF'];
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      const spd = 100 + Math.random() * 160;
      this.particlePool.spawn(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd - 50,
        5 + Math.random() * 5,
        palette[i % palette.length],
        0.6,
        'circle',
        300
      );
    }
  }

  spawnFloatingText(x, y, text, color = '#FFFFFF') {
    this.textPool.spawn(x, y, text, color, 1.1, -50);
  }

  render(ctx, player, pointer, safeBounds) {
    const sb = safeBounds || this.safeBounds || { left: 40, right: 1240, top: 40, bottom: 680, width: 1200, height: 640 };
    for (const hat of this.fallingHats) {
      const wobble = Math.sin(this.swayPhase + hat.swayOffset) * 0.14;
      this.drawHatGraphic(ctx, hat.id, hat.x, hat.y, 1.05, wobble);
    }

    for (const th of this.tumblingHats) {
      this.drawHatGraphic(ctx, th.id, th.x, th.y, 1.0, th.angle);
    }

    let baseHead = null;
    if (player && player.detected) {
      baseHead = this.getHeadCrown(player);
    }
    if (!baseHead && pointer && pointer.active) {
      baseHead = { x: pointer.x, y: pointer.y - 45, r: 52 };
    }

    if (baseHead && this.stackedHats.length > 0) {
      let currX = baseHead.x;
      let currY = baseHead.y;
      const hatScale = Math.max(0.85, Math.min(1.35, baseHead.r / 54));

      for (let idx = 0; idx < this.stackedHats.length; idx++) {
        const sh = this.stackedHats[idx];
        const wobbleAmp = idx * 4.6;
        const swayX = Math.sin(this.swayPhase * 2.2 - idx * 0.6) * wobbleAmp;
        const angle = this.headTilt * (1 + idx * 0.22) + Math.cos(this.swayPhase * 2.2 - idx * 0.6) * (idx * 0.038);
        const squashVal = Math.sin(sh.squash * Math.PI);
        const scaleX = hatScale * (1 + squashVal * 0.32);
        const scaleY = hatScale * (1 - squashVal * 0.24);

        this.drawHatGraphic(
          ctx,
          sh.id,
          currX + swayX,
          currY,
          scaleX,
          scaleY,
          angle
        );
        currY -= sh.height * 0.72 * hatScale;
      }
    }

    if (this.bird) {
      this.drawBird(ctx, this.bird);
    }

    if (this.monkey) {
      this.drawMonkey(ctx, this.monkey, sb);
    }

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
      ctx.font = '900 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 6;
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

  drawBird(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);

    // If carrying stacked hats, render them hanging neatly below his talons
    if (b.carriedHats && b.carriedHats.length > 0) {
      let hy = 36;
      for (let i = 0; i < b.carriedHats.length; i++) {
        this.drawHatGraphic(
          ctx,
          b.carriedHats[i].id,
          0,
          hy,
          0.85,
          Math.sin(b.wingPhase * 0.3 + i) * 0.08
        );
        hy += b.carriedHats[i].height * 0.62;
      }
    }

    // Direction of flight: face in movement direction (never backwards!)
    const dir = b.facingDir !== undefined ? b.facingDir : (b.phase === 'carrying_away' ? 1 : (b.targetX >= b.x ? 1 : -1));
    ctx.scale(dir, 1);

    if (b.phase === 'carrying_away') {
      ctx.rotate(-0.10); // Gentle forward climb angle
    }

    const wingFlap = Math.sin(b.wingPhase) * 16;

    // 1. Perky Tail Feathers behind
    ctx.fillStyle = '#0284C7';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-24, 4);
    ctx.quadraticCurveTo(-46, -10, -38, -2);
    ctx.quadraticCurveTo(-48, 8, -36, 12);
    ctx.quadraticCurveTo(-42, 20, -22, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Far Wing (behind body)
    ctx.save();
    ctx.fillStyle = '#0284C7';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.quadraticCurveTo(-22, -36 - wingFlap, 6, -30 - wingFlap);
    ctx.quadraticCurveTo(16, -16, 8, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Plump Chubby Bird Body
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 4, 30, 22, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fluffy White/Cream Belly Patch
    ctx.fillStyle = '#E0F2FE';
    ctx.beginPath();
    ctx.ellipse(6, 9, 18, 14, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 4. Head & Crest
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(16, -10, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cute feathered crest on top of head
    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.moveTo(10, -26);
    ctx.quadraticCurveTo(8, -36, 18, -32);
    ctx.quadraticCurveTo(24, -38, 22, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Near Wing (in front of body)
    ctx.fillStyle = '#7DD3FC';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(-22, -32 + wingFlap, 10, -26 + wingFlap);
    ctx.quadraticCurveTo(18, -12, 10, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing feather accents
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-8, -12 + wingFlap * 0.5);
    ctx.lineTo(2, -18 + wingFlap * 0.5);
    ctx.stroke();

    // 6. Cute Golden Beak
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(28, -14);
    ctx.quadraticCurveTo(44, -10, 45, -8);
    ctx.quadraticCurveTo(40, -4, 28, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Beak smile line
    ctx.beginPath();
    ctx.moveTo(30, -9);
    ctx.lineTo(40, -8);
    ctx.stroke();

    // 7. Big Cartoon Eye with Sparkles
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(20, -12, 6.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pupil looking forward/down
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(22, -12, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Catchlight sparkles
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(23.5, -14, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20.5, -10, 1.0, 0, Math.PI * 2); ctx.fill();

    // Cheerful raised eyebrow
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(20, -18, 5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Rosy Pink Cheek
    ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
    ctx.beginPath();
    ctx.arc(14, -4, 5, 0, Math.PI * 2);
    ctx.fill();

    // 8. Little Golden Talons / Feet (carrying hats)
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    [-4, 8].forEach((fx) => {
      ctx.beginPath();
      ctx.moveTo(fx, 24);
      ctx.lineTo(fx - 4, 34);
      ctx.moveTo(fx, 24);
      ctx.lineTo(fx, 36);
      ctx.moveTo(fx, 24);
      ctx.lineTo(fx + 4, 34);
      ctx.stroke();
    });

    ctx.restore();
  }

  drawMonkey(ctx, m, safeBounds) {
    const isLeft = m.side === 'left';
    const sb = safeBounds || this.safeBounds || { left: 40, right: 1240, top: 40, bottom: 680, width: 1200, height: 640 };

    // ----------------------------------------------------
    // PHASE 1: PEEKING & GIGGLING WARNING (Heads-Up from screen bezel)
    // ----------------------------------------------------
    if (m.state === 'peeking') {
      ctx.save();
      const screenW = ctx.canvas ? ctx.canvas.width : 1280;
      const frameX = isLeft ? 0 : screenW;
      const peekY = m.y + Math.sin(this.swayPhase * 4.5) * 6;
      const leanX = Math.sin(this.swayPhase * 3) * 5;
      const earWiggle = Math.sin(this.swayPhase * 6) * 0.06;
      const mouthGiggle = Math.abs(Math.sin(this.swayPhase * 7));

      ctx.translate(frameX, peekY);
      if (!isLeft) ctx.scale(-1, 1);

      // 1. Furry Arms reaching out from behind the bezel line (x = 0)
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      // Upper arm
      ctx.beginPath(); ctx.moveTo(14, -8); ctx.quadraticCurveTo(4, -26, -4, -38); ctx.stroke();
      // Lower arm
      ctx.beginPath(); ctx.moveTo(14, 14);  ctx.quadraticCurveTo(4, 28, -4, 38);  ctx.stroke();

      // Arm Outlines
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(18, -16); ctx.quadraticCurveTo(8, -32, -4, -44); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, -1);   ctx.quadraticCurveTo(0, -20, -4, -32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, 7);    ctx.quadraticCurveTo(0, 20, -4, 32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(18, 22);  ctx.quadraticCurveTo(8, 36, -4, 44); ctx.stroke();

      // Torso & Shoulder curving out
      ctx.fillStyle = '#78350F';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(10 + leanX * 0.4, 2, 20, 36, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Light tummy / chest patch
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.ellipse(15 + leanX * 0.4, 4, 11, 22, 0.12, 0, Math.PI * 2);
      ctx.fill();

      // 2. Head & Ears (Centered at headX, headY)
      const headX = 36 + leanX;
      const headY = -2;
      const headR = 32;

      // TWO ICONIC ROUND MONKEY EARS (Horizontally at 9 & 3 o'clock on sides of head!)
      // Left Ear (near bezel)
      ctx.save();
      ctx.translate(headX - 31, headY + 5);
      ctx.rotate(-earWiggle);
      ctx.fillStyle = '#78350F';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath(); ctx.arc(2, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(1, 0, 4.5, -Math.PI * 0.6, Math.PI * 0.6); ctx.stroke();
      ctx.restore();

      // Right Ear (facing room / hats)
      ctx.save();
      ctx.translate(headX + 31, headY + 5);
      ctx.rotate(earWiggle);
      ctx.fillStyle = '#78350F';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath(); ctx.arc(-2, 0, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(-1, 0, 5, Math.PI * 0.4, Math.PI * 1.6); ctx.stroke();
      ctx.restore();

      // Head Circle
      ctx.fillStyle = '#78350F';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(headX, headY, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hair Tuft on top of head
      ctx.fillStyle = '#78350F';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(headX - 7, headY - headR + 2);
      ctx.quadraticCurveTo(headX - 10, headY - headR - 14, headX - 1, headY - headR - 11);
      ctx.quadraticCurveTo(headX + 8, headY - headR - 16, headX + 6, headY - headR + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Peach Face Mask around eyes
      ctx.fillStyle = '#FEF08A';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(headX - 11, headY - 7, 14, 0, Math.PI * 2);
      ctx.arc(headX + 11, headY - 7, 14, 0, Math.PI * 2);
      ctx.fill();

      // Peach Muzzle
      ctx.beginPath();
      ctx.ellipse(headX, headY + 12, 23, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Nostrils
      ctx.fillStyle = '#78350F';
      ctx.beginPath(); ctx.arc(headX - 5, headY + 7, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(headX + 5, headY + 7, 2.5, 0, Math.PI * 2); ctx.fill();

      // Laughing Mouth with Pink Tongue
      const mouthOpen = 5 + mouthGiggle * 5;
      ctx.fillStyle = '#991B1B';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(headX, headY + 16, 12, mouthOpen, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FB7185';
      ctx.beginPath();
      ctx.arc(headX, headY + 16 + mouthOpen * 0.4, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(headX - 3.5, headY + 14, 7, 3.5, 1.5);
      ctx.fill();

      // Rosy Blushing Cheeks
      ctx.fillStyle = 'rgba(244, 114, 182, 0.6)';
      ctx.beginPath(); ctx.arc(headX - 16, headY + 11, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(headX + 16, headY + 11, 6.5, 0, Math.PI * 2); ctx.fill();

      // Big Cartoon Eyes looking toward hats
      const drawEye = (ex, ey) => {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#451A03';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 8, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(ex + 2.5, ey, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(ex + 4, ey - 2.5, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + 1.5, ey + 2, 1, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#451A03';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ex, ey - 14, 7, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      };
      drawEye(headX - 10, headY - 7);
      drawEye(headX + 10, headY - 7);

      // 3. Hands wrapping around the screen bezel edge (x = 0)
      const drawBezelGripHand = (pawY, isUpper) => {
        ctx.save();
        ctx.fillStyle = '#78350F';
        ctx.strokeStyle = '#451A03';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-14, pawY - 14, 16, 28, [8, 0, 0, 8]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FEF08A';
        ctx.strokeStyle = '#451A03';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-2, pawY - 13, 8, 26, 4);
        ctx.fill();
        ctx.stroke();

        const fingerOffsets = [-10, -3.5, 3.5, 10];
        fingerOffsets.forEach((fy) => {
          ctx.fillStyle = '#FEF08A';
          ctx.strokeStyle = '#451A03';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(0, pawY + fy - 3, 12, 6.5, 3.25);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#B45309';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(9, pawY + fy, 2, -Math.PI * 0.4, Math.PI * 0.4);
          ctx.stroke();
        });

        const thumbY = isUpper ? pawY + 12 : pawY - 16;
        ctx.fillStyle = '#FEF08A';
        ctx.strokeStyle = '#451A03';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(0, thumbY, 9, 6, 3);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };

      drawBezelGripHand(-38, true);
      drawBezelGripHand(38, false);

      ctx.restore();

      // Top HUD Alert Banner (cleanly out of the way, not covering monkey!)
      ctx.save();
      const hudCX = (sb.left + sb.right) / 2;
      const hudY = sb.top + 28;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(hudCX - 190, hudY - 18, 380, 36, 18);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FEF08A';
      ctx.fillText('🐵 TEE-HEE! HEADS UP! MONKEY IS COMING! 👀', hudCX, hudY);
      ctx.restore();
      return;
    }

    // ----------------------------------------------------
    // PHASE 2: FULL BODY MONKEY SWINGING ON JUNGLE VINE
    // ----------------------------------------------------
    ctx.save();

    // 1. Leafy Jungle Vine
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(m.pivotX, m.pivotY);
    ctx.quadraticCurveTo(
      (m.pivotX + m.x) / 2 + Math.sin(this.swayPhase * 3) * 18,
      (m.pivotY + m.y) / 2,
      m.x,
      m.y - 32
    );
    ctx.stroke();

    // Vine leaves
    [0.30, 0.65].forEach((t) => {
      const lx = m.pivotX + (m.x - m.pivotX) * t;
      const ly = m.pivotY + (m.y - m.pivotY) * t;
      ctx.fillStyle = '#4ADE80';
      ctx.beginPath();
      ctx.ellipse(lx + 10, ly, 9, 4.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Full Body Monkey
    ctx.translate(m.x, m.y);
    const swingAng = Math.sin(m.swingAngle || 0) * 0.45;
    ctx.rotate(swingAng);
    if (!isLeft) ctx.scale(-1, 1);

    // Long Curled Wagging Tail
    const tailWag = Math.sin(this.swayPhase * 6) * 12;
    ctx.strokeStyle = '#854D0E';
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.bezierCurveTo(-38, 15, -48, -25, -28 + tailWag, -38);
    ctx.stroke();

    // Hanging Arm holding vine
    ctx.strokeStyle = '#854D0E';
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.lineTo(0, -34);
    ctx.stroke();
    // Paw on vine
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath(); ctx.arc(0, -34, 6.5, 0, Math.PI * 2); ctx.fill();

    // Chubby Monkey Body
    ctx.fillStyle = '#854D0E';
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, 5, 22, 28, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cream Tummy Patch
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.ellipse(4, 7, 13, 17, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = '#854D0E';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(-8, 26);
    ctx.lineTo(-15, 42);
    ctx.moveTo(8, 26);
    ctx.lineTo(15, 40);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#854D0E';
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(8, -14, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ears
    [-12, 27].forEach((ex) => {
      ctx.fillStyle = '#854D0E';
      ctx.beginPath(); ctx.arc(ex, -19, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath(); ctx.arc(ex, -19, 5, 0, Math.PI * 2); ctx.fill();
    });

    // Muzzle
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(15, -10, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Excited Open Mouth
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.ellipse(17, -7, 6.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();

    // Eyes looking at hats
    [8, 20].forEach((eyeX) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(eyeX, -19, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath(); ctx.arc(eyeX + 1.8, -19, 2.8, 0, Math.PI * 2); ctx.fill();
    });

    // Reaching Arm (reaching toward top hat)
    ctx.strokeStyle = '#854D0E';
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(10, 2);
    ctx.lineTo(46, 4);
    ctx.stroke();

    // Reaching Open Paw
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(48, 4, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  _getHatCanvas(id) {
    if (!this._hatCanvases) this._hatCanvases = {};
    const isHalloween = Boolean(settings.data.halloweenTheme);
    const cacheKey = `${id}_${isHalloween ? 'mask' : 'hat'}`;
    if (this._hatCanvases[cacheKey]) return this._hatCanvases[cacheKey];

    // Pre-render the hat or Halloween mask onto a cached 2x offscreen canvas for blazing-fast 60fps GPU blitting!
    const c = document.createElement('canvas');
    c.width = 280;
    c.height = 280;
    const offCtx = c.getContext('2d');
    offCtx.scale(2, 2);
    offCtx.translate(70, 85);
    offCtx.lineWidth = 3.5;
    offCtx.lineJoin = 'round';
    offCtx.lineCap = 'round';
    if (isHalloween) {
      this._renderHalloweenMaskVector(offCtx, id);
    } else {
      this._renderHatVector(offCtx, id);
    }
    this._hatCanvases[cacheKey] = c;
    return c;
  }

  _renderHalloweenMaskVector(ctx, id) {
    // Wearable Elastic Mask Side Loops (gives every piece an unmistakable costume mask look!)
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-44, -8, 9, Math.PI * 0.45, Math.PI * 1.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(44, -8, 9, -Math.PI * 0.55, Math.PI * 0.55);
    ctx.stroke();

    ctx.lineWidth = 3.2;

    if (id === 'crown') {
      // 🎃 Jack-O'-Lantern Costume Mask
      // Curved green pumpkin stem on top
      ctx.fillStyle = '#15803D';
      ctx.strokeStyle = '#14532D';
      ctx.beginPath();
      ctx.moveTo(-6, -34);
      ctx.quadraticCurveTo(-4, -48, 5, -48);
      ctx.lineTo(9, -43);
      ctx.quadraticCurveTo(3, -40, 6, -34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ribbed Orange Pumpkin Mask Faceplate
      const pGrad = ctx.createLinearGradient(0, -36, 0, 16);
      pGrad.addColorStop(0, '#FB923C');
      pGrad.addColorStop(0.5, '#F97316');
      pGrad.addColorStop(1, '#EA580C');
      ctx.fillStyle = pGrad;
      ctx.strokeStyle = '#7C2D12';
      ctx.beginPath();
      ctx.ellipse(-22, -9, 24, 24, -0.05, 0, Math.PI * 2);
      ctx.ellipse(22, -9, 24, 24, 0.05, 0, Math.PI * 2);
      ctx.ellipse(0, -9, 28, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Carved Glowing Yellow Eye Cutouts
      ctx.fillStyle = '#FEF08A';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2.2;
      [-17, 17].forEach((ex) => {
        ctx.beginPath();
        ctx.moveTo(ex - 10, -10);
        ctx.lineTo(ex, -25);
        ctx.lineTo(ex + 10, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dark eye pupil hole inside mask cutout
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(ex, -14, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
      });

      // Triangle nose cutout
      ctx.beginPath();
      ctx.moveTo(-5, -4);
      ctx.lineTo(0, -11);
      ctx.lineTo(5, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Toothy Carved Jack-O'-Lantern Grin
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.quadraticCurveTo(0, 5, 26, 0);
      ctx.quadraticCurveTo(18, 14, 0, 14);
      ctx.quadraticCurveTo(-18, 14, -26, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Blocky Pumpkin Teeth
      ctx.fillStyle = '#F97316';
      ctx.fillRect(-12, 1, 7, 5);
      ctx.fillRect(5, 1, 7, 5);
    } else if (id === 'sheriff') {
      // 🧟 Frankenstein Monster Mask with Side Bolts & Stitch Grin
      // Metallic Silver Neck/Temple Bolts on sides
      ctx.fillStyle = '#94A3B8';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      [-48, 38].forEach((bx, idx) => {
        ctx.beginPath();
        ctx.roundRect(bx, -6, 10, 8, 2);
        ctx.fill();
        ctx.stroke();
        const capX = idx === 0 ? -52 : 46;
        ctx.beginPath();
        ctx.roundRect(capX, -9, 5, 14, 2);
        ctx.fill();
        ctx.stroke();
      });

      // Flat-topped Green Monster Face Mask
      const fGrad = ctx.createLinearGradient(0, -40, 0, 16);
      fGrad.addColorStop(0, '#4ADE80');
      fGrad.addColorStop(1, '#16A34A');
      ctx.fillStyle = fGrad;
      ctx.strokeStyle = '#14532D';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.roundRect(-38, -38, 76, 54, [8, 8, 20, 20]);
      ctx.fill();
      ctx.stroke();

      // Jagged Black Monster Hair across flat top
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.moveTo(-38, -30);
      ctx.lineTo(-38, -38);
      ctx.lineTo(38, -38);
      ctx.lineTo(38, -30);
      ctx.lineTo(26, -22);
      ctx.lineTo(14, -30);
      ctx.lineTo(0, -21);
      ctx.lineTo(-14, -30);
      ctx.lineTo(-26, -22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Forehead stitch scar
      ctx.strokeStyle = '#14532D';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-24, -18);
      ctx.lineTo(-8, -20);
      ctx.moveTo(-20, -22); ctx.lineTo(-20, -15);
      ctx.moveTo(-13, -23); ctx.lineTo(-13, -16);
      ctx.stroke();

      // Big Goofy Cartoon Eyes & Heavy Brow
      [-16, 16].forEach((ex) => {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ex, -7, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(ex, -7, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ex - 1.5, -9, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Heavy unibrow ridge
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-28, -14);
      ctx.lineTo(28, -14);
      ctx.stroke();

      // Goofy Stitched Smile
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 2, 18, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (id === 'fire') {
      // 🧛 Count Dracula Vampire Mask with High Crimson Collar & Fangs
      // High Popped Crimson & Black Vampire Collar behind mask
      ctx.fillStyle = '#DC2626';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-36, 10);
      ctx.lineTo(-54, -26);
      ctx.lineTo(-18, -16);
      ctx.lineTo(18, -16);
      ctx.lineTo(54, -26);
      ctx.lineTo(36, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pale Lavender/Porcelain Vampire Mask Face
      ctx.fillStyle = '#F3E8FF';
      ctx.strokeStyle = '#3B0764';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.ellipse(0, -8, 38, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glossy Black Widow's Peak Hair on Top
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(0, -14, 38, 21, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.lineTo(18, -24);
      ctx.lineTo(0, -15);
      ctx.lineTo(-18, -24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Expressive Vampire Eyes & Arched Brows
      [-15, 15].forEach((ex, i) => {
        ctx.fillStyle = '#FEF08A';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(ex, -8, 8.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.arc(ex, -8, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ex - 1.5, -10, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Dramatic V-slanted eyebrows
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ex - 8, i === 0 ? -18 : -14);
        ctx.lineTo(ex + 8, i === 0 ? -14 : -18);
        ctx.stroke();
      });

      // Vampire Smile & Two Cute White Fangs!
      ctx.strokeStyle = '#3B0764';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, -2, 16, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#3B0764';
      ctx.lineWidth = 2;
      [-9, 9].forEach((fx) => {
        ctx.beginPath();
        ctx.moveTo(fx - 4, 4);
        ctx.lineTo(fx, 14);
        ctx.lineTo(fx + 4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    } else if (id === 'party') {
      // 🐈‍⬛ Spooky Black Cat Mask with Pointy Ears, Glowing Green Eyes & Whiskers
      // Pointy Black Cat Ears on top
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      [-26, 26].forEach((ex, idx) => {
        const dir = idx === 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(ex - 12, -20);
        ctx.lineTo(ex + dir * 6, -48);
        ctx.lineTo(ex + 12, -20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Pink Inner Ear Triangle
        ctx.fillStyle = '#F472B6';
        ctx.beginPath();
        ctx.moveTo(ex - 6, -22);
        ctx.lineTo(ex + dir * 4, -40);
        ctx.lineTo(ex + 6, -22);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0F172A';
      });

      // Sleek Black Cat Face Mask Body
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -6, 42, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Neon Green Cat Eyes
      [-16, 16].forEach((ex, idx) => {
        const tilt = idx === 0 ? 0.18 : -0.18;
        ctx.fillStyle = '#4ADE80';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(ex, -10, 10, 7.5, tilt, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Vertical Cat Slit Pupil
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.ellipse(ex, -10, 2.8, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ex - 3, -12, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Cute Pink Triangle Nose & Cat ":3" Mouth
      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.moveTo(-6, -1);
      ctx.lineTo(6, -1);
      ctx.lineTo(0, 5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#F472B6';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(-5, 6, 5, 0, Math.PI);
      ctx.arc(5, 6, 5, 0, Math.PI);
      ctx.stroke();

      // White Cat Whiskers
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.2;
      [-1, 1].forEach((dir) => {
        ctx.beginPath();
        ctx.moveTo(dir * 20, -2); ctx.lineTo(dir * 38, -5);
        ctx.moveTo(dir * 20, 3);  ctx.lineTo(dir * 39, 3);
        ctx.moveTo(dir * 20, 8);  ctx.lineTo(dir * 37, 11);
        ctx.stroke();
      });
    } else if (id === 'chef') {
      // 💀 Festive Glowing Skull / Skeleton Mask
      // Rounded Ivory Skull Mask Dome & Jaw
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.ellipse(0, -14, 38, 22, 0, 0, Math.PI * 2);
      ctx.roundRect(-24, -4, 48, 20, [4, 4, 12, 12]);
      ctx.fill();
      ctx.stroke();

      // Re-fill interior to merge skull dome and jaw seamlessly
      ctx.beginPath();
      ctx.ellipse(0, -14, 36, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Festive Orange & Purple Forehead Gem Accents
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.arc(0, -27, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#A855F7';
      ctx.beginPath();
      ctx.arc(-11, -26, 3.2, 0, Math.PI * 2);
      ctx.arc(11, -26, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Big Friendly Dark Eye Sockets with Glowing Cyan/Gold Twinkles
      [-15, 15].forEach((ex) => {
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(ex, -12, 9.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(ex, -12, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Cute Nose Cavity
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(-4.5, 0);
      ctx.lineTo(4.5, 0);
      ctx.closePath();
      ctx.fill();

      // Grinning Skeleton Teeth Row
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-18, 7);
      ctx.lineTo(18, 7);
      for (let tx = -12; tx <= 12; tx += 6) {
        ctx.moveTo(tx, 2);
        ctx.lineTo(tx, 12);
      }
      ctx.stroke();
    } else {
      // 🧙‍♀️ Wicked Witch Mask with Mini Witch Hat Brim & Green Face
      // Green Witch Mask Face
      const wGrad = ctx.createLinearGradient(0, -30, 0, 16);
      wGrad.addColorStop(0, '#A3E635');
      wGrad.addColorStop(1, '#65A30D');
      ctx.fillStyle = wGrad;
      ctx.strokeStyle = '#365314';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.ellipse(0, -5, 38, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Mini Crooked Purple Witch Hat perched on top of mask!
      ctx.fillStyle = '#581C87';
      ctx.strokeStyle = '#3B0764';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(-26, -21);
      ctx.quadraticCurveTo(-8, -44, 10, -50);
      ctx.quadraticCurveTo(18, -50, 16, -42);
      ctx.quadraticCurveTo(10, -34, 26, -21);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hatband & Gold Buckle
      ctx.fillStyle = '#F97316';
      ctx.fillRect(-23, -27, 46, 5);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-5, -28, 10, 7);

      // Witch Hat Brim
      ctx.fillStyle = '#6B21A8';
      ctx.beginPath();
      ctx.ellipse(0, -20, 42, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Expressive Witch Eyes with Purple Eyeshadow
      [-15, 15].forEach((ex) => {
        ctx.fillStyle = '#A855F7';
        ctx.beginPath();
        ctx.arc(ex, -9, 9.5, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(ex, -7, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(ex, -7, 3.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Cute Curved Witch Nose with Pink Wart
      ctx.fillStyle = '#84CC16';
      ctx.strokeStyle = '#365314';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-3, -6);
      ctx.quadraticCurveTo(8, 0, 2, 5);
      ctx.lineTo(-4, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.arc(3, 1, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Cheerful Cackling Smile
      ctx.strokeStyle = '#365314';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 3, 14, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }

  drawHatGraphic(ctx, id, x, y, scaleX = 1.0, scaleY = 1.0, angle = 0) {
    if (arguments.length <= 6) {
      // When called with 5 or 6 arguments (ctx, id, x, y, scale, [angle]):
      // scale applies uniformly to both X and Y, and the 6th arg is angle!
      angle = arguments.length === 6 ? scaleY : 0;
      scaleY = scaleX;
    }

    const hatCanvas = this._getHatCanvas(id);
    if (!hatCanvas) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(hatCanvas, -70, -85, 140, 140);
    ctx.restore();
  }

  _renderHatVector(ctx, id) {
    if (id === 'crown') {
      // 👑 Princess Golden Crown: Multi-faceted gold with cut jewels and velvet trim
      // Base velvet band
      ctx.fillStyle = '#B91C1C';
      ctx.strokeStyle = '#92400E';
      ctx.beginPath();
      ctx.roundRect(-44, 4, 88, 14, 5);
      ctx.fill();
      ctx.stroke();

      // Velvet band pearl studs
      ctx.fillStyle = '#FEF08A';
      [-32, -16, 0, 16, 32].forEach((px) => {
        ctx.beginPath();
        ctx.arc(px, 11, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Gold Crown Body
      const goldGrad = ctx.createLinearGradient(0, -36, 0, 6);
      goldGrad.addColorStop(0, '#FEF08A');
      goldGrad.addColorStop(0.35, '#FACC15');
      goldGrad.addColorStop(1, '#D97706');
      ctx.fillStyle = goldGrad;
      ctx.strokeStyle = '#78350F';
      ctx.beginPath();
      ctx.moveTo(-44, 6);
      ctx.lineTo(-46, -24);
      ctx.lineTo(-20, -5);
      ctx.lineTo(0, -36);
      ctx.lineTo(20, -5);
      ctx.lineTo(46, -24);
      ctx.lineTo(44, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden spheres on crown peaks
      ctx.fillStyle = '#FEF08A';
      [-46, 0, 46].forEach((peakX) => {
        const peakY = peakX === 0 ? -36 : -24;
        ctx.beginPath();
        ctx.arc(peakX, peakY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Sparkling Faceted Cut Gems (Center Ruby, Left Sapphire, Right Emerald)
      const gems = [
        { x: -22, y: -2, c: '#0284C7', lit: '#7DD3FC', r: 6.5 },
        { x: 0, y: -8, c: '#DC2626', lit: '#FCA5A5', r: 8.5 },
        { x: 22, y: -2, c: '#059669', lit: '#6EE7B7', r: 6.5 },
      ];
      gems.forEach((g) => {
        // Gem setting
        ctx.fillStyle = '#78350F';
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r + 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Main facet
        ctx.fillStyle = g.c;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        ctx.fill();

        // Highlight facet / sparkle
        ctx.fillStyle = g.lit;
        ctx.beginPath();
        ctx.arc(g.x - g.r * 0.3, g.y - g.r * 0.3, g.r * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Specular glint
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(g.x - g.r * 0.35, g.y - g.r * 0.35, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (id === 'sheriff') {
      // 👮 Sheriff Labrador Navy Police Cap with Gold Braided Cord & Star Badge
      // Cap Dome
      const capGrad = ctx.createLinearGradient(0, -32, 0, 8);
      capGrad.addColorStop(0, '#2563EB');
      capGrad.addColorStop(0.4, '#1E3A8A');
      capGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = capGrad;
      ctx.strokeStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(0, -8, 48, 24, 0, Math.PI, 0);
      ctx.lineTo(44, 10);
      ctx.lineTo(-44, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top crease / fold line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, -18, 28, 6, 0, 0, Math.PI);
      ctx.stroke();

      // Visor Brim (Glossy Black patent leather with reflection)
      ctx.lineWidth = 3.5;
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(0, 12, 50, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glossy reflection arc on visor
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 10, 36, 6, 0, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();

      // Gold Braided Cord above visor
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-42, 6);
      ctx.quadraticCurveTo(0, 9, 42, 6);
      ctx.stroke();

      // Gold buttons on strap sides
      ctx.fillStyle = '#FEF08A';
      [-40, 40].forEach((bx) => {
        ctx.beginPath();
        ctx.arc(bx, 6, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Gold 5-Point Sheriff Labrador Star Badge
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -7, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Star inside badge
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      for (let s = 0; s < 5; s++) {
        const outerA = (s * Math.PI * 2) / 5 - Math.PI / 2;
        const innerA = outerA + Math.PI / 5;
        const ox = Math.cos(outerA) * 9;
        const oy = -7 + Math.sin(outerA) * 9;
        const ix = Math.cos(innerA) * 4.5;
        const iy = -7 + Math.sin(innerA) * 4.5;
        if (s === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill();
    } else if (id === 'fire') {
      // 🚒 Paw Patrol Red Firefighter Helmet with Raised Center Ridge & Shield Badge
      // Dome with high-gloss highlight
      const fireGrad = ctx.createLinearGradient(0, -32, 0, 10);
      fireGrad.addColorStop(0, '#F87171');
      fireGrad.addColorStop(0.4, '#EF4444');
      fireGrad.addColorStop(1, '#991B1B');
      ctx.fillStyle = fireGrad;
      ctx.strokeStyle = '#7F1D1D';
      ctx.beginPath();
      ctx.arc(0, 6, 44, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Specular glare arc on dome
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(-14, -14, 18, 12, -0.4, 0.8 * Math.PI, 1.4 * Math.PI);
      ctx.stroke();

      // Raised center aerodynamic ridge
      ctx.fillStyle = '#DC2626';
      ctx.strokeStyle = '#7F1D1D';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-6, 6);
      ctx.lineTo(-4, -36);
      ctx.lineTo(4, -36);
      ctx.lineTo(6, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Protective Rear & Side Brim
      ctx.fillStyle = '#B91C1C';
      ctx.strokeStyle = '#7F1D1D';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-56, 5, 112, 13, 6);
      ctx.fill();
      ctx.stroke();

      // Firefighter Gold Shield Badge
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-13, -26);
      ctx.lineTo(13, -26);
      ctx.lineTo(13, -9);
      ctx.lineTo(0, -1);
      ctx.lineTo(-13, -9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cute paw / flame emblem inside shield
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(0, -12, 4, 0, Math.PI * 2);
      ctx.fill();
      [-5, 0, 5].forEach((px, pi) => {
        ctx.beginPath();
        ctx.arc(px, pi === 1 ? -18 : -16, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (id === 'party') {
      // 🥳 Birthday Party Cone Hat with Rainbow Swirls & Bouncy Pom-Pom
      // Cone body
      const coneGrad = ctx.createLinearGradient(-36, 0, 36, 0);
      coneGrad.addColorStop(0, '#F43F5E');
      coneGrad.addColorStop(0.5, '#EC4899');
      coneGrad.addColorStop(1, '#BE185D');
      ctx.fillStyle = coneGrad;
      ctx.strokeStyle = '#831843';
      ctx.beginPath();
      ctx.moveTo(-38, 12);
      ctx.lineTo(0, -46);
      ctx.lineTo(38, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rainbow diagonal swirl stripes
      ctx.save();
      ctx.clip(); // clip stripes inside cone!
      const stripes = [
        { y: -30, c: '#FEF08A', w: 8 },
        { y: -16, c: '#38BDF8', w: 9 },
        { y: -1, c: '#4ADE80', w: 10 },
      ];
      stripes.forEach((st) => {
        ctx.fillStyle = st.c;
        ctx.beginPath();
        ctx.moveTo(-45, st.y + 12);
        ctx.lineTo(45, st.y - 12);
        ctx.lineTo(45, st.y - 12 + st.w);
        ctx.lineTo(-45, st.y + 12 + st.w);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();

      // Re-stroke cone boundary
      ctx.strokeStyle = '#831843';
      ctx.beginPath();
      ctx.moveTo(-38, 12);
      ctx.lineTo(0, -46);
      ctx.lineTo(38, 12);
      ctx.closePath();
      ctx.stroke();

      // Ruffled crinkle-cut paper fringe along bottom
      ctx.fillStyle = '#FEF08A';
      ctx.strokeStyle = '#CA8A04';
      ctx.lineWidth = 2;
      for (let r = -38; r <= 32; r += 10) {
        ctx.beginPath();
        ctx.arc(r + 5, 12, 5, 0, Math.PI);
        ctx.fill();
        ctx.stroke();
      }

      // Fluffy multi-lobed Pom-Pom on tip
      ctx.fillStyle = '#38BDF8';
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 2.5;
      [
        [-4, -48, 7],
        [4, -48, 7],
        [0, -54, 7.5],
        [0, -46, 6],
      ].forEach(([px, py, pr]) => {
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      // Specular highlight on pom-pom
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.arc(-2, -54, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'chef') {
      // 🧑‍🍳 Puffy White Chef Hat (Toque Blanche) with 3D Ballooning Pleats
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 3;

      // Outer billowy clouds
      const chefGrad = ctx.createLinearGradient(0, -44, 0, 0);
      chefGrad.addColorStop(0, '#FFFFFF');
      chefGrad.addColorStop(0.7, '#F8FAFC');
      chefGrad.addColorStop(1, '#E2E8F0');
      ctx.fillStyle = chefGrad;

      [
        [-28, -20, 20],
        [28, -20, 20],
        [-14, -32, 22],
        [14, -32, 22],
        [0, -36, 24],
      ].forEach(([cx, cy, cr]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Interior pleat shadow accents
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 2.5;
      [-16, 0, 16].forEach((px) => {
        ctx.beginPath();
        ctx.moveTo(px, -30);
        ctx.lineTo(px * 0.7, -10);
        ctx.stroke();
      });

      // Stiff pleated headband
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-36, -10, 72, 24, 4);
      ctx.fill();
      ctx.stroke();

      // Headband vertical pleat stitches
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      for (let bx = -28; bx <= 28; bx += 10) {
        ctx.beginPath();
        ctx.moveTo(bx, -8);
        ctx.lineTo(bx, 12);
        ctx.stroke();
      }

      // Little golden fork & spoon chef insignia
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(0, 2, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 🧙 Starry Purple Wizard Hat with Crooked Tip & Crescent Moon
      // Wide curved brim
      ctx.fillStyle = '#581C87';
      ctx.strokeStyle = '#3B0764';
      ctx.beginPath();
      ctx.ellipse(0, 12, 54, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Crooked cone body
      const wizGrad = ctx.createLinearGradient(0, -50, 0, 12);
      wizGrad.addColorStop(0, '#A855F7');
      wizGrad.addColorStop(0.5, '#7C3AED');
      wizGrad.addColorStop(1, '#4C1D95');
      ctx.fillStyle = wizGrad;
      ctx.beginPath();
      ctx.moveTo(-38, 11);
      ctx.quadraticCurveTo(-15, -20, 4, -40);
      ctx.quadraticCurveTo(18, -48, 22, -44);
      ctx.quadraticCurveTo(14, -36, 12, -26);
      ctx.quadraticCurveTo(24, 0, 38, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold belt & buckle around hat base
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-10, 4, 20, 10, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4C1D95';
      ctx.fillRect(-5, 7, 10, 4);

      // Golden celestial stars & crescent moon
      ctx.fillStyle = '#FEF08A';
      // Crescent Moon
      ctx.beginPath();
      ctx.arc(-8, -14, 8, 0.4 * Math.PI, 1.6 * Math.PI);
      ctx.arc(-4, -14, 6, 1.5 * Math.PI, 0.5 * Math.PI, true);
      ctx.closePath();
      ctx.fill();

      // Twinkling stars
      [
        [10, -18, 4.5],
        [-2, -32, 3.5],
      ].forEach(([sx, sy, sr]) => {
        ctx.beginPath();
        for (let s = 0; s < 4; s++) {
          const a = (s * Math.PI * 2) / 4;
          const ox = sx + Math.cos(a) * sr;
          const oy = sy + Math.sin(a) * sr;
          const ia = a + Math.PI / 4;
          const ix = sx + Math.cos(ia) * (sr * 0.4);
          const iy = sy + Math.sin(ia) * (sr * 0.4);
          if (s === 0) ctx.moveTo(ox, oy);
          else ctx.lineTo(ox, oy);
          ctx.lineTo(ix, iy);
        }
        ctx.closePath();
        ctx.fill();
      });
    }
  }
}