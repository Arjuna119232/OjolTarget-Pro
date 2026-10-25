package com.ojoltarget.pro;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Widget layar utama "Siap menerima order": kartu yang sama dengan di aplikasi, dengan
 * tiga tombol (Dapat, Jemput, Selesai). Hanya tombol tahap yang sedang berlaku yang aktif.
 * Mengetuk tombol membuka aplikasi dan menjalankan aksi itu (GPS dikunci oleh aplikasi).
 * Tampilan diperbarui aplikasi lewat OjolNative.updateWidget setiap status berubah.
 */
public class WidgetProvider extends AppWidgetProvider {
    static final String PREFS = "ojol_widget";
    static final String KEY_SNAPSHOT = "snapshot";
    static final String EXTRA_ACTION = "widget_action";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, build(context));
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
        return "Rp" + String.format(new Locale("id", "ID"), "%,d", value);
    }

    private static PendingIntent open(Context context, int code, String action) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (action != null) {
            intent.putExtra(EXTRA_ACTION, action);
        }
        return PendingIntent.getActivity(context, code, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void style(RemoteViews v, int id, boolean on, int onBg) {
        v.setInt(id, "setBackgroundResource", on ? onBg : R.drawable.widget_btn_off);
        v.setTextColor(id, on ? 0xFFFFFFFF : 0xFF64748B);
    }

    private static RemoteViews build(Context context) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_order);
        JSONObject snap = readSnapshot(context);
        PendingIntent buka = open(context, 0, null);
        v.setOnClickPendingIntent(R.id.widget_root, buka);

        boolean terdaftar = snap != null && snap.optBoolean("terdaftar", false);
        if (!terdaftar) {
            v.setTextViewText(R.id.widget_platform, "");
            v.setTextViewText(R.id.widget_status, "Siap menerima order");
            v.setTextViewText(R.id.widget_sub, "Buka aplikasi untuk mendaftar dulu");
            style(v, R.id.widget_btn_dapat, false, 0);
            style(v, R.id.widget_btn_jemput, false, 0);
            style(v, R.id.widget_btn_selesai, false, 0);
            v.setOnClickPendingIntent(R.id.widget_btn_dapat, buka);
            v.setOnClickPendingIntent(R.id.widget_btn_jemput, buka);
            v.setOnClickPendingIntent(R.id.widget_btn_selesai, buka);
            return v;
        }

        String fase = snap.optString("fase", "idle");
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        boolean hariSama = today.equals(snap.optString("hari", ""));
        int orders = hariSama ? snap.optInt("orderHariIni", 0) : 0;
        long rp = hariSama ? snap.optLong("rpHariIni", 0) : 0;
        long target = snap.optLong("target", 0);

        v.setTextViewText(R.id.widget_platform, snap.optString("platform", ""));
        if ("jemput".equals(fase)) {
            v.setTextViewText(R.id.widget_status, "Menuju titik jemput");
        } else if ("antar".equals(fase)) {
            v.setTextViewText(R.id.widget_status, "Menuju titik antar");
        } else {
            v.setTextViewText(R.id.widget_status, "Siap menerima order");
        }

        String sub;
        long mulai = snap.optLong("waktuDapat", 0);
        if (!"idle".equals(fase) && mulai > 0) {
            sub = "Mulai " + new SimpleDateFormat("HH:mm", Locale.US).format(new Date(mulai));
        } else {
            sub = orders + " order · " + rupiah(rp);
            if (target > 0) {
                sub += " · " + Math.min(100, rp * 100 / target) + "% target";
            }
        }
        v.setTextViewText(R.id.widget_sub, sub);

        style(v, R.id.widget_btn_dapat, "idle".equals(fase), R.drawable.widget_btn_green);
        style(v, R.id.widget_btn_jemput, "jemput".equals(fase), R.drawable.widget_btn_amber);
        style(v, R.id.widget_btn_selesai, "antar".equals(fase), R.drawable.widget_btn_blue);

        v.setOnClickPendingIntent(R.id.widget_btn_dapat,
                "idle".equals(fase) ? open(context, 1, "dapat") : buka);
        v.setOnClickPendingIntent(R.id.widget_btn_jemput,
                "jemput".equals(fase) ? open(context, 2, "jemput") : buka);
        v.setOnClickPendingIntent(R.id.widget_btn_selesai,
                "antar".equals(fase) ? open(context, 3, "selesai") : buka);
        return v;
    }
}
