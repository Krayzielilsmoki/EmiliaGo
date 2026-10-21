// Game 3: Butterfly & Bubble Pop for EmiliaGO! (1P & 2P Support)
// Pop bubbles & catch butterflies, bounce the 3-hit Golden Balloon for +5 points,
// and avoid the High-Visibility Buzzing Bumblebee!
import { sound } from './sound.js';
import { settings } from './settings.js';

const BUTTERFLY_STYLES = [
  { topWing: '#38BDF8', bottomWing: '#BAE6FD', name: 'Bluey Butterfly', points: 1 },
  { topWing: '#FB923C', bottomWing: '#FED7AA', name: 'Bingo Butterfly', points: 1 },
  { topWing: '#F472B6', bottomWing: '#FBCFE8', name: 'Peppa Butterfly', points: 1 },
  { topWing: '#FACC15', bottomWing: '#FEF08A', name: 'Golden Butterfly', points: 2, isGold: true },
];

const MAX_ACTIVE_TARGETS = 4;

export class ButterflyPopGame {
  constructor() {
    this.targets = [];
    this.particles = [];
    this.floatingTexts = [];

    this.score = 0;
    this.bestScore = settings.data.bestButterflies || 0;
    this.spawnTimer = 0;
    this.beeTimer = 8.5;
    this.goldenBalloonTimer = 6.5;
    this.time = 0;

    this.onMilestone = null;
    this.onBeeSting = null;
  }

  reset() {
    this.targets = [];
    this.particles = [];
    this.floatingTexts = [];
    this.score = 0;
    this.spawnTimer = 0.2;
    this.beeTimer = 8.5;
    this.goldenBalloonTimer = 6.5;
    sound.updateBeeBuzz(false);
  }

  spawnTarget(safeBounds) {
    if (this.targets.length >= MAX_ACTIVE_TARGETS) return;
    const roll = Math.random();

    if (roll < 0.48) {
      // Butterfly
      const style =
        Math.random() < 0.2
          ? BUTTERFLY_STYLES[3]
          : BUTTERFLY_STYLES[Math.floor(Math.random() * 3)];
      const fromLeft = Math.random() < 0.5;
      const startX = fromLeft ? safeBounds.left + 30 : safeBounds.right - 30;
      const baseY =
        safeBounds.top +
        80 +
        Math.random() * Math.max(120, safeBounds.height * 0.65);

      this.targets.push({
        kind: 'butterfly',
        style,
        x: startX,
        y: baseY,
        baseY,
        vx: (fromLeft ? 1 : -1) * (105 + Math.random() * 65),
        flapPhase: Math.random() * Math.PI * 2,
        wavePhase: Math.random() * Math.PI * 2,
        trailTimer: 0,
        r: 46,
      });
    } else if (roll < 0.62) {
      // Cute Cartoon Ladybug
      const fromLeft = Math.random() < 0.5;
      const startX = fromLeft ? safeBounds.left + 30 : safeBounds.right - 30;
      const baseY =
        safeBounds.top +
        100 +
        Math.random() * Math.max(100, safeBounds.height * 0.55);

      this.targets.push({
        kind: 'ladybug',
        x: startX,
        y: baseY,
        baseY,
        vx: (fromLeft ? 1 : -1) * (90 + Math.random() * 45),
        flapPhase: 0,
        wavePhase: Math.random() * Math.PI * 2,
        r: 40,
      });
    } else {
      // Soap Bubble
      const hue = Math.floor(Math.random() * 360);
      const x =
        safeBounds.left +
        70 +
        Math.random() * Math.max(80, safeBounds.width - 140);
      this.targets.push({
        kind: 'bubble',
        hue,
        x,
        y: safeBounds.bottom - 30,
        vx: (Math.random() - 0.5) * 40,
        vy: -(85 + Math.random() * 55),
        wobblePhase: Math.random() * Math.PI * 2,
        r: 44 + Math.random() * 14,
      });
    }
  }

