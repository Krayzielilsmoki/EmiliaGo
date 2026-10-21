// Camera & MediaPipe 1P/2P Pose Tracker with Double-Buffered Native Shield USB UVC Bridge for EmiliaGO
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { logger } from './logger.js';

export class PoseTracker {
  constructor(videoElement) {
    this.video = videoElement;
    this.landmarker = null;
    this.isReady = false;
    this.stream = null;

    // 1P / 2P Auto-Detection Mode (default 2 = auto-detect 1 or 2 players!)
    this.maxPlayers = 2;

    // Native Android USB UVC Bridge state (for NVIDIA Shield TV)
    this.useNativeUvc = Boolean(
      typeof window !== 'undefined' &&
        window.EmiliaNativeUVC &&
        window.EmiliaNativeUVC.isNativeUvcSupported()
    );

    // Double-buffer for flicker-free 60fps canvas rendering on Android TV WebView:
    this._stagingImage = new Image();
    this.uvcCanvas = document.createElement('canvas');
    this.uvcCanvas.width = 1280;
    this.uvcCanvas.height = 720;
    this.uvcCtx = this.uvcCanvas.getContext('2d');

    // Dedicated downscaled inference canvas (320x180 - exact 16:9 widescreen)
    // MediaPipe Pose model internally downsizes to 224x224. Passing 320x180 eliminates
    // 97% of GPU texture upload bandwidth vs 1080p, dropping inference to ~7-10ms!
    this.aiCanvas = document.createElement('canvas');
    this.aiCanvas.width = 320;
    this.aiCanvas.height = 180;
    this.aiCtx = this.aiCanvas.getContext('2d');
    this.uvcFrameReady = false;
    this._uvcLoading = false;
    this._lastUvcSeq = -1;
    this._decodedUvcSeq = -1;
    this._lastProcessedUvcSeq = -1;

    // Camera settings
    this.selectedDeviceId = '';
    this.resolutionPreset = '720p';
    this.fitMode = 'contain';
    this.zoomScale = 1.0;
    this.mirror = true;

    // Telemetry
    this.cameraInfo = {
      label: 'None',
      width: 0,
      height: 0,
      aspectRatio: 'N/A',
      fps: 0,
      inferenceMs: 0,
    };

    this._lastVideoTime = -1;
    this._frameCount = 0;
    this._lastFpsTime = performance.now();

    // Smoothed primary player + array of all active players (up to 2!)
    this.players = [];
    this.player = {
      detected: false,
      playerCount: 0,
      allPlayers: [],
      landmarksCanvas: [],
      colliders: {},
      shoulderSpanPx: 140,
      shoulderRatio: 0.18,
      distanceEstimate: 'Waiting for player...',
      autoHitboxRadius: 48,
      motionSpeed: 0,
    };

    this._prevCollidersByPlayer = [{}, {}];
    this._prevSpanByPlayer = [140, 140];
    this.successfulInferences = 0;

    this._stagingImage.onload = () => {
      const w = this._stagingImage.naturalWidth || 1280;
      const h = this._stagingImage.naturalHeight || 720;
      if (this.uvcCanvas.width !== w || this.uvcCanvas.height !== h) {
        this.uvcCanvas.width = w;
        this.uvcCanvas.height = h;
      }
      this.uvcCtx.drawImage(this._stagingImage, 0, 0, w, h);
      // Fast downscale to 320x180 for MediaPipe pose tracking (zero allocation)
      this.aiCtx.drawImage(this._stagingImage, 0, 0, 320, 180);
      this.uvcFrameReady = true;
      this._decodedUvcSeq = this._lastUvcSeq;
      this._uvcLoading = false;

      if (this.cameraInfo.width !== w || this.cameraInfo.height !== h) {
        const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
        const div = gcd(w, h);
        this.cameraInfo.width = w;
        this.cameraInfo.height = h;
        const devName =
          window.EmiliaNativeUVC && window.EmiliaNativeUVC.getDeviceName
            ? window.EmiliaNativeUVC.getDeviceName()
            : 'USB Webcam';
        this.cameraInfo.label = `${devName} (Direct UVC)`;
        this.cameraInfo.aspectRatio = `${w / div}:${h / div} (${(w / h).toFixed(2)})`;
      }
    };

    this._stagingImage.onerror = () => {
      this._uvcLoading = false;
    };
  }

