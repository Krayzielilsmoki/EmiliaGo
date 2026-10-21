// Game 4: Silly Poses Photo Booth Game for EmiliaGO! (1P & 2P Support)
// - 1 Player: Pose picture on Left Half, Player on Right Half
// - 2 Players: Pose picture in the Middle, Player 1 on Left & Player 2 on Right!
// - 5-second countdown -> snaps photo -> plays giggling/laughing sound -> decorates photo with comic stickers ("COOL!", "AWESOME!")
// - Hold hand on "PLAY AGAIN" -> "Ready... Set... GO!" animation -> new random pose!
import { sound } from './sound.js';
import { settings } from './settings.js';

const TOTAL_POSE_IMAGES = 42;

const FLAIR_WORDS = [
  { text: 'AWESOME!! 🌟', bg: '#FACC15', fg: '#0F172A', border: '#B45309' },
  { text: 'SO SILLY!! 🤪', bg: '#EC4899', fg: '#FFFFFF', border: '#831843' },
  { text: 'SUPER COOL!! 😎', bg: '#38BDF8', fg: '#0F172A', border: '#0369A1' },
  { text: 'WACKADOO!! 🐾', bg: '#FB923C', fg: '#FFFFFF', border: '#9A3412' },
  { text: 'BRILLIANT!! 🎉', bg: '#4ADE80', fg: '#0F172A', border: '#15803D' },
  { text: 'NAILED IT!! 👑', bg: '#A855F7', fg: '#FFFFFF', border: '#581C87' },
];

const FLAIR_EMOJIS = ['😂', '🤪', '🤩', '🎉', '🌟', '👑', '🦄', '🎸', '🎈', '🌈', '🔥', '🐶'];

export class SillyPosesGame {
  constructor() {
    this.score = 0;
    this.bestScore = settings.data.bestSillyPoses || 0;

    // Shuffled deck of 1..24 pose image indices
    this.poseDeck = [];
    this.currentPoseImg = null;
    this.currentPoseLoaded = false;

    // Game Phases: 'ready_set_go' | 'countdown' | 'result'
    this.phase = 'ready_set_go';
    this.phaseTimer = 2.1;
    this.lastCountdownSec = 6;
    this.flashAlpha = 0;
    this.animTime = 0;

    // Captured photo snapshot canvas + randomized stickers
    this.photoCanvas = document.createElement('canvas');
    this.photoCanvas.width = 1280;
    this.photoCanvas.height = 720;
    this.photoCtx = this.photoCanvas.getContext('2d');
    this.photoStickers = [];

    // Hands-free "PLAY AGAIN" hover button state
    this.playAgainHold = 0;
    this._playAgainTick = -1;
    this._lastKnownPlayerBounds = null;

    this.onMilestone = null;
  }