  spawnGoldenBalloon(safeBounds) {
    if (this.targets.some((t) => t.kind === 'goldenBalloon')) return;
    if (this.targets.length >= MAX_ACTIVE_TARGETS + 1) return;
    const x =
      safeBounds.left +
      100 +
      Math.random() * Math.max(100, safeBounds.width - 200);
    this.targets.push({
      kind: 'goldenBalloon',
      x,
      y: safeBounds.top + 80,
      vx: (Math.random() - 0.5) * 140,
      vy: 40,
      r: 52,
      hitsLeft: 3,
      hitCooldown: 0,
      angle: 0,
      squash: 0,
    });
  }

  spawnBee(safeBounds) {
    if (this.targets.some((t) => t.kind === 'bee')) return;
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? safeBounds.left - 40 : safeBounds.right + 40;
    const baseY =
      safeBounds.top +
      110 +
      Math.random() * Math.max(120, safeBounds.height * 0.55);
    const pattern = Math.random() < 0.5 ? 'figure8' : 'hover_dart';

    this.targets.push({
      kind: 'bee',
      pattern, // 50/50: 'figure8' (swooping wave curves + pollen trail) vs 'hover_dart' (curious hover & fast dart)
      fromLeft,
      startX,
      x: startX,
      y: baseY,
      baseY,
      vx: (fromLeft ? 1 : -1) * (pattern === 'figure8' ? 145 : 175),
      wavePhase: 0,
      wingPhase: 0,
      pollenTrail: [],
      trailTimer: 0,
      hoverPhase: 'approach', // 'approach' -> 'hover' -> 'dart'
      hoverTargetX: safeBounds.left + safeBounds.width * (0.35 + Math.random() * 0.30),
      hoverTimer: 1.25,
      r: 46,
    });
  }

  update(dt, safeBounds, player, pointer, onMilestone) {
    this.time += dt;
    this.spawnTimer -= dt;
    this.beeTimer -= dt;
    this.goldenBalloonTimer -= dt;

    if (this.spawnTimer <= 0 && this.targets.length < MAX_ACTIVE_TARGETS) {
      this.spawnTarget(safeBounds);
      this.spawnTimer = 1.15;
    }

    if (this.goldenBalloonTimer <= 0) {
      this.spawnGoldenBalloon(safeBounds);
      this.goldenBalloonTimer = 11.0 + Math.random() * 4;
    }

    if (this.beeTimer <= 0) {
      this.spawnBee(safeBounds);
      this.beeTimer = 12.5 + Math.random() * 4.5;
    }

    // Collect active colliders from ALL detected players (1P or 2P!)
    const colliders = [];
    const activePlayers =
      player && player.allPlayers && player.allPlayers.length > 0
        ? player.allPlayers
        : player && player.detected
        ? [player]
        : [];

    for (const pObj of activePlayers) {
      if (!pObj.colliders) continue;
      for (const k of ['leftHand', 'rightHand', 'head']) {
        const c = pObj.colliders[k];
        if (c && c.visibility > 0.3) colliders.push(c);
      }
    }
    if (pointer && pointer.active) {
      colliders.push(pointer);
    }

    let hasActiveBee = false;

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];

