package com.emiliago.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.content.res.AssetFileDescriptor;
import android.graphics.ImageFormat;
import android.graphics.Rect;
import android.graphics.SurfaceTexture;
import android.graphics.YuvImage;
import android.hardware.usb.UsbDevice;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import android.util.Log;
import android.view.KeyEvent;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;
import com.herohan.uvcapp.CameraHelper;
import com.herohan.uvcapp.ICameraHelper;
import com.serenegiant.usb.IFrameCallback;
import com.serenegiant.usb.Size;
import com.serenegiant.usb.UVCCamera;
import com.serenegiant.usb.UVCControl;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "EmiliaGO_UVC";
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1001;

    private ICameraHelper mCameraHelper;
    private SurfaceTexture mDummyTexture;
    private TextToSpeech mTts;
    private boolean mTtsReady = false;
    private MediaPlayer mMediaPlayer;

    static class ReusableByteArrayOutputStream extends OutputStream {
        byte[] buf;
        int count = 0;
        ReusableByteArrayOutputStream(int initialCapacity) {
            buf = new byte[initialCapacity];
        }
        @Override
        public void write(int b) {
            if (count >= buf.length) {
                byte[] newbuf = new byte[buf.length * 2];
                System.arraycopy(buf, 0, newbuf, 0, buf.length);
                buf = newbuf;
            }
            buf[count++] = (byte) b;
        }
        @Override
        public void write(byte[] b, int off, int len) {
            if (count + len > buf.length) {
                byte[] newbuf = new byte[Math.max(buf.length * 2, count + len)];
                System.arraycopy(buf, 0, newbuf, 0, count);
                buf = newbuf;
            }
            System.arraycopy(b, off, buf, count, len);
            count += len;
        }
        public void reset() {
            count = 0;
        }
    }

    // Ping-pong double buffers for zero-allocation, tear-free JPEG frame serving to WebView
    private final byte[][] mJpegBuffers = new byte[][] { new byte[1024 * 1024], new byte[1024 * 1024] };
    private final int[] mJpegLengths = new int[2];
    private volatile int mActiveBufferIdx = 0;
    private final ReusableByteArrayOutputStream mReusableBaos = new ReusableByteArrayOutputStream(1024 * 1024);
    private volatile int mFrameSeq = 0;
    private volatile int mFrameWidth = 1280;
    private volatile int mFrameHeight = 720;
    private volatile int mPreferredWidth = 1280;
    private volatile int mPreferredHeight = 720;
    private volatile boolean mIsStreaming = false;
    private volatile String mDeviceLabel = "WeGear 4K Webcam";
    private volatile String mStatusMessage = "Initializing USB UVC driver...";

    private byte[] mNv21Buffer;
    private Timer mMemoryTelemetryTimer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initialize persistent diagnostic & crash logger
        EmiliaLogger.init(this);

        // Keep NVIDIA Shield TV screen awake during hands-free motion gameplay
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Request Android runtime Camera permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                new String[] { Manifest.permission.CAMERA },
                CAMERA_PERMISSION_REQUEST_CODE
            );
        }

        // Configure WebView and inject Native UVC Bridge
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setDomStorageEnabled(true);
            settings.setJavaScriptEnabled(true);

            webView.addJavascriptInterface(new NativeUvcBridge(), "EmiliaNativeUVC");

            webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> request.grant(request.getResources()));
                }
            });

            // Set custom BridgeWebViewClient that serves binary JPEG frames (0 MemoryCache bloat!)
            // and gracefully recovers if the 32-bit WebView renderer process ever crashes!
            webView.setWebViewClient(new BridgeWebViewClient(this.bridge) {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    if (request != null && request.getUrl() != null) {
                        String path = request.getUrl().getPath();
                        if (path != null && (path.endsWith("__camera_frame.jpg") || path.endsWith("__uvc_frame.jpg"))) {
                            int readIdx = mActiveBufferIdx;
                            int len = mJpegLengths[readIdx];
                            byte[] buf = mJpegBuffers[readIdx];
                            if (buf != null && len > 0) {
                                Map<String, String> headers = new HashMap<>();
                                headers.put("Cache-Control", "no-cache, no-store, must-revalidate");
                                headers.put("Pragma", "no-cache");
                                headers.put("Expires", "0");
                                headers.put("Access-Control-Allow-Origin", "*");
                                return new WebResourceResponse(
                                    "image/jpeg",
                                    "binary",
                                    200,
                                    "OK",
                                    headers,
                                    new ByteArrayInputStream(buf, 0, len)
                                );
                            }
                        }
                    }
                    return super.shouldInterceptRequest(view, request);
                }

                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    String reason = (detail != null && detail.didCrash()) ? "CRASHED" : "KILLED_BY_SYSTEM";
                    int priority = detail != null ? detail.rendererPriorityAtExit() : -1;
                    String msg = "WebView render process gone: reason=" + reason + ", priority=" + priority;
                    Log.e(TAG, msg);
                    EmiliaLogger.log("FATAL", "WebView", msg);
                    EmiliaLogger.logMemoryStats("onRenderProcessGone");

                    // Gracefully recover instead of allowing Crashpad to abort com.emiliago.app!
                    runOnUiThread(() -> {
                        try {
                            if (view != null) {
                                view.destroy();
                            }
                        } catch (Exception ignored) {}
                        recreate();
                    });
                    return true;
                }
            });
        }

        // Start periodic memory telemetry (logs heap status every 45s)
        mMemoryTelemetryTimer = new Timer("EmiliaMemoryLogger", true);
        mMemoryTelemetryTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                EmiliaLogger.logMemoryStats("Periodic");
            }
        }, 45000, 45000);

        // Initialize Android TextToSpeech as fallback voice engine
        try {
            mTts = new TextToSpeech(this, status -> {
                if (status == TextToSpeech.SUCCESS && mTts != null) {
                    mTts.setLanguage(Locale.US);
                    mTts.setPitch(1.18f);
                    mTts.setSpeechRate(0.95f);
                    mTtsReady = true;
                }
            });
        } catch (Exception e) {
            Log.w(TAG, "TextToSpeech not available on this device", e);
        }

        initUvcCamera();
    }

    private Size chooseBestSize(List<Size> sizes, int prefW, int prefH) {
        if (sizes == null || sizes.isEmpty()) return null;

        // 1. Exact match in MJPEG (type 7) for 30fps widescreen
        for (Size s : sizes) {
            if (s.type == UVCCamera.UVC_VS_FRAME_MJPEG && s.width == prefW && s.height == prefH) {
                return s;
            }
        }
        // 2. Fallback to 1280x720 16:9 MJPEG (full wide-angle sensor width)
        for (Size s : sizes) {
            if (s.type == UVCCamera.UVC_VS_FRAME_MJPEG && s.width == 1280 && s.height == 720) {
                return s;
            }
        }
        // 3. Fallback to 640x360 16:9 MJPEG (widescreen uncropped)
        for (Size s : sizes) {
            if (s.type == UVCCamera.UVC_VS_FRAME_MJPEG && s.width == 640 && s.height == 360) {
                return s;
            }
        }
        // 4. Any match for prefW x prefH
        for (Size s : sizes) {
            if (s.width == prefW && s.height == prefH) {
                return s;
            }
        }
        // 5. Fallback to 640x480 MJPEG
        for (Size s : sizes) {
            if (s.type == UVCCamera.UVC_VS_FRAME_MJPEG && s.width == 640 && s.height == 480) {
                return s;
            }
        }
        return sizes.get(0);
    }

    private void applyZeroHardwareZoom() {
        try {
            if (mCameraHelper != null) {
                UVCControl ctrl = mCameraHelper.getUVCControl();
                if (ctrl != null) {
                    if (ctrl.isZoomAbsoluteEnable()) {
                        ctrl.resetZoomAbsolute();
                        ctrl.setZoomAbsolutePercent(0);
                        Log.i(TAG, "Hardware Zoom reset to 0% (widest FOV)");
                    }
                    if (ctrl.isZoomRelativeEnable()) {
                        ctrl.resetZoomRelative();
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not reset UVC zoom control", e);
        }
    }

    private void resetAndCalibrateExposure() {
        try {
            if (mCameraHelper != null) {
                UVCControl ctrl = mCameraHelper.getUVCControl();
                if (ctrl != null) {
                    // 1. Force Auto Exposure Mode to AUTO (Mode 2)
                    if (ctrl.isAutoExposureModeEnable()) {
                        ctrl.resetAutoExposureMode();
                        ctrl.setAutoExposureMode(UVCControl.UVC_AUTO_EXPOSURE_MODE_AUTO);
                        Log.i(TAG, "UVC Auto Exposure mode set to AUTO");
                    }
                    if (ctrl.isExposureTimeAbsoluteEnable()) {
                        ctrl.resetExposureTimeAbsolute();
                    }
                    if (ctrl.isAutoExposurePriorityEnable()) {
                        ctrl.resetAutoExposurePriority();
                    }
                    // 2. Reset gain to camera default (clears stuck high-gain/overexposure)
                    if (ctrl.isGainEnable()) {
                        ctrl.resetGain();
                        Log.i(TAG, "UVC Gain reset to default");
                    }
                    // 3. Reset brightness, contrast, backlight compensation
                    if (ctrl.isBrightnessEnable()) {
                        ctrl.resetBrightness();
                    }
                    if (ctrl.isContrastEnable()) {
                        ctrl.resetContrast();
                    }
                    // 4. Force Auto White Balance
                    if (ctrl.isWhiteBalanceAutoEnable()) {
                        ctrl.resetWhiteBalanceAuto();
                        ctrl.setWhiteBalanceAuto(true);
                        Log.i(TAG, "UVC White Balance set to AUTO");
                    }
                    // 5. Anti-flicker 60Hz powerline frequency
                    if (ctrl.isPowerlineFrequencyEnable()) {
                        ctrl.setPowerlineFrequency(2);
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not calibrate UVC exposure/gain", e);
        }
    }

    public void resetCameraHardwareInternal() {
        runOnUiThread(() -> {
            try {
                Log.i(TAG, "Executing full camera hardware exposure & connection reset...");
                EmiliaLogger.log("INFO", TAG, "Executing full camera hardware exposure & connection reset");
                if (mCameraHelper != null) {
                    resetAndCalibrateExposure();
                    applyZeroHardwareZoom();
                    if (mCameraHelper.isCameraOpened()) {
                        mIsStreaming = false;
                        mCameraHelper.stopPreview();
                        // Brief delay before restarting to allow Sony ISP registers to clear
                        new Handler(Looper.getMainLooper()).postDelayed(() -> {
                            try {
                                if (mCameraHelper != null && mCameraHelper.isCameraOpened()) {
                                    resetAndCalibrateExposure();
                                    applyZeroHardwareZoom();
                                    attachFrameCallback();
                                    mCameraHelper.startPreview();
                                    Log.i(TAG, "Camera preview restarted with fresh AE/AGC calibration");
                                    EmiliaLogger.log("INFO", TAG, "Camera preview restarted with fresh AE/AGC calibration");
                                }
                            } catch (Exception e) {
                                Log.e(TAG, "Error restarting preview after exposure reset", e);
                            }
                        }, 250);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to execute camera reset", e);
            }
        });
    }

    private void attachFrameCallback() {
        if (mCameraHelper == null) return;
        mCameraHelper.setFrameCallback(new IFrameCallback() {
            @Override
            public void onFrame(ByteBuffer frame) {
                int w = mFrameWidth;
                int h = mFrameHeight;
                int len = frame.remaining();
                int expected = w * h * 3 / 2;
                if (len < expected) {
                    return;
                }
                if (mNv21Buffer == null || mNv21Buffer.length != len) {
                    mNv21Buffer = new byte[len];
                }
                frame.get(mNv21Buffer, 0, len);

                try {
                    YuvImage yuv = new YuvImage(mNv21Buffer, ImageFormat.NV21, w, h, null);
                    synchronized (mReusableBaos) {
                        mReusableBaos.reset();
                        // 88% JPEG quality: crisp Sony 4K sensor detail with fast compression
                        yuv.compressToJpeg(new Rect(0, 0, w, h), 88, mReusableBaos);
                        int count = mReusableBaos.count;
                        int writeIdx = 1 - mActiveBufferIdx;
                        if (mJpegBuffers[writeIdx].length < count) {
                            mJpegBuffers[writeIdx] = new byte[count * 2];
                        }
                        System.arraycopy(mReusableBaos.buf, 0, mJpegBuffers[writeIdx], 0, count);
                        mJpegLengths[writeIdx] = count;
                        mActiveBufferIdx = writeIdx;
                    }
                    mFrameSeq++;
                    if (!mIsStreaming) {
                        mIsStreaming = true;
                        mStatusMessage = "Streaming live UVC video (" + w + "x" + h + ")";
                        Log.i(TAG, "First UVC frame decoded! Stream is LIVE at " + w + "x" + h);
                        EmiliaLogger.log("INFO", TAG, "First UVC frame decoded! Stream is LIVE at " + w + "x" + h);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error compressing NV21 frame to JPEG", e);
                    EmiliaLogger.log("ERROR", TAG, "Error compressing NV21 frame to JPEG: " + e.getMessage());
                }
            }
        }, UVCCamera.PIXEL_FORMAT_NV21);
    }

    private void initUvcCamera() {
        try {
            mDummyTexture = new SurfaceTexture(10);
            mCameraHelper = new CameraHelper();
            mCameraHelper.setStateCallback(new ICameraHelper.StateCallback() {
                @Override
                public void onAttach(UsbDevice device) {
                    Log.i(TAG, "onAttach USB device: " + device.getDeviceName() + " product=" + device.getProductName());
                    if (device.getProductName() != null) {
                        mDeviceLabel = device.getProductName().trim();
                    }
                    mStatusMessage = "USB Webcam attached (" + mDeviceLabel + ") - requesting USB permission...";
                    mCameraHelper.selectDevice(device);
                }

                @Override
                public void onDeviceOpen(UsbDevice device, boolean isFirstOpen) {
                    Log.i(TAG, "onDeviceOpen: " + device.getDeviceName() + " isFirstOpen=" + isFirstOpen);
                    mStatusMessage = "USB device opened - starting 16:9 wide UVC stream...";
                    // Open directly in 16:9 widescreen MJPEG (1280x720 @ 30fps) so sensor is NOT cropped to 4:3!
                    Size targetSize = new Size(
                        UVCCamera.UVC_VS_FRAME_MJPEG,
                        mPreferredWidth,
                        mPreferredHeight,
                        30,
                        Collections.singletonList(30)
                    );
                    try {
                        mCameraHelper.openCamera(targetSize);
                    } catch (Exception e) {
                        Log.w(TAG, "openCamera(targetSize) fallback to openCamera()", e);
                        mCameraHelper.openCamera();
                    }
                }

                @Override
                public void onCameraOpen(UsbDevice device) {
                    Log.i(TAG, "onCameraOpen: " + device.getDeviceName());
                    try {
                        List<Size> sizes = mCameraHelper.getSupportedSizeList();
                        if (sizes != null) {
                            StringBuilder sb = new StringBuilder();
                            for (Size s : sizes) {
                                sb.append(s.width).append("x").append(s.height).append("(t:").append(s.type).append(") ");
                            }
                            Log.i(TAG, "Supported UVC preview sizes: " + sb.toString());
                            EmiliaLogger.log("INFO", TAG, "Supported UVC preview sizes: " + sb.toString());
                        }
                        Size bestSize = chooseBestSize(sizes, mPreferredWidth, mPreferredHeight);
                        if (bestSize != null) {
                            Log.i(TAG, "Selecting UVC preview size: " + bestSize.width + "x" + bestSize.height + " type=" + bestSize.type);
                            mCameraHelper.setPreviewSize(bestSize);
                        }

                        Size activeSize = mCameraHelper.getPreviewSize();
                        if (activeSize != null) {
                            mFrameWidth = activeSize.width;
                            mFrameHeight = activeSize.height;
                            mDummyTexture.setDefaultBufferSize(mFrameWidth, mFrameHeight);
                            Log.i(TAG, "Active preview size: " + mFrameWidth + "x" + mFrameHeight);
                        }

                        applyZeroHardwareZoom();
                        resetAndCalibrateExposure();
                        mCameraHelper.addSurface(mDummyTexture, false);
                        attachFrameCallback();
                        mCameraHelper.startPreview();
                        Log.i(TAG, "mCameraHelper.startPreview() called at " + mFrameWidth + "x" + mFrameHeight);

                        // Schedule a post-warmup exposure pulse 1.2s later once the Sony ISP begins processing real light
                        new Handler(Looper.getMainLooper()).postDelayed(() -> {
                            resetAndCalibrateExposure();
                            Log.i(TAG, "Post-startup Auto-Exposure convergence check executed");
                        }, 1200);
                    } catch (Exception e) {
                        Log.e(TAG, "Error in onCameraOpen", e);
                        mStatusMessage = "Error starting UVC preview: " + e.getMessage();
                    }
                }

                @Override
                public void onCameraClose(UsbDevice device) {
                    Log.i(TAG, "onCameraClose");
                    mIsStreaming = false;
                }

                @Override
                public void onDeviceClose(UsbDevice device) {
                    Log.i(TAG, "onDeviceClose");
                    mIsStreaming = false;
                }

                @Override
                public void onDetach(UsbDevice device) {
                    Log.i(TAG, "onDetach");
                    mIsStreaming = false;
                    mStatusMessage = "USB Webcam detached";
                }

                @Override
                public void onCancel(UsbDevice device) {
                    Log.w(TAG, "onCancel USB permission for device: " + device.getDeviceName());
                    mStatusMessage = "USB permission cancelled - please click OK on TV prompt";
                }
            });

            List<UsbDevice> devs = mCameraHelper.getDeviceList();
            if (devs != null && !devs.isEmpty()) {
                Log.i(TAG, "Found " + devs.size() + " attached UVC device(s) at startup, selecting first.");
                mCameraHelper.selectDevice(devs.get(0));
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize CameraHelper", e);
            mStatusMessage = "UVC init failed: " + e.getMessage();
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            if (event.getAction() == KeyEvent.ACTION_UP) {
                if (this.bridge != null && this.bridge.getWebView() != null) {
                    this.bridge.getWebView().evaluateJavascript(
                        "if (window.onAndroidBackPressed) { window.onAndroidBackPressed(); }",
                        null
                    );
                }
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().evaluateJavascript(
                "if (window.onAndroidBackPressed) { window.onAndroidBackPressed(); }",
                null
            );
            return;
        }
        super.onBackPressed();
    }

    @Override
    public void onDestroy() {
        if (mMediaPlayer != null) {
            try {
                mMediaPlayer.release();
            } catch (Exception ignored) {}
            mMediaPlayer = null;
        }
        if (mTts != null) {
            try {
                mTts.stop();
                mTts.shutdown();
            } catch (Exception ignored) {}
            mTts = null;
        }
        if (mMemoryTelemetryTimer != null) {
            try {
                mMemoryTelemetryTimer.cancel();
            } catch (Exception ignored) {}
            mMemoryTelemetryTimer = null;
        }
        if (mCameraHelper != null) {
            try {
                mCameraHelper.release();
            } catch (Exception ignored) {}
            mCameraHelper = null;
        }
        super.onDestroy();
    }

    public class NativeUvcBridge {
        @JavascriptInterface
        public boolean isNativeUvcSupported() {
            return true;
        }

        @JavascriptInterface
        public void exitApp() {
            runOnUiThread(() -> {
                finishAffinity();
            });
        }

        @JavascriptInterface
        public boolean playAssetAudio(final String relativePath) {
            if (relativePath == null || relativePath.isEmpty()) return false;
            try {
                String cleanPath = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
                final String assetPath = "public/" + cleanPath;
                runOnUiThread(() -> {
                    try {
                        if (mMediaPlayer != null) {
                            try {
                                if (mMediaPlayer.isPlaying()) {
                                    mMediaPlayer.stop();
                                }
                                mMediaPlayer.reset();
                            } catch (Exception ignored) {
                                mMediaPlayer.release();
                                mMediaPlayer = new MediaPlayer();
                            }
                        } else {
                            mMediaPlayer = new MediaPlayer();
                        }
                        mMediaPlayer.setAudioAttributes(
                            new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_GAME)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build()
                        );
                        AssetFileDescriptor afd = getAssets().openFd(assetPath);
                        mMediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                        afd.close();
                        mMediaPlayer.setVolume(1.0f, 1.0f);
                        mMediaPlayer.prepare();
                        mMediaPlayer.start();
                    } catch (Exception e) {
                        Log.e(TAG, "Error playing asset audio: " + assetPath, e);
                    }
                });
                return true;
            } catch (Exception e) {
                Log.e(TAG, "playAssetAudio failed", e);
                return false;
            }
        }

        @JavascriptInterface
        public void speakTts(final String text) {
            if (mTts != null && mTtsReady && text != null) {
                try {
                    mTts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "emiliago_utt");
                } catch (Exception ignored) {}
            }
        }

        @JavascriptInterface
        public boolean isStreaming() {
            return mIsStreaming && mJpegLengths[mActiveBufferIdx] > 0;
        }

        @JavascriptInterface
        public int getFrameSeq() {
            return mFrameSeq;
        }

        @JavascriptInterface
        public int getWidth() {
            return mFrameWidth;
        }

        @JavascriptInterface
        public int getHeight() {
            return mFrameHeight;
        }

        @JavascriptInterface
        public String getDeviceName() {
            return mDeviceLabel;
        }

        @JavascriptInterface
        public String getStatusMessage() {
            return mStatusMessage;
        }

        @JavascriptInterface
        public String getLatestFrameBase64() {
            int idx = mActiveBufferIdx;
            int len = mJpegLengths[idx];
            byte[] bytes = mJpegBuffers[idx];
            if (bytes != null && len > 0) {
                return Base64.encodeToString(bytes, 0, len, Base64.NO_WRAP);
            }
            return null;
        }

        @JavascriptInterface
        public void logEvent(final String level, final String tag, final String message) {
            EmiliaLogger.log(level != null ? level : "INFO", tag != null ? tag : "JS", message != null ? message : "");
        }

        @JavascriptInterface
        public String getDiagnosticLogs() {
            return EmiliaLogger.getRecentLogs(80);
        }

        @JavascriptInterface
        public void clearDiagnosticLogs() {
            EmiliaLogger.clearLogs();
        }

        @JavascriptInterface
        public String getLogFilePath() {
            return EmiliaLogger.getLogFilePath();
        }

        @JavascriptInterface
        public String getMemoryTelemetry() {
            Runtime rt = Runtime.getRuntime();
            long total = rt.totalMemory() / (1024 * 1024);
            long free = rt.freeMemory() / (1024 * 1024);
            long used = total - free;
            long max = rt.maxMemory() / (1024 * 1024);
            long nativeH = android.os.Debug.getNativeHeapAllocatedSize() / (1024 * 1024);
            return "Java: " + used + "MB / " + total + "MB (Max: " + max + "MB) | Native: " + nativeH + "MB";
        }

        @JavascriptInterface
        public void setPreferredResolution(final int width, final int height) {
            if (mPreferredWidth == width && mPreferredHeight == height) {
                return;
            }
            mPreferredWidth = width;
            mPreferredHeight = height;
            runOnUiThread(() -> {
                if (mCameraHelper != null && mCameraHelper.isCameraOpened()) {
                    try {
                        List<Size> sizes = mCameraHelper.getSupportedSizeList();
                        Size target = chooseBestSize(sizes, width, height);
                        if (target != null && (target.width != mFrameWidth || target.height != mFrameHeight)) {
                            Log.i(TAG, "Switching live UVC preview size to " + target.width + "x" + target.height);
                            mIsStreaming = false;
                            mCameraHelper.stopPreview();
                            mCameraHelper.setPreviewSize(target);
                            mFrameWidth = target.width;
                            mFrameHeight = target.height;
                            mDummyTexture.setDefaultBufferSize(mFrameWidth, mFrameHeight);
                            applyZeroHardwareZoom();
                            attachFrameCallback();
                            mCameraHelper.startPreview();
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to switch UVC resolution", e);
                    }
                }
            });
        }

        @JavascriptInterface
        public void retryConnection() {
            runOnUiThread(() -> {
                if (mCameraHelper != null) {
                    List<UsbDevice> devs = mCameraHelper.getDeviceList();
                    if (devs != null && !devs.isEmpty()) {
                        mCameraHelper.selectDevice(devs.get(0));
                    }
                }
            });
        }

        @JavascriptInterface
        public boolean resetCameraHardware() {
            resetCameraHardwareInternal();
            return true;
        }
    }
}
