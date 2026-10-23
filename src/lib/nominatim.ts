import { smartCache } from './cache';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'OjolTargetPro/2.0.0 (driver-companion@ojoltarget.pro)';
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1100; // 1 request per detik rate limit compliance

export interface ReverseGeoResult {
  nama: string;
  wilayah: string;
  isEstimasi: boolean;
  displayName: string;
  fromCache?: boolean;
}

export async function getNamaLokasi(lat: number, lng: number): Promise<ReverseGeoResult> {
  const cacheKey = smartCache.makeGeoKey(lat, lng);
  const cached = smartCache.get<ReverseGeoResult>(cacheKey);

  if (cached) {
    return { ...cached, fromCache: true };
  }

  // Rate limiting to respect OpenStreetMap Nominatim TOS
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastRequestTime);
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastRequestTime = Date.now();

  try {
    const resp = await fetch(
      `${NOMINATIM_BASE}?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id`,
      {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(6500),
      }
    );

    if (!resp.ok) throw new Error(`Nominatim error: ${resp.status}`);
    const data = await resp.json();
    lastRequestTime = Date.now();

    const addr = data.address || {};
    const jalan = addr.road || addr.street || addr.pedestrian || addr.highway || '';
    const kelurahan = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || '';
    const kecamatan = addr.city_district || addr.borough || addr.subdistrict || '';
    const kota = addr.city || addr.municipality || addr.town || addr.county || '';

    let nama = '';
    if (jalan) nama += jalan;
    if (kelurahan) nama += (nama ? ', ' : '') + kelurahan;
    if (kecamatan) nama += (nama ? ', ' : '') + kecamatan;
    if (!nama) nama = data.display_name?.split(',').slice(0, 3).join(',') || `Lokasi (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    const wilayah = deteksiWilayah(lat, lng, kota);

    const result: ReverseGeoResult = {
      nama: nama.trim() || 'Lokasi Terdeteksi',
      wilayah,
      isEstimasi: false,
      displayName: data.display_name || nama,
      fromCache: false,
    };

    // Simpan ke Smart Cache lokal
    smartCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Nominatim reverse geo offline / timeout, fallback estimasi:', err);
    const wilayah = deteksiWilayah(lat, lng, '');
    const fallback: ReverseGeoResult = {
      nama: `Titik GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      wilayah,
      isEstimasi: true,
      displayName: `Area Sekitar: ${wilayah}`,
      fromCache: false,
    };
    return fallback;
  }
}

// Bounding box DKI Jakarta & Sekitarnya
const JAKARTA_BBOX = {
  latMin: -6.40,
  latMax: -6.05,
  lngMin: 106.65,
  lngMax: 107.05,
};

const JAKARTA_WILAYAH_MAP: Record<string, string> = {
  'Kota Jakarta Selatan': 'Jaksel',
  'Jakarta Selatan': 'Jaksel',
  'Kota Jakarta Barat': 'Jakbar',
  'Jakarta Barat': 'Jakbar',
  'Kota Jakarta Pusat': 'Jakpus',
  'Jakarta Pusat': 'Jakpus',
  'Kota Jakarta Timur': 'Jaktim',
  'Jakarta Timur': 'Jaktim',
  'Kota Jakarta Utara': 'Jakut',
  'Jakarta Utara': 'Jakut',
  'Kota Depok': 'Depok / Bodetabek',
  'Kota Tangerang': 'Tangerang',
  'Kota Tangerang Selatan': 'Tangsel',
  'Kota Bekasi': 'Bekasi',
  'Kabupaten Bogor': 'Bogor',
};

export function deteksiWilayah(lat: number, lng: number, kota: string): string {
  if (kota && JAKARTA_WILAYAH_MAP[kota]) {
    return JAKARTA_WILAYAH_MAP[kota];
  }

  for (const [key, val] of Object.entries(JAKARTA_WILAYAH_MAP)) {
    if (kota.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }

  if (
    lat >= JAKARTA_BBOX.latMin &&
    lat <= JAKARTA_BBOX.latMax &&
    lng >= JAKARTA_BBOX.lngMin &&
    lng <= JAKARTA_BBOX.lngMax
  ) {
    const latMid = (JAKARTA_BBOX.latMin + JAKARTA_BBOX.latMax) / 2;
    const lngMid = (JAKARTA_BBOX.lngMin + JAKARTA_BBOX.lngMax) / 2;
    const isSouth = lat < latMid; // more negative = south
    const isEast = lng > lngMid;
    if (isSouth && isEast) return 'Jaktim / Depok';
    if (isSouth && !isEast) return 'Jaksel / Tangsel';
    if (!isSouth && isEast) return 'Jakut / Bekasi';
    if (!isSouth && !isEast) return 'Jakbar';
  }

  return 'Area Lapangan';
}

export function getJamGacorSlot(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 6 && h < 9) return '06:00-09:00 (Pagi Berangkat Kerja)';
  if (h >= 9 && h < 11) return '09:00-11:00 (Sela Kantor & Antar Paket)';
  if (h >= 11 && h < 14) return '11:00-14:00 (Jam Makan Siang)';
  if (h >= 14 && h < 17) return '14:00-17:00 (Sore Antar Barang)';
  if (h >= 17 && h < 20) return '17:00-20:00 (Jam Pulang Kantor)';
  if (h >= 20 && h < 23) return '20:00-23:00 (Malam Food & Hangout)';
  return '23:00-06:00 (Subuh & Kalong)';
}

export function formatRupiah(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export function formatKM(val: number): string {
  return `${(val || 0).toLocaleString('id-ID')} KM`;
}

export function formatTanggalIndonesia(isoStr: string | number | Date): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}
