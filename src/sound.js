// Sound Effects, Spoken Voice Coach, Background Music, Dance Party Jukebox & Real Character Soundboard Engine for EmiliaGO
import { settings } from './settings.js';

export const SOUNDBOARD_CHARACTERS = [
  {
    id: 'real_bluey_intro',
    emoji: '🐾',
    character: 'BLUEY THEME SONG!',
    label: 'Da-da-da-da-da! Hooray Emilia!',
    color: '#38BDF8',
    clip: '/audio/real_bluey_intro.mp3',
    gain: 1.45,
  },
  {
    id: 'cel_bluey_intro_tune',
    emoji: '🎶',
    character: 'BLUEY INTRO TUNE!',
    label: 'Dance & Play, Emilia!',
    color: '#38BDF8',
    clip: '/audio/celebration/bluey-intro-tune.mp3',
    gain: 1.45,
  },
  {
    id: 'cel_bluey_bingo_laugh',
    emoji: '🐶',
    character: 'BLUEY & BINGO GIGGLING!',
    label: 'Hehehe! Awesome job, Emilia!',
    color: '#FB923C',
    clip: '/audio/celebration/bluey-and-bingo-laughing.mp3',
    gain: 1.55,
  },
  {
    id: 'cel_cowabunga',
    emoji: '🐢',
    character: 'COWABUNGA!!',
    label: 'Super moves, Emilia!',
    color: '#4ADE80',
    clip: '/audio/celebration/cowabunga.mp3',
    gain: 1.55,
  },
  {
    id: 'real_peppa_im_peppa',
    emoji: '🐷',
    character: "I'M PEPPA PIG! OINK!",
    label: 'Oink Oink! Brilliant job, Emilia!',
    color: '#F472B6',
    clip: '/audio/real_peppa_im_peppa.mp3',
    gain: 1.55,
  },
  {
    id: 'real_bluey_shout',
    emoji: '💙',
    character: 'BLUEY!!',
    label: 'For real life?! +1 Golden Star!',
    color: '#38BDF8',
    clip: '/audio/real_bluey_shout.mp3',
    gain: 1.65,
  },
  {
    id: 'real_bingo_shout',
    emoji: '🧡',
    character: 'BINGO!!',
    label: 'Wackadoo! Awesome moves, Emilia!',
    color: '#F59E0B',
    clip: '/audio/real_bingo_shout.mp3',
    gain: 1.65,
  },
  {
    id: 'real_peppa_intro',
    emoji: '🐽',
    character: 'PEPPA PIG PARTY!',
    label: 'Hooray! Everybody loves playing games!',
    color: '#EC4899',
    clip: '/audio/real_peppa_intro.mp3',
    gain: 1.45,
  },
  {
    id: 'real_kids_hooray',
    emoji: '🎉',
    character: 'HOORAY EMILIA!!',
    label: 'You earned a Golden Star Trophy!',
    color: '#4ADE80',
    clip: '/audio/real_kids_hooray.mp3',
    gain: 1.45,
  },
  {
    id: 'sheriff_1',
    emoji: '🚔',
    character: 'SHERIFF LABRADOR!',
    label: 'Great job, Officer Emilia! Safety first!',
    color: '#FACC15',
    clip: '/audio/sb_sheriff_1.wav',
    gain: 1.45,
  },
  {
    id: 'danny_1',
    emoji: '🕺',
    character: 'DANNY GO: MOVE YOUR BODY!',
    label: 'Boom, boom, shake the room, Emilia!',
    color: '#4ADE80',
    clip: '/audio/sb_danny_1.wav',
    gain: 1.45,
  },
];

export const FAIL_SOUND_CLIPS = [
  { url: '/audio/fail/oh-biscuits.mp3', label: 'Oh, biscuits!', gain: 1.6 },
  { url: '/audio/fail/beans-on-toast.mp3', label: 'Beans on toast!', gain: 1.6 },
  { url: '/audio/fail/bluey-scream.mp3', label: 'Aaaah!', gain: 1.45 },
];

export const CELEBRATION_LAUGH_CLIPS = [
  { url: '/audio/celebration/bluey-and-bingo-laughing.mp3', label: 'Hehehe!', gain: 1.6 },
  { url: '/audio/celebration/cowabunga.mp3', label: 'Cowabunga!', gain: 1.6 },
  { url: '/audio/real_kids_hooray.mp3', label: 'Hooray!', gain: 1.5 },
];

