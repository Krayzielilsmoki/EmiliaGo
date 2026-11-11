// Hands-Free Left/Right Wing 6-Game Start Screen & Single-Hand Selection for EmiliaGO
import { sound } from './sound.js';
import { settings } from './settings.js';

export class GameHub {
  constructor() {
    this.holdDuration = 1.4; // 1.4 seconds intentional hold to select a game
    this.activeBubbleId = null;
    this.holdProgress = 0;
    this._lastTickStep = -1;
    this._announcedBubbleId = null;
    this.animTime = 0;
    this.activeSelectingSide = null; // 'left' or 'right'

    // Home button state while inside a mini-game
    this.homeHoldProgress = 0;
    this._homeAnnounced = false;
    this._homeTickStep = -1;

    // Preload custom 3D cartoon title badges
    this.badgeImages = {};
    const badgeIds = ['keepy', 'hats', 'butterflies', 'poses', 'dance', 'disaster'];
    for (const id of badgeIds) {
      const img = new Image();
      img.src = `/icons/${id}_badge.jpg`;
      this.badgeImages[id] = img;
    }
  }

  reset() {
    this.activeBubbleId = null;
    this.holdProgress = 0;
    this._lastTickStep = -1;
    this._announcedBubbleId = null;
    this.activeSelectingSide = null;
    this.homeHoldProgress = 0;
    this._homeAnnounced = false;
  }

  getHubBubbles(safeBounds) {
    const cx = (safeBounds.left + safeBounds.right) / 2;
    const cy = (safeBounds.top + safeBounds.bottom) / 2;
    const w = safeBounds.width;
    const h = safeBounds.height;

    // Card radius: large, child-friendly, colorful
    const baseR = Math.max(52, Math.min(68, Math.min(w * 0.082, h * 0.118)));

    // Push Left column to outer left wing and Right column to outer right wing
    const leftX = safeBounds.left + baseR + 25;
    const rightX = safeBounds.right - baseR - 25;

    // 3 Vertical rows: Top, Mid, Bottom
    const rowTopY = cy - h * 0.28;
    const rowMidY = cy;
    const rowBotY = cy + h * 0.28;

    // 6 Games arranged in two outer wings:
    // Left Wing (Reachable with Left Hand):
    // 1. Keepy Uppy at Top-Left
    // 2. Hat Stacker at Mid-Left
    // 3. Silly Poses at Bottom-Left
    // Right Wing (Reachable with Right Hand):
    // 4. Butterfly Pop at Top-Right
    // 5. Dance Party at Mid-Right
    // 6. Floor is Lava at Bottom-Right
    const isHalloween = Boolean(settings.data.halloweenTheme);

    const gameDefs = [
      {
        id: 'keepy',
        title: isHalloween ? 'PUMPKIN POP' : 'KEEPY UPPY',
        subtitle: isHalloween ? "Bounce Jack-O'-Lanterns!" : 'Bounce Balloon!',
        voiceHover: 'hover_keepy',
        side: 'left',
        row: 'top',
        x: leftX,
        y: rowTopY,
        r: baseR,
        primary: isHalloween ? '#F97316' : '#EF4444',
        secondary: isHalloween ? '#FDBA74' : '#FCA5A5',
        rim: '#FEF08A',
        glowColor: isHalloween ? 'rgba(249, 115, 22,' : 'rgba(239, 68, 68,',
        badge: isHalloween ? '🎃' : '🎈',
      },
      {
        id: 'hats',
        title: isHalloween ? 'MASK STACKER' : 'HAT STACKER',
        subtitle: isHalloween ? 'Catch Spooky Masks!' : 'Catch Silly Hats!',
        voiceHover: 'hover_hats',
        side: 'left',
        row: 'mid',
        x: leftX,
        y: rowMidY,
        r: baseR,
        primary: isHalloween ? '#22C55E' : '#F59E0B',
        secondary: isHalloween ? '#86EFAC' : '#FDE68A',
        rim: isHalloween ? '#FEF08A' : '#FFFFFF',
        glowColor: isHalloween ? 'rgba(34, 197, 94,' : 'rgba(245, 158, 11,',
        badge: isHalloween ? '🎭' : '👑',
      },
      {
        id: 'poses',
        title: 'SILLY POSES',
        subtitle: 'Copy & Say Cheese!',
        voiceHover: 'hover_poses',
        side: 'left',
        row: 'bot',
        x: leftX,
        y: rowBotY,
        r: baseR,
        primary: '#38BDF8',
        secondary: '#BAE6FD',
        rim: '#FACC15',
        glowColor: 'rgba(56, 189, 248,',
        badge: '📸',
      },
      {
        id: 'butterflies',
        title: isHalloween ? 'BAT & GHOST POP' : 'BUTTERFLY POP',
        subtitle: isHalloween ? 'Catch Bats & Ghosts!' : 'Pop & Catch!',
        voiceHover: 'hover_butterflies',
        side: 'right',
        row: 'top',
        x: rightX,
        y: rowTopY,
        r: baseR,
        primary: isHalloween ? '#7C3AED' : '#EC4899',
        secondary: isHalloween ? '#DDD6FE' : '#FBCFE8',
        rim: isHalloween ? '#FACC15' : '#7DD3FC',
        glowColor: isHalloween ? 'rgba(124, 58, 237,' : 'rgba(236, 72, 153,',
        badge: isHalloween ? '🦇' : '🦋',
      },
      {
        id: 'dance',
        title: 'DANCE PARTY',
        subtitle: 'Dress Up & Freeze!',
        voiceHover: 'hover_dance',
        side: 'right',
        row: 'mid',
        x: rightX,
        y: rowMidY,
        r: baseR,
        primary: '#A855F7',
        secondary: '#E9D5FF',
        rim: '#4ADE80',
        glowColor: 'rgba(168, 85, 247,',
        badge: '🪩',
      },
      {
        id: 'disaster',
        title: 'FLOOR IS LAVA',
        subtitle: 'Climb & Jump!',
        voiceHover: 'hover_disaster',
        side: 'right',
        row: 'bot',
        x: rightX,
        y: rowBotY,
        r: baseR,
        primary: '#F97316',
        secondary: '#FED7AA',
        rim: '#FEF08A',
        glowColor: 'rgba(249, 115, 22,',
        badge: '🌋',
      },
    ];

    return gameDefs;
  }

