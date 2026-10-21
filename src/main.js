// EmiliaGO Main Loop — 6-Game Motion Party Hub (1P & 2P Support), Spoken Voice Coach, Jukebox & Persistent TV Settings
import { PoseTracker } from './poseTracker.js';
import { AvatarRenderer } from './avatarRenderer.js';
import { CalibrationManager } from './calibration.js';
import { KeepyUppyGame } from './keepyUppy.js';
import { HatStackerGame } from './hatStacker.js';
import { ButterflyPopGame } from './butterflyPop.js';
import { SillyPosesGame } from './sillyPoses.js';
import { DancePartyGame } from './danceParty.js';
import { DisasterZoneGame } from './disasterZone.js';
import { GameHub } from './gameHub.js';
import { settings } from './settings.js';
import { sound } from './sound.js';
import { logger } from './logger.js';

const video = document.getElementById('webcam-video');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Core Modules
const tracker = new PoseTracker(video);
const avatar = new AvatarRenderer();
const calibration = new CalibrationManager();
const hub = new GameHub();
const keepyGame = new KeepyUppyGame();
const hatGame = new HatStackerGame();
const butterflyGame = new ButterflyPopGame();
const posesGame = new SillyPosesGame();
const danceGame = new DancePartyGame();
const disasterGame = new DisasterZoneGame();

// Current Screen State: 'hub' | 'keepy' | 'hats' | 'butterflies' | 'poses' | 'dance' | 'disaster'
let activeScreen = 'hub';
let welcomeSpoken = false;
let isPaused = false;
let confirmMode = null; // 'pause_game' | 'exit_app' | null

// Pointer fallback for mouse/touch testing
const pointer = { x: -1000, y: -1000, r: 44, active: false };

// Splash Screen Elements
const splashScreen = document.getElementById('splash-screen');
const splashProgressBar = document.getElementById('splash-progress-bar');
const splashStatusText = document.getElementById('splash-status-text');
let splashDismissed = false;

function dismissSplashScreen() {
  if (splashDismissed || !splashScreen) return;
  splashDismissed = true;
  if (splashProgressBar) splashProgressBar.style.width = '100%';
  if (splashStatusText) splashStatusText.textContent = "Let's Play, Emilia!";
  setTimeout(() => {
    splashScreen.classList.add('fade-out');
    setTimeout(() => {
      splashScreen.classList.add('hidden');
    }, 600);
  }, 250);
}

// DOM Elements
const modeSubtitle = document.getElementById('mode-subtitle');
const starVal = document.getElementById('star-val');
const starPill = document.getElementById('star-pill');
const starLabelText = document.getElementById('star-label-text');
const currentScorePill = document.getElementById('current-score-pill');
const scoreLabelText = document.getElementById('score-label-text');
const scoreVal = document.getElementById('score-val');
const bestScorePill = document.getElementById('best-score-pill');
const bestLabelText = document.getElementById('best-label-text');
const bestVal = document.getElementById('best-val');

const btnBrandHome = document.getElementById('btn-brand-home');
const btnHome = document.getElementById('btn-home');
const btnPlayerMode = document.getElementById('btn-player-mode');
const btnAvatarMode = document.getElementById('btn-avatar-mode');
const btnToggleLab = document.getElementById('btn-toggle-lab');
const btnCloseLab = document.getElementById('btn-close-lab');
const labDrawer = document.getElementById('lab-drawer');
const savedIndicator = document.getElementById('saved-indicator');
const statusToast = document.getElementById('status-toast');

// Non-Obtrusive Floating Star Burst Element
const starRewardBurst = document.getElementById('star-reward-burst');
let starBurstTimer = null;

// Pause & Exit Confirmation Modal Elements
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmSubtitle = document.getElementById('confirm-subtitle');
const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
const btnConfirmOk = document.getElementById('btn-confirm-ok');

// Parent Settings Controls
const btnRemoteHub = document.getElementById('btn-remote-hub');
const btnRemoteKeepy = document.getElementById('btn-remote-keepy');
const btnRemoteHats = document.getElementById('btn-remote-hats');
const btnRemoteButterflies = document.getElementById('btn-remote-butterflies');
const btnRemotePoses = document.getElementById('btn-remote-poses');
const btnRemoteDance = document.getElementById('btn-remote-dance');
const btnRemoteDisaster = document.getElementById('btn-remote-disaster');
const btnCalibrate = document.getElementById('btn-calibrate');
const btnBalloonCount = document.getElementById('btn-balloon-count');

const chkMusicEnabled = document.getElementById('chk-music-enabled');
const sliderMusicVol = document.getElementById('slider-music-vol');
const valMusicVol = document.getElementById('val-music-vol');
const chkVoiceEnabled = document.getElementById('chk-voice-enabled');
const selectSoundboardFreq = document.getElementById('select-soundboard-freq');
const btnTestSoundboard = document.getElementById('btn-test-soundboard');
const btnUploadClips = document.getElementById('btn-upload-clips');
const inputCustomAudio = document.getElementById('input-custom-audio');
const customAudioStatus = document.getElementById('custom-audio-status');

const selectCamera = document.getElementById('select-camera');
const selectResolution = document.getElementById('select-resolution');
const btnResetExposure = document.getElementById('btn-reset-exposure');
const selectFit = document.getElementById('select-fit');
const sliderZoomScale = document.getElementById('slider-zoom-scale');
const valZoomScale = document.getElementById('val-zoom-scale');
const sliderSideMargin = document.getElementById('slider-side-margin');
const valSideMargin = document.getElementById('val-side-margin');
const sliderFloorMargin = document.getElementById('slider-floor-margin');
const valFloorMargin = document.getElementById('val-floor-margin');
const chkShowSafezone = document.getElementById('chk-show-safezone');
const sliderHitboxMult = document.getElementById('slider-hitbox-mult');
const valHitboxMult = document.getElementById('val-hitbox-mult');
const sliderGravity = document.getElementById('slider-gravity');
const valGravity = document.getElementById('val-gravity');
const chkForgivingFloor = document.getElementById('chk-forgiving-floor');
const chkHideVideo = document.getElementById('chk-hide-video');

