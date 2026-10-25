import {
  Akun,
  ActiveOrder,
  OrderRecord,
  PLATFORMS,
  Platform,
  Settings,
  SpotData,
  STORAGE_KEYS,
  Tema,
} from '../types';
import { formatJam, pad2, totalOrder } from './format';

/** Awalan lama dipertahankan agar data order & titik dari versi sebelumnya tetap terbaca. */
const PREFIX = 'ojol_target_';

const MAKS_ORDER = 20000;
const MAKS_SPOT = 6000;

function baca<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function tulis(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Gagal menyimpan', key, e);
  }
}

function hapus(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* abaikan */
  }
}

const num = (v: unknown): v is number => typeof v === 'number' && isFinite(v);

function platformValid(p: unknown): Platform {
  return PLATFORMS.includes(p as Platform) ? (p as Platform) : 'Grab';
}

// ---------- Order ----------

function bersihOrder(o: unknown): OrderRecord | null {
  if (!o || typeof o !== 'object') return null;
  const r = o as OrderRecord;
  if (typeof r.id !== 'string' || !num(r.nominal) || !num(r.timestamp)) return null;
  return { ...r, platform: platformValid(r.platform), createdAt: num(r.createdAt) ? r.createdAt : r.timestamp };
}

export function loadOrders(): OrderRecord[] {
  const arr = baca<unknown[]>(STORAGE_KEYS.ORDERS, []);
  return Array.isArray(arr) ? arr.map(bersihOrder).filter((x): x is OrderRecord => !!x) : [];
}

export function saveOrders(orders: OrderRecord[]): void {
  tulis(STORAGE_KEYS.ORDERS, orders.slice(0, MAKS_ORDER));
}

// ---------- Titik Maps Gacor ----------

function bersihSpot(s: unknown): SpotData | null {
  if (!s || typeof s !== 'object') return null;
  const r = s as SpotData;
  if (typeof r.id !== 'string' || !num(r.lat) || !num(r.lng) || !num(r.timestamp)) return null;
  return {
    ...r,
    namaLokasi: r.namaLokasi || 'Titik lapangan',
    wilayah: r.wilayah || 'Area Lapangan',
    jamGacor: r.jamGacor || '',
    isEstimasi: !!r.isEstimasi,
  };
}

export function loadSpots(): SpotData[] {
  const arr = baca<unknown[]>(STORAGE_KEYS.SPOT_DATA, []);
  return Array.isArray(arr) ? arr.map(bersihSpot).filter((x): x is SpotData => !!x) : [];
}

export function saveSpots(spots: SpotData[]): void {
  tulis(STORAGE_KEYS.SPOT_DATA, spots.slice(0, MAKS_SPOT));
}

// ---------- Order berjalan ----------

export function loadActive(): ActiveOrder | null {
  const a = baca<ActiveOrder | null>(STORAGE_KEYS.ACTIVE_ORDER, null);
  if (!a || typeof a !== 'object' || typeof a.id !== 'string' || !num(a.waktuDapat)) return null;
  if (a.phase !== 'menuju-jemput' && a.phase !== 'menuju-antar') return null;
  return { ...a, platform: platformValid(a.platform) };
}

export function saveActive(a: ActiveOrder | null): void {
  if (a) tulis(STORAGE_KEYS.ACTIVE_ORDER, a);
  else hapus(STORAGE_KEYS.ACTIVE_ORDER);
}

// ---------- Setelan & akun ----------

export const DEFAULT_SETTINGS: Settings = { akun: null, tema: 'gelap', izinSelesai: false, introSelesai: false };

function akunValid(a: unknown): Akun | null {
  if (!a || typeof a !== 'object') return null;
  const r = a as Partial<Akun>;
  if (typeof r.nama !== 'string' || !r.nama.trim()) return null;
  if (typeof r.lencana !== 'string' || !r.lencana.trim()) return null;
  if (!num(r.hariOnbid) || !num(r.jamOnline) || !num(r.targetHarian) || r.targetHarian <= 0) return null;
  return {
    nama: r.nama.trim().slice(0, 40),
    platform: platformValid(r.platform),
    lencana: r.lencana.trim().slice(0, 30),
    hariOnbid: Math.min(7, Math.max(1, Math.round(r.hariOnbid))),
    jamOnline: Math.min(24, Math.max(0.5, r.jamOnline)),
    targetHarian: Math.round(r.targetHarian),
    dibuat: num(r.dibuat) ? r.dibuat : Date.now(),
  };
}

