import {
  STORAGE_KEYS,
  DriverProfile,
  ServiceRecord,
  RepairLog,
  ServiceSetting,
  OrderRecord,
  ActiveOrderState,
  WidgetSnapshot,
  UserSettings,
  TimerOnBidState,
  SpotData,
  OnboardingData,
  OJOL_SERVICE_INTERVALS,
  DEFAULT_SERVICE_COSTS,
} from '@/types';

const STORAGE_PREFIX = 'ojol_target_';

export function getKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(getKey(key));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getKey(key), JSON.stringify(value));
  } catch (e) {
    console.error(`Gagal menyimpan ${key}:`, e);
  }
}

export function removeJSON(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getKey(key));
}

// ----------------- DRIVER PROFILE -----------------

export function loadDriverProfile(): DriverProfile | null {
  return loadJSON<DriverProfile | null>(STORAGE_KEYS.PROFILE, null);
}

export function saveDriverProfile(profile: DriverProfile): void {
  saveJSON(STORAGE_KEYS.PROFILE, profile);
  // sync widget snapshot as well
  syncWidgetSnapshotFromState();
}

// ----------------- ONBOARDING -----------------

export function loadOnboarding(): OnboardingData | null {
  return loadJSON<OnboardingData | null>(STORAGE_KEYS.ONBOARDING, null);
}

export function saveOnboarding(data: OnboardingData): void {
  saveJSON(STORAGE_KEYS.ONBOARDING, data);
}

// ----------------- SERVICE RECORDS -----------------

export function loadServices(): ServiceRecord[] {
  return loadJSON<ServiceRecord[]>(STORAGE_KEYS.SERVICES, []);
}

export function saveServices(services: ServiceRecord[]): void {
  saveJSON(STORAGE_KEYS.SERVICES, services);
  syncWidgetSnapshotFromState();
}

// ----------------- REPAIR LOGS (LOG RIWAYAT PERBAIKAN) -----------------

export function loadRepairLogs(): RepairLog[] {
  return loadJSON<RepairLog[]>(STORAGE_KEYS.REPAIRS, []);
}

export function saveRepairLogs(repairs: RepairLog[]): void {
  saveJSON(STORAGE_KEYS.REPAIRS, repairs);
}

// ----------------- SERVICE SETTINGS -----------------

export function loadServiceSettings(): ServiceSetting[] {
  const defaults: ServiceSetting[] = (Object.keys(OJOL_SERVICE_INTERVALS) as import('@/types').ServiceType[]).map((t) => ({
    type: t,
    intervalKM: OJOL_SERVICE_INTERVALS[t],
    aktif: true,
    estimasiBiayaRataRata: DEFAULT_SERVICE_COSTS[t],
  }));
  return loadJSON<ServiceSetting[]>(STORAGE_KEYS.SERVICE_SETTINGS, defaults);
}

export function saveServiceSettings(settings: ServiceSetting[]): void {
  saveJSON(STORAGE_KEYS.SERVICE_SETTINGS, settings);
}

// ----------------- ORDERS -----------------

export function loadOrders(): OrderRecord[] {
  return loadJSON<OrderRecord[]>(STORAGE_KEYS.ORDERS, []);
}

export function saveOrders(orders: OrderRecord[]): void {
  saveJSON(STORAGE_KEYS.ORDERS, orders);
  syncWidgetSnapshotFromState();
}

// ----------------- ACTIVE ORDER STATE -----------------

export function loadActiveOrder(): ActiveOrderState | null {
  return loadJSON<ActiveOrderState | null>(STORAGE_KEYS.ACTIVE_ORDER, null);
}

export function saveActiveOrder(active: ActiveOrderState | null): void {
  if (active === null) {
    removeJSON(STORAGE_KEYS.ACTIVE_ORDER);
  } else {
    saveJSON(STORAGE_KEYS.ACTIVE_ORDER, active);
  }
  syncWidgetSnapshotFromState();
}

// ----------------- USER SETTINGS -----------------

export const DEFAULT_USER_SETTINGS: UserSettings = {
  quickOrderNominal: 10200,
  platform: 'Grab',
  targetHarian: 250000,
  daerahOperasional: 'Jakarta Selatan',
  themeMode: 'dark',
  adaptiveBatterySaver: true,
  highContrastDay: false,
  soundAlerts: true,
  vibrationAlerts: true,
  servisReminderThresholdKM: 250,
  smartCacheEnabled: true,
  offlineTilesEnabled: true,
  autoSyncKMWithOrders: true,
  complianceModeVerified: true,
};

export function loadUserSettings(): UserSettings {
  return loadJSON<UserSettings>(STORAGE_KEYS.USER_SETTINGS, DEFAULT_USER_SETTINGS);
}