// Telemetry Labels
const statRes = document.getElementById('stat-res');
const statAspect = document.getElementById('stat-aspect');
const statFps = document.getElementById('stat-fps');
const statHitbox = document.getElementById('stat-hitbox');
const statDistance = document.getElementById('stat-distance');
const statMem = document.getElementById('stat-mem');
const btnViewLogs = document.getElementById('btn-view-logs');
const btnClearLogs = document.getElementById('btn-clear-logs');
const logViewerContainer = document.getElementById('log-viewer-container');
const logViewerText = document.getElementById('log-viewer-text');

let cameraErrorMsg = '';
let toastTimer = null;

function showToast(msg, durationMs = 3000) {
  statusToast.textContent = msg;
  statusToast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    statusToast.classList.add('hidden');
  }, durationMs);
}

function flashSavedIndicator() {
  if (!savedIndicator) return;
  savedIndicator.textContent = '✓ Saved!';
  savedIndicator.style.color = '#fde047';
  setTimeout(() => {
    savedIndicator.textContent = '✓ Auto-Saved';
    savedIndicator.style.color = '#4ade80';
  }, 1200);
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.max(1920, Math.round(window.innerWidth * dpr));
  const targetH = Math.max(1080, Math.round(window.innerHeight * dpr));
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Apply Persistent Settings to Modules & UI at Startup
const AVATAR_MODES = [
  { id: 'stickers', label: '✨ Stickers' },
  { id: 'avatar', label: '🐶 Avatar' },
  { id: 'skeleton', label: '🦴 Skeleton' },
];

const PLAYER_MODES = [
  { id: '1p', label: '👤 1P (Fastest 60 FPS)', maxPoses: 1 },
  { id: 'auto', label: '👥 2P Auto', maxPoses: 2 },
  { id: 'always_2p', label: '👥 2P Split', maxPoses: 2 },
];

function applyPersistentSettingsToUI() {
  const d = settings.data;

  tracker.selectedDeviceId = d.cameraDeviceId || '';
  tracker.resolutionPreset = d.resolutionPreset || '720p';
  if (tracker.resolutionPreset === '1080p') {
    tracker.resolutionPreset = '720p';
    settings.data.resolutionPreset = '720p';
    settings.save();
  }
  tracker.fitMode = d.fitMode || 'contain';
  tracker.zoomScale = d.zoomScale || 1.0;

  const dim = tracker.getResolutionDimensions();
  if (window.EmiliaNativeUVC && window.EmiliaNativeUVC.setPreferredResolution) {
    window.EmiliaNativeUVC.setPreferredResolution(dim.width, dim.height);
  }

  const pModeObj = PLAYER_MODES.find((m) => m.id === d.twoPlayerMode) || PLAYER_MODES[0];
  tracker.setMaxPlayers(pModeObj.maxPoses);
  if (btnPlayerMode) btnPlayerMode.textContent = pModeObj.label;

  selectResolution.value = tracker.resolutionPreset;
  selectFit.value = tracker.fitMode;
  const zoomPct = Math.round(tracker.zoomScale * 100);
  sliderZoomScale.value = zoomPct;
  valZoomScale.textContent = `${zoomPct}%`;

  const sidePct = Math.round((d.margins?.left ?? 0.08) * 100);
  sliderSideMargin.value = sidePct;
  valSideMargin.textContent = `${sidePct}%`;

  const floorPct = Math.round((d.margins?.bottom ?? 0.08) * 100);
  sliderFloorMargin.value = floorPct;
  valFloorMargin.textContent = `${floorPct}%`;

  chkShowSafezone.checked = Boolean(d.showSafeZoneBorder);

  const mult = Number(d.hitboxMultiplier || 1.35);
  sliderHitboxMult.value = mult;
  valHitboxMult.textContent = `${mult.toFixed(1)}x`;

  const g = Number(d.gravityScale || 0.9);
  sliderGravity.value = g;
  keepyGame.gravityScale = g;
  const desc = g <= 0.7 ? 'Extra Floaty' : g <= 1.1 ? 'Floaty' : 'Fast';
  valGravity.textContent = `${desc} (${g.toFixed(1)}x)`;

  chkForgivingFloor.checked = Boolean(d.forgivingFloor);
  keepyGame.forgivingFloor = Boolean(d.forgivingFloor);

  avatar.mode = d.avatarMode || 'stickers';
  avatar.hideVideoInAvatarMode = Boolean(d.hideVideoInAvatarMode);
  chkHideVideo.checked = avatar.hideVideoInAvatarMode;
  const modeObj = AVATAR_MODES.find((m) => m.id === avatar.mode) || AVATAR_MODES[0];
  btnAvatarMode.textContent = modeObj.label;

  const bCount = d.balloonCount || 1;
  btnBalloonCount.textContent = `🎈 ${bCount} Balloon${bCount > 1 ? 's' : ''}`;

  if (chkMusicEnabled) chkMusicEnabled.checked = d.musicEnabled !== false;
  const mVolPct = Math.round((d.musicVolume ?? 0.16) * 100);
  if (sliderMusicVol) sliderMusicVol.value = mVolPct;
  if (valMusicVol) valMusicVol.textContent = `${mVolPct}%`;

  chkVoiceEnabled.checked = d.voiceEnabled !== false;
  selectSoundboardFreq.value = String(d.soundboardEveryN || 10);

  starVal.textContent = d.starsEarned || 0;
}

applyPersistentSettingsToUI();

// Character Soundboard & Compact Golden Star Burst Handler (No Big Text Box!)
function triggerMilestoneCelebration(scoreOrForce = false) {
  const isManualTest = scoreOrForce === true;
  const newStars = settings.awardStar();
  starVal.textContent = newStars;
  starPill.classList.add('pulse');
  setTimeout(() => starPill.classList.remove('pulse'), 650);

  if (starRewardBurst) {
    starRewardBurst.classList.add('hidden');
    void starRewardBurst.offsetWidth;
    starRewardBurst.classList.remove('hidden');
    if (starBurstTimer) clearTimeout(starBurstTimer);
    starBurstTimer = setTimeout(() => {
      starRewardBurst.classList.add('hidden');
    }, 2200);
  }

  sound.playCharacterSoundboard(isManualTest);
}

keepyGame.onMilestone = () => triggerMilestoneCelebration(false);
hatGame.onMilestone = () => triggerMilestoneCelebration(false);
butterflyGame.onMilestone = () => triggerMilestoneCelebration(false);
posesGame.onMilestone = () => triggerMilestoneCelebration(false);
danceGame.onMilestone = () => triggerMilestoneCelebration(false);
disasterGame.onMilestone = () => triggerMilestoneCelebration(false);
disasterGame.onReturnToHub = () => switchScreen('hub');

// Award/upgrade Chest Badge (Bronze -> Silver -> Gold -> Bottom Diamond -> 10-Diamond Fireworks!)
hatGame.onLevelComplete = () => {
  return avatar.awardChestPin();
};

// Trigger 5-second sad face + flashing yellow when stung by a Buzzy Bee in Butterfly Pop!
butterflyGame.onBeeSting = (duration = 5.0) => {
  avatar.triggerBeeSting(duration);
};

// Pause & Exit Confirmation Modal Functions
function openConfirmModal(mode) {
  confirmMode = mode;
  isPaused = true;
  sound.updateBeeBuzz(false);
  sound.stopLavaClip();
  if (activeScreen === 'dance') {
    sound.pauseDanceTrack();
  }
  if (mode === 'pause_game') {
    confirmTitle.textContent = '⏸️ Game Paused';
    confirmSubtitle.textContent = 'Would you like to keep playing or go back to the Game Hub?';
    btnConfirmCancel.textContent = '▶️ Keep Playing';
    btnConfirmOk.textContent = '🏠 Back to Hub';
  } else {
    confirmTitle.textContent = "👋 Exit Emilia's Playground?";
    confirmSubtitle.textContent = 'Are you sure you want to close the game?';
    btnConfirmCancel.textContent = '🎈 Stay & Play';
    btnConfirmOk.textContent = '🚪 Exit Game';
  }
  confirmModal.classList.remove('hidden');
  setTimeout(() => {
    btnConfirmCancel.focus();
  }, 40);
}

function closeConfirmModal() {
  confirmModal.classList.add('hidden');
  confirmMode = null;
  isPaused = false;
  if (activeScreen === 'dance' && danceGame.phase === 'dancing') {
    sound.resumeDanceTrack();
  }
}

btnConfirmCancel.addEventListener('click', () => {
  sound.init();
  closeConfirmModal();
});

btnConfirmOk.addEventListener('click', () => {
  sound.init();
  const mode = confirmMode;
  closeConfirmModal();
  if (mode === 'pause_game') {
    switchScreen('hub');
  } else if (mode === 'exit_app') {
    if (window.EmiliaNativeUVC && typeof window.EmiliaNativeUVC.exitApp === 'function') {
      window.EmiliaNativeUVC.exitApp();
    } else {
      window.close();
    }
  }
});

// Performance Telemetry & Profiling Hooks for Game Testing
let perfLastTime = performance.now();
let perfFrameCount = 0;
let perfFrameDips = 0;
let perfMinFps = 60;
let perfTotalRenderMs = 0;
let perfTotalInferenceMs = 0;
let perfLastLogTime = performance.now();
let perfScreenStartTime = performance.now();

// Switch Active Game or Return to Start Hub
function switchScreen(screenId) {
  sound.init();
  closeConfirmModal();

  // Performance telemetry on screen transitions
  if (activeScreen && activeScreen !== screenId) {
    const durSec = ((performance.now() - perfScreenStartTime) / 1000).toFixed(1);
    logger.info('PERF', `Screen ended: [${activeScreen}] duration=${durSec}s`);
    perfScreenStartTime = performance.now();
    perfFrameCount = 0;
    perfFrameDips = 0;
    perfMinFps = 60;
    perfTotalRenderMs = 0;
    perfTotalInferenceMs = 0;
    perfLastLogTime = performance.now();
  }

  // Always clean up game-specific state when switching screens!
  sound.updateBeeBuzz(false);
  if (screenId !== 'disaster') {
    disasterGame.stop();
    sound.stopLavaClip();
  }
  if (screenId !== 'dance') {
    danceGame.stopAudio();
    sound.stopDanceTrack();
  }
  if (screenId !== 'hats') {
    // Clear Hat Stacker chest pins when exiting the game so they don't stay on the avatar!
    avatar.clearChestPins();
  }

  const safeBounds = calibration.getSafeBounds(canvas.width, canvas.height);

  if (screenId === 'calibrate') {
    activeScreen = 'hub';
    hub.reset();
    calibration.startInteractiveCalibration();
    btnCalibrate.textContent = '⏹️ Cancel Calibrate';
    return;
  }

  activeScreen = screenId;
  hub.reset();
  logger.info('Game', `Switched to screen: ${screenId}`);

  if (screenId !== 'disaster' && screenId !== 'dance') {
    sound.stopLavaClip();
  }
  if (screenId !== 'dance') {
    sound.stopDanceTrack();
  }

  // Always keep total stars visible across the app
  starPill?.classList.remove('hidden');
  starVal.textContent = settings.data.starsEarned || 0;

  if (screenId === 'hub') {
    sound.updateBackgroundMusic();
    modeSubtitle.textContent = 'Choose a Game!';
    btnHome?.classList.add('hidden');
    avatar.hideHeadSticker = false;
    if (starLabelText) starLabelText.textContent = '⭐ STARS';
    // Hide arcade SCORE and BEST pills on the Home Hub
    currentScorePill?.classList.add('hidden');
    bestScorePill?.classList.add('hidden');
    sound.speakVoice('welcome_hub', true);
  } else if (screenId === 'keepy') {
    modeSubtitle.textContent = '🎈 Keepy Uppy';
    btnHome?.classList.remove('hidden');
    avatar.hideHeadSticker = false;
    if (starLabelText) starLabelText.textContent = '⭐';
    currentScorePill?.classList.remove('hidden');
    bestScorePill?.classList.remove('hidden');
    scoreLabelText.textContent = '🎈 HITS';
    scoreVal.textContent = keepyGame.score;
    bestLabelText.textContent = '🏆 BEST';
    bestVal.textContent = keepyGame.bestScore;
    keepyGame.resetBalloons(safeBounds);
    sound.speakVoice('start_keepy', true);
  } else if (screenId === 'hats') {
    modeSubtitle.textContent = '👑 Hat Stacker';
    btnHome?.classList.remove('hidden');
    avatar.hideHeadSticker = true;
    avatar.showHatAchievements = true;
    if (starLabelText) starLabelText.textContent = '⭐';
    currentScorePill?.classList.remove('hidden');
    bestScorePill?.classList.remove('hidden');
    scoreLabelText.textContent = '👑 TOWER';
    scoreVal.textContent = hatGame.score;
    bestLabelText.textContent = '🏆 BEST';
    bestVal.textContent = hatGame.bestScore;
    hatGame.reset(safeBounds);
    sound.speakVoice('start_hats', true);
  } else if (screenId === 'butterflies') {
    modeSubtitle.textContent = '🦋 Butterfly Pop';
    btnHome?.classList.remove('hidden');
    avatar.hideHeadSticker = false;
    if (starLabelText) starLabelText.textContent = '⭐';
    currentScorePill?.classList.remove('hidden');
    bestScorePill?.classList.remove('hidden');
    scoreLabelText.textContent = '🦋 POPPED';
    scoreVal.textContent = butterflyGame.score;
    bestLabelText.textContent = '🏆 BEST';
    bestVal.textContent = butterflyGame.bestScore;
    butterflyGame.reset(safeBounds);
    sound.speakVoice('start_butterflies', true);
  } else if (screenId === 'poses') {
    modeSubtitle.textContent = '📸 Silly Poses';
    btnHome?.classList.remove('hidden');
    avatar.hideHeadSticker = false;
    if (starLabelText) starLabelText.textContent = '⭐';
    // Creative photo booth — hide score pills
    currentScorePill?.classList.add('hidden');
    bestScorePill?.classList.add('hidden');
    posesGame.reset();
    sound.speakVoice('start_poses', true);
  } else if (screenId === 'dance') {
    modeSubtitle.textContent = '🪩 Dance Party';
    btnHome?.classList.remove('hidden');
    avatar.hideHeadSticker = true;
    if (starLabelText) starLabelText.textContent = '⭐';
    // Unified Groove Meter on canvas handles hype — hide top score pills
    currentScorePill?.classList.add('hidden');
    bestScorePill?.classList.add('hidden');
    danceGame.reset();
    sound.speakVoice('start_dance', true);
  } else if (screenId === 'disaster') {
    modeSubtitle.textContent = '🌋 Floor is Lava';
    btnHome?.classList.remove('hidden');
    avatar.hideHeadSticker = false;
    if (starLabelText) starLabelText.textContent = '⭐';
    currentScorePill?.classList.remove('hidden');
    bestScorePill?.classList.add('hidden');
    scoreLabelText.textContent = 'ROUND';
    scoreVal.textContent = `${disasterGame.currentRound || 1} / ${disasterGame.totalRounds || 10}`;
    sound.prewarmLavaAudio();
    disasterGame.reset();
  }
}

async function populateCameraDropdown() {
  const cams = await tracker.listCameras();
  selectCamera.innerHTML = '';
  if (cams.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Default USB Webcam';
    selectCamera.appendChild(opt);
    return;
  }
  cams.forEach((cam, idx) => {
    const opt = document.createElement('option');
    opt.value = cam.deviceId;
    opt.textContent = cam.label || `Webcam #${idx + 1}`;
    if (cam.deviceId === tracker.selectedDeviceId) {
      opt.selected = true;
    }
    selectCamera.appendChild(opt);
  });
}

async function initApp() {
  await new Promise((r) => setTimeout(r, 120));

  if (splashProgressBar) splashProgressBar.style.width = '30%';
  if (splashStatusText) splashStatusText.textContent = 'Connecting USB Camera...';

  // Start staggered audio pre-warming in background so achievements have 0ms lag!
  sound.init();

  const camPromise = tracker
    .startCamera(settings.data.cameraDeviceId || '')
    .then(async (info) => {
      cameraErrorMsg = '';
      if (splashProgressBar) splashProgressBar.style.width = '60%';
      if (splashStatusText) splashStatusText.textContent = 'Camera connected! Loading Motion AI...';
      await populateCameraDropdown();
      return info;
    })
    .catch((err) => {
      console.warn('Camera not connected or permission pending:', err);
      cameraErrorMsg =
        'Waiting for USB Webcam... (Press OK on Shield TV permission dialog or use Mouse to test!)';
      return null;
    });

  const modelPromise = tracker.initModel().catch((err) => {
    console.error('Pose model failed to load:', err);
  });

  await Promise.all([camPromise, modelPromise]);

  // Wait until the first live UVC camera frame is decoded before shader warmup
  if (tracker.useNativeUvc) {
    if (splashStatusText) splashStatusText.textContent = 'Connecting Camera Stream...';
    const t0 = performance.now();
    while (performance.now() - t0 < 3000) {
      if (tracker.uvcFrameReady) break;
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  if (splashProgressBar) splashProgressBar.style.width = '85%';
  if (splashStatusText) splashStatusText.textContent = 'Warming up Motion Tracking & Shaders...';

  // Pre-warm WebGL GPU shaders on the full-resolution camera frame while splash is visible!
  // This eliminates the 2-3s frozen screen upon entering the game.
  await tracker.warmupGpuShaders(canvas.width, canvas.height);

  if (splashProgressBar) splashProgressBar.style.width = '95%';
  if (splashStatusText) splashStatusText.textContent = 'Starting Live Magic Mirror...';

  // Safety fallback timer: in case camera hardware is detached or permission delayed
  setTimeout(() => {
    if (!splashDismissed) {
      logger.warn('Splash', 'Safety timeout reached (15s), dismissing splash');
      dismissSplashScreen();
    }
  }, 15000);

  if (!welcomeSpoken) {
    welcomeSpoken = true;
    setTimeout(() => sound.speakVoice('welcome_hub', true), 700);
  }

  setInterval(async () => {
    if (cameraErrorMsg && !tracker.stream && !tracker.useNativeUvc) {
      try {
        await tracker.startCamera(settings.data.cameraDeviceId || '');
        cameraErrorMsg = '';
        await populateCameraDropdown();
      } catch {
        // Still waiting
      }
    }
  }, 2500);
}

// Top Bar & Drawer Navigation Listeners
btnBrandHome.addEventListener('click', () => {
  if (activeScreen !== 'hub') {
    openConfirmModal('pause_game');
  }
});
if (btnHome) {
  btnHome.addEventListener('click', () => {
    if (activeScreen !== 'hub') {
      openConfirmModal('pause_game');
    }
  });
}

btnRemoteHub.addEventListener('click', () => {
  closeLabDrawer();
  switchScreen('hub');
});
btnRemoteKeepy.addEventListener('click', () => {
  closeLabDrawer();
  switchScreen('keepy');
});
btnRemoteHats.addEventListener('click', () => {
  closeLabDrawer();
  switchScreen('hats');
});
btnRemoteButterflies.addEventListener('click', () => {
  closeLabDrawer();
  switchScreen('butterflies');
});
if (btnRemotePoses) {
  btnRemotePoses.addEventListener('click', () => {
    closeLabDrawer();
    switchScreen('poses');
  });
}
if (btnRemoteDance) {
  btnRemoteDance.addEventListener('click', () => {
    closeLabDrawer();
    switchScreen('dance');
  });
}
if (btnRemoteDisaster) {
  btnRemoteDisaster.addEventListener('click', () => {
    closeLabDrawer();
    switchScreen('disaster');
  });
}

function updateMemoryStatusUI() {
  if (statMem) {
    const mem = logger.getNativeMemoryStatus();
    statMem.textContent = mem || 'Active';
  }
}

function openLabDrawer() {
  labDrawer.classList.remove('closed');
  updateMemoryStatusUI();
  setTimeout(() => {
    if (btnAvatarMode) {
      btnAvatarMode.focus();
    } else {
      btnRemoteHub.focus();
    }
  }, 50);
}

function closeLabDrawer() {
  labDrawer.classList.add('closed');
  if (logViewerContainer) {
    logViewerContainer.classList.add('hidden');
    if (btnViewLogs) btnViewLogs.textContent = '📜 View Logs';
  }
}

function toggleLabDrawer() {
  sound.init();
  if (labDrawer.classList.contains('closed')) {
    openLabDrawer();
  } else {
    closeLabDrawer();
  }
}

if (btnToggleLab) {
  btnToggleLab.addEventListener('click', toggleLabDrawer);
}
btnCloseLab.addEventListener('click', closeLabDrawer);

if (btnViewLogs) {
  btnViewLogs.addEventListener('click', async () => {
    sound.init();
    if (logViewerContainer.classList.contains('hidden')) {
      const logs = await logger.getCombinedLogs();
      if (logViewerText) logViewerText.textContent = logs;
      logViewerContainer.classList.remove('hidden');
      btnViewLogs.textContent = '❌ Hide Logs';
    } else {
      logViewerContainer.classList.add('hidden');
      btnViewLogs.textContent = '📜 View Logs';
    }
  });
}

if (btnClearLogs) {
  btnClearLogs.addEventListener('click', () => {
    sound.init();
    logger.clear();
    if (logViewerText) logViewerText.textContent = 'Diagnostic logs cleared.';
    showToast('Diagnostic logs cleared.');
  });
}

// Central Handler for Shield Remote Back Button & Keyboard Escape
function handleBackAction() {
  sound.init();
  const drawerOpen = !labDrawer.classList.contains('closed');

  if (confirmMode !== null) {
    closeConfirmModal();
    return;
  }
  if (drawerOpen) {
    closeLabDrawer();
    return;
  }
  if (calibration.isCalibrating) {
    calibration.cancelInteractiveCalibration();
    btnCalibrate.textContent = '🙌 Calibrate Play-Space';
    return;
  }
  if (activeScreen !== 'hub') {
    openConfirmModal('pause_game');
    return;
  }
  openConfirmModal('exit_app');
}

window.onAndroidBackPressed = handleBackAction;

// Shield TV Remote & Keyboard Navigation
window.addEventListener('keydown', (e) => {
  sound.init();
  const drawerOpen = !labDrawer.classList.contains('closed');

  if (confirmMode !== null) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      btnConfirmCancel.focus();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      btnConfirmOk.focus();
      return;
    }
  }

  if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack') {
    e.preventDefault();
    handleBackAction();
    return;
  }

  // Right arrow on remote opens the right-side Settings & Avatar drawer
  if (!drawerOpen && confirmMode === null && e.key === 'ArrowRight' && activeScreen !== 'calibrate') {
    e.preventDefault();
    openLabDrawer();
    return;
  }

  // Quick remote restart during Silly Poses photo result screen
  if (activeScreen === 'poses' && posesGame.phase === 'result') {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Select') {
      e.preventDefault();
      posesGame.startNewRound(true);
      return;
    }
  }

  if (e.key === 'd' || e.key === 'D' || e.key === 'm' || e.key === 'M' || e.key === 'ContextMenu') {
    e.preventDefault();
    toggleLabDrawer();
    return;
  }

  if (
    !drawerOpen &&
    confirmMode === null &&
    (e.key === 'Enter' || e.key === ' ') &&
    (!document.activeElement || document.activeElement === document.body)
  ) {
    e.preventDefault();
    openLabDrawer();
  }
});