function normalSettings(s: Partial<Settings>): Settings {
  const tema: Tema = s.tema === 'terang' || s.tema === 'sistem' ? s.tema : 'gelap';
  return {
    akun: akunValid(s.akun),
    tema,
    izinSelesai: s.izinSelesai === true,
    introSelesai: s.introSelesai === true,
  };
}

export function loadSettings(): Settings {
  const s = baca<Partial<Settings> | null>(STORAGE_KEYS.SETTINGS, null);
  return s && typeof s === 'object' ? normalSettings(s) : { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: Settings): void {
  tulis(STORAGE_KEYS.SETTINGS, s);
}

/** Nama & platform dari versi lama, hanya untuk mengisi awal formulir daftar. */
export function loadLegacy(): { nama: string; platform: Platform } | null {
  const baru = baca<{ nama?: unknown; platform?: unknown } | null>(STORAGE_KEYS.SETTINGS, null);
  const profil = baca<{ nama?: unknown; primaryPlatform?: unknown } | null>(STORAGE_KEYS.OLD_PROFILE, null);
  const nama =
    typeof baru?.nama === 'string' && baru.nama
      ? baru.nama
      : typeof profil?.nama === 'string'
      ? profil.nama
      : '';
  if (!nama) return null;
  return { nama, platform: platformValid(baru?.platform ?? profil?.primaryPlatform) };
}

// ---------- Cadangan ----------

export interface ImporHasil {
  orders: OrderRecord[];
  spots: SpotData[];
  settings?: Settings;
}

export function exportJSON(settings: Settings, orders: OrderRecord[], spots: SpotData[]): string {
  return JSON.stringify(
    { app: 'OjolTarget Pro', version: 3, exportedAt: new Date().toISOString(), settings, orders, spots },
    null,
    2
  );
}

/** Menerima cadangan baru maupun cadangan versi 2.0.0 (orders/spots/settings). */
export function parseImport(teks: string): ImporHasil | null {
  try {
    const b = JSON.parse(teks);
    if (!b || typeof b !== 'object') return null;
    const orders = Array.isArray(b.orders) ? b.orders.map(bersihOrder).filter((x: unknown): x is OrderRecord => !!x) : [];
    const spots = Array.isArray(b.spots) ? b.spots.map(bersihSpot).filter((x: unknown): x is SpotData => !!x) : [];
    if (!orders.length && !spots.length) return null;
    return { orders, spots };
  } catch {
    return null;
  }
}

// ---------- CSV ----------

function sel(v: unknown): string {
  const t = v === undefined || v === null ? '' : String(v);
  return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}

export function ordersToCSV(orders: OrderRecord[]): string {
  const kepala = [
    'Tanggal',
    'Jam',
    'Platform',
    'Pendapatan order (Rp)',
    'Hasil tambahan (Rp)',
    'Total (Rp)',
    'KM ke jemput',
    'KM jemput-antar',
    'Total KM',
    'Titik dapat order',
    'Titik jemput',
    'Titik antar',
    'Catatan',
  ];
  const baris = [...orders]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((o) => {
      const d = new Date(o.timestamp);
      const tgl = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      return [
        tgl,
        formatJam(o.timestamp),
        o.platform,
        o.nominal,
        o.tambahan ?? '',
        totalOrder(o),
        o.kmKeJemput ?? '',
        o.kmKeAntar ?? '',
        o.kmTotalTrip ?? '',
        o.titikDapatNama ?? '',
        o.titikJemputNama ?? o.namaLokasi ?? '',
        o.titikAntarNama ?? '',
        o.catatan ?? '',
      ]
        .map(sel)
        .join(',');
    });
  return '﻿' + [kepala.map(sel).join(','), ...baris].join('\r\n');
}
