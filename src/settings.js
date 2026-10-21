// Persistent Settings & Star Trophy Storage for EmiliaGO (saves across launches on Shield TV & PC)

const STORAGE_KEY = 'emiliago_persistent_v2';

export class SettingsManager {
  constructor() {
    this.data = {
      // Camera & Display Settings
      cameraDeviceId: '',
      resolutionPreset: '720p', // 720p: locked 60 FPS widescreen (1080p causes 180ms MediaPipe GPU lag on Shield TV)
      fitMode: 'contain', // 'contain' (Full 100% FOV) | 'cover' (Fill 16:9)
      zoomScale: 1.0, // 0.65 to 1.0

      // Living Room Safe Play-Zone Margins (fractions 0.02..0.30)
      margins: {
        left: 0.08,
        right: 0.08,
        top: 0.05,
        bottom: 0.08,
      },
      showSafeZoneBorder: false,

      // Gameplay & Kid Forgiveness + 1P/2P Mode
      twoPlayerMode: '1p', // '1p' (Fastest 60 FPS for Emilia) | 'auto' (2P) | 'always_2p'
      hitboxMultiplier: 1.35, // Generous default for Emilia
      avatarMode: 'stickers', // 'stickers' | 'avatar' | 'skeleton'
      hideVideoInAvatarMode: false,
      balloonCount: 1,
      gravityScale: 0.9, // Slightly floatier default for kids
      forgivingFloor: true,

      // Audio, Background Music & Soundboard
      voiceEnabled: true,
      musicEnabled: true,
      musicVolume: 0.16,
      soundboardEveryN: 10,
      soundboardMigratedV3: true,

      // Persistent Player Progress & Trophies
      starsEarned: 0,
      bestKeepyUppy: 0,
      bestHatStack: 0,
      bestButterflies: 0,
      bestSillyPoses: 0,
      bestDanceParty: 0,
      bestDisasterZone: 0,
    };

    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.soundboardMigratedV3 && parsed.soundboardEveryN === 5) {
          parsed.soundboardEveryN = 10;
          parsed.soundboardMigratedV3 = true;
        }
        // Ensure 720p is always enforced for locked 60 FPS on NVIDIA Shield TV
        if (parsed.resolutionPreset === '1080p' || !parsed.resolutionPreset) {
          parsed.resolutionPreset = '720p';
        }
        if (!parsed.playerModeMigratedV2) {
          parsed.twoPlayerMode = '1p';
          parsed.playerModeMigratedV2 = true;
        }
        this.data = {
          ...this.data,
          ...parsed,
          margins: {
            ...this.data.margins,
            ...(parsed.margins || {}),
          },
        };
      }
    } catch (e) {
      console.warn('Could not load persistent settings:', e);
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Could not save persistent settings:', e);
    }
  }

  awardStar() {
    this.data.starsEarned = (this.data.starsEarned || 0) + 1;
    this.save();
    return this.data.starsEarned;
  }
}

export const settings = new SettingsManager();