// Parent Settings Control Listeners
btnCalibrate.addEventListener('click', () => {
  sound.init();
  if (calibration.isCalibrating) {
    calibration.cancelInteractiveCalibration();
    btnCalibrate.textContent = '🙌 Calibrate Play-Space';
  } else {
    closeLabDrawer();
    calibration.startInteractiveCalibration();
    btnCalibrate.textContent = '⏹️ Cancel Calibrate';
  }
});

if (btnPlayerMode) {
  btnPlayerMode.addEventListener('click', () => {
    sound.init();
    const curIdx = PLAYER_MODES.findIndex((m) => m.id === settings.data.twoPlayerMode);
    const next = PLAYER_MODES[(curIdx + 1) % PLAYER_MODES.length];
    settings.data.twoPlayerMode = next.id;
    tracker.setMaxPlayers(next.maxPoses);
    settings.save();
    flashSavedIndicator();
    btnPlayerMode.textContent = next.label;
    showToast(`Player Mode: ${next.label}`);
  });
}

btnAvatarMode.addEventListener('click', () => {
  sound.init();
  const curIdx = AVATAR_MODES.findIndex((m) => m.id === avatar.mode);
  const next = AVATAR_MODES[(curIdx + 1) % AVATAR_MODES.length];
  avatar.mode = next.id;
  settings.data.avatarMode = next.id;
  settings.save();
  flashSavedIndicator();
  btnAvatarMode.textContent = next.label;
  showToast(`Switched to ${next.label}`);
});

