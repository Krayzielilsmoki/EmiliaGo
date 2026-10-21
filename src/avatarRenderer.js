// Renders Fun Cartoon Stickers (1P & 2P), Upgraded Chest Badges (Bronze->Silver->Gold->Bottom Diamonds + Fireworks),
// Bee-Sting Yellow Flash (no face-blocking emoji), Rainbow Sparkle Hand Trails, Cartoon Puppy Avatar, or Skeleton for EmiliaGO
import { sound } from './sound.js';

const POSE_CONNECTIONS = [
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24],
  [23, 24],
  [23, 25], [25, 27],
  [24, 26], [26, 28],
];

const RAINBOW_COLORS = ['#EF4444', '#FB923C', '#FACC15', '#4ADE80', '#38BDF8', '#A855F7', '#F472B6'];

export class AvatarRenderer {
  constructor() {
    this.mode = 'stickers'; // 'stickers' | 'avatar' | 'skeleton'
    this.hideVideoInAvatarMode = false;
    this.hideHeadSticker = false; // True during Hat Stacker / Dance Party so hats sit directly on head
    this.rainbowSparkleActive = false;
    this.rainbowTrailParticles = [];
    this._colorIdx = 0;

    // Hat Stacker Upgraded Achievement System (Cleared on exit!)
    // 3 Bronze -> 1 Silver | 3 Silver -> 1 Gold -> +1 Bottom Diamond | 10 Diamonds -> Fireworks Celebration!
    this.showHatAchievements = false;
    this.bronzeCount = 0;
    this.silverCount = 0;
    this.goldFlashTimer = 0;
    this.diamondsCount = 0;
    this.badgePopScale = 1.0;
    this.fireworksTimer = 0;
    this.fireworkSparks = [];
    this._fireworkBurstCooldown = 0;

    // 5-second Sad + Flashing Yellow state when stung by a Buzzy Bee in Butterfly Pop or hit by Snowball!
    this.sadTimer = 0;
    this.sadReason = 'bee';
    this._animTime = 0;
  }

  /**
   * Resets chest badges when exiting Hat Stacker so they don't stay stuck on the avatar in other games
   */
  clearChestPins() {
    this.showHatAchievements = false;
    this.bronzeCount = 0;
    this.silverCount = 0;
    this.goldFlashTimer = 0;
    this.fireworksTimer = 0;
    this.fireworkSparks = [];
  }

  /**
   * Progression:
   * - +1 Bronze Pin on chest (max 2 Bronze visible before 3rd merges into 1 Silver Star!)
   * - 3 Bronze -> 1 Silver Star on chest
   * - 3 Silver -> 1 Gold Badge on chest -> awards +1 Diamond in bottom tray & clears chest to start Bronze again!
   * - 10 Diamonds -> Grand Fireworks Celebration & resets!
   */
  awardChestPin() {
    this.showHatAchievements = true;
    this.badgePopScale = 1.75;
    this.bronzeCount++;

    let resultMsg = {
      icon: '🥉',
      name: `Bronze Star (${this.bronzeCount}/3)`,
      color: '#FDBA74',
    };

    if (this.bronzeCount >= 3) {
      this.bronzeCount = 0;
      this.silverCount++;
      resultMsg = {
        icon: '🥈',
        name: `MERGED INTO SILVER STAR (${this.silverCount}/3)!`,
        color: '#E2E8F0',
      };

      if (this.silverCount >= 3) {
        this.silverCount = 0;
        this.goldFlashTimer = 2.4;
        this.diamondsCount++;
        resultMsg = {
          icon: '🥇💎',
          name: `GOLD BADGE -> +1 DIAMOND (${this.diamondsCount}/10)!`,
          color: '#FACC15',
        };

        if (this.diamondsCount >= 10) {
          this.triggerFireworksCelebration();
          resultMsg = {
            icon: '🎆💎',
            name: '10 DIAMONDS! MEGA FIREWORKS CELEBRATION!',
            color: '#4ADE80',
          };
        }
      }
    }

    return resultMsg;
  }