export const DANCE_PARTY_TRACKS = [
  { id: 'bluey_dance_mode', title: 'Bluey — Dance Mode!', url: '/music/bluey_dance_mode.mp3' },
  { id: 'barbie_girl', title: 'Aqua — Barbie Girl', url: '/music/barbie_girl.mp3' },
  { id: 'bang_bang', title: 'Ariana, Jessie J & Nicki — Bang Bang!', url: '/music/bang_bang.mp3' },
  { id: 'blue_da_ba_dee', title: 'Eiffel 65 — Blue (Da Ba Dee)', url: '/music/blue_da_ba_dee.mp3' },
  { id: 'huntrx_golden_sonic', title: 'HUNTR/X — Golden vs Sonic!', url: '/music/huntrx_golden_sonic.mp3' },
  { id: 'kpop_demon_hunters_golden', title: 'KPop Demon Hunters — Golden!', url: '/music/kpop_demon_hunters_golden.mp3' },
  { id: 'better_when_im_dancin', title: "Meghan Trainor — Better When I'm Dancin'", url: '/music/better_when_im_dancin.mp3' },
  { id: 'dynamite', title: 'Taio Cruz — Dynamite!', url: '/music/dynamite.mp3' },
  { id: 'pitbull_fireball', title: 'Pitbull — Fireball!', url: '/music/pitbull_fireball.mp3' },
  { id: 'shakira_try_everything', title: 'Zootopia — Try Everything', url: '/music/shakira_try_everything.mp3' },
  { id: 'shakira_zoo', title: 'Zootopia 2 — Zoo', url: '/music/shakira_zoo.mp3' },
  { id: 'shakira_dai_dai', title: 'Shakira — Dai Dai', url: '/music/shakira_dai_dai.mp3' },
  { id: 'john_ryans_polka', title: "John Ryan's Polka!", url: '/music/john_ryans_polka.mp3' },
];

export const LAVA_SOUND_MAP = {
  transition: '/audio/lava/Transition.wav',
  blizzard: '/audio/lava/Blizzard.wav',
  lava1: '/audio/lava/FloorIsLava.wav',
  lava2: '/audio/lava/FloorIsLava2.wav',
  water: '/audio/lava/FloorIsWater.wav',
  freeze: '/audio/lava/Freeze.wav',
  run: '/audio/lava/Run.wav',
  done1: '/audio/lava/Done1.wav',
  done2: '/audio/lava/Done2.wav',
  done3: '/audio/lava/Done3.wav',
  youdidit: '/audio/lava/YouDidIt.mp3',
};