      if (t.kind === 'butterfly') {
        t.flapPhase += dt * 15;
        t.wavePhase += dt * 2.8;
        t.x += t.vx * dt;
        t.y = t.baseY + Math.sin(t.wavePhase) * 42;

        if (t.x < safeBounds.left + 40 && t.vx < 0) {
          t.vx = Math.abs(t.vx);
        } else if (t.x > safeBounds.right - 40 && t.vx > 0) {
          t.vx = -Math.abs(t.vx);
        }

        // Shimmering fairy dust trail behind the butterfly
        t.trailTimer = (t.trailTimer || 0) + dt;
        if (t.trailTimer >= 0.14 && this.particles.length < 12) {
          t.trailTimer = 0;
          const facing = t.vx >= 0 ? 1 : -1;
          this.particles.push({
            kind: 'fairydust',
            x: t.x - facing * 18 + (Math.random() - 0.5) * 8,
            y: t.y + (Math.random() - 0.5) * 10,
            vx: -facing * 20 + (Math.random() - 0.5) * 12,
            vy: -8 + Math.random() * 20,
            r: 3 + Math.random() * 2,
            color: t.style.topWing,
            life: 0.55,
            maxLife: 0.55,
          });
        }
      } else if (t.kind === 'ladybug') {
        t.flapPhase = (t.flapPhase || 0) + dt * 22;
        t.wavePhase = (t.wavePhase || 0) + dt * 2.2;
        t.x += t.vx * dt;
        t.y = t.baseY + Math.sin(t.wavePhase) * 28;

        if (t.x < safeBounds.left + 35 && t.vx < 0) {
          t.vx = Math.abs(t.vx);
        } else if (t.x > safeBounds.right - 35 && t.vx > 0) {
          t.vx = -Math.abs(t.vx);
        }
      } else if (t.kind === 'bubble') {
        t.wobblePhase += dt * 4;
        t.x += (t.vx + Math.sin(t.wobblePhase) * 28) * dt;
        t.y += t.vy * dt;

        if (t.y < safeBounds.top - 50) {
          this.targets.splice(i, 1);
          continue;
        }
      } else if (t.kind === 'goldenBalloon') {
        if (t.hitCooldown > 0) t.hitCooldown -= dt;
        if (t.squash > 0) t.squash = Math.max(0, t.squash - dt * 3.5);
        t.vy += 180 * dt; // buoyant floaty celebration balloon physics
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        t.angle += t.vx * 0.003 * dt;

        if (t.x - t.r < safeBounds.left) {
          t.x = safeBounds.left + t.r;
          t.vx = Math.abs(t.vx);
        } else if (t.x + t.r > safeBounds.right) {
          t.x = safeBounds.right - t.r;
          t.vx = -Math.abs(t.vx);
        }
        if (t.y - t.r < safeBounds.top) {
          t.y = safeBounds.top + t.r;
          t.vy = Math.abs(t.vy) * 0.7;
        }
        if (t.y + t.r > safeBounds.bottom) {
          t.y = safeBounds.bottom - t.r;
          t.vy = -300;
          t.squash = 0.7;
          sound.playFloorDrop(true);
        }
      } else if (t.kind === 'bee') {
        // Update pollen trail particles
        if (t.pollenTrail) {
          for (let j = t.pollenTrail.length - 1; j >= 0; j--) {
            const pt = t.pollenTrail[j];
            pt.life -= dt;
            pt.y += 18 * dt; // gentle floating drift
            if (pt.life <= 0) t.pollenTrail.splice(j, 1);
          }
        }

        if (t.pattern === 'figure8') {
          // PATTERN A: Figure-8 Harmonic Swooping Wave with Pollen Trail
          t.wavePhase += dt * 4.6;
          t.wingPhase = (t.wingPhase || 0) + dt * 38;
          t.x += t.vx * dt;
          t.y = t.baseY + Math.sin(t.wavePhase) * 62 + Math.sin(t.wavePhase * 2) * 24;

          t.trailTimer = (t.trailTimer || 0) - dt;
          if (t.trailTimer <= 0) {
            t.trailTimer = 0.08;
            if (t.pollenTrail.length < 24) {
              t.pollenTrail.push({
                x: t.x + (t.vx > 0 ? -32 : 32),
                y: t.y + (Math.random() - 0.5) * 12,
                life: 0.65,
                maxLife: 0.65,
                r: Math.random() * 3 + 2,
              });
            }
          }
        } else {
          // PATTERN B: Curious Hover Near Bubbles (1.2s) & Fast Dart Away!
          t.wingPhase = (t.wingPhase || 0) + dt * 44;
          if (t.hoverPhase === 'approach') {
            t.wavePhase += dt * 4.8;
            t.x += (t.fromLeft ? 1 : -1) * 175 * dt;
            t.y = t.baseY + Math.sin(t.wavePhase) * 36;

            const reachedCenter = t.fromLeft ? (t.x >= t.hoverTargetX) : (t.x <= t.hoverTargetX);
            if (reachedCenter) {
              t.hoverPhase = 'hover';
              t.hoverTimer = 1.25;
            }
          } else if (t.hoverPhase === 'hover') {
            t.hoverTimer -= dt;
            t.wavePhase += dt * 14;
            // Curious bobbing & zipping in place
            t.x += Math.sin(t.wavePhase * 0.8) * 45 * dt;
            t.y = t.baseY + Math.sin(t.wavePhase * 1.2) * 28 + Math.cos(t.wavePhase * 0.6) * 12;

            if (t.hoverTimer <= 0) {
              t.hoverPhase = 'dart';
            }
          } else if (t.hoverPhase === 'dart') {
            // High-speed dart across the screen!
            t.wavePhase += dt * 3.5;
            t.x += (t.fromLeft ? 1 : -1) * 360 * dt;
            t.y = t.baseY + Math.sin(t.wavePhase) * 18;
          }
        }

        // Screen boundary cleanup
        const outLeft = t.x < safeBounds.left - 120;
        const outRight = t.x > safeBounds.right + 120;
        if ((t.fromLeft && outRight) || (!t.fromLeft && outLeft) || (outLeft && outRight)) {
          this.targets.splice(i, 1);
          continue;
        }
        hasActiveBee = true;
      }

