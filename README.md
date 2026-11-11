# EmiliaGO! Complete Project Guide & Architecture Handbook

Welcome to **EmiliaGO!**, an interactive, hands-free webcam motion-tracking adventure suite designed for kids using real-time AI body tracking (MediaPipe).

> [!TIP]
> **Want to customize this game for your own kids?**
> Check out the **[Customization Guide](CUSTOMIZATION_GUIDE.md)** for a quick walkthrough on changing player names, celebration banners, music, sound effects, and 2-player mode!

> [!NOTE]
> **Looking to try the game immediately on Android / Android TV?**
> Download the pre-built **`EmiliaGO-debug.apk`** from the **[Releases](../../releases)** tab on GitHub, or install directly using the build instructions below.

---

## 1. Quick Start & Future Development Workflow

### Workspace Directory
```powershell
# Open this folder directly as your project workspace:
C:\Users\Home\Desktop\EmiliaGo
```

### Build & Deploy Pipeline
All changes can be compiled and deployed directly to the NVIDIA Shield TV with:
```powershell
# 1. Build the frontend web bundle
npm run build

# 2. Sync web assets into Android Capacitor
npx cap sync android

# 3. Assemble the debug APK
cd android
.\gradlew.bat assembleDebug
cd ..

# 4. Copy APK and stream-install silently to NVIDIA Shield TV
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk .\EmiliaGO-debug.apk -Force
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" connect 192.168.86.47:5555
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s 192.168.86.47:5555 install -r EmiliaGO-debug.apk

# 5. Verify deployment timestamp
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s 192.168.86.47:5555 shell dumpsys package com.emiliago.app | Select-String "lastUpdateTime"
```

> [!CAUTION]
> **CRITICAL SHIELD TV DEPLOYMENT RULE**:
> **STRICTLY NEVER execute `am start` on the NVIDIA Shield TV via ADB!**
> Running `am start` freezes or crashes the active UVC camera hardware handle. Always use silent streamed install (`adb install -r EmiliaGO-debug.apk`). The app updates seamlessly without interrupting the camera.

---

## 2. Hardware & Architecture Overview

| Component | Specification / Configuration |
|---|---|
| **Target Device** | NVIDIA Shield TV (Android 11, API 30, arm64-v8a) at IP `192.168.86.47:5555` |
| **Camera** | CODi A05020 USB UVC Webcam plugged directly into Shield TV USB port |
| **UVC Bridge** | Native Android Java bridge (`window.EmiliaNativeUVC`) streaming direct binary MJPEG into WebView (`/__uvc_frame.jpg?seq=X`) with zero Base64 overhead |
| **AI Inference** | Google MediaPipe PoseLandmarker running on GPU delegate, pre-warmed at 320×180 resolution |
| **Framework** | Vanilla Canvas 2D + Vite 8 + Capacitor Android (offline, zero internet dependency) |
| **Player Support** | 1-Player and 2-Player modes with dynamic player sorting (P1 left, P2 right) |

---

## 3. Mini-Games Directory & Gameplay Rules

### 1. 🎈 Keepy Uppy (`src/keepyUppy.js`)
- **Concept**: Keep the bright balloon in the air using hands and head!
- **Features**:
  - Faithful Bluey-style animated cartoon puppy in bottom-left corner with puffed-out cheeks blowing gusts of air and soap bubbles upward to assist.
  - Multi-hit combo system with pitch-shifting hit sounds.
  - Turbo Leaf Blower activation when score reaches 10+.

### 2. 👑 Hat Stacker (`src/hatStacker.js`)
- **Concept**: Catch falling silly hats on your head to build the tallest wobbly tower!
- **Features**:
  - 8 distinct hat types (Princess Crown, Police Cap, Chef Toque, Firefighter Helmet, Party Cone, Pirate Bicorn, Top Hat, Cowboy Hat).
  - Hats land precisely at the player's hairline/forehead (not covering the eyes).
  - Little animated bluebird lands on top of the stack.
  - Diamond achievement bottom bar and celebratory fireworks display.

### 3. 🫧 Butterfly & Bubble Pop (`src/butterflyPop.js`)
- **Concept**: Pop floating soap bubbles, catch fluttering butterflies and cartoon ladybugs, bounce the multi-hit golden balloon, and avoid buzzing bumblebees!
- **Features**:
  - Fluttering themed butterflies (Bluey, Bingo, Peppa, Golden).
  - Cartoon ladybugs with flapping wings and horizontal wing seam.
  - 3-hit bouncy **Golden Balloon**: bounces off hands with celebratory sounds and awards **+5 bonus points** on the 3rd hit.
  - Buzzing bumblebee hazard with high-visibility warning pill and continuous flight audio buzz.
  - **Performance Optimization**: `MAX_ACTIVE_TARGETS = 4`, batched fairy dust, batched wing paths, and zero `ctx.shadowBlur` or gradient heap allocations for smooth 30 FPS.

