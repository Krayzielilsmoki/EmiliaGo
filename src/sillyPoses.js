// Game 4: Silly Poses Photo Booth Game for EmiliaGO! (1P & 2P Support)
// - 1 Player: Pose picture on Left Half, Player on Right Half
// - 2 Players: Pose picture in the Middle, Player 1 on Left & Player 2 on Right!
// - 5-second countdown -> snaps photo -> plays giggling/laughing sound -> decorates photo with comic stickers ("COOL!", "AWESOME!")
// - Hold hand on "PLAY AGAIN" -> "Ready... Set... GO!" animation -> new random pose!
import { sound } from './sound.js';
import { settings } from './settings.js';
import { photoGallery } from './photoGallery.js';

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

    // Shuffled deck of 1..42 pose image indices
    this.poseDeck = [];
    this.currentPoseIdx = 1;
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

    // Offscreen 960x540 composite canvas for saving full final snaps to Gallery
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCanvas.width = 960;
    this.compositeCanvas.height = 540;
    this.compositeCtx = this.compositeCanvas.getContext('2d');

    // Hands-free "PLAY AGAIN" hover button state
    this.playAgainHold = 0;
    this._playAgainTick = -1;
    this._lastKnownPlayerBounds = null;

    // In-Game Silly Photos Gallery State
    this.isGalleryOpen = false;
    this.galleryPhotos = [];
    this.galleryPage = 0;
    this.selectedPhoto = null;
    this.galleryHold = 0;
    this._galleryTick = -1;
    this.galleryCloseHold = 0;
    this._galleryCloseTick = -1;
    this.galleryPrevHold = 0;
    this._galleryPrevTick = -1;
    this.galleryNextHold = 0;
    this._galleryNextTick = -1;
    this.galleryBackHold = 0;
    this._galleryBackTick = -1;
    this.galleryDeleteHold = 0;
    this._galleryDeleteTick = -1;
    this.galleryPhotoHolds = [0, 0, 0, 0];
    this._galleryPhotoTicks = [-1, -1, -1, -1];

    this.onMilestone = null;

    this._loadGalleryPhotos();
  }

  async _loadGalleryPhotos() {
    try {
      const photos = await photoGallery.getPhotos();
      for (const p of photos) {
        if (!p._img) {
          const img = new Image();
          img.src = p.dataUrl;
          p._img = img;
        }
      }
      this.galleryPhotos = photos;
    } catch (e) {
      console.warn('Failed to load gallery photos:', e);
    }
  }

  openGallery() {
    this.isGalleryOpen = true;
    this.selectedPhoto = null;
    this.galleryHold = 0;
    this._galleryTick = -1;
    this.galleryCloseHold = 0;
    this._galleryCloseTick = -1;
    this.galleryPrevHold = 0;
    this._galleryPrevTick = -1;
    this.galleryNextHold = 0;
    this._galleryNextTick = -1;
    this.galleryBackHold = 0;
    this._galleryBackTick = -1;
    this.galleryDeleteHold = 0;
    this._galleryDeleteTick = -1;
    this.galleryPhotoHolds = [0, 0, 0, 0];
    this._galleryPhotoTicks = [-1, -1, -1, -1];
    this.galleryPage = 0;
    this._loadGalleryPhotos();
  }

  closeGallery() {
    this.isGalleryOpen = false;
    this.selectedPhoto = null;
    this.galleryCloseHold = 0;
    this._galleryCloseTick = -1;
    this.galleryHold = 0;
    this._galleryTick = -1;
  }

  _playTapSound() {
    try {
      if (typeof sound.playPop === 'function') {
        this._playTapSound();
      } else if (typeof sound.playBubblePop === 'function') {
        sound.playBubblePop(false);
      }
    } catch {
      // ignore
    }
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
    this.currentPoseIdx = idx;
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

    if (this.isGalleryOpen) {
      this._updateGalleryInteraction(dt, safeBounds, player, pointer);
      return;
    }

    // Check Bottom-Left Gallery Button interaction
    this._updateGalleryButton(dt, safeBounds, player, pointer);
    if (this.isGalleryOpen) return;

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

    if (this.isGalleryOpen) {
      this._renderGalleryOverlay(ctx, cw, ch, safeBounds, player);
      return;
    }

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
      this._saveFinalSnapToGallery(cw, ch, safeBounds);

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

    // 4. Draw Bottom-Left Gallery Button
    this._drawGalleryButton(ctx, safeBounds);
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

  // ---------------------------------------------------------------------------
  // SILLY PHOTOS PERSISTENT GALLERY INTEGRATION
  // ---------------------------------------------------------------------------

  _saveFinalSnapToGallery(cw, ch, safeBounds) {
    try {
      const compW = 960;
      const compH = 540;
      if (this.compositeCanvas.width !== compW || this.compositeCanvas.height !== compH) {
        this.compositeCanvas.width = compW;
        this.compositeCanvas.height = compH;
      }
      const cCtx = this.compositeCtx;
      cCtx.clearRect(0, 0, compW, compH);
      cCtx.imageSmoothingEnabled = true;
      cCtx.imageSmoothingQuality = 'high';

      // 1. Dark Blue Gradient/Solid Backdrop
      cCtx.fillStyle = '#0F172A';
      cCtx.fillRect(0, 0, compW, compH);

      // Subtle decorative star sparkles
      cCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < 28; i++) {
        const sx = (i * 137.5) % compW;
        const sy = (i * 89.3) % compH;
        cCtx.beginPath();
        cCtx.arc(sx, sy, (i % 3) + 1.2, 0, Math.PI * 2);
        cCtx.fill();
      }

      // 2. Comparison Header Banner across the top
      cCtx.save();
      cCtx.font = '900 21px system-ui, sans-serif';
      cCtx.textAlign = 'center';
      cCtx.textBaseline = 'middle';
      cCtx.strokeStyle = '#020617';
      cCtx.lineWidth = 4;
      cCtx.strokeText('✨ HOW DID YOU DO? COMPARE YOUR POSE! ✨', compW * 0.58, 28);
      cCtx.fillStyle = '#FEF08A';
      cCtx.fillText('✨ HOW DID YOU DO? COMPARE YOUR POSE! ✨', compW * 0.58, 28);
      cCtx.restore();

      // 3. Center-Right Framed Zoomed Polaroid Photo of Emilia's Pose
      const pw = Math.min(540, compW * 0.60);
      const ph = Math.min(345, compH * 0.68);
      const photoCX = compW * 0.58;
      const photoCY = compH * 0.49;

      cCtx.save();
      cCtx.translate(photoCX, photoCY);

      // White Polaroid Frame with clean border
      cCtx.fillStyle = '#FFFFFF';
      cCtx.beginPath();
      cCtx.roundRect(-pw / 2 - 10, -ph / 2 - 10, pw + 20, ph + 38, 14);
      cCtx.fill();

      // Snapped Image
      if (this.photoCanvas && this.photoCanvas.width > 0) {
        cCtx.drawImage(this.photoCanvas, -pw / 2, -ph / 2, pw, ph);
      }

      cCtx.strokeStyle = '#CBD5E1';
      cCtx.lineWidth = 2;
      cCtx.strokeRect(-pw / 2, -ph / 2, pw, ph);

      // Caption banner on bottom Polaroid rim
      cCtx.fillStyle = '#1E293B';
      cCtx.font = '900 16px system-ui, cursive, sans-serif';
      cCtx.textAlign = 'center';
      cCtx.textBaseline = 'middle';
      cCtx.fillText('📸 YOUR POSE!', 0, ph / 2 + 15);
      cCtx.restore();

      // 4. Far Left: Target Pose Card
      const targetCardW = 160;
      const targetCardH = targetCardW * 1.15;
      const targetCardX = 32;
      const targetCardY = 66;
      this._drawPosePictureCard(cCtx, targetCardX, targetCardY, targetCardW, targetCardH, true, '🎯 TARGET POSE');

      // 5. Comic Stickers & Flair Words ("COOL!", "SUPERSTAR!", Emojis)
      const scaleX = compW / cw;
      const scaleY = compH / ch;
      for (let i = 0; i < this.photoStickers.length; i++) {
        const st = this.photoStickers[i];
        const sx = st.x * scaleX;
        const sy = st.y * scaleY;

        cCtx.save();
        cCtx.translate(sx, sy);
        cCtx.rotate(st.angle);

        if (st.type === 'word') {
          cCtx.font = '900 22px system-ui, sans-serif';
          const tw = cCtx.measureText(st.text).width + 30;
          const th = 38;
          cCtx.fillStyle = st.bg;
          cCtx.strokeStyle = '#FFFFFF';
          cCtx.lineWidth = 3.5;
          cCtx.beginPath();
          cCtx.roundRect(-tw / 2, -th / 2, tw, th, 19);
          cCtx.fill();
          cCtx.stroke();

          cCtx.textAlign = 'center';
          cCtx.textBaseline = 'middle';
          cCtx.fillStyle = st.fg;
          cCtx.fillText(st.text, 0, 1.5);
        } else {
          cCtx.font = `${Math.round(st.size * 0.72)}px system-ui, sans-serif`;
          cCtx.textAlign = 'center';
          cCtx.textBaseline = 'middle';
          cCtx.fillText(st.emoji, 0, 0);
        }
        cCtx.restore();
      }

      // 6. Watermark stamp at bottom left
      cCtx.save();
      cCtx.font = '700 12px system-ui, sans-serif';
      cCtx.fillStyle = '#94A3B8';
      cCtx.textAlign = 'left';
      cCtx.textBaseline = 'bottom';
      const now = new Date();
      const dateLabel = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      cCtx.fillText(`EmiliaGO • Silly Poses • ${dateLabel}`, 34, compH - 16);
      cCtx.restore();

      // 7. Save to Persistent Gallery
      const dataUrl = this.compositeCanvas.toDataURL('image/jpeg', 0.82);
      photoGallery
        .savePhoto({
          poseName: `Pose #${this.currentPoseIdx}`,
          dataUrl,
          stars: 3,
        })
        .then((newPhoto) => {
          if (newPhoto) {
            const img = new Image();
            img.src = newPhoto.dataUrl;
            newPhoto._img = img;
            this.galleryPhotos.unshift(newPhoto);
          }
        });
    } catch (err) {
      console.warn('Failed to save snap to gallery:', err);
    }
  }

  _updateGalleryButton(dt, safeBounds, player, pointer) {
    const gBtnX = safeBounds.left + 64;
    const gBtnY = safeBounds.bottom - 56;
    const gBtnR = 46;

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
      if (pointer.clicked && Math.hypot(pointer.x - gBtnX, pointer.y - gBtnY) < gBtnR + 25) {
        this._playTapSound();
        this.openGallery();
        return;
      }
    }

    let hovering = false;
    for (const h of hands) {
      if (Math.hypot(h.x - gBtnX, h.y - gBtnY) < gBtnR + (h.r || 38) * 0.65) {
        hovering = true;
        break;
      }
    }

    if (hovering) {
      this.galleryHold = Math.min(1.0, this.galleryHold + dt / 1.2);
      const step = Math.floor(this.galleryHold * 5);
      if (step > this._galleryTick) {
        this._galleryTick = step;
        sound.playCalibrationTick(this.galleryHold);
      }
      if (this.galleryHold >= 1.0) {
        this.galleryHold = 0;
        this._galleryTick = -1;
        this._playTapSound();
        this.openGallery();
      }
    } else {
      this.galleryHold = Math.max(0, this.galleryHold - dt * 2.0);
      if (this.galleryHold === 0) {
        this._galleryTick = -1;
      }
    }
  }

  _drawGalleryButton(ctx, safeBounds) {
    const gBtnX = safeBounds.left + 64;
    const gBtnY = safeBounds.bottom - 56;
    const gBtnR = 46;

    ctx.save();
    ctx.translate(gBtnX, gBtnY);

    // Glowing purple/violet circular button
    ctx.beginPath();
    ctx.arc(0, 0, gBtnR, 0, Math.PI * 2);
    ctx.fillStyle = '#8B5CF6';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FEF08A';
    ctx.stroke();

    // Icon & Label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText('🖼️', 0, -10);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 13px system-ui, sans-serif';
    ctx.fillText('GALLERY', 0, 16);

    // Photo Count Badge
    if (this.galleryPhotos.length > 0) {
      const badgeX = gBtnR * 0.65;
      const badgeY = -gBtnR * 0.65;
      const countStr = String(this.galleryPhotos.length);
      ctx.font = '900 13px system-ui, sans-serif';
      const bw = Math.max(24, ctx.measureText(countStr).width + 12);
      ctx.beginPath();
      ctx.roundRect(badgeX - bw / 2, badgeY - 11, bw, 22, 11);
      ctx.fillStyle = '#EC4899';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(countStr, badgeX, badgeY + 1);
    }

    // Hover hold progress ring
    if (this.galleryHold > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, gBtnR + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.galleryHold);
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  _getGalleryCardBoxes(safeBounds) {
    const availW = safeBounds.right - safeBounds.left - 180;
    const availH = safeBounds.bottom - safeBounds.top - 120;
    const cardW = Math.min(420, (availW - 30) / 2);
    const cardH = Math.min(236, (availH - 24) / 2);
    const startX = (safeBounds.left + safeBounds.right) / 2 - cardW - 15;
    const startY = safeBounds.top + 80;

    return [
      { x: startX, y: startY, w: cardW, h: cardH },
      { x: startX + cardW + 30, y: startY, w: cardW, h: cardH },
      { x: startX, y: startY + cardH + 20, w: cardW, h: cardH },
      { x: startX + cardW + 30, y: startY + cardH + 20, w: cardW, h: cardH },
    ];
  }

  _updateGalleryInteraction(dt, safeBounds, player, pointer) {
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

    // A. FULL SCREEN PICTURE VIEWER INTERACTION
    if (this.selectedPhoto !== null) {
      // 1. Back to Grid Button (top-left)
      const backX = safeBounds.left + 54;
      const backY = safeBounds.top + 36;
      const backR = 34;

      if (
        pointer &&
        pointer.active &&
        pointer.clicked &&
        Math.hypot(pointer.x - backX, pointer.y - backY) < backR + 20
      ) {
        this._playTapSound();
        this.selectedPhoto = null;
        return;
      }

      let hoveringBack = false;
      for (const h of hands) {
        if (Math.hypot(h.x - backX, h.y - backY) < backR + (h.r || 38) * 0.65) {
          hoveringBack = true;
          break;
        }
      }
      if (hoveringBack) {
        this.galleryBackHold = Math.min(1.0, this.galleryBackHold + dt / 1.1);
        const step = Math.floor(this.galleryBackHold * 5);
        if (step > this._galleryBackTick) {
          this._galleryBackTick = step;
          sound.playCalibrationTick(this.galleryBackHold);
        }
        if (this.galleryBackHold >= 1.0) {
          this.galleryBackHold = 0;
          this._galleryBackTick = -1;
          this._playTapSound();
          this.selectedPhoto = null;
          return;
        }
      } else {
        this.galleryBackHold = Math.max(0, this.galleryBackHold - dt * 2.0);
        if (this.galleryBackHold === 0) this._galleryBackTick = -1;
      }

      // 2. Delete Photo Button (top-right)
      const delX = safeBounds.right - 54;
      const delY = safeBounds.top + 36;
      const delR = 34;

      if (
        pointer &&
        pointer.active &&
        pointer.clicked &&
        Math.hypot(pointer.x - delX, pointer.y - delY) < delR + 20
      ) {
        this._playTapSound();
        const delId = this.selectedPhoto.id;
        photoGallery.deletePhoto(delId);
        this.galleryPhotos = this.galleryPhotos.filter((p) => p.id !== delId);
        this.selectedPhoto = null;
        if (this.galleryPage * 4 >= this.galleryPhotos.length && this.galleryPage > 0) {
          this.galleryPage--;
        }
        return;
      }

      let hoveringDelete = false;
      for (const h of hands) {
        if (Math.hypot(h.x - delX, h.y - delY) < delR + (h.r || 38) * 0.65) {
          hoveringDelete = true;
          break;
        }
      }
      if (hoveringDelete) {
        this.galleryDeleteHold = Math.min(1.0, this.galleryDeleteHold + dt / 1.6);
        const step = Math.floor(this.galleryDeleteHold * 5);
        if (step > this._galleryDeleteTick) {
          this._galleryDeleteTick = step;
          sound.playCalibrationTick(this.galleryDeleteHold);
        }
        if (this.galleryDeleteHold >= 1.0) {
          this.galleryDeleteHold = 0;
          this._galleryDeleteTick = -1;
          this._playTapSound();
          const delId = this.selectedPhoto.id;
          photoGallery.deletePhoto(delId);
          this.galleryPhotos = this.galleryPhotos.filter((p) => p.id !== delId);
          this.selectedPhoto = null;
          if (this.galleryPage * 4 >= this.galleryPhotos.length && this.galleryPage > 0) {
            this.galleryPage--;
          }
          return;
        }
      } else {
        this.galleryDeleteHold = Math.max(0, this.galleryDeleteHold - dt * 2.0);
        if (this.galleryDeleteHold === 0) this._galleryDeleteTick = -1;
      }

      // 3. Side Navigation Arrows in Full Screen (if multiple photos)
      if (this.galleryPhotos.length > 1) {
        const curIdx = this.galleryPhotos.findIndex((p) => p.id === this.selectedPhoto.id);
        const midY = (safeBounds.top + safeBounds.bottom) / 2;
        const arrowLeftX = safeBounds.left + 46;
        const arrowRightX = safeBounds.right - 46;
        const arrowR = 36;

        // Prev Arrow
        if (curIdx > 0) {
          if (
            pointer &&
            pointer.active &&
            pointer.clicked &&
            Math.hypot(pointer.x - arrowLeftX, pointer.y - midY) < arrowR + 20
          ) {
            this._playTapSound();
            this.selectedPhoto = this.galleryPhotos[curIdx - 1];
            return;
          }
          let hoveringPrev = hands.some(
            (h) => Math.hypot(h.x - arrowLeftX, h.y - midY) < arrowR + (h.r || 38) * 0.65
          );
          if (hoveringPrev) {
            this.galleryPrevHold = Math.min(1.0, this.galleryPrevHold + dt / 1.0);
            if (this.galleryPrevHold >= 1.0) {
              this.galleryPrevHold = 0;
              this._playTapSound();
              this.selectedPhoto = this.galleryPhotos[curIdx - 1];
              return;
            }
          } else {
            this.galleryPrevHold = Math.max(0, this.galleryPrevHold - dt * 2.0);
          }
        }

        // Next Arrow
        if (curIdx < this.galleryPhotos.length - 1) {
          if (
            pointer &&
            pointer.active &&
            pointer.clicked &&
            Math.hypot(pointer.x - arrowRightX, pointer.y - midY) < arrowR + 20
          ) {
            this._playTapSound();
            this.selectedPhoto = this.galleryPhotos[curIdx + 1];
            return;
          }
          let hoveringNext = hands.some(
            (h) => Math.hypot(h.x - arrowRightX, h.y - midY) < arrowR + (h.r || 38) * 0.65
          );
          if (hoveringNext) {
            this.galleryNextHold = Math.min(1.0, this.galleryNextHold + dt / 1.0);
            if (this.galleryNextHold >= 1.0) {
              this.galleryNextHold = 0;
              this._playTapSound();
              this.selectedPhoto = this.galleryPhotos[curIdx + 1];
              return;
            }
          } else {
            this.galleryNextHold = Math.max(0, this.galleryNextHold - dt * 2.0);
          }
        }
      }
      return;
    }

    // B. GRID VIEW (2x2 Grid of Photos)
    // 1. Close Button (top-right)
    const closeX = safeBounds.right - 64;
    const closeY = safeBounds.top + 36;
    const closeR = 36;

    if (
      pointer &&
      pointer.active &&
      pointer.clicked &&
      Math.hypot(pointer.x - closeX, pointer.y - closeY) < closeR + 20
    ) {
      this._playTapSound();
      this.closeGallery();
      return;
    }

    let hoveringClose = false;
    for (const h of hands) {
      if (Math.hypot(h.x - closeX, h.y - closeY) < closeR + (h.r || 38) * 0.65) {
        hoveringClose = true;
        break;
      }
    }
    if (hoveringClose) {
      this.galleryCloseHold = Math.min(1.0, this.galleryCloseHold + dt / 1.1);
      const step = Math.floor(this.galleryCloseHold * 5);
      if (step > this._galleryCloseTick) {
        this._galleryCloseTick = step;
        sound.playCalibrationTick(this.galleryCloseHold);
      }
      if (this.galleryCloseHold >= 1.0) {
        this.galleryCloseHold = 0;
        this._galleryCloseTick = -1;
        this._playTapSound();
        this.closeGallery();
        return;
      }
    } else {
      this.galleryCloseHold = Math.max(0, this.galleryCloseHold - dt * 2.0);
      if (this.galleryCloseHold === 0) this._galleryCloseTick = -1;
    }

    // 2. Pagination (Prev / Next Page)
    const midY = (safeBounds.top + safeBounds.bottom) / 2;
    const prevX = safeBounds.left + 50;
    const nextX = safeBounds.right - 50;
    const navR = 38;

    if (this.galleryPage > 0) {
      if (
        pointer &&
        pointer.active &&
        pointer.clicked &&
        Math.hypot(pointer.x - prevX, pointer.y - midY) < navR + 20
      ) {
        this._playTapSound();
        this.galleryPage--;
        return;
      }
      let hoveringPrev = hands.some(
        (h) => Math.hypot(h.x - prevX, h.y - midY) < navR + (h.r || 38) * 0.65
      );
      if (hoveringPrev) {
        this.galleryPrevHold = Math.min(1.0, this.galleryPrevHold + dt / 1.1);
        if (this.galleryPrevHold >= 1.0) {
          this.galleryPrevHold = 0;
          this._playTapSound();
          this.galleryPage--;
          return;
        }
      } else {
        this.galleryPrevHold = Math.max(0, this.galleryPrevHold - dt * 2.0);
      }
    } else {
      this.galleryPrevHold = 0;
    }

    const totalPages = Math.max(1, Math.ceil(this.galleryPhotos.length / 4));
    if (this.galleryPage < totalPages - 1) {
      if (
        pointer &&
        pointer.active &&
        pointer.clicked &&
        Math.hypot(pointer.x - nextX, pointer.y - midY) < navR + 20
      ) {
        this._playTapSound();
        this.galleryPage++;
        return;
      }
      let hoveringNext = hands.some(
        (h) => Math.hypot(h.x - nextX, h.y - midY) < navR + (h.r || 38) * 0.65
      );
      if (hoveringNext) {
        this.galleryNextHold = Math.min(1.0, this.galleryNextHold + dt / 1.1);
        if (this.galleryNextHold >= 1.0) {
          this.galleryNextHold = 0;
          this._playTapSound();
          this.galleryPage++;
          return;
        }
      } else {
        this.galleryNextHold = Math.max(0, this.galleryNextHold - dt * 2.0);
      }
    } else {
      this.galleryNextHold = 0;
    }

    // 3. Photo Cards in 2x2 Grid
    const startIdx = this.galleryPage * 4;
    const pagePhotos = this.galleryPhotos.slice(startIdx, startIdx + 4);
    const cardBoxes = this._getGalleryCardBoxes(safeBounds);

    for (let i = 0; i < 4; i++) {
      if (i >= pagePhotos.length) {
        this.galleryPhotoHolds[i] = 0;
        this._galleryPhotoTicks[i] = -1;
        continue;
      }
      const box = cardBoxes[i];
      const p = pagePhotos[i];

      // Pointer click
      if (pointer && pointer.active && pointer.clicked) {
        if (
          pointer.x >= box.x &&
          pointer.x <= box.x + box.w &&
          pointer.y >= box.y &&
          pointer.y <= box.y + box.h
        ) {
          this._playTapSound();
          this.selectedPhoto = p;
          return;
        }
      }

      // Hands hovering card
      let hovering = false;
      for (const h of hands) {
        if (
          h.x >= box.x - 15 &&
          h.x <= box.x + box.w + 15 &&
          h.y >= box.y - 15 &&
          h.y <= box.y + box.h + 15
        ) {
          hovering = true;
          break;
        }
      }

      if (hovering) {
        this.galleryPhotoHolds[i] = Math.min(1.0, this.galleryPhotoHolds[i] + dt / 1.1);
        const step = Math.floor(this.galleryPhotoHolds[i] * 5);
        if (step > this._galleryPhotoTicks[i]) {
          this._galleryPhotoTicks[i] = step;
          sound.playCalibrationTick(this.galleryPhotoHolds[i]);
        }
        if (this.galleryPhotoHolds[i] >= 1.0) {
          this.galleryPhotoHolds[i] = 0;
          this._galleryPhotoTicks[i] = -1;
          this._playTapSound();
          this.selectedPhoto = p;
          return;
        }
      } else {
        this.galleryPhotoHolds[i] = Math.max(0, this.galleryPhotoHolds[i] - dt * 2.0);
        if (this.galleryPhotoHolds[i] === 0) {
          this._galleryPhotoTicks[i] = -1;
        }
      }
    }
  }

  _renderGalleryOverlay(ctx, cw, ch, safeBounds, player) {
    ctx.save();

    // A. FULL SCREEN PICTURE VIEWER
    if (this.selectedPhoto !== null) {
      const p = this.selectedPhoto;

      // Deep cinematic dark backdrop
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, cw, ch);

      // Maximize to true full screen (16:9 aspect ratio)
      const maxW = cw * 0.96;
      const maxH = ch * 0.94;
      let pw = maxW;
      let ph = pw * (9 / 16);
      if (ph > maxH) {
        ph = maxH;
        pw = ph * (16 / 9);
      }
      const photoCX = cw / 2;
      const photoCY = ch / 2;

      ctx.save();
      ctx.translate(photoCX, photoCY);

      // Rounded photo region
      ctx.beginPath();
      ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 18);
      ctx.save();
      ctx.clip();

      if (p._img && p._img.complete && p._img.naturalWidth > 0) {
        ctx.drawImage(p._img, -pw / 2, -ph / 2, pw, ph);
      } else {
        if (!p._img && p.dataUrl) {
          const img = new Image();
          img.src = p.dataUrl;
          p._img = img;
        }
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      }
      ctx.restore();

      // Crisp clean border
      ctx.beginPath();
      ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 18);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      ctx.restore();

      // Floating Bottom Detail Pill
      const curIdx = this.galleryPhotos.findIndex((item) => item.id === p.id);
      const pillText = `📸 ${p.poseName} • ${p.dateStr}  (${curIdx + 1} of ${this.galleryPhotos.length})`;
      ctx.save();
      ctx.font = '900 16px system-ui, sans-serif';
      const tw = ctx.measureText(pillText).width + 36;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(cw / 2 - tw / 2, ch / 2 + ph / 2 - 40, tw, 30, 15);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(pillText, cw / 2, ch / 2 + ph / 2 - 25);
      ctx.restore();

      // 1. Floating Back Button (top-left)
      const backX = safeBounds.left + 54;
      const backY = safeBounds.top + 36;
      const backR = 34;
      ctx.save();
      ctx.translate(backX, backY);
      ctx.beginPath();
      ctx.arc(0, 0, backR, 0, Math.PI * 2);
      ctx.fillStyle = '#2563EB';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 14px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('🔙 BACK', 0, 1);

      if (this.galleryBackHold > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, backR + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.galleryBackHold);
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();

      // 2. Floating Delete Button (top-right)
      const delX = safeBounds.right - 54;
      const delY = safeBounds.top + 36;
      const delR = 34;
      ctx.save();
      ctx.translate(delX, delY);
      ctx.beginPath();
      ctx.arc(0, 0, delR, 0, Math.PI * 2);
      ctx.fillStyle = '#DC2626';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 13px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('🗑️ DELETE', 0, 1);

      if (this.galleryDeleteHold > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, delR + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.galleryDeleteHold);
        ctx.strokeStyle = '#FCA5A5';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();

      // 3. Side Navigation Arrows in Full Screen (if multiple photos)
      if (this.galleryPhotos.length > 1) {
        const midY = (safeBounds.top + safeBounds.bottom) / 2;
        const arrowLeftX = safeBounds.left + 46;
        const arrowRightX = safeBounds.right - 46;
        const arrowR = 36;

        if (curIdx > 0) {
          ctx.save();
          ctx.translate(arrowLeftX, midY);
          ctx.beginPath();
          ctx.arc(0, 0, arrowR, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#FEF08A';
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 24px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('◀', 0, 1);
          if (this.galleryPrevHold > 0) {
            ctx.beginPath();
            ctx.arc(
              0,
              0,
              arrowR + 6,
              -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * this.galleryPrevHold
            );
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 6;
            ctx.stroke();
          }
          ctx.restore();
        }

        if (curIdx < this.galleryPhotos.length - 1) {
          ctx.save();
          ctx.translate(arrowRightX, midY);
          ctx.beginPath();
          ctx.arc(0, 0, arrowR, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#FEF08A';
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 24px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('▶', 0, 1);
          if (this.galleryNextHold > 0) {
            ctx.beginPath();
            ctx.arc(
              0,
              0,
              arrowR + 6,
              -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * this.galleryNextHold
            );
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 6;
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      this._drawGalleryHands(ctx, player);
      ctx.restore();
      return;
    }

    // B. GRID VIEW
    // Dark Backdrop
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(0, 0, cw, ch);

    // Top Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 32px system-ui, sans-serif';
    ctx.fillStyle = '#FEF08A';
    ctx.fillText('🖼️ SILLY PHOTOS GALLERY', cw / 2, safeBounds.top + 32);

    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(
      `${this.galleryPhotos.length} Saved Snap${this.galleryPhotos.length === 1 ? '' : 's'}`,
      cw / 2,
      safeBounds.top + 58
    );
      // 1. Close Button (top-right)
      const closeX = safeBounds.right - 64;
      const closeY = safeBounds.top + 36;
      const closeR = 36;
      ctx.save();
      ctx.translate(closeX, closeY);
      ctx.beginPath();
      ctx.arc(0, 0, closeR, 0, Math.PI * 2);
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 15px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('✖ CLOSE', 0, 1);

      if (this.galleryCloseHold > 0) {
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          closeR + 6,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * this.galleryCloseHold
        );
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();

      // Empty state
      if (this.galleryPhotos.length === 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '64px system-ui, sans-serif';
        ctx.fillText('📸', cw / 2, ch * 0.44);

        ctx.font = '900 28px system-ui, sans-serif';
        ctx.fillStyle = '#FEF08A';
        ctx.fillText('No Silly Photos Saved Yet!', cw / 2, ch * 0.54);

        ctx.font = '600 18px system-ui, sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(
          'Play Silly Poses and copy funny poses to collect hilarious snaps! ✨',
          cw / 2,
          ch * 0.6
        );
        ctx.restore();
      } else {
        // Draw 2x2 Photo Cards
        const startIdx = this.galleryPage * 4;
        const pagePhotos = this.galleryPhotos.slice(startIdx, startIdx + 4);
        const cardBoxes = this._getGalleryCardBoxes(safeBounds);

        for (let i = 0; i < pagePhotos.length; i++) {
          const p = pagePhotos[i];
          const box = cardBoxes[i];
          const hold = this.galleryPhotoHolds[i] || 0;

          ctx.save();
          // Card shadow and white background
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(box.x, box.y, box.w, box.h, 14);
          ctx.fill();

          // If hovered, glowing border
          if (hold > 0) {
            ctx.lineWidth = 5;
            ctx.strokeStyle = '#FACC15';
            ctx.stroke();
          } else {
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#CBD5E1';
            ctx.stroke();
          }

          // Card image (16:9 inner area)
          const imgH = box.h - 32;
          const pad = 6;
          if (p._img && p._img.complete && p._img.naturalWidth > 0) {
            ctx.drawImage(p._img, box.x + pad, box.y + pad, box.w - pad * 2, imgH - pad);
          } else {
            if (!p._img && p.dataUrl) {
              const img = new Image();
              img.src = p.dataUrl;
              p._img = img;
            }
            ctx.fillStyle = '#1E293B';
            ctx.fillRect(box.x + pad, box.y + pad, box.w - pad * 2, imgH - pad);
          }

          // Card Footer
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#0F172A';
          ctx.font = '900 13px system-ui, sans-serif';
          ctx.fillText(`📸 ${p.poseName} • ${p.dateStr}`, box.x + box.w / 2, box.y + box.h - 15);

          // Hold Progress Ring over card center
          if (hold > 0) {
            const cx = box.x + box.w / 2;
            const cy = box.y + imgH / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 32, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hold);
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 14px system-ui, sans-serif';
            ctx.fillText('VIEW', cx, cy + 1);
          }
          ctx.restore();
        }

        // Pagination side arrows
        const midY = (safeBounds.top + safeBounds.bottom) / 2;
        const prevX = safeBounds.left + 50;
        const nextX = safeBounds.right - 50;
        const navR = 38;
        const totalPages = Math.ceil(this.galleryPhotos.length / 4);

        if (this.galleryPage > 0) {
          ctx.save();
          ctx.translate(prevX, midY);
          ctx.beginPath();
          ctx.arc(0, 0, navR, 0, Math.PI * 2);
          ctx.fillStyle = '#1E293B';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#94A3B8';
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 24px system-ui, sans-serif';
          ctx.fillText('◀', 0, 1);
          if (this.galleryPrevHold > 0) {
            ctx.beginPath();
            ctx.arc(
              0,
              0,
              navR + 6,
              -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * this.galleryPrevHold
            );
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 6;
            ctx.stroke();
          }
          ctx.restore();
        }

        if (this.galleryPage < totalPages - 1) {
          ctx.save();
          ctx.translate(nextX, midY);
          ctx.beginPath();
          ctx.arc(0, 0, navR, 0, Math.PI * 2);
          ctx.fillStyle = '#1E293B';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#94A3B8';
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 24px system-ui, sans-serif';
          ctx.fillText('▶', 0, 1);
          if (this.galleryNextHold > 0) {
            ctx.beginPath();
            ctx.arc(
              0,
              0,
              navR + 6,
              -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * this.galleryNextHold
            );
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 6;
            ctx.stroke();
          }
          ctx.restore();
        }

        // Page Indicator
        ctx.save();
        ctx.font = '900 16px system-ui, sans-serif';
        ctx.fillStyle = '#FEF08A';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Page ${this.galleryPage + 1} of ${totalPages}`, cw / 2, safeBounds.bottom - 22);
        ctx.restore();
      }

    // Hand Cursors in Gallery Overlay
    this._drawGalleryHands(ctx, player);
    ctx.restore();
  }

  _drawGalleryHands(ctx, player) {
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
          ctx.arc(h.x, h.y, 24, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(250, 204, 21, 0.55)';
          ctx.fill();
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
        }
      }
    }
  }
}