      // Check collision with players' hands or head
      let hitCol = null;
      for (const col of colliders) {
        const dist = Math.hypot(t.x - col.x, t.y - col.y);
        if (dist < t.r + (col.r || 42)) {
          hitCol = col;
          break;
        }
      }

      if (hitCol) {
        // Case A: Buzzy Bee Hazard (Don't Touch!)
        if (t.kind === 'bee') {
          sound.updateBeeBuzz(false);
          sound.playFloorDrop(false);
          sound.playFailClip(false);
          this.spawnPopParticles(t.x, t.y, '#FACC15');
          this.spawnFloatingText(t.x, t.y - 35, 'OUCH! BUZZY BEE! 🐝', '#FACC15');
          this.targets.splice(i, 1);
          if (this.onBeeSting) {
            this.onBeeSting(5.0);
          }
          continue;
        }

        // Case B: 3-Hit Bouncy Golden Balloon (+5 Bonus Points on 3rd hit!)
        if (t.kind === 'goldenBalloon') {
          if (t.hitCooldown > 0) continue;
          t.hitCooldown = 0.35;
          t.hitsLeft--;
          t.squash = 1.0;

          if (t.hitsLeft > 0) {
            const dx = t.x - hitCol.x;
            t.vx = (dx >= 0 ? 1 : -1) * (140 + Math.random() * 80);
            t.vy = -380;
            sound.playBalloonHit(4 - t.hitsLeft);
            this.spawnPopParticles(t.x, t.y, '#FACC15');
            this.spawnFloatingText(
              t.x,
              t.y - 45,
              `GOLDEN BOUNCE! ✨ (${t.hitsLeft} MORE!)`,
              '#FEF08A'
            );
          } else {
            const prevScore = this.score;
            this.score += 5;
            if (this.score > this.bestScore) {
              this.bestScore = this.score;
              settings.data.bestButterflies = this.bestScore;
              settings.save();
            }
            sound.playFanfare();
            this.spawnPopParticles(t.x, t.y, '#FACC15');
            this.spawnFloatingText(t.x, t.y - 45, 'GOLDEN BALLOON POP! 🎈✨ +5 POINTS!', '#FACC15');
            this.targets.splice(i, 1);

            const everyN = settings.data.soundboardEveryN || 10;
            const milestoneCb = onMilestone || this.onMilestone;
            if (Math.floor(this.score / everyN) > Math.floor(prevScore / everyN) && milestoneCb) {
              milestoneCb(this.score);
            }
          }
          continue;
        }

        // Case C: Butterfly, Soap Bubble, or Ladybug
        const isButterfly = t.kind === 'butterfly';
        const isLadybug = t.kind === 'ladybug';
        const prevScore = this.score;
        const pts = isButterfly ? t.style.points || 1 : 1;
        this.score += pts;

        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          settings.data.bestButterflies = this.bestScore;
          settings.save();
        }

        sound.playBubblePop(isButterfly || isLadybug);
        const pColor = isLadybug
          ? '#EF4444'
          : isButterfly
          ? t.style.topWing
          : `hsl(${t.hue}, 90%, 65%)`;
        this.spawnPopParticles(t.x, t.y, pColor);