  triggerFireworksCelebration() {
    this.fireworksTimer = 6.0;
    this._fireworkBurstCooldown = 0.05;
    sound.playCelebrationClip(true);
  }

  triggerBeeSting(duration = 5.0) {
    this.sadTimer = duration;
    this.sadReason = 'bee';
  }

  triggerYellowFlash(duration = 2.0, reason = 'snowball') {
    this.sadTimer = duration;
    this.sadReason = reason;
  }

  updateAndRender(ctx, player, canvasWidth, canvasHeight, dt = 0.016, rainbowStreakArg = false) {
    this._animTime += dt;
    if (this.sadTimer > 0) {
      this.sadTimer = Math.max(0, this.sadTimer - dt);
    }
    if (this.goldFlashTimer > 0) {
      this.goldFlashTimer = Math.max(0, this.goldFlashTimer - dt);
    }
    if (this.badgePopScale > 1.0) {
      this.badgePopScale = Math.max(1.0, this.badgePopScale - dt * 2.4);
    }

    const activePlayers =
      player && player.allPlayers && player.allPlayers.length > 0
        ? player.allPlayers
        : player && player.detected
        ? [player]
        : [];

    const rainbowActive = Boolean(rainbowStreakArg || this.rainbowSparkleActive);

    // 1. Update & render Rainbow Sparkle Hand Trails for all active players
    if (activePlayers.length > 0 && rainbowActive && this.sadTimer <= 0) {
      for (const pObj of activePlayers) {
        if (!pObj.colliders) continue;
        ['leftHand', 'rightHand'].forEach((hk) => {
          const h = pObj.colliders[hk];
          if (h && h.visibility > 0.3) {
            const speed = Math.hypot(h.vx || 0, h.vy || 0);
            if (speed > 1.2 || Math.random() < 0.35) {
              this._colorIdx = (this._colorIdx + 1) % RAINBOW_COLORS.length;
              if (this.rainbowTrailParticles.length < 45) {
                this.rainbowTrailParticles.push({
                  x: h.x + (Math.random() - 0.5) * h.r * 0.6,
                  y: h.y + (Math.random() - 0.5) * h.r * 0.6,
                  vx: (Math.random() - 0.5) * 35,
                  vy: -25 - Math.random() * 40,
                  r: 7 + Math.random() * 9,
                  color: RAINBOW_COLORS[this._colorIdx],
                  life: 0.45,
                  maxLife: 0.45,
                });
              }
            }
          }
        });
      }
    }

    for (let i = this.rainbowTrailParticles.length - 1; i >= 0; i--) {
      const p = this.rainbowTrailParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.rainbowTrailParticles.splice(i, 1);
      } else {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        this.drawStar(ctx, p.x, p.y, 5, p.r * alpha + 3, (p.r * alpha + 3) * 0.45, p.color, '#FFFFFF');
        ctx.restore();
      }
    }

