import { loadOrders, saveOrders, loadSpotData, saveSpotData } from '@/lib/storage';
import { getJamGacorSlot, deteksiWilayah } from '@/lib/nominatim';
import { OrderRecord, SpotData } from '@/types';

interface NativeBridge {
  consumePendingOrders?: () => string;
  consumePendingSpots?: () => string;
  updateWidget?: (json: string) => void;
}

function getBridge(): NativeBridge | null {
  if (typeof window === 'undefined') return null;
  const b = (window as any).OjolNative as NativeBridge | undefined;
  return b && typeof b === 'object' ? b : null;
}

function parseArray<T>(raw: string | undefined): T[] {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Mengimpor order & spot yang dicatat dari widget Android native.
 * Dipanggil pada event __ojolWidgetSync (onResume WebView).
 */
export function syncWidgetData(): { orders: number; spots: number } {
  const bridge = getBridge();
  if (!bridge) return { orders: 0, spots: 0 };

  let orderCount = 0;
  let spotCount = 0;

  const pendingOrders = parseArray<{ amount?: number; platform?: string; ts?: number }>(
    bridge.consumePendingOrders?.()
  );

  if (pendingOrders.length) {
    const existing = loadOrders();
    const mapped: OrderRecord[] = pendingOrders.map((o) => ({
      id: crypto.randomUUID(),
      nominal: o.amount || 10200,
      bersih: Math.round((o.amount || 10200) * 0.8),
      platform: (o.platform as any) || 'Grab',
      timestamp: o.ts || Date.now(),
      createdAt: Date.now(),
    }));
    saveOrders([...mapped, ...existing]);
    orderCount = mapped.length;
  }

  const pendingSpots = parseArray<{ lat?: number; lng?: number; hasLocation?: boolean; ts?: number }>(
    bridge.consumePendingSpots?.()
  );

  if (pendingSpots.length) {
    const existing = loadSpotData();
    const mapped: SpotData[] = pendingSpots
      .filter((s) => s.hasLocation || (s.lat && s.lng))
      .map((s) => {
        const lat = s.lat || 0;
        const lng = s.lng || 0;
        return {
          id: crypto.randomUUID(),
          lat,
          lng,
          timestamp: s.ts || Date.now(),
          namaLokasi: `Tandai dari widget (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          wilayah: deteksiWilayah(lat, lng, ''),
          jamGacor: getJamGacorSlot(s.ts ? new Date(s.ts) : new Date()),
          isEstimasi: true,
        };
      });
    saveSpotData([...mapped, ...existing]);
    spotCount = mapped.length;
  }

  if (orderCount || spotCount) {
    window.dispatchEvent(
      new CustomEvent('ojol-widget-synced', { detail: { orderCount, spotCount } })
    );
  }

  return { orders: orderCount, spots: spotCount };
}

/** Pasang hook global yang dipanggil MainActivity saat onResume. */
export function installWidgetSync(): void {
  if (typeof window === 'undefined') return;
  (window as any).__ojolWidgetSync = () => {
    try {
      return syncWidgetData();
    } catch (e) {
      console.error('Widget sync gagal:', e);
      return { orders: 0, spots: 0 };
    }
  };
}