btnBalloonCount.addEventListener('click', () => {
  sound.init();
  const nextCount = ((settings.data.balloonCount || 1) % 4) + 1;
  settings.data.balloonCount = nextCount;
  settings.save();
  flashSavedIndicator();
  const bounds = calibration.getSafeBounds(canvas.width, canvas.height);
  keepyGame.setBalloonCount(nextCount, bounds);
  btnBalloonCount.textContent = `🎈 ${nextCount} Balloon${nextCount > 1 ? 's' : ''}`;
});

if (chkMusicEnabled) {
  chkMusicEnabled.addEventListener('change', (e) => {
    settings.data.musicEnabled = e.target.checked;
    settings.save();
    flashSavedIndicator();
    sound.updateBackgroundMusic();
  });
}

if (sliderMusicVol) {
  sliderMusicVol.addEventListener('input', (e) => {
    const pct = Number(e.target.value);
    if (valMusicVol) valMusicVol.textContent = `${pct}%`;
    settings.data.musicVolume = pct / 100;
    settings.save();
    flashSavedIndicator();
    sound.updateBackgroundMusic();
  });
}

chkVoiceEnabled.addEventListener('change', (e) => {
  settings.data.voiceEnabled = e.target.checked;
  settings.save();
  flashSavedIndicator();
  if (e.target.checked) {
    sound.speakVoice('welcome_hub', true);
  }
});

