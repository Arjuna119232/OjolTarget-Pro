export type Platform = 'Grab' | 'Gojek' | 'Maxim' | 'ShopeeFood' | 'InDriver' | 'Lainnya';

export const PLATFORMS: Platform[] = ['Grab', 'Gojek', 'Maxim', 'ShopeeFood', 'InDriver', 'Lainnya'];

export interface LatLng {
  lat: number;
  lng: number;
}

/** Titik GPS hasil kunci lokasi. */
export interface Fix extends LatLng {
  acc: number; // akurasi (meter)
  ts: number;
}

/** Fix + nama lokasi (nama diisi belakangan lewat reverse geocode). */
export interface Place extends Fix {
  nama?: string;
  wilayah?: string;
}

export type KmSource = 'rute' | 'estimasi' | 'manual';

/** Tahap order yang sedang berjalan. */
export type Phase = 'menuju-jemput' | 'menuju-antar';

export interface ActiveOrder {
  id: string;
  platform: Platform;
  phase: Phase;
  waktuDapat: number;
  waktuJemput?: number;
  waktuSelesai?: number; // tombol Order selesai sudah ditekan
  dapat?: Place; // posisi driver saat order masuk
  jemput?: Place; // posisi saat penumpang/barang dijemput
  antar?: Place; // posisi saat order selesai
  kmJemput?: number; // dapat -> jemput
  kmJemputSrc?: KmSource;
  kmAntar?: number; // jemput -> antar
  kmAntarSrc?: KmSource;
}

/** Catatan order selesai. Nama field dipertahankan agar data lama tetap terbaca. */
export interface OrderRecord {
  id: string;
  nominal: number; // pendapatan yang diinput driver secara manual
  platform: Platform;
  timestamp: number; // waktu order selesai
  createdAt: number;
  waktuDapat?: number;
  waktuJemput?: number;
  titikDapatNama?: string;
  titikJemputNama?: string;
  titikAntarNama?: string;
  namaLokasi?: string;
  wilayah?: string;
  jamGacor?: string;
  kmKeJemput?: number;
  kmKeAntar?: number;
  kmTotalTrip?: number;
  tambahan?: number; // hasil tambahan (Rp): tip, bonus, dll.
  catatan?: string;
  manual?: boolean; // dicatat manual (tanpa alur 3 tombol)
  nomorOrder?: string;
  lat?: number;
  lng?: number;
}

export type SpotTipe = 'Spot Gacor' | 'Jemput' | 'Antar';

/** Titik yang tampil di Maps Gacor. */
export interface SpotData {
  id: string;
  lat: number;
  lng: number;
  timestamp: number;
  namaLokasi: string;
  wilayah: string;
  jamGacor: string;
  isEstimasi: boolean;
  nominal?: number;
  platform?: Platform;
  tipe?: SpotTipe;
  orderId?: string;
}

export type Tema = 'gelap' | 'terang' | 'sistem';
export type LapisPeta = 'gelap' | 'standar';

/** Data akun: diisi sekali saat daftar, hanya bisa diubah di Setelan > Akun. */
export interface Akun {
  nama: string;
  platform: Platform;
  lencana: string; // lencana / level akun
  hariOnbid: number; // hari onbid per minggu
  jamOnline: number; // jam online per hari
  targetHarian: number; // target penghasilan per hari (Rp)
  dibuat: number;
}

export interface Settings {
  akun: Akun | null;
  tema: Tema;
  izinSelesai: boolean; // pop up izin sudah ditampilkan
  introSelesai: boolean; // onboarding 3 halaman sudah selesai
}

export type Tab = 'order' | 'maps' | 'riwayat' | 'setelan';

export const STORAGE_KEYS = {
  ORDERS: 'ojol_orders_v3',
  SPOT_DATA: 'ojol_spot_data_v3',
  ACTIVE_ORDER: 'ojol_active_order_v4',
  SETTINGS: 'ojol_settings_v4',
  // kunci lama, hanya dibaca untuk migrasi
  OLD_SETTINGS: 'ojol_user_settings_v3',
  OLD_PROFILE: 'ojol_driver_profile_v3',
} as const;
