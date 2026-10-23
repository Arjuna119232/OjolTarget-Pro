export type PlatformType = 'Grab' | 'Gojek' | 'Maxim' | 'ShopeeFood' | 'InDriver' | 'Lainnya';

export type VehicleType = 'Motor Bebek / Matic' | 'Motor Sport' | 'Mobil Listrik' | 'Mobil Konvensional';

export type WorkshopType = 'Bengkel Resmi (AHASS/Yamaha/dll)' | 'Bengkel Spesialis / Langganan' | 'Servis Mandiri (DIY)' | 'Planet Ban / Shop&Drive';

export type ServiceType = 
  | 'Oli Mesin'
  | 'Oli Gardan'
  | 'Busi'
  | 'V-Belt & Roller'
  | 'Kampas Rem'
  | 'Ban Depan/Belakang'
  | 'Aki'
  | 'Filter Udara'
  | 'Radiator Coolant'
  | 'Servis Berkala / CVT';

export interface ServiceRecord {
  id: string;
  type: ServiceType;
  bengkel: string;
  tipeBengkel: WorkshopType;
  noFaktur?: string;
  kmAtServis: number;       // KM tercatat saat servis dilakukan (input manual struk / aktual)
  targetKM: number;         // KM target servis berikutnya (kmAtServis + interval)
  biayaPart: number;        // Biaya suku cadang (Rp)
  biayaJasa: number;        // Biaya ongkos pasang (Rp)
  totalBiaya: number;       // Total pengeluaran servis (Rp)
  catatan: string;          // Catatan mekanik / merk part
  tanggal: string;          // ISO string
  createdAt: number;
}

export interface RepairLog {
  id: string;
  komponen: string;
  kategori: 'Mesin' | 'Transmisi / CVT' | 'Rem' | 'Kelistrikan' | 'Kaki-kaki / Ban' | 'Bodi / Aksesoris';
  gejala: string;
  tindakan: 'Ganti Baru' | 'Perbaikan / Bubut' | 'Pembersihan / Setel';
  kmPerbaikan: number;
  biaya: number;
  bengkel: string;
  garansiBulan?: number;
  tanggal: string;
  createdAt: number;
}

export interface ServiceSetting {
  type: ServiceType;
  intervalKM: number;
  aktif: boolean;
  estimasiBiayaRataRata: number;
}

export interface RegionalBenchmark {
  daerah: string;
  provinsi: string;
  targetHarianRekomendasi: number;
  rataRataTripHarian: number;
  jamSibuk: string;
  deskripsi: string;
}

export interface DriverProfile {
  nama: string;
  noHp: string;
  platNomor: string;
  tipeKendaraan: VehicleType;
  modelKendaraan: string;
  tahunKendaraan: string;
  platforms: PlatformType[];
  primaryPlatform: PlatformType;
  daerahOperasional: string;
  odometerAwalPaten: number; // Paten baseline odometer kendaraan saat onboarding
  currentKM: number;         // Odometer berjalan kendaraan saat ini
  terakhirUpdateKM: number;  // timestamp update KM manual terakhir
  modeKendaraan: 'Ojol Aktif' | 'Harian Biasa';
  registeredAt: number;
}

export interface ActiveOrderState {
  id: string;
  orderNumber?: string;
  platform: PlatformType;
  customerName?: string;
  nominal: number;           // Pendapatan yang diterima driver (bersih)
  status: 'Diterima' | 'Menuju Titik Jemput' | 'Sudah Jemput' | 'Menuju Titik Antar' | 'Selesai';
  titikJemput?: {
    nama: string;
    lat: number;
    lng: number;
  };
  titikAntar?: {
    nama: string;
    lat: number;
    lng: number;
  };
  kmDapatOrder?: number;     // KM saat klik tombol 'Dapat Orderan'
  kmJemput?: number;         // KM saat klik tombol 'Jemput'
  kmTurunkan?: number;       // KM saat klik tombol 'Turunkan'
  kmKeJemput?: number;       // Detail KM dari dapat orderan ke titik jemput
  kmKeAntar?: number;        // Detail KM dari titik jemput ke titik turunkan
  kmTotalTrip?: number;      // Keseluruhan KM perjalanan trip ini
  waktuMulai: number;
  catatan?: string;
}

export interface OrderRecord {
  id: string;
  nominal: number;           // Pendapatan yang diterima driver (tanpa istilah kotor/potongan)
  platform: PlatformType;
  nomorOrder?: string;
  lat?: number;
  lng?: number;
  namaLokasi?: string;
  titikJemputNama?: string;
  titikAntarNama?: string;
  wilayah?: string;
  jamGacor?: string;
  kmKeJemput?: number;       // Detail KM ke titik jemput
  kmKeAntar?: number;        // Detail KM dari jemput ke antar
  kmTotalTrip?: number;      // Total KM trip
  timestamp: number;
  createdAt: number;
}