  _nextPoseImage() {
    if (this.poseDeck.length === 0) {
      this.poseDeck = Array.from({ length: TOTAL_POSE_IMAGES }, (_, i) => i + 1);
      for (let i = this.poseDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.poseDeck[i], this.poseDeck[j]] = [this.poseDeck[j], this.poseDeck[i]];
      }
    }
    const idx = this.poseDeck.pop();
    this.currentPoseLoaded = false;
    const img = new Image();
    img.onload = () => {
      this.currentPoseLoaded = true;
    };
    img.src = `/poses/${idx}.png`;
    this.currentPoseImg = img;
  }

  reset() {
    this.score = 0;
    this.startNewRound(false);
  }

  startNewRound(withReadySetGo = true) {
    this._nextPoseImage();
    this.playAgainHold = 0;
    this._playAgainTick = -1;
    this._lastKnownPlayerBounds = null;
    this.flashAlpha = 0;

    if (withReadySetGo) {
      this.phase = 'ready_set_go';
      this.phaseTimer = 2.25;
      this.lastCountdownSec = 4;
    } else {
      this.phase = 'countdown';
      this.phaseTimer = 5.0;
      this.lastCountdownSec = 6;
    }
  }

  _generatePhotoStickers(cw, ch) {
    const word1 = FLAIR_WORDS[Math.floor(Math.random() * FLAIR_WORDS.length)];
    let word2 = FLAIR_WORDS[Math.floor(Math.random() * FLAIR_WORDS.length)];
    if (word2 === word1) {
      word2 = FLAIR_WORDS[(FLAIR_WORDS.indexOf(word1) + 1) % FLAIR_WORDS.length];
    }

    const pickedEmojis = [];
    for (let i = 0; i < 6; i++) {
      pickedEmojis.push(FLAIR_EMOJIS[Math.floor(Math.random() * FLAIR_EMOJIS.length)]);
    }

    this.photoStickers = [
      {
        type: 'word',
        ...word1,
        x: cw * 0.78,
        y: ch * 0.12,
        angle: 0.08,
      },
      {
        type: 'word',
        ...word2,
        x: cw * 0.20,
        y: ch * 0.72,
        angle: -0.08,
      },
      { type: 'emoji', emoji: pickedEmojis[0], x: cw * 0.44, y: ch * 0.11, size: 66, angle: -0.15 },
      { type: 'emoji', emoji: pickedEmojis[1], x: cw * 0.94, y: ch * 0.20, size: 70, angle: 0.20 },
      { type: 'emoji', emoji: pickedEmojis[2], x: cw * 0.10, y: ch * 0.84, size: 66, angle: 0.15 },
      { type: 'emoji', emoji: pickedEmojis[3], x: cw * 0.94, y: ch * 0.50, size: 64, angle: -0.10 },
    ];
  }

  update(dt, safeBounds, player, pointer, onMilestone) {
    this.animTime += dt;
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.8);
    }

    // Keep running bounding box of players for rock-solid zoom framing
    if (this.phase === 'ready_set_go' || this.phase === 'countdown') {
      const activePlayers =
        player && player.allPlayers && player.allPlayers.length > 0
          ? player.allPlayers
          : player && player.detected
          ? [player]
          : [];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      let validCount = 0;
      for (const p of activePlayers) {
        if (p.landmarksCanvas && p.landmarksCanvas.length > 0) {
          for (const lm of p.landmarksCanvas) {
            if (lm && (lm.visibility === undefined || lm.visibility > 0.35)) {
              if (lm.x < minX) minX = lm.x;
              if (lm.x > maxX) maxX = lm.x;
              if (lm.y < minY) minY = lm.y;
              if (lm.y > maxY) maxY = lm.y;
              validCount++;
            }
          }
        }
        if (p.colliders) {
          for (const k of Object.keys(p.colliders)) {
            const c = p.colliders[k];
            if (c && c.visibility > 0.3) {
              const r = c.r || 28;
              if (c.x - r < minX) minX = c.x - r;
              if (c.x + r > maxX) maxX = c.x + r;
              if (c.y - r < minY) minY = c.y - r;
              if (c.y + r > maxY) maxY = c.y + r;
              validCount++;
            }
          }
        }
      }
      if (validCount >= 4 && isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
        this._lastKnownPlayerBounds = { minX, maxX, minY, maxY };
      }
    }

    if (this.phase === 'ready_set_go') {
      this.phaseTimer -= dt;
      const step = Math.ceil(this.phaseTimer / 0.75);
      if (step < this.lastCountdownSec && step >= 1) {
        this.lastCountdownSec = step;
        sound.playCalibrationTick(0.3 + (3 - step) * 0.3);
      }
      if (this.phaseTimer <= 0) {
        this.phase = 'countdown';
        this.phaseTimer = 5.0;
        this.lastCountdownSec = 6;
        sound.playBalloonHit(5);
      }
      return;
    }

    if (this.phase === 'countdown') {
      this.phaseTimer -= dt;
      const sec = Math.ceil(this.phaseTimer);
      if (sec < this.lastCountdownSec && sec >= 1 && sec <= 5) {
        this.lastCountdownSec = sec;
        sound.playCalibrationTick((6 - sec) / 5);
      }
      // Snapshot occurs inside renderAndUpdate when phaseTimer <= 0 so the live canvas is captured!
      return;
    }

    if (this.phase === 'result') {
      // Hands-free "PLAY AGAIN" bubble at bottom-center (leaves bottom-right free for Home button!)
      const btnX = (safeBounds.left + safeBounds.right) / 2;
      const btnY = safeBounds.bottom - 56;
      const btnR = 64;

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
        if (pointer.clicked && Math.hypot(pointer.x - btnX, pointer.y - btnY) < btnR + 25) {
          sound.playFanfare();
          this.startNewRound(true);
          return;
        }
      }

      let hoveringPlayAgain = false;
      for (const h of hands) {
        if (Math.hypot(h.x - btnX, h.y - btnY) < btnR + (h.r || 38) * 0.65) {
          hoveringPlayAgain = true;
          break;
        }
      }

      if (hoveringPlayAgain) {
        this.playAgainHold = Math.min(1.0, this.playAgainHold + dt / 1.5);
        const step = Math.floor(this.playAgainHold * 5);
        if (step > this._playAgainTick) {
          this._playAgainTick = step;
          sound.playCalibrationTick(this.playAgainHold);
        }
        if (this.playAgainHold >= 1.0) {
          sound.playFanfare();
          this.startNewRound(true);
        }
      } else {
        this.playAgainHold = Math.max(0, this.playAgainHold - dt * 1.5);
        if (this.playAgainHold === 0) {
          this._playAgainTick = -1;
        }
      }
    }
  }

  render(ctx, canvas, safeBounds, player, onMilestone, tracker) {
    const cw = canvas.width;
    const ch = canvas.height;
    const isTwoPlayer =
      (player && player.playerCount >= 2) || settings.data.twoPlayerMode === 'always_2p';

    // 1. Check if 5-second countdown just finished -> SNAP PICTURE FIRST (Clean video, zero UI occlusion!)
    if (this.phase === 'countdown' && this.phaseTimer <= 0) {
      const targetCanvasW = 1920;
      const targetCanvasH = 1080;
      if (this.photoCanvas.width !== targetCanvasW || this.photoCanvas.height !== targetCanvasH) {
        this.photoCanvas.width = targetCanvasW;
        this.photoCanvas.height = targetCanvasH;
      }
      this.photoCtx.clearRect(0, 0, targetCanvasW, targetCanvasH);
      this.photoCtx.imageSmoothingEnabled = true;
      this.photoCtx.imageSmoothingQuality = 'high';

      // Auto-Crop & Dynamic Zoom directly to Emilia's pose bounding box!
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      let validCount = 0;
      const activePlayers =
        player && player.allPlayers && player.allPlayers.length > 0
          ? player.allPlayers
          : player && player.detected
          ? [player]
          : [];

      for (const p of activePlayers) {
        if (p.landmarksCanvas && p.landmarksCanvas.length > 0) {
          for (const lm of p.landmarksCanvas) {
            if (lm && (lm.visibility === undefined || lm.visibility > 0.35)) {
              if (lm.x < minX) minX = lm.x;
              if (lm.x > maxX) maxX = lm.x;
              if (lm.y < minY) minY = lm.y;
              if (lm.y > maxY) maxY = lm.y;
              validCount++;
            }
          }
        }
        if (p.colliders) {
          for (const k of Object.keys(p.colliders)) {
            const c = p.colliders[k];
            if (c && c.visibility > 0.3) {
              const r = c.r || 28;
              if (c.x - r < minX) minX = c.x - r;
              if (c.x + r > maxX) maxX = c.x + r;
              if (c.y - r < minY) minY = c.y - r;
              if (c.y + r > maxY) maxY = c.y + r;
              validCount++;
            }
          }
        }
      }

      let cropBounds = null;
      if (validCount >= 4 && isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
        cropBounds = { minX, maxX, minY, maxY };
      } else if (this._lastKnownPlayerBounds) {
        cropBounds = this._lastKnownPlayerBounds;
      }

      if (cropBounds) {
        const bodyW = cropBounds.maxX - cropBounds.minX;
        const bodyH = cropBounds.maxY - cropBounds.minY;
        const centerX = (cropBounds.minX + cropBounds.maxX) / 2;
        const centerY = (cropBounds.minY + cropBounds.maxY) / 2;

        // Dynamic Zoom: scale the crop window so Emilia's body fills ~75% of the photo height!
        const targetBoxH = Math.max(260, bodyH * 1.30);
        let cropH = Math.min(ch * 0.92, targetBoxH);
        let cropW = cropH * (cw / ch);
        if (cropW > cw) {
          cropW = cw;
          cropH = cw / (cw / ch);
        }

        let cropX = centerX - cropW / 2;
        let cropY = centerY - cropH / 2;
        // Clamp crop window inside canvas boundaries
        cropX = Math.max(0, Math.min(cw - cropW, cropX));
        cropY = Math.max(0, Math.min(ch - cropH, cropY));

        this.photoCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, targetCanvasW, targetCanvasH);
      } else {
        this.photoCtx.drawImage(canvas, 0, 0, targetCanvasW, targetCanvasH);
      }

      this._generatePhotoStickers(cw, ch);

      this.phase = 'result';
      this.flashAlpha = 1.0;
      this.score++;
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        settings.data.bestSillyPoses = this.bestScore;
        settings.save();
      }

      sound.playCameraShutter();
      sound.playCelebrationClip(true);

      const milestoneCb = onMilestone || this.onMilestone;
      if (milestoneCb && this.score % 3 === 0) {
        milestoneCb(this.score);
      }
    }

    // 2. During 'ready_set_go' or 'countdown', draw the Pose Card + Countdown Badge!
    if (this.phase === 'ready_set_go' || this.phase === 'countdown') {
      this._drawSplitPoseLayout(ctx, cw, ch, safeBounds, isTwoPlayer);

      if (this.phase === 'ready_set_go') {
        const label =
          this.phaseTimer > 1.5
            ? 'READY...'
            : this.phaseTimer > 0.75
            ? 'SET...'
            : 'GO! POSE! 📸';
        const color =
          this.phaseTimer > 1.5
            ? '#38BDF8'
            : this.phaseTimer > 0.75
            ? '#FACC15'
            : '#4ADE80';

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.fillRect(0, 0, cw, ch);

        const scale = 1 + Math.sin(this.animTime * 14) * 0.08;
        ctx.translate(cw / 2, ch / 2);
        ctx.scale(scale, scale);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 92px system-ui, sans-serif';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 14;
        ctx.strokeText(label, 0, 0);
        ctx.fillStyle = color;
        ctx.fillText(label, 0, 0);
        ctx.restore();
      } else if (this.phase === 'countdown') {
        // Draw Big 5-Second Countdown Badge (top center)
        const secLeft = Math.max(1, Math.ceil(this.phaseTimer));
        const frac = this.phaseTimer - Math.floor(this.phaseTimer);
        const badgeX = cw / 2;
        const badgeY = isTwoPlayer
          ? safeBounds.top + 42 + Math.min(220, cw * 0.175) * 1.08 + 38
          : safeBounds.top + 68;

        ctx.save();
        ctx.translate(badgeX, badgeY);
        const pulse = 1 + Math.sin(frac * Math.PI) * 0.14;
        ctx.scale(pulse, pulse);

        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.fillStyle = secLeft <= 2 ? '#EF4444' : '#0F172A';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#FACC15';
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 42px system-ui, sans-serif';
        ctx.fillText(String(secLeft), 0, 3);

        ctx.font = '900 18px system-ui, sans-serif';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 5;
        ctx.strokeText('📸 COPY THE POSE!', 0, 58);
        ctx.fillStyle = '#FEF08A';
        ctx.fillText('📸 COPY THE POSE!', 0, 58);
        ctx.restore();
      }
    }

    // 2. During 'result' phase: display the snapped Polaroid Photo + Target Pose Card comparison + Comic Stickers + "PLAY AGAIN" bubble!
    if (this.phase === 'result') {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, cw, ch);

      // Comparison Header across the top
      ctx.save();
      ctx.font = '900 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 5;
      ctx.strokeText('✨ HOW DID YOU DO? COMPARE YOUR POSE! ✨', cw * 0.58, safeBounds.top + 16);
      ctx.fillStyle = '#FEF08A';
      ctx.fillText('✨ HOW DID YOU DO? COMPARE YOUR POSE! ✨', cw * 0.58, safeBounds.top + 16);
      ctx.restore();

      // 1. Center-Right: Framed Zoomed Polaroid Photo of Emilia's Pose (drawn first)
      const pw = Math.min(800, cw * 0.63);
      const ph = Math.min(500, ch * 0.70);
      const photoCX = cw * 0.58;
      const photoCY = ch * 0.46;

      ctx.save();
      ctx.translate(photoCX, photoCY);
      ctx.rotate(Math.sin(this.animTime * 2) * 0.010);

      // White Polaroid Frame with rich shadow
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.roundRect(-pw / 2 - 14, -ph / 2 - 14, pw + 28, ph + 46, 20);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Snapped Zoomed Image inside Polaroid
      ctx.drawImage(this.photoCanvas, -pw / 2, -ph / 2, pw, ph);

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);

      // Caption banner on bottom Polaroid rim
      ctx.fillStyle = '#1E293B';
      ctx.font = '900 20px system-ui, cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📸 YOUR POSE!', 0, ph / 2 + 18);
      ctx.restore();

      // 2. Far Top-Left Corner: Target Pose Card (shifted cleanly below top bar, fully visible!)
      const targetCardW = Math.min(210, cw * 0.17);
      const targetCardH = targetCardW * 1.15;
      const targetCardX = safeBounds.left + 16;
      const targetCardY = Math.max(76, safeBounds.top + 72);
      this._drawPosePictureCard(ctx, targetCardX, targetCardY, targetCardW, targetCardH, true, '🎯 TARGET POSE');

      // Draw Funny Stickers & Flair Words ("COOL!", "AWESOME!", Emojis)
      for (let i = 0; i < this.photoStickers.length; i++) {
        const st = this.photoStickers[i];
        const pop = 1 + Math.sin(this.animTime * 5 + i) * 0.05;
        ctx.save();
        ctx.translate(st.x, st.y);
        ctx.rotate(st.angle);
        ctx.scale(pop, pop);

        if (st.type === 'word') {
          ctx.font = '900 32px system-ui, sans-serif';
          const tw = ctx.measureText(st.text).width + 44;
          const th = 54;
          ctx.fillStyle = st.bg;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.roundRect(-tw / 2, -th / 2, tw, th, 27);
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = st.fg;
          ctx.fillText(st.text, 0, 2);
        } else {
          ctx.font = `${st.size}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(st.emoji, 0, 0);
        }
        ctx.restore();
      }

      // Draw Hands-Free "🔄 PLAY AGAIN!" Bubble at bottom-center (leaves bottom-right free for Home button!)
      const btnX = (safeBounds.left + safeBounds.right) / 2;
      const btnY = safeBounds.bottom - 56;
      const btnR = 64;
      const bob = Math.sin(this.animTime * 4) * 5;

      ctx.save();
      ctx.translate(btnX, btnY + bob);

      ctx.beginPath();
      ctx.arc(0, 0, btnR, 0, Math.PI * 2);
      ctx.fillStyle = '#22C55E';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#FEF08A';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '34px system-ui, sans-serif';
      ctx.fillText('📸', 0, -14);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 17px system-ui, sans-serif';
      ctx.fillText('PLAY AGAIN!', 0, 18);

      if (this.playAgainHold > 0) {
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          btnR + 9,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * this.playAgainHold
        );
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();

      // Draw subtle hand cursor indicators during the result screen so player can easily aim for "PLAY AGAIN!"
      const activePlayers =
        player && player.allPlayers && player.allPlayers.length > 0
          ? player.allPlayers
          : player && player.detected
          ? [player]
          : [];
      for (const pObj of activePlayers) {
        if (!pObj.colliders) continue;
        for (const hk of ['leftHand', 'rightHand']) {
          const h = pObj.colliders[hk];
          if (h && h.visibility > 0.3) {
            ctx.beginPath();
            ctx.arc(h.x, h.y, 26, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
            ctx.fill();
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    }

    // 3. Camera Shutter White Flash Overlay
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }
  }

  _drawSplitPoseLayout(ctx, cw, ch, safeBounds, isTwoPlayer) {
    const topY = safeBounds.top + 42;
    const availH = safeBounds.bottom - topY - 12;

    ctx.save();
    if (!isTwoPlayer) {
      // 1-PLAYER LAYOUT:
      // Silly Pose Card docked compactly in TOP-LEFT corner below top bar (leaving 85%+ open room space!)
      const cardW = Math.min(240, cw * 0.20);
      const cardH = cardW * 1.15;
      const cardX = safeBounds.left + 16;
      const cardY = Math.max(76, safeBounds.top + 72);

      this._drawPosePictureCard(ctx, cardX, cardY, cardW, cardH, true);
    } else {
      // 2-PLAYER LAYOUT:
      // Two LARGE Player Boxes on Left & Right (45% screen width each!),
      // and a SMALLER, HIGHER Silly Pose Card docked at the top-center!
      const sideW = cw * 0.45;
      const sideH = availH * 0.92;
      const sideY = topY + (availH - sideH) / 2;
      const leftX = cw * 0.03;
      const rightX = cw * 0.52;

      this._drawPlayerViewFrame(ctx, leftX, sideY, sideW, sideH, 'PLAYER 1 💙', '#38BDF8');
      this._drawPlayerViewFrame(ctx, rightX, sideY, sideW, sideH, 'PLAYER 2 🧡', '#FB923C');

      const centerW = Math.min(220, cw * 0.175);
      const centerH = centerW * 1.08;
      const centerX = (cw - centerW) / 2;
      const centerY = topY;

      this._drawPosePictureCard(ctx, centerX, centerY, centerW, centerH, true);
    }
    ctx.restore();
  }

  _drawPosePictureCard(ctx, x, y, w, h, isCompact = false, customFooter = null) {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = isCompact ? 5 : 7;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, isCompact ? 18 : 26);
    ctx.fill();
    ctx.stroke();

    const footerH = isCompact ? 26 : 34;
    if (this.currentPoseImg && this.currentPoseLoaded) {
      const pad = isCompact ? 8 : 18;
      const iw = this.currentPoseImg.naturalWidth || 512;
      const ih = this.currentPoseImg.naturalHeight || 512;
      const scale = Math.min((w - pad * 2) / iw, (h - pad * 2 - footerH) / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = x + (w - dw) / 2;
      const dy = y + (h - footerH - dh) / 2;
      ctx.drawImage(this.currentPoseImg, dx, dy, dw, dh);
    }

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.roundRect(x + w * 0.08, y + h - footerH - 4, w * 0.84, footerH - 2, (footerH - 2) / 2);
    ctx.fill();

    const label = customFooter || (isCompact ? '🤪 COPY POSE!' : '🤪 SILLY POSE TO COPY!');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0F172A';
    ctx.font = `900 ${isCompact ? 12 : 16}px system-ui, sans-serif`;
    ctx.fillText(label, x + w / 2, y + h - footerH / 2 - 2);
    ctx.restore();
  }

  _drawPlayerViewFrame(ctx, x, y, w, h, label, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.setLineDash([16, 10]);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 26);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 80, y + h - 42, 160, 32, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 15px system-ui, sans-serif';
    ctx.fillText(label, x + w / 2, y + h - 25);
    ctx.restore();
  }
}
