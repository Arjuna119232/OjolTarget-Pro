import { KmSource, LatLng } from '../types';
import { haversineKm } from './geo';
import { round1 } from './format';

/** Pengali garis lurus -> jarak jalan (rata-rata kota di Indonesia). */
const FAKTOR_JALAN = 1.3;

export interface Jarak {
  km: number;
  src: KmSource;
}

/** Estimasi instan tanpa internet. */
export function estimasiKm(a: LatLng, b: LatLng): Jarak {
  return { km: round1(haversineKm(a, b) * FAKTOR_JALAN), src: 'estimasi' };
}

/**
 * Jarak lewat jalan dari OSRM (gratis, butuh internet). Mengembalikan null
 * jika gagal / timeout, sehingga pemanggil tetap memakai estimasi.
 */
export async function jarakRute(a: LatLng, b: LatLng, timeoutMs = 6000): Promise<Jarak | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), timeoutMs);
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${a.lng.toFixed(6)},${a.lat.toFixed(6)};${b.lng.toFixed(6)},${b.lat.toFixed(6)}` +
      `?overview=false&alternatives=false&steps=false`;
    const resp = await fetch(url, { signal: ctrl?.signal });
    if (!resp.ok) return null;
    const data = await resp.json();
    const meters = data?.routes?.[0]?.distance;
    if (typeof meters !== 'number' || !isFinite(meters)) return null;
    return { km: round1(meters / 1000), src: 'rute' };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
