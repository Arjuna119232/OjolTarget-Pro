import { Fix, LatLng } from '../types';
import { requestLocationPermission } from './native';

/** Jarak garis lurus (km) antara dua titik. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface FixOptions {
  /** Batas waktu menunggu sinyal (ms). */
  timeout?: number;
  /** Akurasi (m) yang dianggap cukup baik untuk langsung dipakai. */
  good?: number;
  onProgress?: (acc: number) => void;
}

let terakhir: Fix | null = null;

function pesanError(code: number): string {
  if (code === 1) return 'Izin lokasi ditolak. Aktifkan lewat Setelan > Setelan Android.';
  if (code === 2) return 'Sinyal GPS belum tersedia. Coba di tempat terbuka.';
  return 'GPS terlalu lama merespons.';
}

/**
 * Mengunci posisi: mendengarkan GPS sampai akurasi cukup baik atau waktu habis,
 * lalu memakai hasil terbaik. Tidak pernah menggantung lebih dari `timeout` + 5 dtk.
 */
export function getFix(opts: FixOptions = {}): Promise<Fix> {
  const timeout = opts.timeout ?? 12000;
  const good = opts.good ?? 30;

  // Posisi yang sangat segar & akurat dipakai langsung (menghindari tunggu ulang).
  if (terakhir && Date.now() - terakhir.ts < 2500 && terakhir.acc <= good) {
    return Promise.resolve(terakhir);
  }

  return new Promise<Fix>((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Perangkat tidak mendukung GPS.'));
      return;
    }
    requestLocationPermission();

    let best: Fix | null = null;
    let lastCode = 3;
    let done = false;
    let watchId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const stop = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timer) clearTimeout(timer);
    };
    const ok = (f: Fix) => {
      if (done) return;
      done = true;
      stop();
      terakhir = f;
      resolve(f);
    };
    const gagal = (code: number) => {
      if (done) return;
      done = true;
      stop();
      reject(new Error(pesanError(code)));
    };

    const cadangan = () => {
      if (best) return ok(best);
      if (terakhir && Date.now() - terakhir.ts < 120000) return ok(terakhir);
      // Upaya terakhir: posisi jaringan / cache sistem.
      navigator.geolocation.getCurrentPosition(
        (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, ts: Date.now() }),
        (e) => gagal(e.code || lastCode),
        { enableHighAccuracy: false, maximumAge: 120000, timeout: 5000 }
      );
    };

    watchId = navigator.geolocation.watchPosition(
      (p) => {
        const f: Fix = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          acc: p.coords.accuracy,
          ts: Date.now(),
        };
        if (!best || f.acc <= best.acc) best = f;
        opts.onProgress?.(best.acc);
        if (best.acc <= good) ok(best);
      },
      (e) => {
        lastCode = e.code;
        if (e.code === 1) gagal(1); // ditolak: tidak ada gunanya menunggu
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeout }
    );
    timer = setTimeout(cadangan, timeout);
  });
}
