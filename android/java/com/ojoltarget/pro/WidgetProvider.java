package com.ojoltarget.pro;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Locale;

/**
 * Widget layar utama: tampilan HUD ringkas (laba bersih, progres target) dan satu
 * tombol Catat Order Cepat. Order yang dicatat saat aplikasi tertutup disimpan
 * antre di SharedPreferences, lalu diimpor aplikasi saat dibuka.
 */
public class WidgetProvider extends AppWidgetProvider {
    static final String PREFS = "ojol_widget";
    static final String KEY_SNAPSHOT = "snapshot";
    static final String KEY_PENDING = "pending";
    static final String KEY_PENDING_SPOTS = "pending_spots";
    static final String ACTION_QUICK = "com.ojoltarget.pro.WIDGET_QUICK_ORDER";
    static final String ACTION_SPOT = "com.ojoltarget.pro.WIDGET_SPOT";
    /** Dipakai bersama MainActivity agar antrean order tidak saling menimpa. */
    static final Object LOCK = new Object();

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, build(context));
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null) {
            return;
        }
        if (ACTION_QUICK.equals(intent.getAction())) {
            handleQuickOrder(context);
        } else if (ACTION_SPOT.equals(intent.getAction())) {
            handleSpot(context);
        }
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, WidgetProvider.class));
        for (int id : ids) {
            manager.updateAppWidget(id, build(context));
        }
    }

    private static JSONObject readSnapshot(Context context) {
        try {
            String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(KEY_SNAPSHOT, null);
            return raw == null ? null : new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }

    private static String rupiah(long value) {
        return "Rp. " + String.format(new Locale("id", "ID"), "%,d", value);
    }

    private static RemoteViews build(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_hud);
        JSONObject snap = readSnapshot(context);

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent openPending = PendingIntent.getActivity(context, 0, open, flags);
        views.setOnClickPendingIntent(R.id.widget_root, openPending);

        if (snap == null) {
            // Belum pernah dibuka / onboarding belum selesai: tombol membuka aplikasi.
            views.setTextViewText(R.id.widget_platform, "");
            views.setTextViewText(R.id.widget_net, "Rp 0");
            views.setTextViewText(R.id.widget_sub, "Buka aplikasi untuk memulai");
            views.setProgressBar(R.id.widget_progress, 100, 0, false);
            views.setTextViewText(R.id.widget_add, "Buka aplikasi");
            views.setOnClickPendingIntent(R.id.widget_add, openPending);
            return views;
        }

        long net = snap.optLong("todayNet", 0);
        long amount = snap.optLong("quickAmount", 10200);
        int pct = (int) Math.max(0, Math.min(100, snap.optLong("progressPct", 0)));
        long remaining = snap.optLong("remaining", 0);
        int trips = snap.optInt("trips", 0);

        views.setTextViewText(R.id.widget_platform, snap.optString("platformName", ""));
        views.setTextViewText(R.id.widget_net, rupiah(net));
        String sub = remaining > 0
                ? pct + "% target · sisa " + rupiah(remaining) + " · " + trips + " order"
                : "Target hari ini tercapai · " + trips + " order";
        views.setTextViewText(R.id.widget_sub, sub);
        views.setProgressBar(R.id.widget_progress, 100, pct, false);
        views.setTextViewText(R.id.widget_add, "+ " + rupiah(amount));

        Intent quick = new Intent(context, WidgetProvider.class);
        quick.setAction(ACTION_QUICK);
        views.setOnClickPendingIntent(R.id.widget_add,
                PendingIntent.getBroadcast(context, 1, quick, flags));

        Intent spot = new Intent(context, WidgetProvider.class);
        spot.setAction(ACTION_SPOT);
        views.setOnClickPendingIntent(R.id.widget_spot,
                PendingIntent.getBroadcast(context, 2, spot, flags));

        views.setOnClickPendingIntent(R.id.widget_btn_dapat, openPending);
        views.setOnClickPendingIntent(R.id.widget_btn_turun, openPending);
        return views;
    }

    private static void handleQuickOrder(Context context) {
        JSONObject snap = readSnapshot(context);
        if (snap == null) {
            return;
        }
        try {
            long amount = snap.optLong("quickAmount", 10200);
            // Uang yang diterima dicatat apa adanya, tanpa potongan komisi.
            long net = amount;

            synchronized (LOCK) {
                SharedPreferences sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                JSONArray pending = new JSONArray(sp.getString(KEY_PENDING, "[]"));
                JSONObject order = new JSONObject();
                order.put("amount", amount);
                order.put("platform", snap.optString("platform", ""));
                order.put("ts", System.currentTimeMillis());
                pending.put(order);

                // Perbarui tampilan widget secara optimistis sampai aplikasi dibuka.
                long todayNet = snap.optLong("todayNet", 0) + net;
                long target = snap.optLong("target", 0);
                snap.put("todayNet", todayNet);
                snap.put("trips", snap.optInt("trips", 0) + 1);
                snap.put("remaining", Math.max(0, target - todayNet));
                snap.put("progressPct", Math.min(150, Math.round(todayNet * 100.0 / Math.max(1, target))));

                sp.edit()
                        .putString(KEY_PENDING, pending.toString())
                        .putString(KEY_SNAPSHOT, snap.toString())
                        .apply();
            }
            refreshAll(context);
            Toast.makeText(context, "Order " + rupiah(amount) + " dicatat", Toast.LENGTH_SHORT).show();
        } catch (Exception ignored) {
        }
    }

    /**
     * Menandai spot dari widget tanpa membuka aplikasi penuh.
     * Mengambil lokasi terakhir yang diketahui (best-effort) lalu menyimpannya
     * ke antrean pending_spots; aplikasi mengimpornya saat dibuka.
     */
    private static void handleSpot(Context context) {
        try {
            double lat = 0d, lng = 0d;
            boolean got = false;
            if (android.os.Build.VERSION.SDK_INT >= 23
                    && context.checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
                    != android.content.pm.PackageManager.PERMISSION_GRANTED
                    && context.checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION)
                    != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(context, "Izin lokasi belum aktif. Buka aplikasi untuk mengaktifkan.",
                        Toast.LENGTH_SHORT).show();
                return;
            }
            android.location.LocationManager lm =
                    (android.location.LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            if (lm != null) {
                android.location.Location loc = null;
                try {
                    loc = lm.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER);
                } catch (Exception ignored) {
                }
                if (loc == null) {
                    try {
                        loc = lm.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER);
                    } catch (Exception ignored) {
                    }
                }
                if (loc != null) {
                    lat = loc.getLatitude();
                    lng = loc.getLongitude();
                    got = true;
                }
            }

            synchronized (LOCK) {
                SharedPreferences sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                JSONArray pending = new JSONArray(sp.getString(KEY_PENDING_SPOTS, "[]"));
                JSONObject item = new JSONObject();
                item.put("lat", lat);
                item.put("lng", lng);
                item.put("hasLocation", got);
                item.put("ts", System.currentTimeMillis());
                pending.put(item);
                sp.edit().putString(KEY_PENDING_SPOTS, pending.toString()).apply();
            }

            Toast.makeText(context,
                    got ? "Spot ditandai, menunggu sinkron aplikasi" : "Spot dicatat (lokasi menyusul)",
                    Toast.LENGTH_SHORT).show();
        } catch (Exception ignored) {
        }
    }
}