export function saveUserSettings(settings: UserSettings): void {
  saveJSON(STORAGE_KEYS.USER_SETTINGS, settings);
}

// ----------------- TIMER ON-BID -----------------

export function loadTimerOnBid(): TimerOnBidState {
  return loadJSON<TimerOnBidState>(STORAGE_KEYS.TIMER_ONBID, {
    isRunning: false,
    isPaused: false,
    startTime: null,
    elapsedSeconds: 0,
    totalSeconds: 0,
    targetJam: 250,
  });
}

export function saveTimerOnBid(state: TimerOnBidState): void {
  saveJSON(STORAGE_KEYS.TIMER_ONBID, state);
}

// ----------------- SPOT DATA -----------------

export function loadSpotData(): SpotData[] {
  return loadJSON<SpotData[]>(STORAGE_KEYS.SPOT_DATA, []);
}

export function saveSpotData(spots: SpotData[]): void {
  saveJSON(STORAGE_KEYS.SPOT_DATA, spots);
}

// ----------------- WIDGET SNAPSHOT -----------------

export function loadWidgetSnapshot(): WidgetSnapshot | null {
  return loadJSON<WidgetSnapshot | null>(STORAGE_KEYS.WIDGET_SNAPSHOT, null);
}

export function saveWidgetSnapshot(snap: WidgetSnapshot): void {
  saveJSON(STORAGE_KEYS.WIDGET_SNAPSHOT, snap);

  // Sync to Native Android if running inside WebView
  if (typeof window !== 'undefined' && (window as any).OjolNative?.updateWidget) {
    try {
      (window as any).OjolNative.updateWidget(JSON.stringify(snap));
    } catch (e) {
      console.warn('Native widget update failed:', e);
    }
  }
}

/**
 * Otomatis menyinkronkan data snapshot widget dari state tersimpan saat ini
 */
export function syncWidgetSnapshotFromState(): WidgetSnapshot {
  const profile = loadDriverProfile();
  const settings = loadUserSettings();
  const orders = loadOrders();
  const services = loadServices();
  const activeOrder = loadActiveOrder();

  // Hitung pendapatan bersih hari ini
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.getTime();

  const todayOrders = orders.filter((o) => o.timestamp >= startOfDay);
  const todayNet = todayOrders.reduce((sum, o) => sum + (o.nominal || 0), 0);
  const target = settings.targetHarian || 250000;
  const trips = todayOrders.length;
  const remaining = Math.max(0, target - todayNet);
  const progressPct = target > 0 ? Math.min(100, Math.round((todayNet / target) * 100)) : 0;

  // Servis terdekat
  const currentKM = profile?.currentKM || 0;
  let minSisa = Infinity;
  let nextServiceType = 'Oli Mesin';

  for (const s of services) {
    const sisa = s.targetKM - currentKM;
    if (sisa < minSisa) {
      minSisa = sisa;
      nextServiceType = s.type;
    }
  }

  const snapshot: WidgetSnapshot = {
    todayNet,
    target,
    platform: profile?.primaryPlatform || settings.platform || 'Grab',
    platformName: profile?.nama || 'Mitra Ojol',
    quickAmount: settings.quickOrderNominal || 10200,
    trips,
    remaining,
    progressPct,
    activeStatus: activeOrder ? `${activeOrder.status} (${activeOrder.platform})` : 'Standby / On-Bid',
    currentKM,
    nextServiceKmRemaining: minSisa === Infinity ? 2000 : minSisa,
    nextServiceType,
  };

  saveWidgetSnapshot(snapshot);
  return snapshot;
}

// ----------------- BACKUP & RESTORE -----------------

export function exportAllDataJSON(): string {
  const bundle = {
    profile: loadDriverProfile(),
    settings: loadUserSettings(),
    services: loadServices(),
    repairs: loadRepairLogs(),
    orders: loadOrders(),
    spots: loadSpotData(),
    timer: loadTimerOnBid(),
    exportedAt: new Date().toISOString(),
    version: '2.0.0',
  };
  return JSON.stringify(bundle, null, 2);
}

export function importAllDataJSON(jsonStr: string): boolean {
  try {
    const bundle = JSON.parse(jsonStr);
    if (bundle.profile) saveDriverProfile(bundle.profile);
    if (bundle.settings) saveUserSettings(bundle.settings);
    if (Array.isArray(bundle.services)) saveServices(bundle.services);
    if (Array.isArray(bundle.repairs)) saveRepairLogs(bundle.repairs);
    if (Array.isArray(bundle.orders)) saveOrders(bundle.orders);
    if (Array.isArray(bundle.spots)) saveSpotData(bundle.spots);
    if (bundle.timer) saveTimerOnBid(bundle.timer);
    syncWidgetSnapshotFromState();
    return true;
  } catch (err) {
    console.error('Import failed:', err);
    return false;
  }
}