export interface WidgetSnapshot {
  todayNet: number;
  target: number;
  platform: string;
  platformName: string;
  quickAmount: number;
  trips: number;
  remaining: number;
  progressPct: number;
  activeStatus: string;
  currentKM: number;
  nextServiceKmRemaining: number;
  nextServiceType: string;
}

export interface InitialServiceInput {
  type: ServiceType;
  kmTerakhirServis: number; // KM saat servis terakhir
  sudahPernah: boolean;
}

export interface OnboardingData {
  nama: string;
  noHp?: string;
  platNomor: string;
  tipeKendaraan: VehicleType;
  modelKendaraan: string;
  platform: PlatformType;
  platforms: PlatformType[];
  daerahOperasional: string;
  odometerAwalPaten: number;
  targetHarian: number;
  initialServices: InitialServiceInput[];
  completed: boolean;
}

export interface TimerOnBidState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  elapsedSeconds: number;
  totalSeconds: number;
  targetJam: number;
  historySessions?: Array<{
    tanggal: string;
    durasiDetik: number;
    status: 'Selesai' | 'Jeda';
  }>;
}

export type GrabLevel = 'Pejuang' | 'Kesatria' | 'Jawara';

export interface LevelTarget {
  hari: number;
  jam: number;
  penyelesaian: number;
  rating: number;
  orderan: number;
}

export interface LevelProgress {
  hari: number;
  jam: number;
  penyelesaian: number;
  rating: number;
  orderan: number;
}

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
  platform?: PlatformType;
  tipe?: 'Jemput' | 'Antar' | 'Spot Gacor';
}

export type Page =
  | 'onboarding'
  | 'cockpit'
  | 'trip'              // Pengganti peta berat: Dashboard 3 Tombol Lapangan
  | 'catat-order'
  | 'riwayat-servis'
  | 'level-grab'
  | 'strategi'
  | 'pengaturan';

export interface UserSettings {
  quickOrderNominal: number;
  platform: PlatformType;
  targetHarian: number;
  daerahOperasional: string;
  themeMode: 'dark' | 'amoled' | 'system';
  adaptiveBatterySaver: boolean;
  highContrastDay: boolean;
  soundAlerts: boolean;
  vibrationAlerts: boolean;
  servisReminderThresholdKM: number;
  smartCacheEnabled: boolean;
  offlineTilesEnabled: boolean;
  autoSyncKMWithOrders: boolean;
  complianceModeVerified: boolean;
}

export const REGIONAL_BENCHMARKS: RegionalBenchmark[] = [
  {
    daerah: 'Jakarta Selatan',
    provinsi: 'DKI Jakarta',
    targetHarianRekomendasi: 280000,
    rataRataTripHarian: 18,
    jamSibuk: '07:00-09:30 & 17:00-20:00',
    deskripsi: 'Kawasan bisnis TB Simatupang, Senopati, Blok M, Kuningan.',
  },
  {
    daerah: 'Jakarta Pusat',
    provinsi: 'DKI Jakarta',
    targetHarianRekomendasi: 300000,
    rataRataTripHarian: 19,
    jamSibuk: '08:00-10:00 & 16:30-19:30',
    deskripsi: 'Sudirman, Thamrin, Tanah Abang, Gambir.',
  },
  {
    daerah: 'Jakarta Barat',
    provinsi: 'DKI Jakarta',
    targetHarianRekomendasi: 260000,
    rataRataTripHarian: 17,
    jamSibuk: '07:00-09:00 & 17:00-20:00',
    deskripsi: 'Grogol, Slipi, Puri Indah, Kebon Jeruk.',
  },
  {
    daerah: 'Jakarta Timur',
    provinsi: 'DKI Jakarta',
    targetHarianRekomendasi: 250000,
    rataRataTripHarian: 16,
    jamSibuk: '06:30-09:00 & 17:00-20:00',
    deskripsi: 'Cawang, PGC Cililitan, Rawamangun, Matraman.',
  },
  {
    daerah: 'Jakarta Utara',
    provinsi: 'DKI Jakarta',
    targetHarianRekomendasi: 260000,
    rataRataTripHarian: 16,
    jamSibuk: '07:30-10:00 & 16:30-19:00',
    deskripsi: 'Kelapa Gading, Pluit, Sunter, Tanjung Priok.',
  },
  {
    daerah: 'Kota Depok & Cibubur',
    provinsi: 'Jawa Barat',
    targetHarianRekomendasi: 230000,
    rataRataTripHarian: 15,
    jamSibuk: '06:00-08:30 & 17:00-20:00',
    deskripsi: 'Margonda, Stasiun UI, Stasiun Pondok Cina, Transyogi.',
  },
  {
    daerah: 'Kota Tangerang & Tangsel (BSD)',
    provinsi: 'Banten',
    targetHarianRekomendasi: 260000,
    rataRataTripHarian: 17,
    jamSibuk: '07:00-09:30 & 17:00-20:00',
    deskripsi: 'BSD City, Bintaro, Alam Sutera, Gading Serpong.',
  },
  {
    daerah: 'Kota & Kab. Bekasi',
    provinsi: 'Jawa Barat',
    targetHarianRekomendasi: 240000,
    rataRataTripHarian: 16,
    jamSibuk: '06:00-09:00 & 17:30-20:30',
    deskripsi: 'Stasiun Bekasi, Summarecon, Harapan Indah, Tambun.',
  },
  {
    daerah: 'Kota Bogor & Sekitarnya',
    provinsi: 'Jawa Barat',
    targetHarianRekomendasi: 220000,
    rataRataTripHarian: 14,
    jamSibuk: '06:30-09:00 & 16:30-19:30',
    deskripsi: 'Stasiun Bogor, Pajajaran, Baranangsiang.',
  },
  {
    daerah: 'Kota Bandung',
    provinsi: 'Jawa Barat',
    targetHarianRekomendasi: 220000,
    rataRataTripHarian: 15,
    jamSibuk: '07:00-09:30 & 16:30-19:30',
    deskripsi: 'Dago, Riau, Buah Batu, Stasiun Bandung.',
  },
  {
    daerah: 'Kota Surabaya',
    provinsi: 'Jawa Timur',
    targetHarianRekomendasi: 250000,
    rataRataTripHarian: 17,
    jamSibuk: '07:00-09:30 & 16:30-19:30',
    deskripsi: 'Tunjungan, Wonokromo, Rungkut, Gubeng.',
  },
  {
    daerah: 'Kota Lainnya (Indonesia)',
    provinsi: 'Nasional',
    targetHarianRekomendasi: 200000,
    rataRataTripHarian: 14,
    jamSibuk: '07:00-09:00 & 16:30-19:00',
    deskripsi: 'Pusat kota, stasiun, terminal, area perkantoran.',
  },
];

