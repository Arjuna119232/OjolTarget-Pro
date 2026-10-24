package com.ojoltarget.pro;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {

    private static final int BACKGROUND = 0xFF0A0F1D;
    private static final int REQ_NOTIFICATIONS = 4101;
    private static final int REQ_STORAGE = 4102;
    private static final int REQ_LOCATION = 4104;
    private static final String CHANNEL_ID = "ojol_target_default";

    private WebView webView;
    private AssetServer server;
    private String origin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
        } else {
            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }

        try {
            server = new AssetServer(getAssets());
            origin = server.origin();
        } catch (Exception e) {
            Toast.makeText(this, "Gagal menyiapkan aplikasi: " + e.getMessage(), Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        webView = new WebView(this);
        webView.setLayoutParams(new android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT));
        webView.setBackgroundColor(BACKGROUND);
        webView.setFitsSystemWindows(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setTextZoom(100);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            s.setSafeBrowsingEnabled(true);
        }

        webView.addJavascriptInterface(new NativeBridge(), "OjolNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(Uri.parse(url));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(BRIDGE_JS, null);
            }

            @Override
            public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
                // Rebuild the WebView instead of letting the whole app die
                // when Android reclaims the renderer on low-memory devices.
                if (!isFinishing()) {
                    recreate();
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton(android.R.string.ok, (d, w) -> result.confirm())
                        .setOnCancelListener(d -> result.cancel())
                        .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton(android.R.string.ok, (d, w) -> result.confirm())
                        .setNegativeButton(android.R.string.cancel, (d, w) -> result.cancel())
                        .setOnCancelListener(d -> result.cancel())
                        .show();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message,
                                      String defaultValue, JsPromptResult result) {
                EditText input = new EditText(MainActivity.this);
                input.setText(defaultValue == null ? "" : defaultValue);
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setView(input)
                        .setPositiveButton(android.R.string.ok,
                                (d, w) -> result.confirm(input.getText().toString()))
                        .setNegativeButton(android.R.string.cancel, (d, w) -> result.cancel())
                        .setOnCancelListener(d -> result.cancel())
                        .show();
                return true;
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                                                           android.webkit.GeolocationPermissions.Callback callback) {
                // WebView butuh grant eksplisit; aplikasi ini memakai GPS untuk fitur spot.
                callback.invoke(origin, true, false);
            }
        });

        // Padding inset dipasang di wadah (bukan di WebView), karena WebView tidak
        // menggeser isi halamannya mengikuti padding. Tanpa ini header tertimpa status bar.
        android.widget.FrameLayout root = new android.widget.FrameLayout(this);
        root.setBackgroundColor(BACKGROUND);
        root.addView(webView);
        rootView = root;
        applyInsets(root);

        setContentView(root);

        createNotificationChannel();

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(origin + "/");
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Pengingat OjolTarget",
                NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Pengingat target harian, jatuh tempo tagihan, dan info shift.");
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }

    /** Menjalankan JS di WebView tanpa membuat thread UI crash. */
    private void evalJs(String script) {
        final WebView view = webView;
        if (view == null) {
            return;
        }
        runOnUiThread(() -> {
            try {
                view.evaluateJavascript(script, null);
            } catch (Exception ignored) {
            }
        });
    }

    private android.widget.FrameLayout rootView;

    /** Warna area bar sistem + ikon status bar mengikuti tema aplikasi (gelap/terang). */
    private void applyChrome(int color, boolean lightBars) {
        if (rootView != null) {
            rootView.setBackgroundColor(color);
        }
        if (webView != null) {
            webView.setBackgroundColor(color);
        }
        View decor = getWindow().getDecorView();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            android.view.WindowInsetsController c = decor.getWindowInsetsController();
            if (c != null) {
                int mask = android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                c.setSystemBarsAppearance(lightBars ? mask : 0, mask);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int flags = decor.getSystemUiVisibility();
            if (lightBars) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            } else {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            }
            decor.setSystemUiVisibility(flags);
        }
    }

    private void applyInsets(View target) {
        target.setOnApplyWindowInsetsListener((v, insets) -> {
            int top, bottom, left, right;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout());
                Insets ime = insets.getInsets(WindowInsets.Type.ime());
                top = bars.top;
                left = bars.left;
                right = bars.right;
                bottom = Math.max(bars.bottom, ime.bottom);
            } else {
                top = insets.getSystemWindowInsetTop();
                bottom = insets.getSystemWindowInsetBottom();
                left = insets.getSystemWindowInsetLeft();
                right = insets.getSystemWindowInsetRight();
            }
            v.setPadding(left, top, right, bottom);
            return insets;
        });
        target.requestApplyInsets();
    }

    private boolean handleUrl(Uri uri) {
        if (uri == null) {
            return false;
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        String webOrigin = origin + "/";
        if (uri.toString().startsWith(webOrigin) || "about".equals(scheme) || "javascript".equals(scheme)) {
            return false;
        }
        if ("http".equals(scheme) || "https".equals(scheme) || "mailto".equals(scheme)
                || "tel".equals(scheme) || "whatsapp".equals(scheme)) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException e) {
                Toast.makeText(this, "Tidak ada aplikasi untuk membuka tautan ini", Toast.LENGTH_SHORT).show();
            }
            return true;
        }
        return true;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_NOTIFICATIONS || requestCode == REQ_STORAGE
                || requestCode == REQ_LOCATION) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (!granted && REQ_NOTIFICATIONS == requestCode) {
                Toast.makeText(this,
                        "Izin notifikasi ditolak. Aktifkan lewat Pengaturan aplikasi.",
                        Toast.LENGTH_LONG).show();
            }
            if (!granted && REQ_LOCATION == requestCode) {
                Toast.makeText(this,
                        "Izin lokasi ditolak. Hitung jarak dan Maps Gacor membutuhkan GPS.",
                        Toast.LENGTH_LONG).show();
            }
            evalJs("window.__ojolPermsChanged && window.__ojolPermsChanged();");
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        evalJs("window.__ojolPermsChanged && window.__ojolPermsChanged();");
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.setWebChromeClient(null);
            webView.destroy();
            webView = null;
        }
        if (server != null) {
            server.close();
            server = null;
        }
        super.onDestroy();
    }

    private int notificationIcon() {
        int id = getResources().getIdentifier("ic_notification", "drawable", getPackageName());
        return id != 0 ? id : getApplicationInfo().icon;
    }

    private String versionName() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            return info.versionName == null ? "1.0.0" : info.versionName;
        } catch (Exception e) {
            return "1.0.0";
        }
    }

    private String notificationsPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                    ? "granted" : "prompt";
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            return nm != null && nm.areNotificationsEnabled() ? "granted" : "denied";
        }
        return "granted";
    }

    private String storagePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return "granted";
        }
        return checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
                ? "granted" : "prompt";
    }

    private boolean isBatteryRestricted() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return false;
        }
        PowerManager power = (PowerManager) getSystemService(Context.POWER_SERVICE);
        return power == null || !power.isIgnoringBatteryOptimizations(getPackageName());
    }

    private void openNotificationSettings() {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:" + getPackageName()));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(intent);
        } catch (Exception ignored) {
        }
    }

    /** Receives files produced inside the WebView (e.g. exported PDF reports). */
    private class NativeBridge {

        @JavascriptInterface
        public String getDeviceInfo() {
            try {
                JSONObject info = new JSONObject();
                info.put("model", Build.MODEL);
                info.put("manufacturer", Build.MANUFACTURER);
                info.put("android", String.valueOf(Build.VERSION.SDK_INT));
                info.put("packageName", getPackageName());
                info.put("appVersion", versionName());
                info.put("isNative", true);
                return info.toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        @JavascriptInterface
        public String permissionStatus() {
            try {
                JSONObject status = new JSONObject();
                status.put("notifications", notificationsPermission());
                status.put("storage", storagePermission());
                status.put("batteryOptimized", isBatteryRestricted());
                status.put("androidSdk", Build.VERSION.SDK_INT);
                return status.toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        @JavascriptInterface
        public void requestNotifications() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                        && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
                    return;
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    NotificationManager nm = getSystemService(NotificationManager.class);
                    if (nm != null && !nm.areNotificationsEnabled()) {
                        openNotificationSettings();
                    }
                }
            });
        }

        @JavascriptInterface
        public void requestStorage() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P
                        && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                        != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
                }
            });
        }

        @JavascriptInterface
        public void requestLocation() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        && checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                        != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                    }, REQ_LOCATION);
                }
            });
        }

        @JavascriptInterface
        public void requestBatteryOptimizationExemption() {
            runOnUiThread(() -> {
                if (isBatteryRestricted()) {
                    try {
                        Intent intent = new Intent(
                                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                                Uri.parse("package:" + getPackageName()));
                        startActivity(intent);
                    } catch (Exception e) {
                        try {
                            startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
                        } catch (Exception ignored) {
                        }
                    }
                }
            });
        }

        @JavascriptInterface
        public void openAppSettings() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.parse("package:" + getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    startActivity(intent);
                } catch (Exception ignored) {
                }
            });
        }

        @JavascriptInterface
        public void vibrate(String patternJson) {
            try {
                Vibrator vibrator;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    VibratorManager manager = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                    vibrator = manager == null ? null : manager.getDefaultVibrator();
                } else {
                    vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                }
                if (vibrator == null || !vibrator.hasVibrator()) {
                    return;
                }
                JSONArray array = new JSONArray(patternJson == null ? "[20]" : patternJson);
                long[] pattern = new long[array.length()];
                for (int i = 0; i < array.length(); i++) {
                    pattern[i] = Math.max(0, array.optLong(i, 20));
                }
                if (pattern.length == 0) {
                    pattern = new long[]{20};
                }
                if (pattern.length == 1) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createOneShot(pattern[0], VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        vibrator.vibrate(pattern[0]);
                    }
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void setChrome(String bgHex, String lightBars) {
            final boolean light = "true".equalsIgnoreCase(lightBars);
            final int color;
            try {
                color = Color.parseColor(bgHex);
            } catch (Exception e) {
                return;
            }
            runOnUiThread(() -> applyChrome(color, light));
        }

        @JavascriptInterface
        public void setKeepScreenOn(String on) {
            final boolean keepOn = "true".equalsIgnoreCase(on);
            runOnUiThread(() -> {
                if (webView != null) {
                    webView.setKeepScreenOn(keepOn);
                }
            });
        }

        @JavascriptInterface
        public void notify(String title, String body) {
            final String safeTitle = title == null || title.trim().isEmpty() ? "OjolTarget Pro" : title;
            final String safeBody = body == null ? "" : body;
            runOnUiThread(() -> {
                try {
                    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (manager == null) {
                        return;
                    }
                    Intent intent = new Intent(MainActivity.this, MainActivity.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        flags |= PendingIntent.FLAG_IMMUTABLE;
                    }
                    PendingIntent pending = PendingIntent.getActivity(
                            MainActivity.this, 0, intent, flags);

                    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                            ? new Notification.Builder(MainActivity.this, CHANNEL_ID)
                            : new Notification.Builder(MainActivity.this);
                    builder.setContentTitle(safeTitle)
                            .setContentText(safeBody)
                            .setStyle(new Notification.BigTextStyle().bigText(safeBody))
                            .setSmallIcon(notificationIcon())
                            .setAutoCancel(true)
                            .setContentIntent(pending);

                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                            || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                            == PackageManager.PERMISSION_GRANTED) {
                        manager.notify((int) (System.currentTimeMillis() % 100000), builder.build());
                    }
                } catch (Exception ignored) {
                }
            });
        }

        @JavascriptInterface
        public void shareText(String text) {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_SEND);
                    intent.setType("text/plain");
                    intent.putExtra(Intent.EXTRA_TEXT, text == null ? "" : text);
                    startActivity(Intent.createChooser(intent, "Bagikan laporan"));
                } catch (Exception ignored) {
                }
            });
        }

        @JavascriptInterface
        public void saveBase64File(String filename, String base64) {
            try {
                String safeName = (filename == null || filename.trim().isEmpty())
                        ? "OjolTarget-Pro.pdf"
                        : filename.replaceAll("[\\\\/:*?\"<>|]", "_");
                byte[] data = Base64.decode(base64, Base64.DEFAULT);
                String location = writeToDownloads(safeName, data);
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                        "Tersimpan: " + location, Toast.LENGTH_LONG).show());
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                        "Gagal menyimpan file: " + e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }

        private String writeToDownloads(String name, byte[] data) throws Exception {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeOf(name));
                values.put(MediaStore.MediaColumns.RELATIVE_PATH,
                        android.os.Environment.DIRECTORY_DOWNLOADS + "/OjolTarget Pro");
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) {
                    throw new Exception("penyimpanan tidak tersedia");
                }
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out == null) {
                        throw new Exception("tidak bisa menulis file");
                    }
                    out.write(data);
                }
                return "Download/OjolTarget Pro/" + name;
            }
            File dir = new File(getExternalFilesDir(null), "downloads");
            if (!dir.exists() && !dir.mkdirs()) {
                throw new Exception("tidak bisa membuat folder");
            }
            File file = new File(dir, name);
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(data);
            }
            return file.getAbsolutePath();
        }

        private String mimeOf(String name) {
            return name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
        }
    }

    /**
     * Routes blob downloads (jsPDF report export) to the native bridge so the
     * file lands in the Downloads folder instead of being silently dropped.
     */
    private static final String BRIDGE_JS =
            "(function(){"
            + "if(window.__ojolBridge){return;}window.__ojolBridge=true;"
            + "var create=URL.createObjectURL;"
            + "window.__ojolBlobs={};"
            + "URL.createObjectURL=function(o){var u=create.call(URL,o);try{window.__ojolBlobs[u]=o;}catch(e){}return u;};"
            + "var click=HTMLAnchorElement.prototype.click;"
            + "HTMLAnchorElement.prototype.click=function(){"
            + "try{"
            + "var href=this.href||'';"
            + "if(href.indexOf('blob:')===0&&window.OjolNative&&window.OjolNative.saveBase64File){"
            + "var b=window.__ojolBlobs[href];"
            + "if(b){var name=this.download||'OjolTarget-Pro.pdf';"
            + "var fr=new FileReader();"
            + "fr.onload=function(){var s=String(fr.result);var i=s.indexOf(',');"
            + "window.OjolNative.saveBase64File(name,i>=0?s.substring(i+1):s);};"
            + "fr.readAsDataURL(b);return;}"
            + "}"
            + "}catch(e){}"
            + "return click.apply(this,arguments);"
            + "};"
            + "})();";
}