    // Optional solid cartoon backdrop in Avatar Mode
    if (this.mode === 'avatar' && this.hideVideoInAvatarMode) {
      const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      grad.addColorStop(0, '#BAE6FD');
      grad.addColorStop(0.78, '#E0F2FE');
      grad.addColorStop(0.78, '#FEF3C7');
      grad.addColorStop(1, '#FDE68A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // 2. Render each detected player (supports 1 or 2 players simultaneously!)
    for (let idx = 0; idx < activePlayers.length; idx++) {
      const pObj = activePlayers[idx];
      if (this.mode === 'avatar') {
        this.drawCartoonAvatar(ctx, pObj, idx, activePlayers.length);
      } else if (this.mode === 'skeleton') {
        this.drawDiagnosticSkeleton(ctx, pObj, idx);
      } else {
        this.drawCartoonStickers(ctx, pObj, rainbowActive, idx, activePlayers.length);
      }

      // Draw Upgraded Chest Badges on chest (only during Hat Stacker, max 4 badges!)
      if (
        this.showHatAchievements &&
        (this.bronzeCount > 0 || this.silverCount > 0 || this.goldFlashTimer > 0)
      ) {
        this.drawUpgradedChestBadges(ctx, pObj);
      }

      // Draw Bee-Sting Flashing Yellow Aura (NO face-blocking emoji!)
      if (this.sadTimer > 0) {
        this.drawBeeStingEffect(ctx, pObj);
      }
    }

    // 3. Draw Bottom Diamond Achievement Tray & 10-Diamond Fireworks during Hat Stacker
    if (this.showHatAchievements) {
      this.drawBottomDiamondBar(ctx, canvasWidth, canvasHeight);
      this.updateAndDrawFireworks(ctx, canvasWidth, canvasHeight, dt);
    }
  }

  /**
   * Renders at most 4 badges on the player's chest:
   * - Gold Badge (when 3 Silvers just merged!)
   * - Silver Stars (0..2) + Bronze Pins (0..2)
   */
  drawUpgradedChestBadges(ctx, player) {
    const lms = player.landmarksCanvas;
    let chestX = null;
    let chestY = null;
    const span = player.shoulderSpanPx || 130;

    if (lms && lms[11] && lms[12] && lms[11].visibility > 0.3 && lms[12].visibility > 0.3) {
      chestX = (lms[11].x + lms[12].x) / 2;
      chestY = (lms[11].y + lms[12].y) / 2 + span * 0.22;
    } else if (player.colliders && player.colliders.head) {
      chestX = player.colliders.head.x;
      chestY = player.colliders.head.y + player.colliders.head.r * 2.1;
    }

    if (chestX === null || chestY === null) return;

    const badges = [];
    if (this.goldFlashTimer > 0) {
      badges.push({
        tier: 'gold',
        bg: '#FACC15',
        rim: '#B45309',
        inner: '#FEF08A',
        label: 'GOLD',
        rMult: 1.35,
      });
    } else {
      for (let s = 0; s < this.silverCount; s++) {
        badges.push({
          tier: 'silver',
          bg: '#E2E8F0',
          rim: '#475569',
          inner: '#FFFFFF',
          label: '★',
          rMult: 1.12,
        });
      }
      for (let b = 0; b < this.bronzeCount; b++) {
        badges.push({
          tier: 'bronze',
          bg: '#D97706',
          rim: '#78350F',
          inner: '#FDBA74',
          label: '★',
          rMult: 0.92,
        });
      }
    }

    // Cap to max 5 visible at once
    const visibleBadges = badges.slice(0, 5);
    const n = visibleBadges.length;
    if (n === 0) return;

    // Stack vertically along the center sternum (avoids horizontal breast placement)
    const baseR = Math.max(16, Math.min(24, span * 0.12));
    const spacingY = baseR * 1.55;
    const startY = chestY - ((n - 1) * spacingY) / 2;

    ctx.save();

    // Top Honor Ribbon Clasp (styled like an Olympic / Scout achievement bar)
    const topPinY = startY - baseR * 0.95;
    const ribbonH = Math.max(22, (n - 1) * spacingY + baseR * 1.5);

    // Striped honor ribbon backing
    ctx.fillStyle = '#2563EB';
    ctx.beginPath();
    ctx.roundRect(chestX - 13, topPinY, 26, ribbonH, 4);
    ctx.fill();

    // Gold ribbon center stripe
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(chestX - 3, topPinY, 6, ribbonH);

    // Gold metallic pin bar at the top
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(chestX - 16, topPinY - 3, 32, 6, 3);
    ctx.fill();
    ctx.stroke();

    // Stacked medals hanging from ribbon vertically down the center
    for (let i = 0; i < n; i++) {
      const b = visibleBadges[i];
      const px = chestX;
      const py = startY + i * spacingY;
      const r = baseR * b.rMult;
      const sc = i === n - 1 ? this.badgePopScale : 1.0;

      ctx.save();
      ctx.translate(px, py);
      ctx.scale(sc, sc);

      // Subtle drop shadow for layered medal depth
      ctx.shadowColor = 'rgba(15, 23, 42, 0.45)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;

      // Shiny metallic medal circle
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = b.bg;
      ctx.fill();

      // Reset shadow for crisp border & star crest
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = b.rim;
      ctx.stroke();

      // Inner star crest
      this.drawStar(ctx, 0, 0, 5, r * 0.65, r * 0.3, b.inner, b.rim);

      ctx.restore();
    }
    ctx.restore();
  }

  drawBottomDiamondBar(ctx, canvasWidth, canvasHeight) {
    const barW = 460;
    const barH = 48;
    const barX = (canvasWidth - barW) / 2;
    const barY = canvasHeight - 62;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#BAE6FD';
    ctx.font = '900 14px system-ui, sans-serif';
    ctx.fillText('💎 DIAMONDS:', barX + 16, barY + barH / 2);

    const slotStartX = barX + 128;
    const slotSpacing = 31;
    for (let i = 0; i < 10; i++) {
      const sx = slotStartX + i * slotSpacing;
      const sy = barY + barH / 2;
      const earned = i < this.diamondsCount;

      ctx.save();
      ctx.translate(sx, sy);
      if (earned) {
        const pulse = 1 + Math.sin(this._animTime * 5 + i) * 0.08;
        ctx.scale(pulse, pulse);
        this.drawFacetedDiamond(ctx, 0, 0, 11);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  updateAndDrawFireworks(ctx, canvasWidth, canvasHeight, dt) {
    if (this.fireworksTimer > 0) {
      this.fireworksTimer -= dt;
      this._fireworkBurstCooldown -= dt;

      if (this._fireworkBurstCooldown <= 0) {
        this._fireworkBurstCooldown = 0.38;
        const bx = canvasWidth * (0.18 + Math.random() * 0.64);
        const by = canvasHeight * (0.16 + Math.random() * 0.42);
        const color = RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)];

        for (let k = 0; k < 22; k++) {
          const ang = (Math.PI * 2 * k) / 22 + (Math.random() - 0.5) * 0.15;
          const spd = 120 + Math.random() * 220;
          this.fireworkSparks.push({
            x: bx,
            y: by,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 5 + Math.random() * 5,
            color,
            life: 1.0,
            maxLife: 1.0,
          });
        }
        sound.playFanfare();
      }

      if (this.fireworksTimer <= 0) {
        // Reset diamond achievement cycle after the grand 10-diamond fireworks finale!
        this.diamondsCount = 0;
        this.bronzeCount = 0;
        this.silverCount = 0;
      }
    }

    for (let i = this.fireworkSparks.length - 1; i >= 0; i--) {
      const sp = this.fireworkSparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vy += 180 * dt;
      sp.life -= dt;
      if (sp.life <= 0) {
        this.fireworkSparks.splice(i, 1);
      } else {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
        this.drawStar(ctx, sp.x, sp.y, 5, sp.r, sp.r * 0.45, sp.color, '#FFFFFF');
        ctx.restore();
      }
    }

    if (this.fireworksTimer > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '900 42px system-ui, sans-serif';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 8;
      const msg = '🎆 10 DIAMONDS! SUPERSTAR EMILIA! 🎆';
      ctx.strokeText(msg, canvasWidth / 2, canvasHeight * 0.22);
      ctx.fillStyle = '#FACC15';
      ctx.fillText(msg, canvasWidth / 2, canvasHeight * 0.22);
      ctx.restore();
    }
  }

  /**
   * Bee Sting Effect: Flashing yellow aura + sad curved mouth on face (NO emoji covering her face!)
   */
  drawBeeStingEffect(ctx, player) {
    const { colliders } = player;
    if (!colliders || !colliders.head) return;

    const flashOn = Math.sin(this._animTime * 18) > -0.2;
    const { x, y, r } = colliders.head;

    ctx.save();
    if (flashOn) {
      ctx.beginPath();
      ctx.arc(x, y, r * 1.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#FACC15';
      ctx.stroke();
    }

    // Draw a simple cartoon sad frown curve on the lower face (instead of an emoji over her face!)
    if (this.mode !== 'avatar') {
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y + r * 0.48, r * 0.26, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 5;
    const msg =
      this.sadReason === 'snowball'
        ? `❄️ SNOWBALL HIT! 🥶 (${Math.ceil(this.sadTimer)}s)`
        : this.sadReason === 'lava'
        ? `🔥 FEET IN LAVA! JUMP! 🦘`
        : `OUCH! BUZZY BEE! 🐝 (${Math.ceil(this.sadTimer)}s)`;
    ctx.strokeText(msg, x, y - r * 1.25);
    ctx.fillStyle = '#FACC15';
    ctx.fillText(msg, x, y - r * 1.25);
    ctx.restore();
  }

  drawCartoonStickers(ctx, player, rainbowStreakActive = false, playerIdx = 0, totalPlayers = 1) {
    const { colliders } = player;
    if (!colliders) return;

    const isSadFlash = this.sadTimer > 0 && Math.sin(this._animTime * 18) > 0;
    const isPlayer2 = playerIdx === 1;

    // 1. Head Crown & Puppy Ears (hidden during Hat Stacker / Dance Party so hats stack directly on head)
    if (!this.hideHeadSticker && colliders.head && colliders.head.visibility > 0.4) {
      const { x, y, r } = colliders.head;
      ctx.save();

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = isSadFlash
        ? '#FACC15'
        : isPlayer2
        ? 'rgba(251, 146, 60, 0.55)'
        : 'rgba(255, 224, 102, 0.45)';
      ctx.lineWidth = isSadFlash ? 6 : 3.5;
      ctx.setLineDash([10, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      const crownY = y - r * 0.82;
      const earSize = Math.max(24, r * 0.55);

      // Left Puppy Ear
      ctx.fillStyle = isSadFlash ? '#FACC15' : isPlayer2 ? '#F4A261' : '#5B9BD5';
      ctx.strokeStyle = '#1E3A5F';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.65, crownY + earSize * 0.4);
      ctx.lineTo(x - r * 0.95, crownY - earSize * 0.75);
      ctx.lineTo(x - r * 0.2, crownY + earSize * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Puppy Ear
      ctx.fillStyle = isSadFlash ? '#FACC15' : isPlayer2 ? '#FB923C' : '#F4A261';
      ctx.beginPath();
      ctx.moveTo(x + r * 0.65, crownY + earSize * 0.4);
      ctx.lineTo(x + r * 0.95, crownY - earSize * 0.75);
      ctx.lineTo(x + r * 0.2, crownY + earSize * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden Mini Crown
      const cw = Math.max(28, r * 0.62);
      const ch = cw * 0.58;
      ctx.fillStyle = isPlayer2 ? '#38BDF8' : '#FFD166';
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - cw / 2, crownY + ch / 2);
      ctx.lineTo(x - cw / 2, crownY - ch / 2);
      ctx.lineTo(x - cw / 5, crownY);
      ctx.lineTo(x, crownY - ch * 0.7);
      ctx.lineTo(x + cw / 5, crownY);
      ctx.lineTo(x + cw / 2, crownY - ch / 2);
      ctx.lineTo(x + cw / 2, crownY + ch / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // When 2 players are active, show cute P1 / P2 badge above crown!
      if (totalPlayers > 1) {
        ctx.textAlign = 'center';
        ctx.font = '900 16px system-ui, sans-serif';
        ctx.fillStyle = isPlayer2 ? '#FB923C' : '#38BDF8';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 4;
        const pTag = isPlayer2 ? 'P2' : 'P1';
        ctx.strokeText(pTag, x, crownY - ch * 0.85);
        ctx.fillText(pTag, x, crownY - ch * 0.85);
      }

      ctx.restore();
    }

    // 2. Left & Right Hand Glowing Bopper Gloves
    ['leftHand', 'rightHand'].forEach((handKey, idx) => {
      const hand = colliders[handKey];
      if (!hand || hand.visibility < 0.3) return;

      const isLeft = idx === 0;
      const primaryColor = isSadFlash
        ? '#FACC15'
        : rainbowStreakActive
        ? '#FACC15'
        : isPlayer2
        ? isLeft
          ? '#F472B6'
          : '#A855F7'
        : isLeft
        ? '#38BDF8'
        : '#FB923C';
      const glowColor = isSadFlash
        ? 'rgba(250, 204, 21, 0.65)'
        : rainbowStreakActive
        ? 'rgba(250, 204, 21, 0.42)'
        : isPlayer2
        ? 'rgba(244, 114, 182, 0.32)'
        : isLeft
        ? 'rgba(56, 189, 248, 0.32)'
        : 'rgba(251, 146, 60, 0.32)';

      ctx.save();
      ctx.beginPath();
      ctx.arc(hand.x, hand.y, hand.r, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = primaryColor;
      ctx.stroke();

      this.drawStar(ctx, hand.x, hand.y, 5, hand.r * 0.48, hand.r * 0.24, '#FFFFFF', primaryColor);
      ctx.restore();
    });

    // 3. Foot Boppers
    ['leftFoot', 'rightFoot'].forEach((footKey) => {
      const foot = colliders[footKey];
      if (!foot || foot.visibility < 0.45) return;

      ctx.save();
      ctx.beginPath();
      ctx.arc(foot.x, foot.y, foot.r * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(167, 243, 208, 0.28)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#34D399';
      ctx.stroke();
      ctx.restore();
    });
  }

  drawCartoonAvatar(ctx, player, playerIdx = 0) {
    const lms = player.landmarksCanvas;
    const { colliders, shoulderSpanPx } = player;
    if (!lms || lms.length < 29) return;

    const isSad = this.sadTimer > 0;
    const isSadFlash = isSad && Math.sin(this._animTime * 18) > 0;
    // Player 1 = Bluey Blue (#60A5FA), Player 2 = Bingo Orange (#FB923C)!
    const baseFur = playerIdx === 1 ? '#FB923C' : '#60A5FA';
    const bellyColor = playerIdx === 1 ? '#FFEDD5' : '#DBEAFE';
    const bodyColor = isSadFlash ? '#FACC15' : baseFur;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const limbWidth = Math.max(18, shoulderSpanPx * 0.22);

    const lS = lms[11], rS = lms[12], lH = lms[23], rH = lms[24];
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(lS.x, lS.y);
    ctx.lineTo(rS.x, rS.y);
    ctx.lineTo(rH.x, rH.y);
    ctx.lineTo(lH.x, lH.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const midX = (lS.x + rS.x + lH.x + rH.x) / 4;
    const midY = (lS.y + rS.y + lH.y + rH.y) / 4;
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(
      midX,
      midY + shoulderSpanPx * 0.05,
      shoulderSpanPx * 0.28,
      shoulderSpanPx * 0.38,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    const drawLimb = (p1, p2, p3, color) => {
      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = limbWidth + 8;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = limbWidth;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.stroke();
    };

    drawLimb(lms[23], lms[25], lms[27], bodyColor);
    drawLimb(lms[24], lms[26], lms[28], bodyColor);
    drawLimb(lms[11], lms[13], lms[15], bodyColor);
    drawLimb(lms[12], lms[14], lms[16], bodyColor);

    if (colliders.head) {
      const { x, y, r } = colliders.head;
      const headR = r * 0.95;

      ctx.fillStyle = '#1E3A8A';
      ctx.beginPath();
      ctx.moveTo(x - headR * 0.7, y - headR * 0.4);
      ctx.lineTo(x - headR * 1.15, y - headR * 1.55);
      ctx.lineTo(x - headR * 0.15, y - headR * 0.85);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x + headR * 0.7, y - headR * 0.4);
      ctx.lineTo(x + headR * 1.15, y - headR * 1.55);
      ctx.lineTo(x + headR * 0.15, y - headR * 0.85);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, y, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.ellipse(x, y + headR * 0.22, headR * 0.48, headR * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      [-1, 1].forEach((dir) => {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(
          x + dir * headR * 0.34,
          y - headR * 0.18,
          headR * 0.18,
          headR * 0.24,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(x + dir * headR * 0.32, y - headR * 0.18, headR * 0.09, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(x, y + headR * 0.08, headR * 0.16, headR * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Happy smile normally, or sad frown if stung by bee!
      ctx.beginPath();
      if (isSad) {
        ctx.arc(x, y + headR * 0.42, headR * 0.2, 1.15 * Math.PI, 1.85 * Math.PI);
      } else {
        ctx.arc(x, y + headR * 0.2, headR * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
      }
      ctx.stroke();
    }

    ['leftHand', 'rightHand'].forEach((k) => {
      const h = colliders[k];
      if (!h) return;
      ctx.fillStyle = isSadFlash ? '#FACC15' : playerIdx === 1 ? '#FDBA74' : '#93C5FD';
      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }

  drawDiagnosticSkeleton(ctx, player, playerIdx = 0) {
    const lms = player.landmarksCanvas;
    const { colliders } = player;

    ctx.save();

    ctx.strokeStyle = playerIdx === 1 ? '#FB923C' : '#22D3EE';
    ctx.lineWidth = 4;
    for (const [i, j] of POSE_CONNECTIONS) {
      const p1 = lms[i];
      const p2 = lms[j];
      if (p1 && p2 && p1.visibility > 0.3 && p2.visibility > 0.3) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    for (let idx = 0; idx < lms.length; idx++) {
      const pt = lms[idx];
      if (!pt || pt.visibility < 0.3) continue;
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const col of Object.values(colliders)) {
      if (col.visibility < 0.3) continue;
      ctx.beginPath();
      ctx.arc(col.x, col.y, col.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(74, 222, 128, 0.22)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#4ADE80';
      ctx.stroke();
    }

    ctx.restore();
  }

  drawStar(ctx, cx, cy, spikes, outerR, innerR, fillStyle, strokeStyle) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerR;
      y = cy + Math.sin(rot) * outerR;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerR;
      y = cy + Math.sin(rot) * innerR;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }

  drawFacetedDiamond(ctx, cx, cy, r = 11) {
    ctx.save();
    ctx.translate(cx, cy);

    // Crown top
    const tw = r * 0.95;
    const bw = r * 1.35;
    const topY = -r * 0.85;
    const midY = -r * 0.2;
    const botY = r * 1.05;

    // Table facet
    ctx.fillStyle = '#E0F2FE';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-tw, topY);
    ctx.lineTo(tw, topY);
    ctx.lineTo(bw, midY);
    ctx.lineTo(-bw, midY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pavilion bottom
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(-bw, midY);
    ctx.lineTo(bw, midY);
    ctx.lineTo(0, botY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center sparkle facet
    ctx.fillStyle = '#BAE6FD';
    ctx.beginPath();
    ctx.moveTo(-tw * 0.45, topY);
    ctx.lineTo(tw * 0.45, topY);
    ctx.lineTo(0, midY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(bw * 0.5, midY);
    ctx.lineTo(0, botY);
    ctx.closePath();
    ctx.fill();

    // Top shine highlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-tw * 0.35, midY * 0.8, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