selectSoundboardFreq.addEventListener('change', (e) => {
  settings.data.soundboardEveryN = Number(e.target.value);
  settings.save();
  flashSavedIndicator();
});

btnTestSoundboard.addEventListener('click', () => {
  sound.init();
  triggerMilestoneCelebration(true);
});

btnUploadClips.addEventListener('click', () => {
  inputCustomAudio.click();
});

inputCustomAudio.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    const total = sound.addCustomSoundboardFiles(e.target.files);
    customAudioStatus.textContent = `Loaded ${total} custom audio clip(s) into Emilia's Soundboard!`;
    customAudioStatus.style.color = '#4ade80';
    triggerMilestoneCelebration(true);
  }
});

selectCamera.addEventListener('change', async (e) => {
  settings.data.cameraDeviceId = e.target.value;
  settings.save();
  flashSavedIndicator();
  try {
    const info = await tracker.startCamera(e.target.value);
    cameraErrorMsg = '';
    showToast(`Switched to ${info.label} (${info.width}×${info.height})`);
  } catch (err) {
    showToast(`Camera error: ${err.message}`);
  }
});

selectResolution.addEventListener('change', async (e) => {
  tracker.resolutionPreset = e.target.value;
  settings.data.resolutionPreset = e.target.value;
  settings.save();
  flashSavedIndicator();
  try {
    const dim = tracker.getResolutionDimensions();
    if (window.EmiliaNativeUVC && window.EmiliaNativeUVC.setPreferredResolution) {
      window.EmiliaNativeUVC.setPreferredResolution(dim.width, dim.height);
    }
    const info = await tracker.startCamera(selectCamera.value);
    showToast(`Stream resolution now ${info.width}×${info.height}`);
  } catch (err) {
    showToast(`Could not switch resolution: ${err.message}`);
  }
});