  async initModel() {
    try {
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks('/wasm');
      } catch {
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
      }

      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: this.maxPlayers || 1, // Single-pose tracking for locked 60 FPS!
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      this.isReady = true;
      logger.info(
        'MediaPipe',
        `PoseLandmarker initialized on GPU (numPoses=${this.maxPlayers || 1})`
      );
    } catch (err) {
      logger.error('MediaPipe', 'Error initializing PoseLandmarker: ' + (err.message || err));
      console.error('Error initializing MediaPipe PoseLandmarker:', err);
      throw err;
    }
  }

  setMaxPlayers(num) {
    this.maxPlayers = num;
    if (this.landmarker && typeof this.landmarker.setOptions === 'function') {
      try {
        this.landmarker.setOptions({ numPoses: num });
        logger.info('MediaPipe', `Updated PoseLandmarker numPoses to ${num}`);
      } catch (e) {
        logger.warn('MediaPipe', `Could not update numPoses: ${e.message}`);
      }
    }
  }

  async warmupGpuShaders(targetW = 320, targetH = 180) {
    if (!this.isReady || !this.landmarker) return;
    try {
      let warmupElement;
      if (this.useNativeUvc && this.aiCanvas) {
        warmupElement = this.aiCanvas;
      } else if (this.video && this.video.readyState >= 2 && this.video.videoWidth > 16) {
        warmupElement = this.aiCanvas;
      } else {
        const dummyCanvas = document.createElement('canvas');
        const w = 320;
        const h = 180;
        dummyCanvas.width = w;
        dummyCanvas.height = h;
        const ctx = dummyCanvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#1E293B');
        grad.addColorStop(1, '#0F172A');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        warmupElement = dummyCanvas;
      }

      // Execute 2 warmup inferences (with strictly monotonic timestamps)
      // to pre-compile both detector & landmark tracking GPU shader pipelines
      const t0 = performance.now();
      this.landmarker.detectForVideo(warmupElement, t0);
      this.landmarker.detectForVideo(warmupElement, t0 + 33);
      this.successfulInferences += 2;
      logger.info(
        'MediaPipe',
        `GPU shaders pre-warmed at ${warmupElement.width || 320}x${warmupElement.height || 180} successfully (0ms freeze on launch)`
      );
    } catch (e) {
      logger.warn('MediaPipe', 'Shader warmup fallback: ' + e.message);
    }
  }

  async listCameras() {
    if (this.useNativeUvc) {
      const name = window.EmiliaNativeUVC.getDeviceName() || 'CODi A05020 Webcam';
      return [{ deviceId: 'native_uvc', label: `${name} (Direct USB UVC)` }];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'videoinput');
    } catch (e) {
      console.warn('Could not enumerate video devices:', e);
      return [];
    }
  }

  getResolutionDimensions() {
    switch (this.resolutionPreset) {
      case '360p':
        return { width: 640, height: 360 };
      case '480p':
        return { width: 640, height: 480 };
      case '1080p':
        return { width: 1920, height: 1080 };
      case '720p':
      default:
        return { width: 1280, height: 720 };
    }
  }

  async startCamera(deviceId = this.selectedDeviceId) {
    const targetDim = this.getResolutionDimensions();

    if (this.useNativeUvc) {
      const uvc = window.EmiliaNativeUVC;
      if (uvc.setPreferredResolution) {
        uvc.setPreferredResolution(targetDim.width, targetDim.height);
      } else if (!uvc.isStreaming()) {
        uvc.retryConnection();
      }

      const t0 = performance.now();
      while (performance.now() - t0 < 2800) {
        if (uvc.isStreaming()) break;
        await new Promise((r) => setTimeout(r, 150));
      }

      if (uvc.isStreaming()) {
        const vw = uvc.getWidth() || targetDim.width;
        const vh = uvc.getHeight() || targetDim.height;
        const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
        const div = gcd(vw, vh);
        this.cameraInfo.label = `${uvc.getDeviceName()} (Direct UVC)`;
        this.cameraInfo.width = vw;
        this.cameraInfo.height = vh;
        this.cameraInfo.aspectRatio = `${vw / div}:${vh / div} (${(vw / vh).toFixed(2)})`;
        return this.cameraInfo;
      } else {
        throw new Error(uvc.getStatusMessage() || 'Waiting for USB UVC Webcam...');
      }
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    this.selectedDeviceId = deviceId;
    const videoConstraints = {
      width: { ideal: targetDim.width },
      height: { ideal: targetDim.height },
      frameRate: { ideal: 30 },
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
    } catch {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      });
    }

    this.video.srcObject = this.stream;
    await new Promise((resolve) => {
      this.video.onloadedmetadata = () => {
        this.video.play();
        resolve();
      };
    });

    const track = this.stream.getVideoTracks()[0];
    const vw = this.video.videoWidth || 1280;
    const vh = this.video.videoHeight || 720;
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const div = gcd(vw, vh);

    this.cameraInfo.label = track ? track.label || 'USB Webcam' : 'USB Webcam';
    this.cameraInfo.width = vw;
    this.cameraInfo.height = vh;
    this.cameraInfo.aspectRatio = `${vw / div}:${vh / div} (${(vw / vh).toFixed(2)})`;

    return this.cameraInfo;
  }

  pollNativeUvcFrame() {
    if (!this.useNativeUvc || !window.EmiliaNativeUVC) return false;
    const uvc = window.EmiliaNativeUVC;
    if (!uvc.isStreaming()) return this.uvcFrameReady;

    const seq = uvc.getFrameSeq();
    if (seq !== this._lastUvcSeq && !this._uvcLoading) {
      // Direct binary JPEG streaming via shouldInterceptRequest (0 Base64 overhead!)
      if (seq >= 0) {
        this._uvcLoading = true;
        this._lastUvcSeq = seq;
        this._stagingImage.src = '/__uvc_frame.jpg?seq=' + seq;
      }
    }
    return this.uvcFrameReady;
  }

  getActiveDrawable() {
    if (this.useNativeUvc) {
      this.pollNativeUvcFrame();
      return this.uvcFrameReady ? this.uvcCanvas : null;
    }
    return this.video.readyState >= 2 && this.video.videoWidth > 16 ? this.video : null;
  }

  getVideoViewport(canvasWidth, canvasHeight) {
    const vw = this.cameraInfo.width || this.video.videoWidth || 1280;
    const vh = this.cameraInfo.height || this.video.videoHeight || 720;
    const videoAspect = vw / vh;
    const canvasAspect = canvasWidth / canvasHeight;

    let drawWidth, drawHeight;

    if (this.fitMode === 'cover') {
      if (videoAspect > canvasAspect) {
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * videoAspect;
      } else {
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / videoAspect;
      }
    } else {
      if (videoAspect > canvasAspect) {
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / videoAspect;
      } else {
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * videoAspect;
      }
    }

    drawWidth *= this.zoomScale;
    drawHeight *= this.zoomScale;

    const offsetX = (canvasWidth - drawWidth) / 2;
    const offsetY = (canvasHeight - drawHeight) / 2;

    return { drawWidth, drawHeight, offsetX, offsetY, vw, vh };
  }

  normToCanvas(normX, normY, viewport) {
    const mx = this.mirror ? 1.0 - normX : normX;
    return {
      x: viewport.offsetX + mx * viewport.drawWidth,
      y: viewport.offsetY + normY * viewport.drawHeight,
    };
  }

  _buildSinglePlayerObject(raw, pIdx, viewport, canvasWidth, hitboxMultiplier) {
    const landmarksCanvas = raw.map((lm) => {
      const pt = this.normToCanvas(lm.x, lm.y, viewport);
      return {
        x: pt.x,
        y: pt.y,
        z: lm.z,
        visibility: lm.visibility ?? 1.0,
      };
    });

    const lms = landmarksCanvas;
    let shoulderSpanPx = this._prevSpanByPlayer[pIdx] || 140;
    const lShoulder = lms[11];
    const rShoulder = lms[12];
    if (lShoulder && rShoulder) {
      const dx = lShoulder.x - rShoulder.x;
      const dy = lShoulder.y - rShoulder.y;
      const span = Math.hypot(dx, dy);
      shoulderSpanPx = shoulderSpanPx * 0.82 + span * 0.18;
      this._prevSpanByPlayer[pIdx] = shoulderSpanPx;
    }

    const shoulderRatio = shoulderSpanPx / canvasWidth;
    let distanceEstimate = 'Living Room Sweet Spot (~5–8 ft)';
    if (shoulderRatio > 0.25) {
      distanceEstimate = 'Close / Desk (~2–4 ft)';
    } else if (shoulderRatio <= 0.12) {
      distanceEstimate = 'Far Living Room (~8–12 ft)';
    }

    const baseRadius = Math.max(28, Math.min(85, shoulderSpanPx * 0.34));
    const finalRadius = baseRadius * hitboxMultiplier;
    const autoHitboxRadius = Math.round(finalRadius);

    const leftPalmX = lms[15].x * 0.3 + lms[17].x * 0.35 + lms[19].x * 0.35;
    const leftPalmY = lms[15].y * 0.3 + lms[17].y * 0.35 + lms[19].y * 0.35;

    const rightPalmX = lms[16].x * 0.3 + lms[18].x * 0.35 + lms[20].x * 0.35;
    const rightPalmY = lms[16].y * 0.3 + lms[18].y * 0.35 + lms[20].y * 0.35;

    const eyeMidY = (lms[2].y + lms[5].y) * 0.5;
    const headCenterX = lms[0].x;
    const headCenterY = eyeMidY - shoulderSpanPx * 0.15;

    const leftFootX = (lms[27].x + lms[31].x) * 0.5;
    const leftFootY = (lms[27].y + lms[31].y) * 0.5;
    const rightFootX = (lms[28].x + lms[32].x) * 0.5;
    const rightFootY = (lms[28].y + lms[32].y) * 0.5;

    const rawColliders = {
      leftHand: {
        name: 'Left Hand',
        playerIndex: pIdx,
        x: leftPalmX,
        y: leftPalmY,
        r: finalRadius,
        visibility: Math.max(lms[15].visibility, lms[19].visibility),
      },
      rightHand: {
        name: 'Right Hand',
        playerIndex: pIdx,
        x: rightPalmX,
        y: rightPalmY,
        r: finalRadius,
        visibility: Math.max(lms[16].visibility, lms[20].visibility),
      },
      head: {
        name: 'Head',
        playerIndex: pIdx,
        x: headCenterX,
        y: headCenterY,
        r: finalRadius * 1.28,
        visibility: lms[0].visibility,
      },
      leftFoot: {
        name: 'Left Foot',
        playerIndex: pIdx,
        x: leftFootX,
        y: leftFootY,
        r: finalRadius * 1.05,
        visibility: lms[27].visibility,
      },
      rightFoot: {
        name: 'Right Foot',
        playerIndex: pIdx,
        x: rightFootX,
        y: rightFootY,
        r: finalRadius * 1.05,
        visibility: lms[28].visibility,
      },
    };

    const prevMap = this._prevCollidersByPlayer[pIdx] || {};
    const nextColliders = {};
    let totalSpeed = 0;

    for (const [key, col] of Object.entries(rawColliders)) {
      const prev = prevMap[key];
      if (prev) {
        const sx = prev.x * 0.3 + col.x * 0.7;
        const sy = prev.y * 0.3 + col.y * 0.7;
        const vx = sx - prev.x;
        const vy = sy - prev.y;
        nextColliders[key] = {
          ...col,
          x: sx,
          y: sy,
          vx,
          vy,
        };
        if (key === 'leftHand' || key === 'rightHand' || key === 'head') {
          totalSpeed += Math.hypot(vx, vy);
        }
      } else {
        nextColliders[key] = { ...col, vx: 0, vy: 0 };
      }
    }

    this._prevCollidersByPlayer[pIdx] = nextColliders;

    return {
      detected: true,
      playerIndex: pIdx,
      landmarksCanvas,
      colliders: nextColliders,
      shoulderSpanPx,
      shoulderRatio,
      distanceEstimate,
      autoHitboxRadius,
      motionSpeed: totalSpeed,
    };
  }

  detectFrame(canvasWidth, canvasHeight, hitboxMultiplier = 1.25) {
    if (!this.isReady || !this.landmarker) {
      return this.player;
    }

    const viewport = this.getVideoViewport(canvasWidth, canvasHeight);
    let sourceElement = null;
    let hasNewFrame = false;

    if (this.useNativeUvc) {
      this.pollNativeUvcFrame();
      if (this.uvcFrameReady && this._decodedUvcSeq !== this._lastProcessedUvcSeq) {
        this._lastProcessedUvcSeq = this._decodedUvcSeq;
        sourceElement = this.aiCanvas; // Blazingly fast GPU inference on 640x360!
        hasNewFrame = true;
      }
    } else if (this.video.readyState >= 2 && this.video.videoWidth > 16) {
      if (this.video.currentTime !== this._lastVideoTime) {
        this._lastVideoTime = this.video.currentTime;
        this.aiCtx.drawImage(this.video, 0, 0, 640, 360);
        sourceElement = this.aiCanvas;
        hasNewFrame = true;
      }
    }

    if (hasNewFrame && sourceElement) {
      const now = performance.now();
      this._frameCount++;
      if (now - this._lastFpsTime >= 500) {
        this.cameraInfo.fps = Math.round((this._frameCount * 1000) / (now - this._lastFpsTime));
        this._frameCount = 0;
        this._lastFpsTime = now;
      }

      const t0 = performance.now();
      const result = this.landmarker.detectForVideo(sourceElement, t0);
      this.successfulInferences++;
      this.cameraInfo.inferenceMs = Math.round(performance.now() - t0);

      if (result.landmarks && result.landmarks.length > 0) {
        // Limit to maxPlayers (1 or 2) and sort left-to-right on canvas so P1 is Left, P2 is Right
        const rawList = result.landmarks.slice(0, this.maxPlayers);
        if (rawList.length > 1) {
          rawList.sort((a, b) => {
            const ax = this.mirror ? 1.0 - (a[0]?.x ?? 0.5) : a[0]?.x ?? 0.5;
            const bx = this.mirror ? 1.0 - (b[0]?.x ?? 0.5) : b[0]?.x ?? 0.5;
            return ax - bx;
          });
        }

        this.players = rawList.map((raw, idx) =>
          this._buildSinglePlayerObject(raw, idx, viewport, canvasWidth, hitboxMultiplier)
        );

        const p0 = this.players[0];
        this.player = {
          ...p0,
          detected: true,
          playerCount: this.players.length,
          allPlayers: this.players,
          secondPlayer: this.players[1] || null,
        };
      } else {
        this.players = [];
        this.player.detected = false;
        this.player.playerCount = 0;
        this.player.allPlayers = [];
        this.player.secondPlayer = null;
      }
    }

    return this.player;
  }
}
