// Game 5: Dance Party Game for EmiliaGO! (1P & 2P Support)
// 1. Slot-Machine / Carousel Dress-Up: Spins & locks Head Accessory, Top, and Bottom one at a time!
// 2. Velvet Stage Curtains Open: Plays full-length songs from Emilia's Music Folder, renders the outfit on body,
//    applies fun Disco Video Filters, and fills the Dance Energy Bar to trigger theme changes & fireworks!
// 3. Random "FREEZE!": Frosts the screen, pauses the music for 5 seconds — hold still to win a cheer, or move and crack the ice!
import { sound, DANCE_PARTY_TRACKS } from './sound.js';
import { settings } from './settings.js';

const HEAD_OPTIONS = [
  { id: 'crown', name: 'Royal Crown', icon: '👑', color: '#FACC15' },
  { id: 'shades', name: 'Star Shades', icon: '🕶️', color: '#EC4899' },
  { id: 'party', name: 'Disco Party Hat', icon: '🥳', color: '#38BDF8' },
  { id: 'unicorn', name: 'Unicorn Horn', icon: '🦄', color: '#C084FC' },
  { id: 'cowboy', name: 'Sheriff Hat', icon: '🤠', color: '#F97316' },
];

const TOP_OPTIONS = [
  { id: 'disco_vest', name: 'Neon Disco Vest', icon: '🦺', primary: '#EC4899', secondary: '#FACC15' },
  { id: 'hero_cape', name: 'Superhero Shirt', icon: '🦸', primary: '#EF4444', secondary: '#38BDF8' },
  { id: 'princess_top', name: 'Sparkle Gown Top', icon: '👗', primary: '#A855F7', secondary: '#FBCFE8' },
  { id: 'star_jacket', name: 'Gold Star Jacket', icon: '🌟', primary: '#F59E0B', secondary: '#FEF08A' },
  { id: 'tropical', name: 'Beach Party Shirt', icon: '🌺', primary: '#10B981', secondary: '#FDE047' },
];

const BOTTOM_OPTIONS = [
  { id: 'tutu', name: 'Pink Fluffy Tutu', icon: '🩰', primary: '#F472B6', secondary: '#FBCFE8' },
  { id: 'bell_bottoms', name: 'Disco Shorts', icon: '🪩', primary: '#38BDF8', secondary: '#FEF08A' },
  { id: 'rainbow_skirt', name: 'Rainbow Skirt', icon: '🌈', primary: '#4ADE80', secondary: '#FACC15' },
  { id: 'star_pants', name: 'Rockstar Pants', icon: '🎸', primary: '#8B5CF6', secondary: '#DDD6FE' },
];

const PARTY_THEMES = [
  { name: 'Disco Rainbow Lights', tint: 'rgba(236, 72, 153, 0.14)', beamColors: ['#EC4899', '#38BDF8', '#FACC15'] },
  { name: 'Neon Cyber Glow', tint: 'rgba(56, 189, 248, 0.16)', beamColors: ['#22D3EE', '#4ADE80', '#A855F7'] },
  { name: 'Sunshine Fiesta', tint: 'rgba(250, 204, 21, 0.15)', beamColors: ['#FACC15', '#FB923C', '#EF4444'] },
  { name: 'Royal Purple Party', tint: 'rgba(168, 85, 247, 0.16)', beamColors: ['#C084FC', '#F472B6', '#38BDF8'] },
];

export class DancePartyGame {
  constructor() {
    this.score = 0; // Number of Dance Bar fills & Freeze wins!
    this.bestScore = settings.data.bestDanceParty || 0;

    // Phases: 'dress_up' | 'curtain_open' | 'dancing' | 'freeze' | 'freeze_result' | 'song_ended'
    this.phase = 'dress_up';
    this.phaseTimer = 0;
    this.animTime = 0;
    this._lastSlotTick = 0;

    // Outfit selection locked by the 3-reel slot machine
    this.outfit = {
      head: HEAD_OPTIONS[0],
      top: TOP_OPTIONS[0],
      bottom: BOTTOM_OPTIONS[0],
    };
    this.reelsLocked = [false, false, false];

    // Stage Curtain Progress (0 = closed, 1 = fully open)
    this.curtainOpen = 0;

    // Music Track Deck
    this.trackDeck = [];
    this.currentTrack = null;

    // Dance Energy Bar (0..100) & Party Theme
    this.danceEnergy = 0;
    this.themeIdx = 0;
    this.particles = [];
    this.floatingTexts = [];

    // FREEZE! state
    this.nextFreezeTimer = 18.0;
    this.freezeGraceTimer = 0;
    this.freezeHoldTimer = 5.0;
    this.iceCracked = false;
    this.lastFreezeSec = 6;

    // Hands-free buttons ('Next Outfit/Song' in corner, or 'Play Again' at song end)
    this.respinHold = 0;
    this._respinTick = -1;

    this.onMilestone = null;
  }

