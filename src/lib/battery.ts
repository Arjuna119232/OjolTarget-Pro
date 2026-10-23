/**
 * Mode Hemat Daya Adaptif (Adaptive Battery Saver Manager)
 * Mengoptimalkan daya baterai agar driver dapat beroperasi seharian di lapangan.
 * 
 * Karakteristik:
 * 1. AMOLED True Black (#000000) menonaktifkan piksel layar OLED/AMOLED.
 * 2. Mengurangi frekuensi sensor GPS dan interval rendering.
 * 3. Mematikan efek visual berat (blur, transitions, animations).
 * 4. Deteksi otomatis level baterai rendah (<20%).
 */

export interface BatteryInfo {
  supported: boolean;
  levelPct: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  statusText: string;
  isLow: boolean;
}

export type PowerMode = 'normal' | 'hemat' | 'amoled_ekstrem';

let cachedBatteryInfo: BatteryInfo = {
  supported: false,
  levelPct: 85,
  charging: false,
  chargingTime: 0,
  dischargingTime: Infinity,
  statusText: 'Baterai Normal',
  isLow: false,
};

type Listener = (info: BatteryInfo) => void;
const listeners: Set<Listener> = new Set();

export async function initBatteryMonitoring(onUpdate?: Listener): Promise<BatteryInfo> {
  if (onUpdate) listeners.add(onUpdate);

  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const b = await (navigator as any).getBattery();
      const update = () => {
        const levelPct = Math.round(b.level * 100);
        const charging = b.charging;
        const isLow = levelPct <= 20 && !charging;
        
        let statusText = `${levelPct}%`;
        if (charging) statusText += ' (Mengisi Daya)';
        else if (isLow) statusText += ' (Baterai Lemah - Hemat Daya Disarankan)';

        cachedBatteryInfo = {
          supported: true,
          levelPct,
          charging,
          chargingTime: b.chargingTime,
          dischargingTime: b.dischargingTime,
          statusText,
          isLow,
        };

        listeners.forEach((l) => l(cachedBatteryInfo));
      };

      update();
      b.addEventListener('levelchange', update);
      b.addEventListener('chargingchange', update);
    } catch {
      cachedBatteryInfo.supported = false;
    }
  }

  return cachedBatteryInfo;
}

export function getCachedBatteryInfo(): BatteryInfo {
  return cachedBatteryInfo;
}

export function subscribeBattery(listener: Listener): () => void {
  listeners.add(listener);
  listener(cachedBatteryInfo);
  return () => listeners.delete(listener);
}

/**
 * Menerapkan class CSS dan preferensi rendering ke DOM
 */
export function applyAdaptivePowerMode(mode: PowerMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  if (mode === 'amoled_ekstrem') {
    root.classList.add('amoled-mode');
    root.classList.add('reduced-motion');
    body.style.backgroundColor = '#000000';
  } else if (mode === 'hemat') {
    root.classList.remove('amoled-mode');
    root.classList.add('reduced-motion');
    body.style.backgroundColor = '#05070d';
  } else {
    root.classList.remove('amoled-mode');
    root.classList.remove('reduced-motion');
    body.style.backgroundColor = '#090d16';
  }
}
