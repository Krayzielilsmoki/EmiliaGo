# Customizing This Game For Your Kids! 🎈🎮

Welcome! This motion-tracking adventure suite uses a webcam and AI pose tracking (MediaPipe) to let kids jump, dance, pop bubbles, stack hats, and dodge hazards right in front of the screen.

It runs in two ways:
1. **Instantly in any web browser** on a laptop or desktop with any regular webcam (`npm run dev`).
2. **On an Android device / Android TV / NVIDIA Shield TV** as an offline APK with a USB or built-in webcam.

Here is a step-by-step guide to personalize the game for your own kids.

---

## 1. Quick Start: Test It In Your Browser (No Android required!)

The fastest way to test your changes and let your kids play immediately:

```bash
# 1. Install dependencies
npm install

# 2. Start the local development server
npm run dev
```

Open the URL shown in your terminal (usually `http://localhost:5173`) in Google Chrome, Edge, or Brave. Allow webcam access, step back so the camera sees your body, and you're playing!

---

## 2. Personalizing the Child's Name & Branding

To replace "Emilia" with your child's name (or children's names):

### A. Title & Splash Screen (`index.html`)
Open [`index.html`](file:///index.html):
- **Line 6**: `<title>EmiliaGO! — Emilia's Playground</title>` &rarr; Change to your child's name (e.g. `LeoGO! — Leo's Playground`).
- **Line 21**: `🎈 Emilia<span class="brand-go">GO!</span>`
- **Line 22**: `<h1 class="splash-title">Emilia's Playground</h1>`
- **Line 41**: `<h1>Emilia<span class="brand-go">GO!</span></h1>`

### B. In-Game Celebrations & Encouragement Banners
Each mini-game displays personalized cheer banners when reaching milestones:
- **[`src/disasterZone.js`](file:///src/disasterZone.js)**:
  - Line ~1625: `🏆 YOU DID IT, EMILIA! 🏆` &rarr; Change to your kid's name!
  - Line ~2923: `NICE TRY, EMILIA!` &rarr; Change to your kid's name!
- **[`src/danceParty.js`](file:///src/danceParty.js)**:
  - Line ~593: `🎉 AWESOME DANCING, EMILIA! 🎉`
- **[`src/avatarRenderer.js`](file:///src/avatarRenderer.js)**:
  - Line ~468: `🎆 10 DIAMONDS! SUPERSTAR EMILIA! 🎆`
- **[`src/calibration.js`](file:///src/calibration.js)**:
  - Line ~159: `'Awesome job, Emilia! Hold your hands up...'`

> **Tip:** You can use your code editor's "Find and Replace" (Ctrl+Shift+H in VS Code) to search for `Emilia` across the `src/` folder and replace it with your child's name.

---

## 3. 1-Player vs 2-Player (Sibling Mode!)

If you have two kids playing together:
- Click the **⚙️ Settings cog** in the bottom-right corner of the screen during gameplay, or
- Open [`src/settings.js`](file:///src/settings.js) and set:
  ```javascript
  twoPlayerMode: 'auto', // Automatically tracks 2 players side-by-side!
  ```
  In 2-player mode, Player 1 is on the left and Player 2 is on the right, each with their own color-coded avatar, hats, scores, and sparkles!

---

## 4. Customizing Music & Character Audio

### Adding Your Kids' Favorite Dance Songs
- Drop any `.mp3` files into the [`public/music/`](file:///public/music/) directory.
- Open [`src/danceParty.js`](file:///src/danceParty.js) and update the `SONG_CATALOG` list with your song filenames and titles.

### Customizing Character Sounds & Voice
- Clips for Bluey, Peppa, Danny Go, etc. are located in [`public/audio/characters/`](file:///public/audio/characters/).
- You can add your kids' favorite character voice lines or recorded family voice clips!

---

## 5. Adjusting Difficulty for Younger or Older Kids

Open [`src/settings.js`](file:///src/settings.js) to tune gameplay physics:
- `hitboxMultiplier`: Default is `1.35` (generous hitbox so younger kids easily hit bubbles and balloons). Set higher (e.g. `1.6`) for toddlers or `1.0` for older kids.
- `gravityScale`: Default is `0.9` (floaty balloons for Keepy Uppy). Increase for faster falling objects.
- `forgivingFloor`: When `true`, Keepy Uppy gives kids extra bounce grace near the bottom.

---

## 6. Building the Android APK (Phone, Tablet, or TV)

When you're ready to package your customized version into a standalone Android APK:

```powershell
# 1. Build the web app
npm run build

# 2. Sync into Android project
npx cap sync android

# 3. Compile the debug APK
cd android
.\gradlew.bat assembleDebug
cd ..
```

The newly built APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

You can install this APK onto any Android phone, tablet, or Android TV box via USB or ADB!
