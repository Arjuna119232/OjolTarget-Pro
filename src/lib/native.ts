/** Jembatan ke MainActivity (Android). Semua pemanggilan aman jika dijalankan di browser biasa. */
interface NativeBridge {
  requestLocation?: () => void;
  vibrate?: (patternJson: string) => void;
  saveBase64File?: (filename: string, base64: string) => void;
  shareText?: (text: string) => void;
  openAppSettings?: () => void;
  setKeepScreenOn?: (on: string) => void;
  setChrome?: (bgHex: string, lightBars: string) => void;
  permissionStatus?: () => string;
  requestNotifications?: () => void;
  requestBatteryOptimizationExemption?: () => void;
  requestStorage?: () => void;
  updateWidget?: (json: string) => void;
  consumeWidgetAction?: () => string;
}

function bridge(): NativeBridge | null {
  if (typeof window === 'undefined') return null;
  const b = (window as unknown as { OjolNative?: NativeBridge }).OjolNative;
  return b && typeof b === 'object' ? b : null;
}

export function isNative(): boolean {
  return bridge() !== null;
}

export function requestLocationPermission(): void {
  try {
    bridge()?.requestLocation?.();
  } catch {
    /* abaikan */
  }
}

export function openAppSettings(): void {
  try {
    bridge()?.openAppSettings?.();
  } catch {
    /* abaikan */
  }
}

export function vibrate(ms = 30): void {
  try {
    const b = bridge();
    if (b?.vibrate) b.vibrate(JSON.stringify([ms]));
    else if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    /* abaikan */
  }
}

export function keepScreenOn(on: boolean): void {
  try {
    bridge()?.setKeepScreenOn?.(on ? 'true' : 'false');
  } catch {
    /* abaikan */
  }
}

/** Samakan warna area status bar/navigasi native dengan tema aplikasi. */
export function setChrome(bgHex: string, lightBars: boolean): void {
  try {
    bridge()?.setChrome?.(bgHex, lightBars ? 'true' : 'false');
  } catch {
    /* abaikan */
  }
}

/** Buka tautan di aplikasi luar (Google Maps, dll). */
export function bukaTautan(url: string): void {
  try {
    window.open(url, '_blank');
  } catch {
    window.location.href = url;
  }
}

export function bukaNavigasi(lat: number, lng: number): void {
  bukaTautan(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=two-wheeler`
  );
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/** Simpan teks sebagai file: ke folder Download di Android, unduhan biasa di browser. */
export function simpanFile(filename: string, text: string, mime: string): boolean {
  try {
    const b = bridge();
    if (b?.saveBase64File) {
      b.saveBase64File(filename, toBase64(text));
      return true;
    }
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch {
    return false;
  }
}

export function bagikanTeks(text: string): void {
  try {
    const b = bridge();
    if (b?.shareText) b.shareText(text);
    else if (navigator.share) void navigator.share({ text });
  } catch {
    /* abaikan */
  }
}

// ---------- Izin ----------

export interface IzinStatus {
  location: boolean;
  notifications: boolean;
  battery: boolean; // true = sudah dikecualikan dari penghematan baterai
  storage: boolean;
}

let lokasiBrowserOk = false;

export function izinStatus(): IzinStatus {
  try {
    const raw = bridge()?.permissionStatus?.();
    if (raw) {
      const j = JSON.parse(raw) as {
        location?: string;
        notifications?: string;
        storage?: string;
        batteryOptimized?: boolean;
      };
      return {
        location: j.location === 'granted',
        notifications: j.notifications === 'granted',
        battery: j.batteryOptimized === false,
        storage: j.storage === 'granted',
      };
    }
  } catch {
    /* jatuh ke nilai bawaan */
  }
  // Di browser biasa (pengujian): hanya lokasi yang bisa diminta.
  return { location: lokasiBrowserOk, notifications: true, battery: true, storage: true };
}

export function mintaIzin(jenis: keyof IzinStatus): void {
  try {
    const b = bridge();
    if (!b) {
      if (jenis === 'location' && navigator.geolocation) {
        const selesai = (ok: boolean) => {
          lokasiBrowserOk = ok;
          notifIzinBerubah();
        };
        navigator.geolocation.getCurrentPosition(() => selesai(true), () => selesai(false), { timeout: 8000 });
      }
      return;
    }
    if (jenis === 'location') b.requestLocation?.();
    else if (jenis === 'notifications') b.requestNotifications?.();
    else if (jenis === 'battery') b.requestBatteryOptimizationExemption?.();
    else b.requestStorage?.();
  } catch {
    /* abaikan */
  }
}

type Pendengar = () => void;
const pendengar = new Set<Pendengar>();

function notifIzinBerubah(): void {
  pendengar.forEach((f) => f());
}

/** Dipanggil native setiap kali dialog izin / layar setelan ditutup. */
export function dengarIzin(f: Pendengar): () => void {
  pendengar.add(f);
  (window as unknown as { __ojolPermsChanged?: () => void }).__ojolPermsChanged = notifIzinBerubah;
  return () => {
    pendengar.delete(f);
  };
}

// ---------- Widget layar utama ----------

export interface WidgetSnapshot {
  terdaftar: boolean;
  fase: 'idle' | 'jemput' | 'antar';
  platform: string;
  nama: string;
  waktuDapat: number;
  hari: string; // yyyy-mm-dd perangkat saat snapshot dibuat
  orderHariIni: number;
  rpHariIni: number;
  target: number;
}

export function kirimWidget(snap: WidgetSnapshot): void {
  try {
    bridge()?.updateWidget?.(JSON.stringify(snap));
  } catch {
    /* abaikan */
  }
}

export function ambilAksiWidget(): string | null {
  try {
    const a = bridge()?.consumeWidgetAction?.();
    return a ? a : null;
  } catch {
    return null;
  }
}