  // Single active selecting hand determination
  // Evaluates both hands, picks the single hand with the highest intentional reach,
  // and ignores the other hand completely so selections NEVER jump back and forth!
  determineActiveSelectingHand(player, pointer, safeBounds) {
    if (pointer && pointer.active) {
      const cx = (safeBounds.left + safeBounds.right) / 2;
      return {
        hand: pointer,
        side: pointer.x < cx ? 'left' : 'right',
        isPointer: true,
      };
    }

    const p = player && player.detected ? player : null;
    if (!p || !p.colliders) {
      this.activeSelectingSide = null;
      return null;
    }

    const cx = (safeBounds.left + safeBounds.right) / 2;
    const cy = (safeBounds.top + safeBounds.bottom) / 2;

    const head = p.colliders.head;
    const torsoX = head ? head.x : cx;
    const torsoY = head ? head.y + (head.r || 35) * 2.2 : cy;

    const lHand = p.colliders.leftHand;
    const rHand = p.colliders.rightHand;

    const lVis = lHand && lHand.visibility > 0.35;
    const rVis = rHand && rHand.visibility > 0.35;

    if (!lVis && !rVis) {
      this.activeSelectingSide = null;
      return null;
    }

    // Intent scores: reaching outward from torso horizontally + reaching upward
    let lScore = 0;
    if (lVis) {
      const reachX = Math.max(0, torsoX - lHand.x); // Reach to the left
      const reachY = Math.max(0, torsoY - lHand.y); // Reach up
      lScore = reachX * 1.6 + reachY * 1.1;
      if (this.activeSelectingSide === 'left') lScore += 45; // Hysteresis to prevent twitching
    }

    let rScore = 0;
    if (rVis) {
      const reachX = Math.max(0, rHand.x - torsoX); // Reach to the right
      const reachY = Math.max(0, torsoY - rHand.y); // Reach up
      rScore = reachX * 1.6 + reachY * 1.1;
      if (this.activeSelectingSide === 'right') rScore += 45; // Hysteresis to prevent twitching
    }

    // Deadzone: If arms are simply resting near torso/hips (score < 95), no hand is actively selecting!
    const minIntentScore = 95;
    if (lScore < minIntentScore && rScore < minIntentScore) {
      this.activeSelectingSide = null;
      return null;
    }

    if (lScore >= rScore && lVis) {
      this.activeSelectingSide = 'left';
      return { hand: lHand, side: 'left', isPointer: false };
    } else if (rVis) {
      this.activeSelectingSide = 'right';
      return { hand: rHand, side: 'right', isPointer: false };
    }

    this.activeSelectingSide = null;
    return null;
  }