  _pickRandomTrack() {
    if (this.trackDeck.length === 0) {
      this.trackDeck = [...DANCE_PARTY_TRACKS];
      for (let i = this.trackDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.trackDeck[i], this.trackDeck[j]] = [this.trackDeck[j], this.trackDeck[i]];
      }
    }
    this.currentTrack = this.trackDeck.pop();
    return this.currentTrack;
  }

  reset() {
    this.score = 0;
    this.particles = [];
    this.floatingTexts = [];
    this.startNewDanceRound();
  }

  stopAudio() {
    sound.stopDanceTrack();
    sound.stopLavaClip();
  }

  startNewDanceRound() {
    sound.stopDanceTrack();
    sound.stopLavaClip();
    this.phase = 'dress_up';
    this.phaseTimer = 0;
    this.curtainOpen = 0;
    this.reelsLocked = [false, false, false];
    this.danceEnergy = 0;
    this.respinHold = 0;
    this._respinTick = -1;

    // Pick final randomized outfit items
    this.outfit = {
      head: HEAD_OPTIONS[Math.floor(Math.random() * HEAD_OPTIONS.length)],
      top: TOP_OPTIONS[Math.floor(Math.random() * TOP_OPTIONS.length)],
      bottom: BOTTOM_OPTIONS[Math.floor(Math.random() * BOTTOM_OPTIONS.length)],
    };
    this._pickRandomTrack();
  }

  update(dt, safeBounds, player, pointer, onMilestone) {
    this.animTime += dt;

    // Update particles & floating texts
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 240 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 50 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // 1. Slot Machine Dress-Up Phase (Reels stop one at a time!)
    if (this.phase === 'dress_up') {
      this.phaseTimer += dt;
      if (this.phaseTimer - this._lastSlotTick > 0.14 && !this.reelsLocked[2]) {
        this._lastSlotTick = this.phaseTimer;
        sound.playCalibrationTick(0.4);
      }

      if (this.phaseTimer >= 1.15 && !this.reelsLocked[0]) {
        this.reelsLocked[0] = true;
        sound.playBalloonHit(2);
      }
      if (this.phaseTimer >= 2.25 && !this.reelsLocked[1]) {
        this.reelsLocked[1] = true;
        sound.playBalloonHit(5);
      }
      if (this.phaseTimer >= 3.35 && !this.reelsLocked[2]) {
        this.reelsLocked[2] = true;
        sound.playFanfare();
      }
      if (this.phaseTimer >= 4.25) {
        this.phase = 'curtain_open';
        this.phaseTimer = 0;
        // Start playing the selected full-length song from Music Folder!
        if (this.currentTrack) {
          sound.startDanceTrack(this.currentTrack.url, () => {
            this.phase = 'song_ended';
            this.respinHold = 0;
            // Play YouDidIt celebratory finale song!
            sound.playLavaClip('youdidit', 1, null, 1.6);
            this.spawnFireworkBurst(
              (safeBounds.left + safeBounds.right) / 2,
              safeBounds.top + safeBounds.height * 0.35
            );
          });
        }
      }
      return;
    }

    // 2. Stage Curtains Opening Phase
    if (this.phase === 'curtain_open') {
      this.curtainOpen = Math.min(1.0, this.curtainOpen + dt * 0.85);
      if (this.curtainOpen >= 1.0) {
        this.phase = 'dancing';
        // Trigger FREEZE! randomly between 30 and 45 seconds into the dance party
        this.nextFreezeTimer = 30.0 + Math.random() * 15.0;
        this.spawnFloatingText(
          (safeBounds.left + safeBounds.right) / 2,
          safeBounds.top + 130,
          "🎉 DANCE PARTY! LET'S DANCE! 🪩",
          '#FACC15'
        );
      }
      return;
    }

    // Compute total player dance movement speed (across 1 or 2 players!)
    const activePlayers =
      player && player.allPlayers && player.allPlayers.length > 0
        ? player.allPlayers
        : player && player.detected
        ? [player]
        : [];
    let totalMotion = 0;
    for (const pObj of activePlayers) {
      totalMotion += pObj.motionSpeed || 0;
    }
    if (pointer && pointer.active) {
      totalMotion += 8;
    }

    // 3. Active Dancing Phase
    if (this.phase === 'dancing') {
      // Require active dancing effort to fill the bar (~25-35s of energetic dancing, 0% when standing still)
      const activeMovement = Math.max(0, totalMotion - 3.5);
      const danceRate = activePlayers.length > 0 || (pointer && pointer.active)
        ? Math.min(4.2, activeMovement * 0.14)
        : 0;
      this.danceEnergy += danceRate * dt;

      if (this.danceEnergy >= 100) {
        this.danceEnergy = 0;
        this.score++;
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          settings.data.bestDanceParty = this.bestScore;
          settings.save();
        }
        // Switch party filter theme & launch fireworks (without interrupting the song with audio!)
        this.themeIdx = (this.themeIdx + 1) % PARTY_THEMES.length;
        const newTheme = PARTY_THEMES[this.themeIdx];
        this.spawnFireworkBurst(
          (safeBounds.left + safeBounds.right) / 2,
          safeBounds.top + safeBounds.height * 0.35
        );
        this.spawnFloatingText(
          (safeBounds.left + safeBounds.right) / 2,
          safeBounds.top + 135,
          `🎆 MEGA GROOVE BURST! ${newTheme.name.toUpperCase()}! 🪩`,
          '#FACC15'
        );
        const milestoneCb = onMilestone || this.onMilestone;
        if (milestoneCb) {
          milestoneCb(this.score);
        }
      }

      // Check hands-free "🎰 NEW OUTFIT / SONG" bubble in top-right corner
      this._updateRespinBubble(
        dt,
        safeBounds.right - 68,
        safeBounds.top + 64,
        44,
        activePlayers,
        pointer
      );

      // Countdown to next random FREEZE! (30 to 45 seconds)
      this.nextFreezeTimer -= dt;
      if (this.nextFreezeTimer <= 0) {
        this.phase = 'freeze';
        this.freezeGraceTimer = 1.35; // 1.35s to hear "Freeze!" and strike a statue pose
        this.freezeHoldTimer = 5.0;
        this.iceCracked = false;
        this.lastFreezeSec = 6;
        this._freezeAnchors = null;
        sound.pauseDanceTrack();
        sound.playFreezeChime();
        sound.speakVoice('cue_freeze', true);
      }
      return;
    }

    // 4. FREEZE! Challenge Phase (5 seconds of holding still while screen is frosted!)
    if (this.phase === 'freeze') {
      if (this.freezeGraceTimer > 0) {
        this.freezeGraceTimer -= dt;
        if (this.freezeGraceTimer <= 0) {
          // Capture each player's frozen statue anchor coordinates
          this._freezeAnchors = activePlayers.map((pObj) => ({
            head: pObj.colliders?.head ? { x: pObj.colliders.head.x, y: pObj.colliders.head.y } : null,
            leftHand: pObj.colliders?.leftHand ? { x: pObj.colliders.leftHand.x, y: pObj.colliders.leftHand.y } : null,
            rightHand: pObj.colliders?.rightHand ? { x: pObj.colliders.rightHand.x, y: pObj.colliders.rightHand.y } : null,
          }));
        }
        return;
      }

      this.freezeHoldTimer -= dt;
      const sec = Math.ceil(this.freezeHoldTimer);
      if (sec < this.lastFreezeSec && sec >= 1 && sec <= 5) {
        this.lastFreezeSec = sec;
        sound.playCalibrationTick((6 - sec) / 5);
      }

      // Check if any player moved away from their frozen statue pose (or fast motion > 38)
      let movedDuringFreeze = totalMotion > 38;
      if (!movedDuringFreeze && this._freezeAnchors && activePlayers.length > 0) {
        for (let i = 0; i < Math.min(this._freezeAnchors.length, activePlayers.length); i++) {
          const anc = this._freezeAnchors[i];
          const cols = activePlayers[i].colliders;
          if (!anc || !cols) continue;
          for (const key of ['head', 'leftHand', 'rightHand']) {
            if (anc[key] && cols[key] && cols[key].visibility > 0.35) {
              const drift = Math.hypot(cols[key].x - anc[key].x, cols[key].y - anc[key].y);
              if (drift > 82) {
                movedDuringFreeze = true;
                break;
              }
            }
          }
          if (movedDuringFreeze) break;
        }
      }

      if (movedDuringFreeze) {
        this.iceCracked = true;
        this.phase = 'freeze_result';
        this.phaseTimer = 1.0;
        sound.playIceSlipAndCrack();
        sound.resumeDanceTrack(); // Immediately resume music with zero delay!
        this.spawnFloatingText(
          (safeBounds.left + safeBounds.right) / 2,
          safeBounds.top + safeBounds.height * 0.45,
          '🧊 CRACK! YOU MOVED! 🤪',
          '#FCA5A5'
        );
        return;
      }

      // Held still for all 5 seconds!
      if (this.freezeHoldTimer <= 0) {
        this.iceCracked = false;
        this.phase = 'freeze_result';
        this.phaseTimer = 1.0;
        this.score++;
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          settings.data.bestDanceParty = this.bestScore;
          settings.save();
        }
        sound.resumeDanceTrack(); // Immediately resume music with zero delay!
        this.spawnFireworkBurst(
          (safeBounds.left + safeBounds.right) / 2,
          safeBounds.top + safeBounds.height * 0.35
        );
        this.spawnFloatingText(
          (safeBounds.left + safeBounds.right) / 2,
          safeBounds.top + safeBounds.height * 0.45,
          '❄️ PERFECT FREEZE! DANCE ON! 🌟',
          '#4ADE80'
        );
      }
      return;
    }

    // 5. Brief Freeze Result celebration/crack display while song rocks on
    if (this.phase === 'freeze_result') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.phase = 'dancing';
        // Next FREEZE! randomly between 30 and 45 seconds
        this.nextFreezeTimer = 30.0 + Math.random() * 15.0;
      }
      return;
    }

    // 6. Song Ended Phase: Big "PLAY AGAIN" bubble in center
    if (this.phase === 'song_ended') {
      this._updateRespinBubble(
        dt,
        (safeBounds.left + safeBounds.right) / 2,
        safeBounds.top + safeBounds.height * 0.58,
        78,
        activePlayers,
        pointer
      );
    }
  }

  _updateRespinBubble(dt, bx, by, br, activePlayers, pointer) {
    const hands = [];
    for (const pObj of activePlayers) {
      if (!pObj.colliders) continue;
      if (pObj.colliders.leftHand && pObj.colliders.leftHand.visibility > 0.3) {
        hands.push(pObj.colliders.leftHand);
      }
      if (pObj.colliders.rightHand && pObj.colliders.rightHand.visibility > 0.3) {
        hands.push(pObj.colliders.rightHand);
      }
    }
    if (pointer && pointer.active) hands.push(pointer);

    let inside = false;
    for (const h of hands) {
      if (Math.hypot(h.x - bx, h.y - by) < br + (h.r || 38) * 0.55) {
        inside = true;
        break;
      }
    }

    if (inside) {
      this.respinHold = Math.min(1.0, this.respinHold + dt / 1.6);
      const step = Math.floor(this.respinHold * 5);
      if (step > this._respinTick) {
        this._respinTick = step;
        sound.playCalibrationTick(this.respinHold);
      }
      if (this.respinHold >= 1.0) {
        this.startNewDanceRound();
      }
    } else {
      this.respinHold = Math.max(0, this.respinHold - dt * 1.5);
      if (this.respinHold === 0) this._respinTick = -1;
    }
  }

  spawnFireworkBurst(x, y) {
    const palette = ['#FACC15', '#EC4899', '#38BDF8', '#4ADE80', '#A855F7', '#FFFFFF'];
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= 40) break;
      const a = (Math.PI * 2 * i) / 20;
      const spd = 120 + Math.random() * 200;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 60,
        r: 6 + Math.random() * 5,
        color: palette[i % palette.length],
        life: 0.75,
        maxLife: 0.75,
      });
    }
  }

  spawnFloatingText(x, y, text, color = '#FFFFFF') {
    this.floatingTexts.push({ x, y, text, color, life: 1.4, maxLife: 1.4 });
  }

  render(ctx, canvasWidth, canvasHeight, safeBounds, player) {
    const activePlayers =
      player && player.allPlayers && player.allPlayers.length > 0
        ? player.allPlayers
        : player && player.detected
        ? [player]
        : [];

    // 1. Draw Disco Party Video Filter, Dance Floor, Spotlights & Disco Ball when curtains are open!
    if (this.phase !== 'dress_up') {
      const theme = PARTY_THEMES[this.themeIdx % PARTY_THEMES.length];
      ctx.save();
      ctx.fillStyle = theme.tint;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Interactive Illuminated Dance Floor Tiles at stage bottom
      this._drawDanceFloor(ctx, canvasWidth, canvasHeight, safeBounds, activePlayers, theme);

      // Sweeping Disco Spotlight Beams from ceiling
      for (let b = 0; b < 3; b++) {
        const pivotX = canvasWidth * (0.22 + b * 0.28);
        const sway = Math.sin(this.animTime * 2.2 + b * 1.8) * 0.42;
        ctx.save();
        ctx.translate(pivotX, 0);
        ctx.rotate(sway);
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = theme.beamColors[b % theme.beamColors.length];
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(-210, canvasHeight);
        ctx.lineTo(210, canvasHeight);
        ctx.lineTo(25, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Faceted 3D Mirror Disco Ball suspended from ceiling
      this._drawDiscoBall(ctx, canvasWidth, canvasHeight, safeBounds, theme);

      ctx.restore();

      // 2. Draw the Randomized Outfit (Head, Top, Bottom) on each detected player!
      for (const pObj of activePlayers) {
        this._drawOutfitOnPlayer(ctx, pObj);
      }
    }

    // 3. Draw Freeze Frost & Ice Cracks Overlay during 'freeze' or 'freeze_result'
    if (this.phase === 'freeze' || this.phase === 'freeze_result') {
      this._drawFreezeIceOverlay(ctx, canvasWidth, canvasHeight);
    }

    // 4. Draw Velvet Stage Curtains during 'dress_up' or 'curtain_open'
    if (this.phase === 'dress_up' || this.phase === 'curtain_open') {
      this._drawStageCurtains(ctx, canvasWidth, canvasHeight, this.curtainOpen);
    }

    // 5. Draw 3-Reel Slot Machine Dress-Up Carousel during 'dress_up'
    if (this.phase === 'dress_up') {
      this._drawDressUpCarousel(ctx, canvasWidth, canvasHeight);
    }

    // 6. Draw Unified Groove Meter & Re-Spin Button during 'dancing'
    if (this.phase === 'dancing') {
      this._drawGrooveMeter(ctx, canvasWidth, safeBounds);
      this._drawActionBubble(
        ctx,
        safeBounds.right - 68,
        safeBounds.top + 64,
        44,
        '🎰',
        'NEW OUTFIT',
        this.respinHold
      );
    }

    // 7. Draw Song Ended Celebration & Big Play Again Button
    if (this.phase === 'song_ended') {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const cx = (safeBounds.left + safeBounds.right) / 2;
      ctx.textAlign = 'center';
      ctx.font = '900 48px system-ui, sans-serif';
      ctx.fillStyle = '#FACC15';
      ctx.fillText('🎉 AWESOME DANCING, EMILIA! 🎉', cx, safeBounds.top + safeBounds.height * 0.34);

      this._drawActionBubble(
        ctx,
        cx,
        safeBounds.top + safeBounds.height * 0.58,
        78,
        '🎰',
        'PLAY AGAIN!',
        this.respinHold
      );
      ctx.restore();
    }

    // 8. Particles & Floating Texts
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

  _drawStarPath(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  _drawOutfitOnPlayer(ctx, player) {
    // 1. Draw Bottom (Rainbow Skirt / Tutu / Bell Bottoms / Lightning Pants)
    this._drawBottomGarment(ctx, player);

    // 2. Draw Top (Neon Safety Vest / Superhero Suit / Gown / Star Jacket / Beach Shirt)
    this._drawTopGarment(ctx, player);

    // 3. Draw Headgear (Star Sunglasses exactly on eyes, or Crown / Cowboy Hat / Party Hat / Unicorn snug on crown)
    this._drawHeadAccessory(ctx, player);
  }

  _drawHeadAccessory(ctx, player) {
    const lms = player.landmarksCanvas;
    const colliders = player.colliders;
    const headItem = this.outfit.head;
    if (!headItem) return;

    let eyeCenter = null;
    let eyeSpan = 45;
    let headAngle = 0;
    let headScale = 1.0;
    let crownPoint = null;

    if (lms && lms[2] && lms[5] && lms[2].visibility > 0.25 && lms[5].visibility > 0.25) {
      const lEye = lms[2];
      const rEye = lms[5];
      eyeCenter = { x: (lEye.x + rEye.x) / 2, y: (lEye.y + rEye.y) / 2 };
      eyeSpan = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y);
      headAngle = Math.atan2(rEye.y - lEye.y, rEye.x - lEye.x);
      headScale = Math.max(0.65, Math.min(2.0, eyeSpan / 44));

      // Crown / top of head anchor: Perpendicularly offset upwards from eyes
      // eyeSpan * 2.15 positions the crownPoint right on the top crown of the head/hair!
      const upX = Math.sin(headAngle);
      const upY = -Math.cos(headAngle);
      crownPoint = {
        x: eyeCenter.x + upX * (eyeSpan * 2.15),
        y: eyeCenter.y + upY * (eyeSpan * 2.15),
      };
    } else if (colliders && colliders.head && colliders.head.visibility > 0.25) {
      const h = colliders.head;
      eyeCenter = { x: h.x, y: h.y };
      crownPoint = { x: h.x, y: h.y - h.r * 0.88 }; // Perched atop crown of head
      eyeSpan = h.r * 0.9;
      headScale = h.r / 42;
    }

    if (!eyeCenter || !crownPoint) return;

    ctx.save();

    // 1. STAR / DISCO SUNGLASSES (Right over the eyes!)
    if (headItem.id === 'shades') {
      ctx.translate(eyeCenter.x, eyeCenter.y);
      ctx.rotate(headAngle);
      ctx.scale(headScale, headScale);

      const frameDist = eyeSpan * 0.52;
      const starR = 26;

      // Draw Star Sunglasses Frames
      [-frameDist, frameDist].forEach((starX) => {
        // Outer hot-pink star frame
        ctx.fillStyle = '#EC4899';
        ctx.strokeStyle = '#F472B6';
        ctx.lineWidth = 3.5;
        this._drawStarPath(ctx, starX, 0, 5, starR, starR * 0.52);
        ctx.fill();
        ctx.stroke();

        // Dark gradient lens inside star
        ctx.fillStyle = '#0F172A';
        this._drawStarPath(ctx, starX, 0, 5, starR * 0.75, starR * 0.38);
        ctx.fill();

        // White glare streak across lens
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(starX - 8, -6);
        ctx.lineTo(starX + 6, 8);
        ctx.stroke();
      });

      // Sleek nose bridge connecting the frames
      ctx.strokeStyle = '#EC4899';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-frameDist + starR * 0.65, 0);
      ctx.lineTo(frameDist - starR * 0.65, 0);
      ctx.stroke();

    // 2. ROYAL CROWN (Perched snugly on top of head)
    } else if (headItem.id === 'crown') {
      ctx.translate(crownPoint.x, crownPoint.y);
      ctx.rotate(headAngle);
      ctx.scale(headScale * 1.05, headScale * 1.05);

      // Gold 5-point crown
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-44, 12);
      ctx.lineTo(-48, -26);
      ctx.lineTo(-20, -5);
      ctx.lineTo(0, -36);
      ctx.lineTo(20, -5);
      ctx.lineTo(48, -26);
      ctx.lineTo(44, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crown velvet band base
      ctx.fillStyle = '#7C2D12';
      ctx.beginPath();
      ctx.roundRect(-42, 6, 84, 9, 4);
      ctx.fill();

      // Jewels: Ruby, Sapphire, Emerald, Diamond
      const gems = ['#EF4444', '#38BDF8', '#10B981', '#38BDF8', '#EF4444'];
      [-32, -16, 0, 16, 32].forEach((gx, gi) => {
        ctx.fillStyle = gems[gi];
        ctx.beginPath();
        ctx.arc(gx, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      });

    // 3. SHERIFF / COWBOY HAT
    } else if (headItem.id === 'cowboy') {
      ctx.translate(crownPoint.x, crownPoint.y);
      ctx.rotate(headAngle);
      ctx.scale(headScale * 1.15, headScale * 1.15);

      // Pinched brown felt crown
      ctx.fillStyle = '#92400E';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-32, 8);
      ctx.lineTo(-26, -34);
      ctx.quadraticCurveTo(0, -22, 26, -34);
      ctx.lineTo(32, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wide curved cowboy brim
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.ellipse(0, 10, 56, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Dark leather hat band
      ctx.fillStyle = '#451A03';
      ctx.beginPath();
      ctx.roundRect(-28, 1, 56, 8, 3);
      ctx.fill();

      // Gold Sheriff Star Badge in center
      this._drawStarPath(ctx, 0, -10, 5, 10, 5);
      ctx.fillStyle = '#FACC15';
      ctx.fill();
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.5;
      ctx.stroke();

    // 4. DISCO PARTY CONE HAT
    } else if (headItem.id === 'party') {
      ctx.translate(crownPoint.x, crownPoint.y);
      ctx.rotate(headAngle);
      ctx.scale(headScale * 1.1, headScale * 1.1);

      // Party cone
      ctx.fillStyle = '#EC4899';
      ctx.strokeStyle = '#831843';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-34, 12);
      ctx.lineTo(0, -48);
      ctx.lineTo(34, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Diagonal decorative stripes
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-18, 6);
      ctx.lineTo(-4, -18);
      ctx.moveTo(4, 10);
      ctx.lineTo(16, -10);
      ctx.stroke();

      // Confetti dots
      ctx.fillStyle = '#38BDF8';
      [[-8, -2], [8, -6], [-2, -28]].forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Fluffy top pom-pom
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(0, -50, 11, 0, Math.PI * 2);
      ctx.fill();

    // 5. UNICORN HORN & FLOWERS
    } else if (headItem.id === 'unicorn') {
      ctx.translate(crownPoint.x, crownPoint.y);
      ctx.rotate(headAngle);
      ctx.scale(headScale * 1.05, headScale * 1.05);

      // Spiral twisted golden unicorn horn
      const hornGrad = ctx.createLinearGradient(0, 10, 0, -54);
      hornGrad.addColorStop(0, '#FACC15');
      hornGrad.addColorStop(0.5, '#FDE047');
      hornGrad.addColorStop(1, '#FFFFFF');

      ctx.fillStyle = hornGrad;
      ctx.strokeStyle = '#CA8A04';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, 10);
      ctx.lineTo(0, -58);
      ctx.lineTo(14, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden spiral grooves up the horn
      ctx.strokeStyle = '#EAB308';
      ctx.lineWidth = 3.5;
      [-36, -22, -8, 4].forEach((hy) => {
        ctx.beginPath();
        const hw = 12 * (1 - (hy + 58) / 70);
        ctx.ellipse(0, hy, hw, 3.5, -0.25, 0, Math.PI);
        ctx.stroke();
      });

      // Pastel flower crown along base
      const flowerColors = ['#F472B6', '#C084FC', '#38BDF8', '#F472B6'];
      [-22, -8, 8, 22].forEach((fx, fi) => {
        ctx.fillStyle = flowerColors[fi];
        ctx.beginPath();
        ctx.arc(fx, 10, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(fx, 10, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  }

  _drawTopGarment(ctx, player) {
    const lms = player.landmarksCanvas;
    if (!lms || lms.length < 25) return;
    const lS = lms[11], rS = lms[12], lH = lms[23], rH = lms[24];
    if (!lS || !rS || !lH || !rH) return;
    if (lS.visibility < 0.25 || rS.visibility < 0.25) return;

    const top = this.outfit.top;
    if (!top) return;

    ctx.save();

    // 1. NEON SAFETY VEST (disco_vest)
    if (top.id === 'disco_vest') {
      // Vest Main Body in High-Vis Neon Safety Yellow
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#CA8A04';
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.moveTo(lS.x - 12, lS.y - 6);
      ctx.lineTo(rS.x + 12, rS.y - 6);
      ctx.lineTo(rH.x + 10, rH.y + 6);
      ctx.lineTo(lH.x - 10, lH.y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Open V-neck collar cutout
      const neckX = (lS.x + rS.x) / 2;
      const neckY = (lS.y + rS.y) / 2;
      const midY = (neckY + (lH.y + rH.y) / 2) / 2;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.beginPath();
      ctx.moveTo(lS.x + 14, lS.y - 6);
      ctx.lineTo(neckX, midY - 10);
      ctx.lineTo(rS.x - 14, rS.y - 6);
      ctx.closePath();
      ctx.fill();

      // Two Silver Reflective Horizontal Stripes across chest & waist
      const y1 = neckY + (midY - neckY) * 0.75;
      const y2 = (lH.y + rH.y) / 2 - 12;

      [y1, y2].forEach((stripeY) => {
        // Stripe backing
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 14;
        ctx.beginPath();
        const t = (stripeY - lS.y) / Math.max(1, ((lH.y + rH.y) / 2 - lS.y));
        const leftX = lS.x + (lH.x - lS.x) * t - 10;
        const rightX = rS.x + (rH.x - rS.x) * t + 10;
        ctx.moveTo(leftX, stripeY);
        ctx.lineTo(rightX, stripeY);
        ctx.stroke();

        // Dark seam borders for the reflective tape
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leftX, stripeY - 7);
        ctx.lineTo(rightX, stripeY - 7);
        ctx.moveTo(leftX, stripeY + 7);
        ctx.lineTo(rightX, stripeY + 7);
        ctx.stroke();
      });

      // Two Silver Reflective Vertical Harness Straps over shoulders
      [
        { topX: lS.x + 18, botX: lH.x + 16 },
        { topX: rS.x - 18, botX: rH.x - 16 },
      ].forEach(({ topX, botX }) => {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(topX, lS.y - 6);
        ctx.lineTo(botX, y2);
        ctx.stroke();

        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(topX - 6, lS.y - 6);
        ctx.lineTo(botX - 6, y2);
        ctx.moveTo(topX + 6, lS.y - 6);
        ctx.lineTo(botX + 6, y2);
        ctx.stroke();
      });

      // Center black zipper line
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(neckX, midY - 10);
      ctx.lineTo(neckX, (lH.y + rH.y) / 2 + 6);
      ctx.stroke();

      // Lower cargo pockets
      ctx.fillStyle = '#EAB308';
      ctx.strokeStyle = '#A16207';
      ctx.lineWidth = 2;
      const pocketW = 34, pocketH = 24;
      [lH.x + 6, rH.x - 40].forEach((px) => {
        ctx.beginPath();
        ctx.roundRect(px, y2 + 8, pocketW, pocketH, 4);
        ctx.fill();
        ctx.stroke();
      });

    // 2. SUPERHERO CAPE & SUIT (hero_cape)
    } else if (top.id === 'hero_cape') {
      // Flowing Red Superhero Cape anchored behind shoulders
      ctx.fillStyle = '#DC2626';
      ctx.strokeStyle = '#991B1B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lS.x - 10, lS.y);
      ctx.lineTo(lH.x - 48, lH.y + 45);
      ctx.lineTo(rH.x + 48, rH.y + 45);
      ctx.lineTo(rS.x + 10, rS.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Royal Blue Hero Bodysuit
      ctx.fillStyle = '#1D4ED8';
      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lS.x - 8, lS.y - 4);
      ctx.lineTo(rS.x + 8, rS.y - 4);
      ctx.lineTo(rH.x + 8, rH.y + 4);
      ctx.lineTo(lH.x - 8, lH.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold Superhero Chest Shield Emblem with ⚡ Lightning
      const chestX = (lS.x + rS.x + lH.x + rH.x) / 4;
      const chestY = (lS.y + rS.y + lH.y + rH.y) / 4 - 8;
      const sw = 38, sh = 42;

      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(chestX, chestY - sh / 2);
      ctx.lineTo(chestX + sw / 2, chestY - sh * 0.2);
      ctx.lineTo(chestX + sw * 0.35, chestY + sh / 2);
      ctx.lineTo(chestX, chestY + sh * 0.6);
      ctx.lineTo(chestX - sw * 0.35, chestY + sh / 2);
      ctx.lineTo(chestX - sw / 2, chestY - sh * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Lightning bolt inside shield
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.moveTo(chestX + 2, chestY - 14);
      ctx.lineTo(chestX - 8, chestY + 2);
      ctx.lineTo(chestX - 1, chestY + 2);
      ctx.lineTo(chestX - 4, chestY + 14);
      ctx.lineTo(chestX + 8, chestY - 2);
      ctx.lineTo(chestX + 1, chestY - 2);
      ctx.closePath();
      ctx.fill();

      // Gold Utility Belt
      const waistY = (lH.y + rH.y) / 2;
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(lH.x - 8, waistY - 6, (rH.x - lH.x) + 16, 12, 4);
      ctx.fill();
      ctx.stroke();

    // 3. SPARKLE GOWN TOP (princess_top)
    } else if (top.id === 'princess_top') {
      // Magenta / Purple velvet bodice
      ctx.fillStyle = '#9333EA';
      ctx.strokeStyle = '#581C87';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lS.x - 8, lS.y + 4);
      ctx.lineTo(rS.x + 8, rS.y + 4);
      ctx.lineTo(rH.x + 6, rH.y + 4);
      ctx.lineTo(lH.x - 6, lH.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sweetheart neckline curves
      const neckX = (lS.x + rS.x) / 2;
      const neckY = (lS.y + rS.y) / 2;
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lS.x - 4, lS.y + 6);
      ctx.quadraticCurveTo((lS.x + neckX) / 2, neckY + 18, neckX, neckY + 10);
      ctx.quadraticCurveTo((rS.x + neckX) / 2, neckY + 18, rS.x + 4, rS.y + 6);
      ctx.stroke();

      // Puffed shoulder sleeves
      ctx.fillStyle = '#C084FC';
      ctx.strokeStyle = '#9333EA';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(lS.x - 6, lS.y - 2, 18, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(rS.x + 6, rS.y - 2, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Gemstone Brooch
      ctx.fillStyle = '#F472B6';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(neckX, neckY + 14, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

    // 4. GOLD STAR DISCO JACKET (star_jacket)
    } else if (top.id === 'star_jacket') {
      // Black blazer body
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lS.x - 10, lS.y - 4);
      ctx.lineTo(rS.x + 10, rS.y - 4);
      ctx.lineTo(rH.x + 8, rH.y + 6);
      ctx.lineTo(lH.x - 8, lH.y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Open V showing neon electric cyan undershirt
      const neckX = (lS.x + rS.x) / 2;
      const waistY = (lH.y + rH.y) / 2;
      ctx.fillStyle = '#06B6D4';
      ctx.beginPath();
      ctx.moveTo(lS.x + 12, lS.y - 4);
      ctx.lineTo(rS.x - 12, rS.y - 4);
      ctx.lineTo(neckX, waistY - 6);
      ctx.closePath();
      ctx.fill();

      // Metallic Gold Satin Lapels
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 2.5;

      // Left lapel
      ctx.beginPath();
      ctx.moveTo(lS.x + 10, lS.y - 4);
      ctx.lineTo(lS.x + 26, lS.y + 24);
      ctx.lineTo(neckX, waistY - 4);
      ctx.lineTo(lS.x + 2, waistY - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right lapel
      ctx.beginPath();
      ctx.moveTo(rS.x - 10, rS.y - 4);
      ctx.lineTo(rS.x - 26, rS.y + 24);
      ctx.lineTo(neckX, waistY - 4);
      ctx.lineTo(rS.x - 2, waistY - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold Stars on chest
      this._drawStarPath(ctx, lS.x + 14, lS.y + 40, 5, 12, 6);
      ctx.fillStyle = '#FDE047';
      ctx.fill();
      this._drawStarPath(ctx, rS.x - 14, rS.y + 40, 5, 12, 6);
      ctx.fillStyle = '#FDE047';
      ctx.fill();

    // 5. HAWAIIAN BEACH PARTY SHIRT (tropical)
    } else {
      // Teal body
      ctx.fillStyle = '#0891B2';
      ctx.strokeStyle = '#155E75';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lS.x - 10, lS.y - 4);
      ctx.lineTo(rS.x + 10, rS.y - 4);
      ctx.lineTo(rH.x + 8, rH.y + 6);
      ctx.lineTo(lH.x - 8, lH.y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Open tropical camp collar
      const neckX = (lS.x + rS.x) / 2;
      const neckY = (lS.y + rS.y) / 2;
      ctx.fillStyle = '#06B6D4';
      ctx.strokeStyle = '#164E63';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(lS.x + 8, lS.y - 4);
      ctx.lineTo(neckX, neckY + 22);
      ctx.lineTo(rS.x - 8, rS.y - 4);
      ctx.stroke();

      // Repeating tropical pink hibiscus flower prints
      const flowers = [
        { x: (lS.x + neckX) / 2, y: neckY + 30 },
        { x: (rS.x + neckX) / 2, y: neckY + 30 },
        { x: lH.x + 16, y: lH.y - 12 },
        { x: rH.x - 16, y: rH.y - 12 },
      ];
      for (const fl of flowers) {
        ctx.fillStyle = '#F43F5E';
        for (let p = 0; p < 5; p++) {
          const a = (Math.PI * 2 * p) / 5;
          ctx.beginPath();
          ctx.arc(fl.x + Math.cos(a) * 8, fl.y + Math.sin(a) * 8, 5.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  _drawBottomGarment(ctx, player) {
    const lms = player.landmarksCanvas;
    if (!lms || lms.length < 25) return;
    const lH = lms[23], rH = lms[24];
    if (!lH || !rH || lH.visibility < 0.25 || rH.visibility < 0.25) return;

    const bot = this.outfit.bottom;
    if (!bot) return;

    const hipMidX = (lH.x + rH.x) / 2;
    const hipMidY = (lH.y + rH.y) / 2;
    const hipSpan = Math.hypot(rH.x - lH.x, rH.y - lH.y);
    const skirtW = Math.max(120, hipSpan * 2.2);
    const skirtH = Math.max(90, hipSpan * 1.5);

    ctx.save();

    // 1. RAINBOW FLARE SKIRT (rainbow_skirt)
    if (bot.id === 'rainbow_skirt') {
      const rainbowColors = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#A855F7'];
      const numPanels = rainbowColors.length;

      // Draw the 6 vertical flared rainbow panels!
      for (let i = 0; i < numPanels; i++) {
        const t0 = i / numPanels;
        const t1 = (i + 1) / numPanels;

        // Top waist points
        const wx0 = lH.x - 6 + (rH.x - lH.x + 12) * t0;
        const wx1 = lH.x - 6 + (rH.x - lH.x + 12) * t1;

        // Bottom flared hem points
        const hx0 = hipMidX - skirtW / 2 + skirtW * t0;
        const hx1 = hipMidX - skirtW / 2 + skirtW * t1;
        const hemY = hipMidY + skirtH;

        ctx.fillStyle = rainbowColors[i];
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(wx0, hipMidY - 2);
        ctx.lineTo(wx1, hipMidY - 2);
        ctx.lineTo(hx1, hemY);
        ctx.lineTo(hx0, hemY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Shaded fold highlight on each pleat
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.beginPath();
        ctx.moveTo(wx0, hipMidY - 2);
        ctx.lineTo(wx0 + (wx1 - wx0) * 0.45, hipMidY - 2);
        ctx.lineTo(hx0 + (hx1 - hx0) * 0.45, hemY);
        ctx.lineTo(hx0, hemY);
        ctx.closePath();
        ctx.fill();
      }

      // Sparkly gold waistband
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#CA8A04';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(lH.x - 12, hipMidY - 10, (rH.x - lH.x) + 24, 14, 6);
      ctx.fill();
      ctx.stroke();

    // 2. PINK FLUFFY TUTU (tutu)
    } else if (bot.id === 'tutu') {
      // 3 Layers of ruffled scalloped ballerina tulle flaring past hips
      const tiers = [
        { color: '#EC4899', heightRatio: 1.0, widthRatio: 1.15, scallops: 9 },
        { color: '#F472B6', heightRatio: 0.72, widthRatio: 1.05, scallops: 8 },
        { color: '#FCE7F3', heightRatio: 0.44, widthRatio: 0.95, scallops: 7 },
      ];

      // Draw tiers from bottom to top
      for (const tier of tiers) {
        const curH = skirtH * tier.heightRatio;
        const curW = skirtW * tier.widthRatio;
        const hemY = hipMidY + curH;

        ctx.fillStyle = tier.color;
        ctx.strokeStyle = '#DB2777';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(lH.x - 10, hipMidY);

        // Scalloped ruffled hem
        const startX = hipMidX - curW / 2;
        const stepX = curW / tier.scallops;
        ctx.lineTo(startX, hemY - 6);
        for (let s = 0; s < tier.scallops; s++) {
          const sx = startX + s * stepX;
          ctx.quadraticCurveTo(sx + stepX / 2, hemY + 10, sx + stepX, hemY - 6);
        }
        ctx.lineTo(rH.x + 10, hipMidY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Satin waistband with bow
      ctx.fillStyle = '#F472B6';
      ctx.strokeStyle = '#BE185D';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(lH.x - 10, hipMidY - 8, (rH.x - lH.x) + 20, 12, 5);
      ctx.fill();
      ctx.stroke();

      // Ribbon bow in center
      ctx.fillStyle = '#EC4899';
      ctx.beginPath();
      ctx.ellipse(hipMidX - 7, hipMidY - 2, 7, 5, -0.3, 0, Math.PI * 2);
      ctx.ellipse(hipMidX + 7, hipMidY - 2, 7, 5, 0.3, 0, Math.PI * 2);
      ctx.arc(hipMidX, hipMidY - 2, 3.5, 0, Math.PI * 2);
      ctx.fill();

    // 3. RETRO DISCO FLARE PANTS / BELL BOTTOMS (bell_bottoms) & 4. ROCKSTAR LIGHTNING PANTS (star_pants)
    } else {
      const isBellBottoms = bot.id === 'bell_bottoms';
      const lK = lms[25], rK = lms[26];
      const lA = lms[27], rA = lms[28];
      const defaultLegH = Math.max(140, hipSpan * 2.3);

      // Dynamically resolve Left Knee & Ankle joints
      const lKpos = (lK && lK.visibility > 0.25)
        ? { x: lK.x, y: lK.y }
        : { x: lH.x - hipSpan * 0.12, y: hipMidY + defaultLegH * 0.52 };

      const lApos = (lA && lA.visibility > 0.25)
        ? { x: lA.x, y: lA.y }
        : { x: lKpos.x + (lKpos.x - lH.x) * 0.85, y: lKpos.y + Math.max(48, (lKpos.y - lH.y) * 0.85) };

      // Dynamically resolve Right Knee & Ankle joints
      const rKpos = (rK && rK.visibility > 0.25)
        ? { x: rK.x, y: rK.y }
        : { x: rH.x + hipSpan * 0.12, y: hipMidY + defaultLegH * 0.52 };

      const rApos = (rA && rA.visibility > 0.25)
        ? { x: rA.x, y: rA.y }
        : { x: rKpos.x + (rKpos.x - rH.x) * 0.85, y: rKpos.y + Math.max(48, (rKpos.y - rH.y) * 0.85) };

      // Helper to compute limb normal vectors (perpendiculars) for dynamic leg cylinders
      const calcLegGeometry = (hip, knee, ankle, isLeft, wThigh, wKnee, wAnkle) => {
        const tDx = knee.x - hip.x, tDy = knee.y - hip.y;
        const tLen = Math.hypot(tDx, tDy) || 1;
        const sign = isLeft ? 1 : -1;
        const tNorm = { x: sign * (-tDy / tLen), y: sign * (tDx / tLen) };

        const sDx = ankle.x - knee.x, sDy = ankle.y - knee.y;
        const sLen = Math.hypot(sDx, sDy) || 1;
        const sNorm = { x: sign * (-sDy / sLen), y: sign * (sDx / sLen) };

        const kNormRawX = (tNorm.x + sNorm.x) / 2;
        const kNormRawY = (tNorm.y + sNorm.y) / 2;
        const kNormLen = Math.hypot(kNormRawX, kNormRawY) || 1;
        const kNorm = { x: kNormRawX / kNormLen, y: kNormRawY / kNormLen };

        const crotch = { x: hipMidX, y: hipMidY + Math.max(14, hipSpan * 0.38) };

        const oHip = { x: hip.x + tNorm.x * (wThigh * 0.5), y: hip.y - 4 + tNorm.y * (wThigh * 0.5) };
        const oKnee = { x: knee.x + kNorm.x * (wKnee * 0.5), y: knee.y + kNorm.y * (wKnee * 0.5) };
        const oAnkle = { x: ankle.x + sNorm.x * (wAnkle * 0.5), y: ankle.y + sNorm.y * (wAnkle * 0.5) };
        const iAnkle = { x: ankle.x - sNorm.x * (wAnkle * 0.5), y: ankle.y - sNorm.y * (wAnkle * 0.5) };
        const iKnee = { x: knee.x - kNorm.x * (wKnee * 0.5), y: knee.y - kNorm.y * (wKnee * 0.5) };

        return { oHip, oKnee, oAnkle, iAnkle, iKnee, crotch, tNorm, sNorm, kNorm };
      };

      const wThigh = hipSpan * (isBellBottoms ? 0.44 : 0.42);
      const wKnee = hipSpan * (isBellBottoms ? 0.34 : 0.36);
      const wAnkle = hipSpan * (isBellBottoms ? 0.84 : 0.38); // Wide flared bell-bottoms vs sleek rocker pants!

      const geomL = calcLegGeometry(lH, lKpos, lApos, true, wThigh, wKnee, wAnkle);
      const geomR = calcLegGeometry(rH, rKpos, rApos, false, wThigh, wKnee, wAnkle);

      // Pants base styling
      ctx.fillStyle = isBellBottoms ? '#0284C7' : '#4C1D95';
      ctx.strokeStyle = isBellBottoms ? '#0369A1' : '#2E1065';
      ctx.lineWidth = 3.5;

      const drawLegPath = (geom, hip) => {
        ctx.beginPath();
        ctx.moveTo(geom.oHip.x, geom.oHip.y);
        ctx.lineTo(geom.oKnee.x, geom.oKnee.y);
        ctx.lineTo(geom.oAnkle.x, geom.oAnkle.y);
        ctx.lineTo(geom.iAnkle.x, geom.iAnkle.y);
        ctx.lineTo(geom.iKnee.x, geom.iKnee.y);
        ctx.lineTo(geom.crotch.x, geom.crotch.y);
        ctx.lineTo(hip.x, hip.y - 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };

      // Draw Left and Right pant legs following skeletal leg motion
      drawLegPath(geomL, lH);
      drawLegPath(geomR, rH);

      // Pelvis / crotch bridge
      ctx.beginPath();
      ctx.moveTo(geomL.oHip.x, geomL.oHip.y);
      ctx.lineTo(geomR.oHip.x, geomR.oHip.y);
      ctx.lineTo(geomR.crotch.x, geomR.crotch.y);
      ctx.closePath();
      ctx.fill();

      if (isBellBottoms) {
        // Bell-bottoms flared hem cuffs
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 3;
        [geomL, geomR].forEach((g) => {
          ctx.beginPath();
          ctx.moveTo(g.oAnkle.x, g.oAnkle.y);
          ctx.lineTo(g.iAnkle.x, g.iAnkle.y);
          ctx.stroke();
        });

        // Gold Disco Belt across hips
        ctx.fillStyle = '#FACC15';
        ctx.strokeStyle = '#A16207';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(lH.x - 12, hipMidY - 7, (rH.x - lH.x) + 24, 13, 5);
        ctx.fill();
        ctx.stroke();

        // Big Round Gold Disco Buckle
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(hipMidX, hipMidY - 1, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Rockstar lightning bolts dynamically angled down each outer leg!
        const drawDynamicLightning = (geom, isLeft) => {
          const lerp = (p1, p2, t) => ({ x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t });
          const norm = geom.kNorm;
          const outDist = isLeft ? 12 : -12;

          const p0 = lerp(geom.oHip, geom.oKnee, 0.15);
          const p1 = lerp(geom.oHip, geom.oKnee, 0.45);
          const p2 = lerp(geom.oHip, geom.oKnee, 0.40);
          const p3 = lerp(geom.oHip, geom.oKnee, 0.85);
          const p4 = lerp(geom.oKnee, geom.oAnkle, 0.20);
          const p5 = lerp(geom.oKnee, geom.oAnkle, 0.65);

          ctx.fillStyle = '#FACC15';
          ctx.strokeStyle = '#FEF08A';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x + norm.x * outDist, p1.y + norm.y * outDist);
          ctx.lineTo(p2.x - norm.x * (outDist * 0.4), p2.y - norm.y * (outDist * 0.4));
          ctx.lineTo(p3.x + norm.x * (outDist * 1.2), p3.y + norm.y * (outDist * 1.2));
          ctx.lineTo(p4.x - norm.x * (outDist * 0.3), p4.y - norm.y * (outDist * 0.3));
          ctx.lineTo(p5.x, p5.y);
          ctx.lineTo(p4.x + norm.x * (outDist * 0.4), p4.y + norm.y * (outDist * 0.4));
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p2.x + norm.x * (outDist * 0.3), p2.y + norm.y * (outDist * 0.3));
          ctx.lineTo(p1.x - norm.x * (outDist * 0.2), p1.y - norm.y * (outDist * 0.2));
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        };

        drawDynamicLightning(geomL, true);
        drawDynamicLightning(geomR, false);

        // Black leather studded rocker belt
        ctx.fillStyle = '#18181B';
        ctx.strokeStyle = '#3F3F46';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(lH.x - 12, hipMidY - 7, (rH.x - lH.x) + 24, 13, 4);
        ctx.fill();
        ctx.stroke();

        // Silver chrome metal studs on belt
        const beltW = (rH.x - lH.x) + 24;
        const numStuds = Math.max(3, Math.floor(beltW / 18));
        for (let i = 0; i < numStuds; i++) {
          const sx = lH.x - 6 + (beltW - 12) * (i / (numStuds - 1));
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(sx - 2.5, hipMidY - 3, 5, 5);
        }

        // Rectangular chrome rocker buckle
        ctx.fillStyle = '#CBD5E1';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(hipMidX - 9, hipMidY - 6, 18, 11, 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _drawStageCurtains(ctx, cw, ch, openProgress) {
    ctx.save();
    const halfW = (cw / 2) * (1 - openProgress * 0.88);

    // Left & Right Red Velvet Stage Curtains
    [0, cw - halfW].forEach((xPos, idx) => {
      const grad = ctx.createLinearGradient(xPos, 0, xPos + halfW, 0);
      grad.addColorStop(0, '#7F1D1D');
      grad.addColorStop(0.5, '#DC2626');
      grad.addColorStop(1, '#991B1B');
      ctx.fillStyle = grad;
      ctx.fillRect(xPos, 0, halfW, ch);

      // Gold trim edge
      const trimX = idx === 0 ? xPos + halfW : xPos;
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(trimX, 0);
      ctx.lineTo(trimX, ch);
      ctx.stroke();
    });
    ctx.restore();
  }

  _drawDressUpCarousel(ctx, cw, ch) {
    ctx.save();
    const cardW = Math.min(760, cw * 0.86);
    const cardH = 340;
    const cardX = (cw - cardW) / 2;
    const cardY = (ch - cardH) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 32);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FEF08A';
    ctx.font = '900 32px system-ui, sans-serif';
    ctx.fillText('🎰 PARTY DRESS-UP SPINNER! 💃', cw / 2, cardY + 48);

    const spinIdx = Math.floor(this.animTime * 11);
    const slots = [
      {
        title: 'HEAD',
        locked: this.reelsLocked[0],
        item: this.reelsLocked[0] ? this.outfit.head : HEAD_OPTIONS[spinIdx % HEAD_OPTIONS.length],
      },
      {
        title: 'TOP',
        locked: this.reelsLocked[1],
        item: this.reelsLocked[1] ? this.outfit.top : TOP_OPTIONS[(spinIdx + 2) % TOP_OPTIONS.length],
      },
      {
        title: 'BOTTOM',
        locked: this.reelsLocked[2],
        item: this.reelsLocked[2]
          ? this.outfit.bottom
          : BOTTOM_OPTIONS[(spinIdx + 1) % BOTTOM_OPTIONS.length],
      },
    ];

    const slotW = (cardW - 80) / 3;
    const slotH = 210;
    for (let i = 0; i < 3; i++) {
      const s = slots[i];
      const sx = cardX + 26 + i * (slotW + 14);
      const sy = cardY + 86;

      ctx.fillStyle = s.locked ? 'rgba(34, 197, 94, 0.22)' : 'rgba(30, 41, 59, 0.9)';
      ctx.strokeStyle = s.locked ? '#4ADE80' : '#38BDF8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(sx, sy, slotW, slotH, 22);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '900 15px system-ui, sans-serif';
      ctx.fillText(s.title, sx + slotW / 2, sy + 28);

      ctx.font = '74px system-ui, sans-serif';
      ctx.fillText(s.item.icon, sx + slotW / 2, sy + 108);

      ctx.fillStyle = s.locked ? '#FEF08A' : '#E2E8F0';
      ctx.font = '900 17px system-ui, sans-serif';
      ctx.fillText(s.item.name, sx + slotW / 2, sy + 178);
    }

    ctx.restore();
  }

  _drawDanceFloor(ctx, cw, ch, safeBounds, activePlayers, theme) {
    const floorY = safeBounds.bottom - 75;
    const floorH = ch - floorY;
    const cols = 7;
    const tileW = cw / cols;
    const beatPulse = (Math.sin(this.animTime * 4.8) + 1) * 0.5;

    ctx.save();
    for (let c = 0; c < cols; c++) {
      const x1 = c * tileW;
      const x2 = (c + 1) * tileW;

      // Check if any player's feet or body are stepping on this floor tile column
      let isStepped = false;
      for (const p of activePlayers) {
        if (p.x >= x1 - 15 && p.x <= x2 + 15) {
          isStepped = true;
          break;
        }
      }

      if (isStepped) {
        // Brilliant stepped glow with floor ripple
        const steppedGrad = ctx.createLinearGradient(0, floorY, 0, ch);
        steppedGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        steppedGrad.addColorStop(0.3, theme.beamColors[c % theme.beamColors.length]);
        steppedGrad.addColorStop(1, 'rgba(15, 23, 42, 0.65)');
        ctx.fillStyle = steppedGrad;
      } else {
        // Idle pulsing tile
        const idleAlpha = 0.08 + beatPulse * 0.07;
        ctx.fillStyle = `rgba(255, 255, 255, ${idleAlpha})`;
      }

      ctx.beginPath();
      ctx.roundRect(x1 + 4, floorY + 4, tileW - 8, floorH - 8, 8);
      ctx.fill();

      // Neon tile border
      ctx.strokeStyle = isStepped
        ? '#FFFFFF'
        : theme.beamColors[c % theme.beamColors.length];
      ctx.lineWidth = isStepped ? 3.5 : 1.5;
      ctx.globalAlpha = isStepped ? 0.95 : 0.35 + beatPulse * 0.25;
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawDiscoBall(ctx, cw, ch, safeBounds, theme) {
    const ballX = cw / 2;
    const ballY = safeBounds.top + 46;
    const radius = 34;
    const rot = this.animTime * 0.85;

    ctx.save();

    // 1. Hanging metallic chain from ceiling
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ballX, 0);
    ctx.lineTo(ballX, ballY - radius);
    ctx.stroke();

    // Chain links
    ctx.fillStyle = '#CBD5E1';
    for (let y = 6; y < ballY - radius; y += 10) {
      ctx.beginPath();
      ctx.ellipse(ballX, y, 2.5, 4.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Chrome mounting hook
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(ballX, ballY - radius + 3, 5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Spherical Disco Ball with Facets
    const ballBaseGrad = ctx.createRadialGradient(
      ballX - 8,
      ballY - 8,
      4,
      ballX,
      ballY,
      radius
    );
    ballBaseGrad.addColorStop(0, '#FFFFFF');
    ballBaseGrad.addColorStop(0.4, '#CBD5E1');
    ballBaseGrad.addColorStop(0.85, '#475569');
    ballBaseGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = ballBaseGrad;
    ctx.beginPath();
    ctx.arc(ballX, ballY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Facet grid (6 latitude rings × 12 longitude segments)
    const latRings = 6;
    const lonSegs = 12;
    for (let r = 0; r < latRings; r++) {
      const latAngle = ((r + 0.5) / latRings) * Math.PI;
      const ringY = ballY - Math.cos(latAngle) * radius;
      const ringRadius = Math.sin(latAngle) * radius;

      for (let s = 0; s < lonSegs; s++) {
        const segAngle = rot + (s / lonSegs) * Math.PI * 2;
        const cosA = Math.cos(segAngle);
        // Only draw visible front-facing facets
        if (Math.sin(segAngle) > -0.15) {
          const fx = ballX + cosA * ringRadius;
          const fy = ringY;
          const fw = Math.max(3, ((Math.PI * ringRadius) / lonSegs) * Math.abs(Math.sin(segAngle)));
          const fh = ((radius * 2) / latRings) * 0.75;

          // Shimmer lighting
          const shimmer = (Math.sin(this.animTime * 3 + s * 1.5 + r) + 1) * 0.5;
          let facetCol = '#94A3B8';
          if (shimmer > 0.82) facetCol = '#FFFFFF';
          else if (shimmer > 0.55) facetCol = '#E2E8F0';
          else if (shimmer > 0.35) facetCol = '#64748B';
          else facetCol = '#334155';

          ctx.fillStyle = facetCol;
          ctx.fillRect(fx - fw / 2, fy - fh / 2, fw, fh);
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
          ctx.lineWidth = 1;
          ctx.strokeRect(fx - fw / 2, fy - fh / 2, fw, fh);
        }
      }
    }

    // Specular Cross Glint (✦) on top-left of disco ball
    const glintPhase = (Math.sin(this.animTime * 4.2) + 1) * 0.5;
    if (glintPhase > 0.5) {
      const gx = ballX - radius * 0.38;
      const gy = ballY - radius * 0.38;
      const glintR = 5 + glintPhase * 6;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(gx - glintR, gy);
      ctx.lineTo(gx + glintR, gy);
      ctx.moveTo(gx, gy - glintR);
      ctx.lineTo(gx, gy + glintR);
      ctx.stroke();
    }

    // 3. Orbiting Disco Light Spots across the room
    const spotCount = 10;
    for (let i = 0; i < spotCount; i++) {
      const a = rot * 1.4 + (i * Math.PI * 2) / spotCount;
      const spotX = ballX + Math.cos(a) * (cw * 0.44);
      const spotY = ch * 0.55 + Math.sin(a * 1.6 + i) * (ch * 0.32);
      const spotCol = theme.beamColors[i % theme.beamColors.length];

      ctx.fillStyle = spotCol;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.ellipse(spotX, spotY, 20, 13, a * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawGrooveMeter(ctx, cw, safeBounds) {
    const barW = Math.min(540, cw * 0.65);
    const barH = 38;
    const barX = (cw - barW) / 2;
    const barY = safeBounds.bottom - 58;
    const pct = Math.min(100, Math.max(0, this.danceEnergy));

    // Determine Groove Tier
    let tierName = 'GROOVY!';
    let tierIcon = '⚡';
    let borderColor = '#38BDF8';
    let gradStart = '#06B6D4';
    let gradEnd = '#3B82F6';

    if (pct >= 67) {
      tierName = 'MEGA PARTY!';
      tierIcon = '🪩';
      borderColor = '#F43F5E';
      gradStart = '#A855F7';
      gradEnd = '#EC4899';
    } else if (pct >= 34) {
      tierName = 'ON FIRE!';
      tierIcon = '🔥';
      borderColor = '#F59E0B';
      gradStart = '#FACC15';
      gradEnd = '#EA580C';
    }

    ctx.save();

    // Outer Glow / Container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 19);
    ctx.fill();
    ctx.stroke();

    // Inner Fill Bar
    const badgeW = 125;
    const trackW = barW - badgeW - 14;
    const fillW = Math.max(8, trackW * (pct / 100));

    const fillGrad = ctx.createLinearGradient(barX + badgeW, 0, barX + badgeW + fillW, 0);
    fillGrad.addColorStop(0, gradStart);
    fillGrad.addColorStop(1, gradEnd);

    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(barX + badgeW + 4, barY + 4, fillW, barH - 8, 14);
    ctx.fill();

    // Animated Flowing Chevron Pattern inside fill bar (indicating groove momentum!)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX + badgeW + 4, barY + 4, fillW, barH - 8, 14);
    ctx.clip();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = 3;
    const flowOffset = (this.animTime * 60) % 24;
    for (let cx = barX + badgeW - 20 + flowOffset; cx < barX + badgeW + fillW + 20; cx += 24) {
      ctx.beginPath();
      ctx.moveTo(cx, barY + 6);
      ctx.lineTo(cx + 8, barY + barH / 2);
      ctx.lineTo(cx, barY + barH - 6);
      ctx.stroke();
    }
    ctx.restore();

    // Left Tier Badge Pill: [ ⚡ GROOVY! ] / [ 🔥 ON FIRE! ] / [ 🪩 MEGA PARTY! ]
    const badgeGrad = ctx.createLinearGradient(barX + 4, 0, barX + badgeW, 0);
    badgeGrad.addColorStop(0, gradEnd);
    badgeGrad.addColorStop(1, gradStart);
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.roundRect(barX + 4, barY + 4, badgeW, barH - 8, 15);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 13px system-ui, sans-serif';
    ctx.fillText(`${tierIcon} ${tierName}`, barX + 4 + badgeW / 2, barY + barH / 2 + 1);

    // Percentage Label in track area
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 14px system-ui, sans-serif';
    ctx.fillText(
      `GROOVE: ${Math.round(pct)}%`,
      barX + badgeW + trackW / 2,
      barY + barH / 2 + 1
    );

    ctx.restore();
  }

  _drawFreezeIceOverlay(ctx, cw, ch) {
    ctx.save();
    // Frosted Icy Blue Frame around screen
    ctx.fillStyle = this.iceCracked
      ? 'rgba(239, 68, 68, 0.26)'
      : 'rgba(56, 189, 248, 0.28)';
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = this.iceCracked ? '#FCA5A5' : '#BAE6FD';
    ctx.lineWidth = 24;
    ctx.strokeRect(12, 12, cw - 24, ch - 24);

    if (this.iceCracked) {
      // Draw jagged ice crack lines across the screen!
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cw * 0.5, ch * 0.5);
      ctx.lineTo(cw * 0.35, ch * 0.28);
      ctx.lineTo(cw * 0.2, ch * 0.15);
      ctx.moveTo(cw * 0.5, ch * 0.5);
      ctx.lineTo(cw * 0.68, ch * 0.32);
      ctx.lineTo(cw * 0.85, ch * 0.18);
      ctx.moveTo(cw * 0.5, ch * 0.5);
      ctx.lineTo(cw * 0.42, ch * 0.76);
      ctx.lineTo(cw * 0.28, ch * 0.9);
      ctx.stroke();
    } else if (this.phase === 'freeze') {
      const sec = Math.max(1, Math.ceil(this.freezeHoldTimer));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 72px system-ui, sans-serif';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 12;
      const msg = `❄️ FREEZE!! DON'T MOVE! (${sec}s) ❄️`;
      ctx.strokeText(msg, cw / 2, ch * 0.2);
      ctx.fillStyle = '#E0F2FE';
      ctx.fillText(msg, cw / 2, ch * 0.2);
    }

    ctx.restore();
  }

  _drawActionBubble(ctx, x, y, r, icon, label, holdProgress) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FACC15';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(r * 0.52)}px system-ui, sans-serif`;
    ctx.fillText(icon, 0, -r * 0.15);

    ctx.fillStyle = '#FEF08A';
    ctx.font = `900 ${Math.max(10, Math.round(r * 0.2))}px system-ui, sans-serif`;
    ctx.fillText(label, 0, r * 0.42);

    if (holdProgress > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * holdProgress);
      ctx.strokeStyle = '#4ADE80';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }
}
