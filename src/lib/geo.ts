interface NativeGeoBridge {
  requestLocation?: () => void;
}

export interface GeoLocationResult {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  timestamp: number;
}

let lastKnownPosition: GeoLocationResult | null = null;

export async function getCurrentPositionOnce(
  timeoutMs = 10000,
  highAccuracy = true
): Promise<GeoLocationResult> {
  const bridge = (window as any).OjolNative as NativeGeoBridge | undefined;
  try {
    bridge?.requestLocation?.();
  } catch {
    /* bridge native optional */
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      if (lastKnownPosition) return resolve(lastKnownPosition);
      reject(new Error('Geolocation tidak didukung oleh perangkat ini'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const res: GeoLocationResult = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          timestamp: pos.timestamp || Date.now(),
        };
        lastKnownPosition = res;
        resolve(res);
      },
      (err) => {
        if (lastKnownPosition) {
          // Fallback ke posisi terakhir jika timeout
          return resolve(lastKnownPosition);
        }
        reject(new Error(err.message || 'Gagal mengambil sinyal GPS'));
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: 15000,
      }
    );
  });
}

export function getLastKnownLocation(): GeoLocationResult | null {
  return lastKnownPosition;
}

/**
 * Membuka navigasi belokan-demi-belokan (Turn-by-Turn) ke aplikasi peta pilihan driver
 */
export function bukaNavigasiExternal(
  lat: number,
  lng: number,
  namaLabel = 'Tujuan',
  app: 'google_maps' | 'waze' = 'google_maps'
) {
  if (app === 'waze') {
    const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    window.open(url, '_blank');
  } else {
    // Mode two-wheeler (sepeda motor) default di Google Maps Indonesia
    const labelEncoded = encodeURIComponent(namaLabel);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=two-wheeler`;
    window.open(url, '_blank');
  }
}