if (btnResetExposure) {
  btnResetExposure.addEventListener('click', () => {
    sound.init();
    if (window.EmiliaNativeUVC && window.EmiliaNativeUVC.resetCameraHardware) {
      window.EmiliaNativeUVC.resetCameraHardware();
      sound.playFanfare();
      showToast('☀️ Camera & Auto-Exposure reset! Re-calibrating...');
    } else {
      tracker.startCamera().then(() => {
        showToast('Camera re-initialized.');
      }).catch(err => {
        showToast(`Camera reset: ${err.message}`);
      });
    }
  });
}

selectFit.addEventListener('change', (e) => {
  tracker.fitMode = e.target.value;
  settings.data.fitMode = e.target.value;
  settings.save();
  flashSavedIndicator();
});

sliderZoomScale.addEventListener('input', (e) => {
  const pct = Number(e.target.value);
  valZoomScale.textContent = `${pct}%`;
  tracker.zoomScale = pct / 100;
  settings.data.zoomScale = pct / 100;
  settings.save();
  flashSavedIndicator();
});

sliderSideMargin.addEventListener('input', (e) => {
  const pct = Number(e.target.value);
  valSideMargin.textContent = `${pct}%`;
  calibration.margins.left = pct / 100;
  calibration.margins.right = pct / 100;
  calibration.save();
  flashSavedIndicator();
});

