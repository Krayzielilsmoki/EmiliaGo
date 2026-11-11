// Dedicated Web Worker for MediaPipe PoseLandmarker inference
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let landmarker = null;
let isReady = false;
let maxPlayers = 2;

self.onmessage = async (e) => {
  const data = e.data;
  if (!data) return;

  if (data.type === 'init') {
    try {
      maxPlayers = data.maxPlayers || 2;
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks('/wasm');
      } catch {
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
      }

      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: maxPlayers,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      isReady = true;
      self.postMessage({ type: 'init_done', success: true });
    } catch (err) {
      self.postMessage({ type: 'init_done', success: false, error: err.message || String(err) });
    }
    return;
  }

  if (data.type === 'setMaxPlayers') {
    maxPlayers = data.num;
    if (landmarker && typeof landmarker.setOptions === 'function') {
      try {
        landmarker.setOptions({ numPoses: maxPlayers });
      } catch (err) {
        // ignore
      }
    }
    return;
  }

  if (data.type === 'detect') {
    const { bitmap, timestamp } = data;
    if (!bitmap) return;

    if (!isReady || !landmarker) {
      bitmap.close();
      return;
    }

    try {
      const t0 = performance.now();
      const result = landmarker.detectForVideo(bitmap, timestamp);
      const infMs = Math.round(performance.now() - t0);
      bitmap.close();

      self.postMessage({
        type: 'results',
        landmarks: result.landmarks || [],
        inferenceMs: infMs,
        timestamp,
      });
    } catch (err) {
      try { bitmap.close(); } catch (_) {}
      self.postMessage({ type: 'error', error: err.message || String(err) });
    }
  }
};