const VOICE_CLIPS = {
  welcome: {
    url: '/audio/welcome.mp3',
    text: 'Hi Emilia! Welcome to Emilia GO! Hold your hand on a picture to pick a game!',
  },
  welcome_hub: {
    url: '/audio/welcome.mp3',
    text: 'Hi Emilia! Welcome to Emilia GO! Hold your hand on a picture to pick a game!',
  },
  hover_keepy: {
    url: '/audio/hover_keepy.mp3',
    text: 'Keepy Uppy! Hold your hand here to play!',
  },
  hover_hats: {
    url: '/audio/hover_hats.mp3',
    text: 'Silly Hat Stacker! Hold your hand here to play!',
  },
  hover_butterflies: {
    url: '/audio/hover_butterflies.mp3',
    text: 'Butterfly and Bubble Pop! Hold your hand here to play!',
  },
  hover_poses: {
    url: '/audio/hover_poses.mp3',
    text: 'Silly Poses! Hold your hand here to play!',
  },
  hover_dance: {
    url: '/audio/hover_dance.mp3',
    text: 'Dance Party! Hold your hand here to dress up and dance!',
  },
  hover_disaster: {
    url: '/audio/hover_disaster.mp3',
    text: 'Floor is Lava Adventure! Hold your hand here to play!',
  },
  hover_calibrate: {
    url: '/audio/hover_calibrate.mp3',
    text: 'Magic Mirror Setup! Hold your hand here!',
  },
  hover_home: {
    url: '/audio/hover_home.mp3',
    text: 'Back to the Game Menu! Hold your hand here!',
  },
  calibrate_start: {
    url: '/audio/calibrate_start.mp3',
    text: 'Hi Emilia! Stand in the magic box, and reach both hands high up in the air!',
  },
  calibrate_done: {
    url: '/audio/calibrate_done.mp3',
    text: "Hooray! You are all set, Emilia! Let's play!",
  },
  start_keepy: {
    url: '/audio/start_keepy.mp3',
    text: "Let's play Keepy Uppy, Emilia! Use your hands or your head to keep the balloon up in the air!",
  },
  start_hats: {
    url: '/audio/start_hats.mp3',
    text: "Let's play Silly Hat Stacker, Emilia! Move side to side to catch the falling hats on your head!",
  },
  start_butterflies: {
    url: '/audio/start_butterflies.mp3',
    text: "Let's play Butterfly and Bubble Pop, Emilia! Reach out with your hands to pop the bubbles and catch the butterflies!",
  },
  start_poses: {
    url: '/audio/start_poses.mp3',
    text: "Let's play Silly Poses, Emilia! Copy the funny picture before the timer runs out! Say cheese!",
  },
  start_dance: {
    url: '/audio/start_dance.mp3',
    text: "Welcome to the Dance Party, Emilia! Let's spin a silly outfit, dance to the music, and freeze when you hear Freeze!",
  },
  start_disaster: {
    url: '/audio/start_disaster.mp3',
    text: 'Welcome to the Living Room Adventure! Listen closely to climb up, duck down low, wave your arms, or freeze!',
  },
  cue_freeze: {
    url: '/audio/cue_freeze.mp3',
    text: "Freeze! Don't move!",
  },
  cue_lava: {
    url: '/audio/cue_lava.mp3',
    text: 'The floor is lava! Climb up high or jump!',
  },
  cue_duck: {
    url: '/audio/cue_duck.mp3',
    text: 'Falling rocks! Duck down low!',
  },
  cue_flood: {
    url: '/audio/cue_flood.mp3',
    text: 'Rising water! Wave both arms fast to splash it away!',
  },
  oops_balloon: {
    url: '/audio/fail/oh-biscuits.mp3',
    text: 'Oh, biscuits!',
  },
};

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.soundboardIndex = 0;
    this.failSoundIndex = 0;
    this.laughSoundIndex = 0;
    this.customAudioClips = [];
    this._lastVoiceTime = 0;
    this._lastSoundboardTime = 0;
    this.isSoundboardPlaying = false;

    // WebAudio decoded AudioBuffer cache (pre-warmed sequentially with idle yields so gameplay has ZERO lag!)
    this.bufferCache = new Map();
    this._inflightLoads = new Map();
    this._warmUpStarted = false;
    this.activeClipSource = null;

    // Background Music nodes (hardware-mixed looping AudioBufferSourceNode = 0% JS CPU)
    this.musicSource = null;
    this.musicGainNode = null;
    this.musicLoading = false;
    this.jukeboxActive = false; // True while Dance Party song is playing

    // Continuous Bee Buzzing oscillator nodes (active only when a bee is on screen)
    this._beeBuzzOsc = null;
    this._beeBuzzGain = null;

    // Dance Party Full-Length Song Element routed through WebAudio Context
    this.danceAudioEl = null;
    this.danceMediaSource = null;
    this.danceGainNode = null;

    // Floor is Lava / Disaster Zone active sound source
    this.activeLavaSource = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this._windNoiseBuffer) {
      try {
        const dur = 0.85;
        const bufferSize = Math.floor(this.ctx.sampleRate * dur);
        this._windNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this._windNoiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / bufferSize);
        }
      } catch (ignored) {}
    }
    this.updateBackgroundMusic();
    this.startStaggeredWarmUp();
  }

  /**
   * Pre-decodes all short voice & soundboard clips one-by-one with a 40ms idle pause between each.
   * This prevents startup freeze AND eliminates the mid-game decode lag when achievements trigger!
   */
  async startStaggeredWarmUp() {
    if (this._warmUpStarted || !this.ctx) return;
    this._warmUpStarted = true;

    const urlsToWarm = new Set();
    for (const item of SOUNDBOARD_CHARACTERS) urlsToWarm.add(item.clip);
    for (const item of FAIL_SOUND_CLIPS) urlsToWarm.add(item.url);
    for (const item of CELEBRATION_LAUGH_CLIPS) urlsToWarm.add(item.url);
    for (const v of Object.values(VOICE_CLIPS)) urlsToWarm.add(v.url);
    for (const url of Object.values(LAVA_SOUND_MAP)) urlsToWarm.add(url);

    for (const url of urlsToWarm) {
      if (!this.bufferCache.has(url)) {
        try {
          await this.loadBuffer(url);
        } catch {
          // ignore individual warmup error
        }
        // Yield 40ms to keep 60fps render loop silky smooth
        await new Promise((r) => setTimeout(r, 40));
      }
    }
  }

  async updateBackgroundMusic() {
    if (!this.ctx) return;
    const wantMusic = settings.data.musicEnabled !== false && !this.jukeboxActive;
    const baseVol = Number(settings.data.musicVolume ?? 0.16);

    if (!wantMusic) {
      if (this.musicGainNode && this.ctx) {
        this.musicGainNode.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.12);
      }
      return;
    }

    if (this.musicSource && this.musicGainNode) {
      const targetVol = this.activeClipSource ? baseVol * 0.25 : baseVol;
      this.musicGainNode.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.2);
      return;
    }

    if (this.musicLoading) return;
    this.musicLoading = true;

    try {
      const buf = await this.loadBuffer('/audio/bg_playground_music.wav');
      if (!buf || !this.ctx) {
        this.musicLoading = false;
        return;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const gain = this.ctx.createGain();
      const shouldPlayNow = settings.data.musicEnabled !== false && !this.jukeboxActive;
      gain.gain.value = shouldPlayNow ? baseVol : 0.0001;

      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(0);

      this.musicSource = src;
      this.musicGainNode = gain;
    } catch (e) {
      console.warn('Could not start background music:', e);
    } finally {
      this.musicLoading = false;
    }
  }

  async loadBuffer(url) {
    if (this.bufferCache.has(url)) {
      return this.bufferCache.get(url);
    }
    if (this._inflightLoads.has(url)) {
      return this._inflightLoads.get(url);
    }
    this.init();
    if (!this.ctx) return null;

    const promise = (async () => {
      try {
        const resp = await fetch(url);
        const arrayBuf = await resp.arrayBuffer();
        const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
        this.bufferCache.set(url, audioBuf);
        return audioBuf;
      } finally {
        this._inflightLoads.delete(url);
      }
    })();

    this._inflightLoads.set(url, promise);
    return promise;
  }

  addCustomSoundboardFiles(fileList) {
    for (const file of fileList) {
      const url = URL.createObjectURL(file);
      const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
      this.customAudioClips.push({
        id: 'custom_' + Date.now() + '_' + Math.random(),
        emoji: '🌟',
        character: `${cleanName.toUpperCase()}!`,
        label: 'Awesome job, Emilia!',
        color: '#A855F7',
        clip: url,
        gain: 1.45,
      });
      this.loadBuffer(url).catch(() => {});
    }
    return this.customAudioClips.length;
  }

  addCustomSoundFiles(fileList) {
    return this.addCustomSoundboardFiles(fileList);
  }

  /**
   * Speaks a pre-generated voice prompt using the shared WebAudio AudioContext
   */
  speakVoice(clipKey, forceInterrupt = true) {
    if (!settings.data.voiceEnabled) return;
    if (this.isSoundboardPlaying && !forceInterrupt) return;

    this.init();

    const now = performance.now();
    if (!forceInterrupt && now - this._lastVoiceTime < 2500) {
      return;
    }
    this._lastVoiceTime = now;

    const entry = VOICE_CLIPS[clipKey];
    if (!entry) return;

    this.playAudioUrl(entry.url, entry.text, 1.35, forceInterrupt, false);
  }

  prewarmLavaAudio() {
    this.init();
    if (!this.ctx) return;
    for (const url of Object.values(LAVA_SOUND_MAP)) {
      this.loadBuffer(url).catch(() => {});
    }
  }

  stopLavaClip() {
    this._lavaPlaySeq = (this._lavaPlaySeq || 0) + 1;
    if (this._lavaTimerId) {
      clearTimeout(this._lavaTimerId);
      this._lavaTimerId = null;
    }
    if (this.activeLavaSource) {
      try {
        this.activeLavaSource.onended = null; // Critical: prevent onended from triggering chain callbacks
        this.activeLavaSource.stop();
        this.activeLavaSource.disconnect();
      } catch {
        // ignore
      }
      this.activeLavaSource = null;
    }
  }

  async playLavaClip(key, loopCount = 1, onEndedCallback = null, volumeGain = 1.55) {
    this.init();
    if (!this.ctx) return null;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.stopLavaClip();
    const playSeq = this._lavaPlaySeq;

    let url = LAVA_SOUND_MAP[key];
    if (key === 'done') {
      const dones = [LAVA_SOUND_MAP.done1, LAVA_SOUND_MAP.done2, LAVA_SOUND_MAP.done3];
      url = dones[Math.floor(Math.random() * dones.length)];
    }
    if (!url) return null;

    let buffer = this.bufferCache.get(url);
    if (!buffer) {
      buffer = await this.loadBuffer(url);
    }
    // If stopLavaClip was called while waiting for decode, cancel immediately!
    if (playSeq !== this._lavaPlaySeq || !buffer) return null;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const singleDur = buffer.duration;
    const isMultiLoop = loopCount > 1;
    source.loop = isMultiLoop;
    const totalDur = isMultiLoop ? singleDur * loopCount : singleDur;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = volumeGain;

    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.start(0);
    this.activeLavaSource = source;

    let endedTriggered = false;
    const handleEnd = () => {
      if (endedTriggered || playSeq !== this._lavaPlaySeq) return;
      endedTriggered = true;
      if (this._lavaTimerId) {
        clearTimeout(this._lavaTimerId);
        this._lavaTimerId = null;
      }
      if (this.activeLavaSource === source) {
        this.activeLavaSource = null;
      }
      if (onEndedCallback && playSeq === this._lavaPlaySeq) {
        onEndedCallback();
      }
    };

    if (isMultiLoop) {
      this._lavaTimerId = setTimeout(() => {
        if (playSeq !== this._lavaPlaySeq) return;
        try {
          source.onended = null;
          source.stop();
          source.disconnect();
        } catch {}
        handleEnd();
      }, totalDur * 1000);
    } else {
      source.onended = handleEnd;
    }

    return {
      source,
      duration: totalDur,
    };
  }

  async playAudioUrl(
    url,
    fallbackText = '',
    volumeGain = 1.4,
    interruptPrevious = true,
    isSoundboard = false
  ) {
    this.init();
    if (!this.ctx) {
      this.speakFallbackTts(fallbackText);
      return;
    }

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      // Fast synchronous lookup if pre-warmed (0ms lag!)
      let buffer = this.bufferCache.get(url);
      if (!buffer) {
        buffer = await this.loadBuffer(url);
      }
      if (!buffer) {
        this.speakFallbackTts(fallbackText);
        return;
      }

      if (interruptPrevious && this.activeClipSource) {
        try {
          this.activeClipSource.stop();
          this.activeClipSource.disconnect();
        } catch {
          // ignore
        }
        this.activeClipSource = null;
        this.isSoundboardPlaying = false;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = this.ctx.createGain();
      gainNode.gain.value = volumeGain;

      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      if (isSoundboard) {
        this.isSoundboardPlaying = true;
      }

      // Gently duck background music while voice/soundboard clip plays
      if (this.musicGainNode && settings.data.musicEnabled !== false && !this.jukeboxActive) {
        const baseVol = Number(settings.data.musicVolume ?? 0.16);
        this.musicGainNode.gain.setTargetAtTime(baseVol * 0.22, this.ctx.currentTime, 0.08);
      }

      source.onended = () => {
        try {
          source.disconnect();
          gainNode.disconnect();
        } catch {
          // ignore
        }
        if (this.activeClipSource === source) {
          this.activeClipSource = null;
          this.isSoundboardPlaying = false;
          if (
            this.musicGainNode &&
            settings.data.musicEnabled !== false &&
            !this.jukeboxActive &&
            this.ctx
          ) {
            const baseVol = Number(settings.data.musicVolume ?? 0.16);
            this.musicGainNode.gain.setTargetAtTime(baseVol, this.ctx.currentTime, 0.25);
          }
        }
      };

      this.activeClipSource = source;
      source.start(0);
    } catch (err) {
      this.isSoundboardPlaying = false;
      console.warn('WebAudio clip playback error, falling back:', err);
      this.speakFallbackTts(fallbackText);
    }
  }

  speakFallbackTts(text) {
    if (!text) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = 1.25;
      u.rate = 1.02;
      window.speechSynthesis.speak(u);
    }
  }

  playCharacterSoundboard(force = false) {
    return this.triggerCharacterSoundboard(force);
  }

  triggerCharacterSoundboard(force = false) {
    this.init();

    const now = performance.now();
    if (!force && (this.isSoundboardPlaying || now - this._lastSoundboardTime < 4500)) {
      return null;
    }
    this._lastSoundboardTime = now;

    const pool =
      this.customAudioClips.length > 0
        ? [...this.customAudioClips, ...SOUNDBOARD_CHARACTERS]
        : SOUNDBOARD_CHARACTERS;

    const idx = this.soundboardIndex % pool.length;
    this.soundboardIndex++;

    const item = pool[idx];
    this.playAudioUrl(item.clip, item.label, item.gain || 1.5, true, true);
    return item;
  }

  /**
   * Plays one of the Fail Sounds from Emilia's Sounds Folder (oh-biscuits, beans-on-toast, bluey-scream)
   */
  playFailClip(interrupt = false) {
    if (!this.enabled) return;
    if (this.isSoundboardPlaying && !interrupt) return;
    const item = FAIL_SOUND_CLIPS[this.failSoundIndex % FAIL_SOUND_CLIPS.length];
    this.failSoundIndex++;
    this.playAudioUrl(item.url, item.label, item.gain, interrupt, false);
  }

  /**
   * Plays a laughing/celebration clip (for Silly Poses photo reveal, Dance Freeze win, etc.)
   */
  playCelebrationClip(interrupt = true) {
    if (!this.enabled) return;
    const item = CELEBRATION_LAUGH_CLIPS[this.laughSoundIndex % CELEBRATION_LAUGH_CLIPS.length];
    this.laughSoundIndex++;
    this.playAudioUrl(item.url, item.label, item.gain, interrupt, true);
  }

  /**
   * Dance Party Jukebox: Streams full-length MP3 tracks from /music/* through WebAudio Context
   */
  _ensureDanceAudioNode() {
    this.init();
    if (!this.danceAudioEl) {
      this.danceAudioEl = new Audio();
      this.danceAudioEl.preload = 'auto';
      this.danceAudioEl.crossOrigin = 'anonymous';
      if (this.ctx) {
        try {
          this.danceMediaSource = this.ctx.createMediaElementSource(this.danceAudioEl);
          this.danceGainNode = this.ctx.createGain();
          this.danceGainNode.gain.value = 0.85;
          this.danceMediaSource.connect(this.danceGainNode);
          this.danceGainNode.connect(this.ctx.destination);
        } catch (e) {
          console.warn('MediaElementSource fallback:', e);
        }
      }
    }
  }

  startDanceTrack(trackUrl, onEndedCallback = null) {
    this._ensureDanceAudioNode();
    this.jukeboxActive = true;
    this.updateBackgroundMusic(); // Mutes background loop while Dance Party song plays!

    if (this.danceAudioEl) {
      this.danceAudioEl.pause();
      this.danceAudioEl.src = trackUrl;
      this.danceAudioEl.currentTime = 0;
      this.danceAudioEl.onended = () => {
        if (onEndedCallback) onEndedCallback();
      };
      if (this.danceGainNode && this.ctx) {
        this.danceGainNode.gain.setTargetAtTime(0.85, this.ctx.currentTime, 0.05);
      }
      this.danceAudioEl.play().catch((e) => console.warn('Dance track play error:', e));
    }
  }

  pauseDanceTrack() {
    if (this.danceAudioEl && !this.danceAudioEl.paused) {
      this.danceAudioEl.pause();
    }
  }

  resumeDanceTrack() {
    if (this.danceAudioEl && this.danceAudioEl.paused && this.jukeboxActive) {
      this.danceAudioEl.play().catch(() => {});
    }
  }

  stopDanceTrack() {
    this.jukeboxActive = false;
    if (this.danceAudioEl) {
      this.danceAudioEl.onended = null;
      this.danceAudioEl.pause();
      this.danceAudioEl.currentTime = 0;
    }
    this.updateBackgroundMusic();
  }

  /**
   * Continuous Bee Buzzing sound while a Buzzy Bee is on screen in Butterfly Pop
   */
  updateBeeBuzz(shouldBuzz = false) {
    if (!this.enabled || !shouldBuzz) {
      if (this._beeBuzzOsc) {
        try {
          this._beeBuzzOsc.stop();
          this._beeBuzzOsc.disconnect();
          this._beeBuzzGain.disconnect();
        } catch {
          // ignore
        }
        this._beeBuzzOsc = null;
        this._beeBuzzGain = null;
      }
      return;
    }

    this.init();
    if (!this.ctx) return;

    if (!this._beeBuzzOsc) {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(148, now);
      gain.gain.setValueAtTime(0.055, now);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);

      this._beeBuzzOsc = osc;
      this._beeBuzzGain = gain;
    } else {
      // Modulate pitch slightly for lifelike flight buzz
      const wobble = 145 + Math.sin(performance.now() * 0.025) * 18;
      this._beeBuzzOsc.frequency.setTargetAtTime(wobble, this.ctx.currentTime, 0.04);
    }
  }

  _playTone(type, setupFreqFn, setupGainFn, startTime, stopTime) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    setupFreqFn(osc.frequency);
    setupGainFn(gain.gain);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // ignore
      }
    };
    osc.start(startTime);
    osc.stop(stopTime);
  }

  /**
   * Loud, unmistakable Balloon Pop sound when a balloon hits the floor!
   */
  playBalloonPop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // 1. Sharp noise burst (rubber snap)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.14);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, now);
    filter.Q.setValueAtTime(1.2, now);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.65, now);
    nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.ctx.destination);
    noise.start(now);

    // 2. Low thump pitch drop
    this._playTone(
      'sine',
      (f) => {
        f.setValueAtTime(420, now);
        f.exponentialRampToValueAtTime(65, now + 0.12);
      },
      (g) => {
        g.setValueAtTime(0.45, now);
        g.exponentialRampToValueAtTime(0.001, now + 0.14);
      },
      now,
      now + 0.15
    );
  }

  /**
   * Cheerful, cute cartoon puppy "Yip-Yip!" sound when the puppy appears!
   */
  playPuppyBark() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.16);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Cheerful, sweeping wind whoosh sound for Turbo Leaf Blower gusts!
   */
  playWindGust() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const dur = 0.85;

    let noiseBuffer = this._windNoiseBuffer;
    if (!noiseBuffer) {
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / bufferSize);
      }
      this._windNoiseBuffer = noiseBuffer;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(880, now + dur * 0.35);
    filter.frequency.exponentialRampToValueAtTime(260, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + dur);
  }

  /**
   * Playful Cheeky Monkey "Ooh-ooh Aah-aah!" sound when the monkey swings in!
   */
  playMonkeySound() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const syllables = [
      { f1: 390, f2: 580, dur: 0.11, delay: 0.0 },
      { f1: 420, f2: 640, dur: 0.11, delay: 0.14 },
      { f1: 520, f2: 780, dur: 0.15, delay: 0.29 },
      { f1: 540, f2: 820, dur: 0.16, delay: 0.47 },
    ];
    for (const s of syllables) {
      const t = now + s.delay;
      this._playTone(
        'triangle',
        (f) => {
          f.setValueAtTime(s.f1, t);
          f.exponentialRampToValueAtTime(s.f2, t + s.dur * 0.65);
          f.exponentialRampToValueAtTime(s.f1 * 0.9, t + s.dur);
        },
        (g) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.34, t + 0.02);
          g.exponentialRampToValueAtTime(0.001, t + s.dur);
        },
        t,
        t + s.dur + 0.01
      );
    }
  }

  /**
   * Cheerful Bluebird Chirping / Singing sound when the bird flies in to collect hats!
   */
  playBirdChirp() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chirps = [
      { fStart: 1350, fEnd: 2150, delay: 0.0, dur: 0.09 },
      { fStart: 1500, fEnd: 2450, delay: 0.11, dur: 0.09 },
      { fStart: 1800, fEnd: 1350, delay: 0.22, dur: 0.12 },
      { fStart: 1600, fEnd: 2600, delay: 0.36, dur: 0.14 },
    ];
    for (const c of chirps) {
      const t = now + c.delay;
      this._playTone(
        'sine',
        (f) => {
          f.setValueAtTime(c.fStart, t);
          f.exponentialRampToValueAtTime(c.fEnd, t + c.dur);
        },
        (g) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.26, t + 0.015);
          g.exponentialRampToValueAtTime(0.001, t + c.dur);
        },
        t,
        t + c.dur + 0.01
      );
    }
  }

  /**
   * Camera Shutter Click for Silly Poses photo capture!
   */
  playCameraShutter() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    this._playTone(
      'triangle',
      (f) => {
        f.setValueAtTime(1600, now);
        f.exponentialRampToValueAtTime(420, now + 0.045);
      },
      (g) => {
        g.setValueAtTime(0.38, now);
        g.exponentialRampToValueAtTime(0.001, now + 0.05);
      },
      now,
      now + 0.06
    );
    this._playTone(
      'sine',
      (f) => {
        f.setValueAtTime(2200, now + 0.06);
        f.exponentialRampToValueAtTime(800, now + 0.11);
      },
      (g) => {
        g.setValueAtTime(0.3, now + 0.06);
        g.exponentialRampToValueAtTime(0.001, now + 0.12);
      },
      now + 0.06,
      now + 0.13
    );
  }

  /**
   * Ice Freeze Crystalline Chime & Ice Crack / Slip sound for Dance Party & Disaster Zone
   */
  playFreezeChime() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [1046.5, 1318.5, 1567.98, 2093.0].forEach((freq, i) => {
      const t = now + i * 0.04;
      this._playTone(
        'sine',
        (f) => f.setValueAtTime(freq, t),
        (g) => {
          g.setValueAtTime(0.22, t);
          g.exponentialRampToValueAtTime(0.001, t + 0.25);
        },
        t,
        t + 0.26
      );
    });
  }

  playIceSlipAndCrack() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Comical cartoon slip whistle + crack!
    this._playTone(
      'sine',
      (f) => {
        f.setValueAtTime(450, now);
        f.exponentialRampToValueAtTime(1650, now + 0.16);
        f.exponentialRampToValueAtTime(180, now + 0.34);
      },
      (g) => {
        g.setValueAtTime(0.32, now);
        g.exponentialRampToValueAtTime(0.001, now + 0.36);
      },
      now,
      now + 0.37
    );
    this.playFailClip(false);
  }

  playBalloonHit(combo = 1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const scaleSemitones = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const idx = Math.min(combo - 1, scaleSemitones.length - 1);
    const baseFreq = 280 * Math.pow(2, scaleSemitones[idx] / 12);

    this._playTone(
      'sine',
      (f) => {
        f.setValueAtTime(baseFreq * 0.75, now);
        f.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.09);
        f.exponentialRampToValueAtTime(baseFreq, now + 0.22);
      },
      (g) => {
        g.setValueAtTime(0.01, now);
        g.linearRampToValueAtTime(0.32, now + 0.02);
        g.exponentialRampToValueAtTime(0.001, now + 0.28);
      },
      now,
      now + 0.29
    );

    this._playTone(
      'triangle',
      (f) => f.setValueAtTime(baseFreq * 2, now),
      (g) => {
        g.setValueAtTime(0.12, now);
        g.exponentialRampToValueAtTime(0.001, now + 0.22);
      },
      now,
      now + 0.23
    );
  }

  playHatCatch(stackHeight = 1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const base = 320 + Math.min(stackHeight, 10) * 45;
    this._playTone(
      'triangle',
      (f) => {
        f.setValueAtTime(base * 0.7, now);
        f.exponentialRampToValueAtTime(base * 1.35, now + 0.12);
      },
      (g) => {
        g.setValueAtTime(0.28, now);
        g.exponentialRampToValueAtTime(0.001, now + 0.22);
      },
      now,
      now + 0.24
    );
  }

  playBubblePop(isButterfly = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (isButterfly) {
      [659.25, 880, 1174.66].forEach((freq, i) => {
        const t = now + i * 0.045;
        this._playTone(
          'sine',
          (f) => f.setValueAtTime(freq, t),
          (g) => {
            g.setValueAtTime(0.2, t);
            g.exponentialRampToValueAtTime(0.001, t + 0.18);
          },
          t,
          t + 0.2
        );
      });
    } else {
      this._playTone(
        'sine',
        (f) => {
          f.setValueAtTime(380, now);
          f.exponentialRampToValueAtTime(980, now + 0.07);
        },
        (g) => {
          g.setValueAtTime(0.28, now);
          g.exponentialRampToValueAtTime(0.001, now + 0.08);
        },
        now,
        now + 0.09
      );
    }
  }

  playFloorDrop(isForgivingBounce = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (isForgivingBounce) {
      this._playTone(
        'sine',
        (f) => {
          f.setValueAtTime(160, now);
          f.exponentialRampToValueAtTime(240, now + 0.14);
        },
        (g) => {
          g.setValueAtTime(0.2, now);
          g.exponentialRampToValueAtTime(0.001, now + 0.16);
        },
        now,
        now + 0.17
      );
    } else {
      this._playTone(
        'sawtooth',
        (f) => {
          f.setValueAtTime(220, now);
          f.exponentialRampToValueAtTime(95, now + 0.35);
        },
        (g) => {
          g.setValueAtTime(0.18, now);
          g.exponentialRampToValueAtTime(0.001, now + 0.38);
        },
        now,
        now + 0.4
      );
    }
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + i * 0.08;
      this._playTone(
        'triangle',
        (f) => f.setValueAtTime(freq, t),
        (g) => {
          g.setValueAtTime(0.22, t);
          g.exponentialRampToValueAtTime(0.001, t + 0.3);
        },
        t,
        t + 0.32
      );
    });
  }

  playCalibrationTick(progress = 0.5) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    this._playTone(
      'sine',
      (f) => f.setValueAtTime(420 + progress * 480, now),
      (g) => {
        g.setValueAtTime(0.12, now);
        g.exponentialRampToValueAtTime(0.001, now + 0.08);
      },
      now,
      now + 0.09
    );
  }
}

export const sound = new SoundManager();