        const label = isLadybug
          ? 'LADYBUG CATCH! 🐞 +1'
          : isButterfly
          ? t.style.isGold
            ? 'GOLDEN BUTTERFLY! 🌟 +2'
            : 'CAUGHT BUTTERFLY! 🦋 +1'
          : 'POP! 🫧 +1';
        this.spawnFloatingText(
          t.x,
          t.y - 30,
          label,
          isLadybug ? '#FCA5A5' : isButterfly ? '#FEF08A' : '#BAE6FD'
        );

        this.targets.splice(i, 1);

        const everyN = settings.data.soundboardEveryN || 10;
        const milestoneCb = onMilestone || this.onMilestone;
        if (Math.floor(this.score / everyN) > Math.floor(prevScore / everyN) && milestoneCb) {
          milestoneCb(this.score);
        }
      }
    }

    // Play continuous buzzing sound while a Bee is on screen!
    sound.updateBeeBuzz(hasActiveBee);

    // Update particles & floating texts
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 50 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  spawnPopParticles(x, y, color) {
    const colors = [color, '#FEF08A', '#FFFFFF', '#7DD3FC', '#F472B6'];
    for (let i = 0; i < 10; i++) {
      if (this.particles.length >= 30) break;
      const a = (Math.PI * 2 * i) / 10;
      const spd = 90 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 35,
        r: 4 + Math.random() * 5,
        color: colors[i % colors.length],
        life: 0.45,
        maxLife: 0.45,
      });
    }
  }

  spawnFloatingText(x, y, text, color = '#FFFFFF') {
    this.floatingTexts.push({ x, y, text, color, life: 0.95, maxLife: 0.95 });
  }

  render(ctx) {
    for (const t of this.targets) {
      if (t.kind === 'bubble') {
        this.drawSoapBubble(ctx, t);
      } else if (t.kind === 'butterfly') {
        this.drawButterfly(ctx, t);
      } else if (t.kind === 'ladybug') {
        this.drawLadybug(ctx, t);
      } else if (t.kind === 'goldenBalloon') {
        this.drawGoldenBalloon(ctx, t);
      } else if (t.kind === 'bee') {
        this.drawBee(ctx, t);
      }
    }

    if (this.particles.length > 0) {
      ctx.save();
      // 1. Batch all fairy dust crosses in a single stroke
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const p of this.particles) {
        if (p.kind === 'fairydust') {
          ctx.moveTo(p.x - p.r * 1.5, p.y);
          ctx.lineTo(p.x + p.r * 1.5, p.y);
          ctx.moveTo(p.x, p.y - p.r * 1.5);
          ctx.lineTo(p.x, p.y + p.r * 1.5);
        }
      }
      ctx.stroke();

      // 2. Batch particle centers
      for (const p of this.particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.kind === 'fairydust' ? '#FFFFFF' : p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.kind === 'fairydust' ? p.r * 0.45 : p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.floatingTexts.length > 0) {
      ctx.save();
      ctx.font = '900 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      for (const ft of this.floatingTexts) {
        ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
        ctx.strokeStyle = '#0F172A';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.restore();
    }
  }

  drawGoldenBalloon(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);

    const wobble = Math.sin(b.squash * Math.PI * 2) * b.squash * 0.22;
    ctx.scale(1 + wobble, 1 - wobble);
    ctx.rotate(b.angle || 0);

    const r = b.r;

    // 1. Festive Golden Curly Ribbon / String dangling below
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, r + 6);
    ctx.bezierCurveTo(-14, r + 18, 14, r + 30, -6, r + 42);
    ctx.stroke();

    // 2. Balloon Knot at bottom
    ctx.fillStyle = '#D97706';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-7, r + 6);
    ctx.lineTo(7, r + 6);
    ctx.lineTo(0, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Shimmering Golden Balloon Body
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.94, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Soft warm golden shadow contour
    ctx.fillStyle = 'rgba(180, 83, 9, 0.22)';
    ctx.beginPath();
    ctx.ellipse(r * 0.22, r * 0.22, r * 0.68, r * 0.72, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 4. Glossy Specular Balloon Highlight (curved crescent on upper left)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(-r * 0.38, -r * 0.38, r * 0.42, r * 0.24, -0.65, 0.75 * Math.PI, 1.4 * Math.PI);
    ctx.stroke();

    // Secondary soft glow dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.beginPath();
    ctx.arc(-r * 0.52, -r * 0.16, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Sparkling Stars on the gold surface
    const drawStar = (sx, sy, sr) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(sx, sy - sr);
      ctx.quadraticCurveTo(sx, sy, sx + sr, sy);
      ctx.quadraticCurveTo(sx, sy, sx, sy + sr);
      ctx.quadraticCurveTo(sx, sy, sx - sr, sy);
      ctx.quadraticCurveTo(sx, sy, sx, sy - sr);
      ctx.fill();
    };
    drawStar(r * 0.38, -r * 0.32, 7);
    drawStar(r * 0.46, r * 0.25, 5);

    // 6. Hits Badge Pill in center
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-38, -16, 76, 32, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FEF08A';
    ctx.font = '900 16px system-ui, sans-serif';
    ctx.fillText(`✨ ×${b.hitsLeft}`, 0, 1);

    ctx.restore();
  }

  /**
   * High-Visibility Custom-Illustrated Cartoon Bumblebee with Flapping Wings & Warning Banner!
   * (Zero Gaussian shadowBlur or clip passes - blazing fast 60fps Skia performance!)
   */
  drawBee(ctx, bee) {
    // Render golden pollen trail (batched into 2 fill passes total!)
    if (bee.pollenTrail && bee.pollenTrail.length > 0) {
      // 1. Outer soft glow
      ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
      ctx.beginPath();
      for (const pt of bee.pollenTrail) {
        ctx.moveTo(pt.x + pt.r * 1.6, pt.y);
        ctx.arc(pt.x, pt.y, pt.r * 1.6, 0, Math.PI * 2);
      }
      ctx.fill();

      // 2. Inner golden particle
      ctx.fillStyle = 'rgba(250, 204, 21, 0.9)';
      ctx.beginPath();
      for (const pt of bee.pollenTrail) {
        ctx.moveTo(pt.x + pt.r, pt.y);
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    ctx.save();
    ctx.translate(bee.x, bee.y);
    const dir = bee.vx >= 0 ? 1 : -1;

    // 1. High-contrast pulsing danger aura (crisp yellow/red outline, not a faded wash)
    const pulse = 1 + Math.sin(this.time * 14) * 0.08;
    ctx.save();
    ctx.scale(dir * pulse, pulse);

    // Flapping Translucent White Wings on top
    const wingLift = Math.sin(bee.wingPhase || this.time * 35) * 10;
    ctx.fillStyle = 'rgba(224, 242, 254, 0.92)';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.ellipse(-8, -26 + wingLift * 0.5, 16, 22, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(8, -26 - wingLift * 0.5, 15, 20, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pointy Black Stinger at the back
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(-36, -6);
    ctx.lineTo(-54, 0);
    ctx.lineTo(-36, 6);
    ctx.closePath();
    ctx.fill();

    // Plump Bright Yellow Bee Body
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FACC15';
    ctx.fill();

    // 3 Black Stripes (drawn cleanly without clip/stencil overhead!)
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(-23, -20, 9, 40, 4);
    ctx.roundRect(-5, -24, 10, 48, 5);
    ctx.roundRect(13, -20, 9, 40, 4);
    ctx.fill();

    // Crisp outer outline around bee body
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 26, 0, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0F172A';
    ctx.stroke();

    // Expressive Cartoon Eye & Grumpy Eyebrow at front
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(24, -6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0F172A';
    ctx.stroke();

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(26, -6, 4, 0, Math.PI * 2);
    ctx.fill();

    // Angry slanted eyebrow
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(16, -16);
    ctx.lineTo(32, -11);
    ctx.stroke();

    ctx.restore();

    // 2. High-Contrast Hazard Pill Below Bee ("⚠️ BEE! AVOID!")
    const pillW = 132;
    const pillH = 26;
    ctx.fillStyle = '#DC2626';
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-pillW / 2, 34, pillW, pillH, 13);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 13px system-ui, sans-serif';
    ctx.fillText('⚠️ BEE! AVOID!', 0, 47);

    ctx.restore();
  }

  drawSoapBubble(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    const sx = 1 + Math.sin(b.wobblePhase) * 0.05;
    const sy = 1 - Math.sin(b.wobblePhase) * 0.05;
    ctx.scale(sx, sy);

    // Translucent soap bubble body (0 gradient allocation overhead!)
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${b.hue}, 92%, 72%, 0.30)`;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.stroke();

    // Iridescent reflection arc
    ctx.strokeStyle = `hsla(${(b.hue + 60) % 360}, 95%, 75%, 0.55)`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, b.r * 0.82, 0.2 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();

    // Glossy specular highlight glare
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.beginPath();
    ctx.ellipse(-b.r * 0.35, -b.r * 0.35, b.r * 0.22, b.r * 0.12, -0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawButterfly(ctx, bf) {
    ctx.save();
    ctx.translate(bf.x, bf.y);
    const facing = bf.vx >= 0 ? 1 : -1;
    ctx.scale(facing, 1);

    const flapFore = 0.32 + Math.abs(Math.sin(bf.flapPhase)) * 0.68;
    const flapHind = 0.32 + Math.abs(Math.sin(bf.flapPhase + 0.35)) * 0.68;
    const r = bf.r * 0.85;

    // 1. Forewings (Left & Right batched)
    ctx.save();
    ctx.scale(flapFore, 1);
    ctx.fillStyle = bf.style.topWing;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    // Left forewing
    ctx.moveTo(0, -r * 0.15);
    ctx.bezierCurveTo(-r * 0.35, -r * 0.85, -r * 1.15, -r * 0.8, -r * 1.25, -r * 0.25);
    ctx.bezierCurveTo(-r * 1.15, r * 0.1, -r * 0.45, r * 0.05, 0, 0);
    // Right forewing
    ctx.moveTo(0, -r * 0.15);
    ctx.bezierCurveTo(r * 0.35, -r * 0.85, r * 1.15, -r * 0.8, r * 1.25, -r * 0.25);
    ctx.bezierCurveTo(r * 1.15, r * 0.1, r * 0.45, r * 0.05, 0, 0);
    ctx.fill();
    ctx.stroke();

    // Soft wing highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.55, -r * 0.45, r * 0.32, r * 0.18, -0.4, 0, Math.PI * 2);
    ctx.ellipse(r * 0.55, -r * 0.45, r * 0.32, r * 0.18, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Hindwings (Left & Right batched)
    ctx.save();
    ctx.scale(flapHind, 1);
    ctx.fillStyle = bf.style.bottomWing;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    // Left hindwing
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-r * 0.45, r * 0.05, -r * 0.95, r * 0.4, -r * 0.75, r * 0.85);
    ctx.bezierCurveTo(-r * 0.4, r * 0.95, -r * 0.1, r * 0.6, 0, r * 0.25);
    // Right hindwing
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(r * 0.45, r * 0.05, r * 0.95, r * 0.4, r * 0.75, r * 0.85);
    ctx.bezierCurveTo(r * 0.4, r * 0.95, r * 0.1, r * 0.6, 0, r * 0.25);
    ctx.fill();
    ctx.stroke();

    // Jeweled eye-spots on hindwings
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-r * 0.52, r * 0.52, 5, 0, Math.PI * 2);
    ctx.arc(r * 0.52, r * 0.52, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bf.style.isGold ? '#EF4444' : '#FACC15';
    ctx.beginPath();
    ctx.arc(-r * 0.52, r * 0.52, 3.2, 0, Math.PI * 2);
    ctx.arc(r * 0.52, r * 0.52, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.52 - 1, r * 0.52 - 1, 1.2, 0, Math.PI * 2);
    ctx.arc(r * 0.52 - 1, r * 0.52 - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Cute Cartoon Body, Thorax & Head
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, 6, r * 0.5, 0, 0, Math.PI * 2);
    ctx.arc(0, -r * 0.45, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Big happy cartoon eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-4, -r * 0.48, 3.8, 0, Math.PI * 2);
    ctx.arc(4, -r * 0.48, 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-4 + (facing > 0 ? 0.8 : -0.8), -r * 0.48, 2.2, 0, Math.PI * 2);
    ctx.arc(4 + (facing > 0 ? 0.8 : -0.8), -r * 0.48, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Curled perky antennae with glowing pollen tips
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, -r * 0.52);
    ctx.quadraticCurveTo(-14, -r * 0.95, -18, -r * 0.88);
    ctx.moveTo(2, -r * 0.52);
    ctx.quadraticCurveTo(14, -r * 0.95, 18, -r * 0.88);
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(-18, -r * 0.88, 3, 0, Math.PI * 2);
    ctx.arc(18, -r * 0.88, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawLadybug(ctx, lb) {
    ctx.save();
    ctx.translate(lb.x, lb.y);
    const facing = lb.vx >= 0 ? 1 : -1;
    ctx.scale(facing, 1);

    const r = lb.r * 0.85;
    const flap = Math.sin(lb.flapPhase || 0);

    // 1. Cute Tiny Black Cartoon Legs in ONE stroke
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    [-r * 0.35, 0, r * 0.35].forEach((lx, i) => {
      const legWiggle = Math.sin((lb.flapPhase || 0) + i * 1.5) * 2.5;
      ctx.moveTo(lx, -r * 0.55);
      ctx.lineTo(lx - 5, -r * 0.95 + legWiggle);
      ctx.moveTo(lx, r * 0.55);
      ctx.lineTo(lx - 5, r * 0.95 - legWiggle);
    });
    ctx.stroke();

    // 2. Flapping Translucent Wings in ONE fill & stroke
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      -r * 0.15,
      -r * 0.72 + flap * 5,
      r * 0.55,
      r * 0.28,
      -0.3 + flap * 0.12,
      0,
      Math.PI * 2
    );
    ctx.ellipse(
      -r * 0.15,
      r * 0.72 - flap * 5,
      r * 0.55,
      r * 0.28,
      0.3 - flap * 0.12,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    // 3. Round Red Shell / Elytra
    const wingSpread = 1.5;
    ctx.fillStyle = '#EF4444';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, -wingSpread, r, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.arc(0, wingSpread, r, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Horizontal Wing Seam Spine
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r * 0.48, 0);
    ctx.stroke();

    // Cute Black Polka Dots (all 7 in ONE single path & fill!)
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-r * 0.48, -r * 0.45, 5, 0, Math.PI * 2);
    ctx.arc(-r * 0.08, -r * 0.58, 5, 0, Math.PI * 2);
    ctx.arc(r * 0.22, -r * 0.35, 4.5, 0, Math.PI * 2);
    ctx.arc(-r * 0.48, r * 0.45, 5, 0, Math.PI * 2);
    ctx.arc(-r * 0.08, r * 0.58, 5, 0, Math.PI * 2);
    ctx.arc(r * 0.22, r * 0.35, 4.5, 0, Math.PI * 2);
    ctx.arc(-r * 0.72, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.45, r * 0.35, r * 0.16, -0.3, 0.8 * Math.PI, 1.4 * Math.PI);
    ctx.stroke();

    // 4. Black Pronotum + Head (batched)
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.ellipse(r * 0.48, 0, r * 0.24, r * 0.52, 0, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.arc(r * 0.72, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White accent spots on collar
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(r * 0.44, -r * 0.26, 4, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.44, r * 0.26, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Cartoon Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(r * 0.76, -r * 0.18, 5, 0, Math.PI * 2);
    ctx.arc(r * 0.76, r * 0.18, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pupils
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(r * 0.8, -r * 0.18, 2.8, 0, Math.PI * 2);
    ctx.arc(r * 0.8, r * 0.18, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // 6. Antennae
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.88, -4);
    ctx.quadraticCurveTo(r * 1.15, -14, r * 1.28, -8);
    ctx.moveTo(r * 0.88, 4);
    ctx.quadraticCurveTo(r * 1.15, 14, r * 1.28, 8);
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(r * 1.28, -8, 3, 0, Math.PI * 2);
    ctx.arc(r * 1.28, 8, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