  collectHandColliders(player, pointer) {
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

  updateAndRenderHub(ctx, dt, safeBounds, player, pointer, onSelectGame) {
    this.animTime += dt;
    const cx = (safeBounds.left + safeBounds.right) / 2;
    const cy = (safeBounds.top + safeBounds.bottom) / 2;
    const w = safeBounds.width;
    const h = safeBounds.height;
    const bubbles = this.getHubBubbles(safeBounds);

    // 1. Single Active Selecting Hand
    const selecting = this.determineActiveSelectingHand(player, pointer, safeBounds);
    let hovered = null;
    let pointingHand = null;

    if (selecting) {
      const hHand = selecting.hand;
      const side = selecting.side;
      pointingHand = hHand;

      // Check direct collision with any bubble first (touching card or calibrate)
      for (const b of bubbles) {
        const d = Math.hypot(b.x - hHand.x, b.y - hHand.y);
        if (d < b.r + (hHand.r || 35) * 0.70) {
          hovered = b;
          break;
        }
      }

      // If not directly touching, check intentional reach into Left or Right wing
      if (!hovered) {
        // Wings activation lines: Must reach into outer 28% of the screen
        const leftReachBoundary = cx - w * 0.18;
        const rightReachBoundary = cx + w * 0.18;

        // Vertical row cutoffs with hysteresis for active bubble
        let topCutoff = cy - h * 0.13;
        let botCutoff = cy + h * 0.13;

        // Sticky hysteresis: maintain active selection even if hand wobbles vertically
        if (this.activeBubbleId === 'keepy' || this.activeBubbleId === 'butterflies') {
          topCutoff += 45;
        } else if (this.activeBubbleId === 'poses' || this.activeBubbleId === 'disaster') {
          botCutoff -= 45;
        }

        if (side === 'left' && hHand.x < leftReachBoundary) {
          if (hHand.y < topCutoff) {
            hovered = bubbles.find((b) => b.id === 'keepy');
          } else if (hHand.y > botCutoff) {
            hovered = bubbles.find((b) => b.id === 'poses');
          } else {
            hovered = bubbles.find((b) => b.id === 'hats');
          }
        } else if (side === 'right' && hHand.x > rightReachBoundary) {
          if (hHand.y < topCutoff) {
            hovered = bubbles.find((b) => b.id === 'butterflies');
          } else if (hHand.y > botCutoff) {
            hovered = bubbles.find((b) => b.id === 'disaster');
          } else {
            hovered = bubbles.find((b) => b.id === 'dance');
          }
        }
      }
    }

    // 2. Selection Progress & Audio Cues
    if (hovered) {
      if (this.activeBubbleId !== hovered.id) {
        this.activeBubbleId = hovered.id;
        this.holdProgress = 0;
        this._lastTickStep = -1;
        if (this._announcedBubbleId !== hovered.id) {
          this._announcedBubbleId = hovered.id;
          sound.speakVoice(hovered.voiceHover, true);
        }
      }
      this.holdProgress = Math.min(1.0, this.holdProgress + dt / this.holdDuration);
      const step = Math.floor(this.holdProgress * 6);
      if (step > this._lastTickStep) {
        this._lastTickStep = step;
        sound.playCalibrationTick(this.holdProgress);
      }
    } else {
      this.holdProgress = Math.max(0, this.holdProgress - dt * 2.5);
      if (this.holdProgress === 0) {
        this.activeBubbleId = null;
        this._announcedBubbleId = null;
      }
    }

    // 3. Game Bubble Selection (No dark backdrop boxes - clean floating bubbles over camera feed)

    // 4. Directional Pointing Beam & Reticle from Single Active Hand
    if (hovered && pointingHand) {
      ctx.save();
      ctx.strokeStyle = hovered.rim;
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -this.animTime * 35;
      ctx.beginPath();
      ctx.moveTo(pointingHand.x, pointingHand.y);
      ctx.lineTo(hovered.x, hovered.y);
      ctx.stroke();

      // Hand targeting reticle
      ctx.beginPath();
      ctx.arc(pointingHand.x, pointingHand.y, (pointingHand.r || 35) * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = `${hovered.glowColor} 0.45)`;
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Pulse ring on hand
      const pulseR = (pointingHand.r || 35) * (1.1 + Math.sin(this.animTime * 8) * 0.15);
      ctx.beginPath();
      ctx.arc(pointingHand.x, pointingHand.y, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = hovered.rim;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    // 5. Render Each Game Bubble
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      const isHovered = this.activeBubbleId === b.id;
      const bobY = Math.sin(this.animTime * 2.4 + i * 1.1) * 5;
      const scale = isHovered ? 1.15 + Math.sin(this.animTime * 10) * 0.03 : 1.0;

      ctx.save();
      ctx.translate(b.x, b.y + bobY);
      ctx.scale(scale, scale);

      // Outer glow
      ctx.beginPath();
      ctx.arc(0, 0, b.r + 12, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? `${b.glowColor} 0.58)` : 'rgba(15, 23, 42, 0.35)';
      ctx.fill();

      // Cel-shaded Cartoon Glossy Bubble Body (0 dynamic gradient overhead!)
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.primary;
      ctx.fill();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = b.rim;
      ctx.stroke();

      // Top-left glossy highlight arc
      ctx.fillStyle = b.secondary;
      ctx.beginPath();
      ctx.ellipse(-b.r * 0.28, -b.r * 0.28, b.r * 0.42, b.r * 0.22, -0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(-b.r * 0.32, -b.r * 0.35, b.r * 0.14, 0, Math.PI * 2);
      ctx.fill();

      // Bubble icon artwork
      this.drawBubbleArtwork(ctx, b.id, b.r);

      // Title Pill
      if (b.id !== 'calibrate') {
        const pillW = b.r * 1.84;
        const pillH = Math.max(26, b.r * 0.36);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.strokeStyle = b.rim;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-pillW / 2, b.r * 0.54, pillW, pillH, pillH / 2);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `900 ${Math.round(b.r * 0.20)}px system-ui, sans-serif`;
        ctx.fillText(b.title, 0, b.r * 0.54 + pillH * 0.68);
      }

      // Circular Hold Countdown Progress Ring
      if (isHovered && this.holdProgress > 0) {
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          b.r + 13,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * this.holdProgress
        );
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.restore();
    }

    // 6. Compact Interactive Prompt Banner docked right at bottom edge of screen
    ctx.save();
    const promptW = Math.min(620, w * 0.82);
    const promptH = 34;
    const promptX = cx - promptW / 2;
    const promptY = Math.max(safeBounds.bottom - promptH - 2, ctx.canvas.height - promptH - 8);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = hovered ? hovered.rim : 'rgba(250, 204, 21, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(promptX, promptY, promptW, promptH, promptH / 2);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hovered ? '#FEF08A' : '#BAE6FD';
    ctx.font = '900 15px system-ui, sans-serif';

    const promptMsg = hovered
      ? `👉 POINTING AT: ${hovered.badge} ${hovered.title}! HOLD STILL TO PLAY! (${Math.round(this.holdProgress * 100)}%)`
      : '👉 REACH YOUR HAND LEFT OR RIGHT TO PLAY!';
    ctx.fillText(promptMsg, cx, promptY + promptH / 2 + 1);
    ctx.restore();

    // 7. Launch game when hold completes
    if (hovered && this.holdProgress >= 1.0) {
      const chosenId = hovered.id;
      this.reset();
      sound.playFanfare();
      if (onSelectGame) {
        onSelectGame(chosenId);
      }
    }
  }

  updateAndRenderHomeBubble(ctx, dt, safeBounds, player, pointer, onReturnHome) {
    const r = 28;
    const x = ctx.canvas.width - r - 22;
    const y = ctx.canvas.height - r - 22;

    if (pointer && pointer.clicked && Math.hypot(x - pointer.x, y - pointer.y) < r + 24) {
      this.reset();
      sound.playFanfare();
      if (onReturnHome) onReturnHome();
      return;
    }

    const hands = this.collectHandColliders(player, pointer);
    let inside = false;
    for (const h of hands) {
      if (Math.hypot(x - h.x, y - h.y) < r + (h.r || 35) * 0.45) {
        inside = true;
        break;
      }
    }

    if (inside) {
      this.homeHoldProgress = Math.min(1.0, this.homeHoldProgress + dt / 2.0);
      if (!this._homeAnnounced && this.homeHoldProgress >= 0.3) {
        this._homeAnnounced = true;
        sound.speakVoice('hover_home', false);
      }
      const step = Math.floor(this.homeHoldProgress * 5);
      if (step > this._homeTickStep) {
        this._homeTickStep = step;
        sound.playCalibrationTick(this.homeHoldProgress);
      }
    } else {
      this.homeHoldProgress = Math.max(0, this.homeHoldProgress - dt * 1.5);
      if (this.homeHoldProgress === 0) {
        this._homeAnnounced = false;
        this._homeTickStep = -1;
      }
    }

    ctx.save();
    ctx.translate(x, y);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = inside ? 'rgba(2, 132, 199, 0.92)' : 'rgba(15, 23, 42, 0.72)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#7DD3FC';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('🏠', 0, 1);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.fillText('MENU', 0, 15);

    if (this.homeHoldProgress > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.homeHoldProgress);
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.restore();

    if (this.homeHoldProgress >= 1.0) {
      this.reset();
      sound.playFanfare();
      if (onReturnHome) onReturnHome();
    }
  }

  drawBubbleArtwork(ctx, id, r) {
    const isHalloween = Boolean(settings.data.halloweenTheme);
    const isHalloweenGame = isHalloween && (id === 'keepy' || id === 'hats' || id === 'butterflies');

    if (isHalloweenGame) {
      ctx.save();
      ctx.translate(0, -r * 0.08);
      if (id === 'keepy') {
        // 🎃 Custom Jack-o'-Lantern Hub Icon
        const pr = r * 0.56;
        // Green stem
        ctx.fillStyle = '#15803D';
        ctx.strokeStyle = '#14532D';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-4, -pr * 0.78);
        ctx.quadraticCurveTo(-2, -pr * 1.12, 6, -pr * 1.10);
        ctx.lineTo(8, -pr * 0.78);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ribbed pumpkin body
        ctx.fillStyle = '#F97316';
        ctx.strokeStyle = '#7C2D12';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(-pr * 0.35, 0, pr * 0.58, pr * 0.82, 0, 0, Math.PI * 2);
        ctx.ellipse(pr * 0.35, 0, pr * 0.58, pr * 0.82, 0, 0, Math.PI * 2);
        ctx.ellipse(0, 0, pr * 0.52, pr * 0.88, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Carved glowing eyes & smile
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.moveTo(-pr * 0.45, -2); ctx.lineTo(-pr * 0.25, -pr * 0.36); ctx.lineTo(-pr * 0.08, -2);
        ctx.moveTo(pr * 0.08, -2);  ctx.lineTo(pr * 0.25, -pr * 0.36);  ctx.lineTo(pr * 0.45, -2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, pr * 0.12, pr * 0.44, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.fill();
      } else if (id === 'hats') {
        // 🎭 Custom Halloween Frankenstein & Vampire Mask Hub Icon
        const mr = r * 0.52;
        // Side bolts
        ctx.fillStyle = '#94A3B8';
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2;
        ctx.fillRect(-mr * 1.15, -4, mr * 2.3, 7);
        ctx.strokeRect(-mr * 1.15, -4, mr * 2.3, 7);

        // Mask faceplate
        ctx.fillStyle = '#4ADE80';
        ctx.strokeStyle = '#14532D';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-mr * 0.85, -mr * 0.82, mr * 1.7, mr * 1.55, [8, 8, 16, 16]);
        ctx.fill();
        ctx.stroke();

        // Jagged hair
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.moveTo(-mr * 0.85, -mr * 0.42);
        ctx.lineTo(-mr * 0.85, -mr * 0.82);
        ctx.lineTo(mr * 0.85, -mr * 0.82);
        ctx.lineTo(mr * 0.85, -mr * 0.42);
        ctx.lineTo(mr * 0.4, -mr * 0.25);
        ctx.lineTo(0, -mr * 0.45);
        ctx.lineTo(-mr * 0.4, -mr * 0.25);
        ctx.closePath();
        ctx.fill();

        // Mask eye cutouts
        ctx.fillStyle = '#FEF08A';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-mr * 0.36, -mr * 0.05, 6.5, 0, Math.PI * 2);
        ctx.arc(mr * 0.36, -mr * 0.05, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Stitched smile
        ctx.beginPath();
        ctx.arc(0, mr * 0.22, mr * 0.42, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else if (id === 'butterflies') {
        // 🦇👻 Custom Cute Bat & Silly Ghost Hub Icon
        const br = r * 0.50;
        // Cute Ghost on bottom-right
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(br * 0.36, br * 0.15, br * 0.48, Math.PI, 0);
        ctx.lineTo(br * 0.84, br * 0.72);
        ctx.lineTo(br * 0.56, br * 0.58);
        ctx.lineTo(br * 0.36, br * 0.74);
        ctx.lineTo(br * 0.16, br * 0.58);
        ctx.lineTo(-br * 0.12, br * 0.72);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(br * 0.22, br * 0.15, 2.8, 0, Math.PI * 2);
        ctx.arc(br * 0.50, br * 0.15, 2.8, 0, Math.PI * 2);
        ctx.ellipse(br * 0.36, br * 0.34, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cute Bat on top-left
        ctx.fillStyle = '#1E1B4B';
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-br * 0.25, -br * 0.32);
        ctx.quadraticCurveTo(-br * 0.85, -br * 0.75, -br * 1.05, -br * 0.22);
        ctx.quadraticCurveTo(-br * 0.65, -br * 0.05, -br * 0.25, -br * 0.12);
        ctx.quadraticCurveTo(br * 0.15, -br * 0.05, br * 0.55, -br * 0.22);
        ctx.quadraticCurveTo(br * 0.35, -br * 0.75, -br * 0.25, -br * 0.32);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-br * 0.25, -br * 0.26, br * 0.24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(-br * 0.33, -br * 0.28, 2.4, 0, Math.PI * 2);
        ctx.arc(-br * 0.17, -br * 0.28, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    const badgeImg = this.badgeImages ? this.badgeImages[id] : null;
    if (badgeImg && badgeImg.complete && badgeImg.naturalWidth > 0) {
      ctx.save();
      const badgeR = r * 0.74;
      const badgeY = -r * 0.08;

      // Circular clip inside the bubble
      ctx.beginPath();
      ctx.arc(0, badgeY, badgeR, 0, Math.PI * 2);
      ctx.clip();

      // Render the 3D game badge
      ctx.drawImage(badgeImg, -badgeR, badgeY - badgeR, badgeR * 2, badgeR * 2);

      // Glossy highlight shine
      const gloss = ctx.createLinearGradient(0, badgeY - badgeR, 0, badgeY + badgeR);
      gloss.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
      gloss.addColorStop(0.35, 'rgba(255, 255, 255, 0.08)');
      gloss.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      gloss.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
      ctx.fillStyle = gloss;
      ctx.fill();

      // Crisp white accent inner ring
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.stroke();

      ctx.restore();
      return;
    }

    ctx.save();
    if (id === 'keepy') {
      const br = r * 0.42;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, br * 0.85);
      ctx.quadraticCurveTo(-10, br * 1.3, 6, br * 1.65);
      ctx.stroke();

      ctx.fillStyle = '#DC2626';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, -br * 0.25, br * 0.88, br * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.ellipse(-br * 0.32, -br * 0.55, br * 0.16, br * 0.3, -0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'hats') {
      const cw = r * 0.78;
      const ch = r * 0.44;
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-cw / 2, ch * 0.35);
      ctx.lineTo(-cw / 2, -ch * 0.45);
      ctx.lineTo(-cw * 0.18, 0);
      ctx.lineTo(0, -ch * 0.75);
      ctx.lineTo(cw * 0.18, 0);
      ctx.lineTo(cw / 2, -ch * 0.45);
      ctx.lineTo(cw / 2, ch * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'butterflies') {
      const wingR = r * 0.34;
      ctx.fillStyle = '#38BDF8';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      [-1, 1].forEach((dir) => {
        ctx.beginPath();
        ctx.ellipse(
          dir * wingR * 0.85,
          -wingR * 0.45,
          wingR * 0.85,
          wingR * 0.6,
          dir * 0.35,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.ellipse(
          dir * wingR * 0.65,
          wingR * 0.25,
          wingR * 0.6,
          wingR * 0.45,
          -dir * 0.3,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38BDF8';
      });
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(0, -wingR * 0.1, 6, wingR * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'poses') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(r * 0.72)}px system-ui, sans-serif`;
      ctx.fillText('📸🤪', 0, -r * 0.05);
    } else if (id === 'dance') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(r * 0.72)}px system-ui, sans-serif`;
      ctx.fillText('🪩💃', 0, -r * 0.05);
    } else if (id === 'disaster') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(r * 0.72)}px system-ui, sans-serif`;
      ctx.fillText('🌋🌊', 0, -r * 0.05);
    } else if (id === 'calibrate') {
      ctx.textAlign = 'center';
      ctx.font = `${Math.round(r * 0.72)}px system-ui, sans-serif`;
      ctx.fillText('🙌', 0, r * 0.18);
    }
    ctx.restore();
  }
}
