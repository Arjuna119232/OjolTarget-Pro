/** Jembatan ke MainActivity (Android). Semua pemanggilan aman jika dijalankan di browser biasa. */
interface NativeBridge {
  requestLocation?: () => void;
  vibrate?: (patternJson: string) => void;
  saveBase64File?: (filename: string, base64: string) => void;
  shareText?: (text: string) => void;
  openAppSettings?: () => void;
  setKeepScreenOn?: (on: string) => void;
  setChrome?: (bgHex: string, lightBars: string) => void;
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
