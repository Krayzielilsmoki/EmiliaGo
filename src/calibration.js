// Play-Space Safe Zone & Spoken 2-Second "Raise Both Hands!" Calibration for EmiliaGO
import { sound } from './sound.js';
import { settings } from './settings.js';

export class CalibrationManager {
  constructor() {
    this.isCalibrating = false;
    this.holdProgress = 0;
    this.lastCalibratedDistance = 'Auto';
    this.lastCalibratedShoulderPx = 140;
    this._lastTickStep = -1;
  }

  get margins() {
    return settings.data.margins;
  }

  get hitboxMultiplier() {
    return settings.data.hitboxMultiplier;
  }

  set hitboxMultiplier(val) {
    settings.data.hitboxMultiplier = val;
    settings.save();
  }

  get showSafeZoneBorder() {
    return settings.data.showSafeZoneBorder;
  }

  set showSafeZoneBorder(val) {
    settings.data.showSafeZoneBorder = val;
    settings.save();
  }

  save() {
    settings.save();
  }

  getSafeBounds(canvasWidth, canvasHeight) {
    const m = this.margins;
    const left = canvasWidth * m.left;
    const right = canvasWidth * (1 - m.right);
    const top = canvasHeight * m.top;
    const bottom = canvasHeight * (1 - m.bottom);
    return {
      left,
      right,
      top,
      bottom,
      width: Math.max(100, right - left),
      height: Math.max(100, bottom - top),
    };
  }

  startInteractiveCalibration() {
    this.isCalibrating = true;
    this.holdProgress = 0;
    this._lastTickStep = -1;
    sound.speakVoice('calibrate_start', true);
  }

  cancelInteractiveCalibration() {
    this.isCalibrating = false;
    this.holdProgress = 0;
  }

  updateAndRender(ctx, player, canvasWidth, canvasHeight, dt, onComplete) {
    const bounds = this.getSafeBounds(canvasWidth, canvasHeight);

    if (this.showSafeZoneBorder || this.isCalibrating) {
      ctx.save();

      ctx.fillStyle = this.isCalibrating ? 'rgba(15, 23, 42, 0.48)' : 'rgba(15, 23, 42, 0.16)';
      ctx.fillRect(0, 0, canvasWidth, bounds.top);
      ctx.fillRect(0, bounds.bottom, canvasWidth, canvasHeight - bounds.bottom);
      ctx.fillRect(0, bounds.top, bounds.left, bounds.height);
      ctx.fillRect(bounds.right, bounds.top, canvasWidth - bounds.right, bounds.height);

      ctx.strokeStyle = this.isCalibrating ? '#FACC15' : 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = this.isCalibrating ? 5 : 3;
      ctx.setLineDash([14, 10]);
      ctx.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
      ctx.setLineDash([]);

      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(
        'SAFE PLAY ZONE (Targets stay inside this box)',
        bounds.left + 14,
        bounds.bottom - 12
      );

      ctx.restore();
    }

    if (!this.isCalibrating) return;

    ctx.save();
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;

    let handsRaised = false;
    if (player && player.detected && player.colliders.leftHand && player.colliders.rightHand) {
      const lH = player.colliders.leftHand;
      const rH = player.colliders.rightHand;
      const head = player.colliders.head;
      const shoulderY =
        player.landmarksCanvas[11] && player.landmarksCanvas[12]
          ? (player.landmarksCanvas[11].y + player.landmarksCanvas[12].y) * 0.5
          : centerY;

      const bothAboveShoulders = lH.y < shoulderY + 38 && rH.y < shoulderY + 38;
      const inHorizontalZone =
        lH.x >= bounds.left - 50 &&
        lH.x <= bounds.right + 50 &&
        rH.x >= bounds.left - 50 &&
        rH.x <= bounds.right + 50;

      if (bothAboveShoulders && inHorizontalZone && head) {
        handsRaised = true;
      }
    }

    if (handsRaised) {
      this.holdProgress = Math.min(1.0, this.holdProgress + dt * 0.65);
      const tickStep = Math.floor(this.holdProgress * 6);
      if (tickStep > this._lastTickStep) {
        this._lastTickStep = tickStep;
        sound.playCalibrationTick(this.holdProgress);
      }
    } else {
      this.holdProgress = Math.max(0, this.holdProgress - dt * 0.8);
    }

    const bannerW = Math.min(640, bounds.width * 0.88);
    const bannerH = 140;
    const bannerX = centerX - bannerW / 2;
    const bannerY = bounds.top + 30;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 22);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FDE047';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText('🙌 REACH BOTH HANDS HIGH IN THE AIR! 🙌', centerX, bannerY + 46);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 18px system-ui, sans-serif';
    const statusMsg = !player?.detected
      ? 'Step inside the Magic Box so the camera can see you!'
      : handsRaised
      ? 'Awesome job, Emilia! Hold your hands up...'
      : 'Wave both hands up above your head!';
    ctx.fillText(statusMsg, centerX, bannerY + 80);

    const barW = bannerW - 80;
    const barH = 22;
    const barX = centerX - barW / 2;
    const barY = bannerY + 98;

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 11);
    ctx.fill();

    if (this.holdProgress > 0) {
      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, '#38BDF8');
      grad.addColorStop(0.5, '#FACC15');
      grad.addColorStop(1, '#4ADE80');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * this.holdProgress, barH, 11);
      ctx.fill();
    }

    ctx.restore();

    if (this.holdProgress >= 1.0) {
      this.isCalibrating = false;
      this.holdProgress = 0;
      this.lastCalibratedDistance = player.distanceEstimate;
      this.lastCalibratedShoulderPx = Math.round(player.shoulderSpanPx);
      this.save();
      sound.playFanfare();
      sound.speakVoice('calibrate_done', true);
      if (onComplete) {
        onComplete({
          distanceEstimate: this.lastCalibratedDistance,
          shoulderSpanPx: this.lastCalibratedShoulderPx,
          autoHitboxRadius: player.autoHitboxRadius,
        });
      }
    }
  }
}