### 4. 📸 Silly Poses & Photo Gallery (`src/sillyPoses.js`, `src/photoGallery.js`)
- **Concept**: Copy hilarious cartoon poses within a 5-second countdown and snap funny photos!
- **Features**:
  - 42 unique silly cartoon pose cards shuffled in a fair deck.
  - Auto-crop and dynamic zoom framing directly onto the player's body.
  - Comparison result screen showing the Target Pose card, the player's snapped Polaroid photo, and fun comic flair stickers/words.
  - **Persistent Photo Gallery**:
    - Bottom-left Gallery button (`safeBounds.left + 64, safeBounds.bottom - 56`) with counter badge.
    - 2×2 grid view with pagination (`◀ PREV` / `NEXT ▶`).
    - **Full-Screen Cinema Photo Viewer**: Fills 96% width / 94% height with clean floating controls (`🔙 BACK`, `🗑️ DELETE` with 1.6s hold protection, and side flip arrows).
    - Persistent IndexedDB storage (`emiliago_gallery_db`) with automatic LocalStorage fallback.

### 5. 🕺 Dance Party (`src/danceParty.js`)
- **Concept**: Groove to energetic kid-friendly tracks and freeze when the music stops!
- **Features**:
  - Cartoon jukebox streaming full-length tracks from `public/music/`.
  - Disco ball rainbow beam lighting effects and bouncing musical notes.
  - Cartoon avatar accessories (star sunglasses aligned directly over the eyes).
  - Dynamic Freeze Mode detection measuring player stillness.

### 6. 🌋 Floor is Lava / Disaster Zone (`src/disasterZone.js`)
- **Concept**: Multi-hazard survival obstacle course through living room disasters!
- **Features**:
  - **Floor is Lava**: Player must continuously jump or stay out of the lava; staying still in lava makes avatar sad and flashes yellow, leading to a Game Over after 5 seconds.
  - **Floor is Water**: Hand swimming motion prevents water from rising above head level (dashed line removed for clean visuals); water above head for 5 seconds triggers Game Over.
  - **Blizzard**: Giant snowman flies across the screen; player must duck to avoid being hit.
  - **Dinosaur Chase**: Playful T-Rex charges toward player if they move slowly; active movement keeps the dino at bay or makes him retreat.
  - Custom kid-friendly cartoon Game Over defeat graphics.

---

## 4. Audio Engine & Soundboard (`src/sound.js`)

- **Synthesizer Engine**: Low-latency WebAudio oscillators for pops, balloon hits, ticks, whooshes, and celebratory fanfares.
  - `playPop()`: Crisp UI tap/button pop sound.
  - `playBubblePop(isButterfly)`: Bubble pop tone.
  - `playBalloonHit(combo)`: Resonant rubber balloon hit tone.
  - `playCalibrationTick(progress)`: Pitch-scaled click for dwell-hover rings.
- **Character Soundboards**: Spoken audio clips from Bluey, Bingo, Peppa Pig, Sheriff Labrador, and Danny Go.
- **Dance Music Streamer**: Full-length MP3 tracks in `public/music/` stream through WebAudio with background music ducking.

---

## 5. Performance Diagnostics & Profiling

Diagnostics are logged continuously into `/sdcard/Android/data/com.emiliago.app/files/emiliago_diagnostic.log`.

To inspect live performance:
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" connect 192.168.86.47:5555
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s 192.168.86.47:5555 pull /sdcard/Android/data/com.emiliago.app/files/emiliago_diagnostic.log .\emiliago_diagnostic.log
Get-Content .\emiliago_diagnostic.log -Tail 30
```

### Key Telemetry Benchmarks
- **Target FPS**: 30 FPS (constrained by 30 FPS camera hardware capture rate).
- **Inference Time**: 42–45ms on NVIDIA Tegra X1 GPU.
- **Frame Render Time**: < 25ms.

---

## 6. Project File Layout

```
C:\Users\Home\Desktop\EmiliaGo\
├── android/                 # Native Android Capacitor & UVC Webcam bridge
│   ├── app/src/main/java/   # MainActivity.java & Native UVC Java classes
│   └── gradlew.bat          # Gradle build tool
├── public/                  # Static assets (audio, music, poses 1..42, icons)
├── src/                     # Game Source Code
│   ├── avatarRenderer.js    # Avatars, stickers, hand boppers, trails
│   ├── butterflyPop.js      # Game 3: Bubble Pop, Ladybugs, Bees
│   ├── calibration.js       # Play space calibration & safe zone bounds
│   ├── danceParty.js        # Game 5: Dance Party & Freeze Mode
│   ├── disasterZone.js      # Game 6: Floor is Lava / Water / Dino / Blizzard
│   ├── gameHub.js           # Home screen carousel & game selector
│   ├── hatStacker.js        # Game 2: Hat Stacker
│   ├── keepyUppy.js         # Game 1: Keepy Uppy with Bluey puppy
│   ├── logger.js            # In-game and file diagnostic logger
│   ├── main.js              # Application entry, 60fps game loop, HUD
│   ├── photoGallery.js      # Persistent IndexedDB photo storage
│   ├── poseTracker.js       # MediaPipe AI pose detection & UVC bridge
│   ├── settings.js          # Persistent player preferences & high scores
│   ├── sillyPoses.js        # Game 4: Silly Poses & Full-Screen Gallery
│   ├── sound.js             # WebAudio effects, character soundboards, music
│   └── style.css            # Base styles and TV viewport sizing
├── capacitor.config.json    # Capacitor configuration
├── package.json             # NPM dependencies (Vite, Capacitor, Rolldown)
└── PROJECT_GUIDE.md         # This handbook
```

---

*EmiliaGO is completely offline, privacy-safe, kid-friendly, and ready for your next session!*