export const LEVEL_TARGETS: Record<GrabLevel, LevelTarget> = {
  Pejuang: { hari: 16, jam: 176, penyelesaian: 80, rating: 4.9, orderan: 150 },
  Kesatria: { hari: 22, jam: 200, penyelesaian: 85, rating: 4.9, orderan: 200 },
  Jawara: { hari: 24, jam: 250, penyelesaian: 90, rating: 4.9, orderan: 250 },
};

export const OJOL_SERVICE_INTERVALS: Record<ServiceType, number> = {
  'Oli Mesin': 2000,
  'Oli Gardan': 6000,
  'Busi': 8000,
  'V-Belt & Roller': 15000,
  'Kampas Rem': 10000,
  'Ban Depan/Belakang': 18000,
  'Aki': 20000,
  'Filter Udara': 8000,
  'Radiator Coolant': 12000,
  'Servis Berkala / CVT': 6000,
};

export const HARIAN_SERVICE_INTERVALS: Record<ServiceType, number> = {
  'Oli Mesin': 4000,
  'Oli Gardan': 10000,
  'Busi': 12000,
  'V-Belt & Roller': 24000,
  'Kampas Rem': 15000,
  'Ban Depan/Belakang': 25000,
  'Aki': 30000,
  'Filter Udara': 15000,
  'Radiator Coolant': 20000,
  'Servis Berkala / CVT': 10000,
};

export const DEFAULT_SERVICE_COSTS: Record<ServiceType, number> = {
  'Oli Mesin': 65000,
  'Oli Gardan': 20000,
  'Busi': 35000,
  'V-Belt & Roller': 185000,
  'Kampas Rem': 75000,
  'Ban Depan/Belakang': 280000,
  'Aki': 250000,
  'Filter Udara': 55000,
  'Radiator Coolant': 45000,
  'Servis Berkala / CVT': 120000,
};

export const STORAGE_KEYS = {
  SERVICES: 'ojol_services_v3',
  REPAIRS: 'ojol_repairs_v3',
  SERVICE_SETTINGS: 'ojol_service_settings_v3',
  ORDERS: 'ojol_orders_v3',
  ACTIVE_ORDER: 'ojol_active_order_v3',
  WIDGET_SNAPSHOT: 'ojol_widget_snapshot_v3',
  PROFILE: 'ojol_driver_profile_v3',
  ONBOARDING: 'ojol_onboarding_v3',
  TIMER_ONBID: 'ojol_timer_onbid_v3',
  SPOT_DATA: 'ojol_spot_data_v3',
  USER_SETTINGS: 'ojol_user_settings_v3',
  GEO_CACHE: 'ojol_smart_geo_cache_v3',
} as const;