sliderFloorMargin.addEventListener('input', (e) => {
  const pct = Number(e.target.value);
  valFloorMargin.textContent = `${pct}%`;
  calibration.margins.bottom = pct / 100;
  calibration.save();
  flashSavedIndicator();
});

chkShowSafezone.addEventListener('change', (e) => {
  calibration.showSafeZoneBorder = e.target.checked;
  calibration.save();
  flashSavedIndicator();
});

sliderHitboxMult.addEventListener('input', (e) => {
  const mult = Number(e.target.value);
  valHitboxMult.textContent = `${mult.toFixed(1)}x`;
  calibration.hitboxMultiplier = mult;
  calibration.save();
  flashSavedIndicator();
});

sliderGravity.addEventListener('input', (e) => {
  const g = Number(e.target.value);
  keepyGame.gravityScale = g;
  settings.data.gravityScale = g;
  settings.save();
  flashSavedIndicator();
  const desc = g <= 0.7 ? 'Extra Floaty' : g <= 1.1 ? 'Floaty' : 'Fast';
  valGravity.textContent = `${desc} (${g.toFixed(1)}x)`;
});

chkForgivingFloor.addEventListener('change', (e) => {
  keepyGame.forgivingFloor = e.target.checked;
  settings.data.forgivingFloor = e.target.checked;
  settings.save();
  flashSavedIndicator();
});

chkHideVideo.addEventListener('change', (e) => {
  avatar.hideVideoInAvatarMode = e.target.checked;
  settings.data.hideVideoInAvatarMode = e.target.checked;
  settings.save();
  flashSavedIndicator();
});

function updatePointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
  pointer.x = (e.clientX - rect.left) * scaleX;
  pointer.y = (e.clientY - rect.top) * scaleY;
}

// Mouse / Touch fallback pointer for testing all 6 games & bubble hub
canvas.addEventListener('pointermove', (e) => {
  sound.init();
  updatePointerPos(e);
  pointer.active = true;
  keepyGame.updatePointer(pointer.x, pointer.y, true);
});
canvas.addEventListener('pointerdown', (e) => {
  sound.init();
  updatePointerPos(e);
  pointer.active = true;
  pointer.clicked = true;
});
canvas.addEventListener('pointerleave', () => {
  pointer.active = false;
  pointer.clicked = false;
  keepyGame.updatePointer(-1000, -1000, false);
});

// Main 60 FPS Render & Physics Loop
let lastTime = performance.now();

let liveWarmupFrames = 0;

function renderLoop(now) {
  const tFrameStart = performance.now();
  const rawDt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const dt = isPaused ? 0 : rawDt;

  const dtReal = (tFrameStart - perfLastTime) / 1000;
  perfLastTime = tFrameStart;
  if (dtReal > 0) {
    const curFps = 1 / dtReal;
    if (perfFrameCount > 10 && curFps < perfMinFps) {
      perfMinFps = curFps;
    }
    if (dtReal > 0.028) {
      perfFrameDips++;
    }
  }
  perfFrameCount++;

  const cw = canvas.width;
  const ch = canvas.height;

  // 1. Clear Canvas
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, cw, ch);

  // 2. Draw Mirrored Webcam Feed (always show raw camera feed in Silly Poses so real faces are visible!)
  const drawable = tracker.getActiveDrawable();
  const shouldDrawVideo =
    activeScreen === 'poses' || !(avatar.mode === 'avatar' && avatar.hideVideoInAvatarMode);
  if (drawable && shouldDrawVideo) {
    if (cameraErrorMsg) {
      cameraErrorMsg = '';
    }
    liveWarmupFrames++;
    // Dismiss splash ONLY after live camera has rendered several frames AND
    // MediaPipe GPU inferences are confirmed running smoothly with zero stall!
    if (!splashDismissed && liveWarmupFrames >= 8 && tracker.successfulInferences >= 2) {
      if (splashProgressBar) splashProgressBar.style.width = '100%';
      if (splashStatusText) splashStatusText.textContent = "Ready to Play, Emilia! 🎈";
      dismissSplashScreen();
    }
    const vp = tracker.getVideoViewport(cw, ch);
    ctx.save();
    if (tracker.mirror) {
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(drawable, cw - vp.offsetX - vp.drawWidth, vp.offsetY, vp.drawWidth, vp.drawHeight);
    } else {
      ctx.drawImage(drawable, vp.offsetX, vp.offsetY, vp.drawWidth, vp.drawHeight);
    }
    ctx.restore();
  } else if (cameraErrorMsg) {
    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, '#1E293B');
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cameraErrorMsg, cw / 2, ch - 30);
    ctx.restore();
  }

  // 3. Detect Player Pose(s) (1P or 2P!) & Update Hitboxes
  const player = tracker.detectFrame(cw, ch, calibration.hitboxMultiplier);

  // Determine if Rainbow Sparkle Hand Trails should glow!
  const currentScore =
    activeScreen === 'keepy'
      ? keepyGame.score
      : activeScreen === 'hats'
      ? hatGame.score
      : activeScreen === 'butterflies'
      ? butterflyGame.score
      : activeScreen === 'poses'
      ? posesGame.score
      : activeScreen === 'dance'
      ? danceGame.score
      : activeScreen === 'disaster'
      ? disasterGame.score
      : 0;
  avatar.rainbowSparkleActive = currentScore >= (settings.data.soundboardEveryN || 10);

  // 4. Draw Stickers / Cartoon Avatar / Skeleton (skipped in Silly Poses so real faces & poses are uncovered!)
  if (activeScreen !== 'poses') {
    avatar.updateAndRender(ctx, player, cw, ch, dt);
  }

  // 5. Update & Render Safe Play Zone + Interactive Calibration
  const safeBounds = calibration.getSafeBounds(cw, ch);
  calibration.updateAndRender(ctx, player, cw, ch, dt, (result) => {
    btnCalibrate.textContent = '🙌 Calibrate Play-Space';
    sliderHitboxMult.value = calibration.hitboxMultiplier;
    valHitboxMult.textContent = `${calibration.hitboxMultiplier.toFixed(1)}x`;
    showToast(
      `Calibrated Emilia! Setup: ${result.distanceEstimate} | Hitbox: ${result.autoHitboxRadius}px`,
      4000
    );
  });

  // 6. Update & Render Active Screen (Hub or Mini-Game) when not calibrating
  if (!calibration.isCalibrating) {
    if (activeScreen === 'hub') {
      if (!isPaused) {
        hub.updateAndRenderHub(ctx, dt, safeBounds, player, pointer, (chosenGameId) => {
          switchScreen(chosenGameId);
        });
      }
    } else if (activeScreen === 'keepy') {
      if (!isPaused) {
        keepyGame.update(dt, safeBounds, player, triggerMilestoneCelebration);
      }
      keepyGame.render(ctx);
      if (!isPaused) {
        hub.updateAndRenderHomeBubble(ctx, dt, safeBounds, player, pointer, () => {
          switchScreen('hub');
        });
      }
      scoreVal.textContent = keepyGame.score;
      bestVal.textContent = keepyGame.bestScore;
    } else if (activeScreen === 'hats') {
      if (!isPaused) {
        hatGame.update(dt, safeBounds, player, pointer, triggerMilestoneCelebration);
      }
      hatGame.render(ctx, player, pointer, safeBounds);
      if (!isPaused) {
        hub.updateAndRenderHomeBubble(ctx, dt, safeBounds, player, pointer, () => {
          switchScreen('hub');
        });
      }
      scoreVal.textContent = hatGame.score;
      bestVal.textContent = hatGame.bestScore;
    } else if (activeScreen === 'butterflies') {
      if (!isPaused) {
        butterflyGame.update(dt, safeBounds, player, pointer, triggerMilestoneCelebration);
      }
      butterflyGame.render(ctx);
      if (!isPaused) {
        hub.updateAndRenderHomeBubble(ctx, dt, safeBounds, player, pointer, () => {
          switchScreen('hub');
        });
      }
      scoreVal.textContent = butterflyGame.score;
      bestVal.textContent = butterflyGame.bestScore;
    } else if (activeScreen === 'poses') {
      if (!isPaused) {
        posesGame.update(dt, safeBounds, player, pointer, triggerMilestoneCelebration);
      }
      posesGame.render(ctx, canvas, safeBounds, player, triggerMilestoneCelebration, tracker);
      if (!isPaused) {
        hub.updateAndRenderHomeBubble(ctx, dt, safeBounds, player, pointer, () => {
          switchScreen('hub');
        });
      }
    } else if (activeScreen === 'dance') {
      if (!isPaused) {
        danceGame.update(dt, safeBounds, player, pointer, triggerMilestoneCelebration);
      }
      danceGame.render(ctx, cw, ch, safeBounds, player);
      if (!isPaused) {
        hub.updateAndRenderHomeBubble(ctx, dt, safeBounds, player, pointer, () => {
          switchScreen('hub');
        });
      }
    } else if (activeScreen === 'disaster') {
      if (!isPaused) {
        disasterGame.update(dt, safeBounds, player, pointer, triggerMilestoneCelebration, avatar);
      }
      disasterGame.render(ctx, cw, ch, safeBounds);
      if (!isPaused) {
        hub.updateAndRenderHomeBubble(ctx, dt, safeBounds, player, pointer, () => {
          switchScreen('hub');
        });
      }
      scoreVal.textContent = `${disasterGame.currentRound || 1} / ${disasterGame.totalRounds || 10}`;
    }
  }

  // 7. Update Telemetry UI
  if (tracker.cameraInfo.width > 0) {
    statRes.textContent = `${tracker.cameraInfo.width}×${tracker.cameraInfo.height}`;
    statAspect.textContent = tracker.cameraInfo.aspectRatio;
    statFps.textContent = `${tracker.cameraInfo.fps} fps / ${tracker.cameraInfo.inferenceMs}ms`;
  }
  statHitbox.textContent = player.detected
    ? `${player.autoHitboxRadius} px (${player.playerCount}P)`
    : '—';
  statDistance.textContent = player.detected ? player.distanceEstimate : 'Step into view...';

  // Periodic Telemetry Summary every 10 seconds into emiliago_diagnostic.log
  const frameRenderMs = performance.now() - tFrameStart;
  perfTotalRenderMs += frameRenderMs;
  perfTotalInferenceMs += tracker.cameraInfo.inferenceMs || 0;

  if (tFrameStart - perfLastLogTime >= 10000) {
    const elapsedSec = (tFrameStart - perfLastLogTime) / 1000;
    const avgFps = perfFrameCount / elapsedSec;
    const avgRender = perfTotalRenderMs / Math.max(1, perfFrameCount);
    const avgInf = perfTotalInferenceMs / Math.max(1, perfFrameCount);

    if (activeScreen !== 'hub') {
      logger.info(
        'PERF',
        `[${activeScreen.toUpperCase()}] avgFPS=${avgFps.toFixed(1)}, minFPS=${perfMinFps.toFixed(1)}, dips=${perfFrameDips} | renderTime=${avgRender.toFixed(2)}ms, inferenceMs=${avgInf.toFixed(1)}ms | players=${player.playerCount}`
      );
    }

    perfFrameCount = 0;
    perfFrameDips = 0;
    perfMinFps = 60;
    perfTotalRenderMs = 0;
    perfTotalInferenceMs = 0;
    perfLastLogTime = tFrameStart;
  }

  // Consume one-frame click event
  pointer.clicked = false;

  requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);
initApp();
