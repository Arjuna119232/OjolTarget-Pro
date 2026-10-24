import { ActiveOrder, Place, SpotData, SpotTipe } from '../types';
import { jamSlot, uid } from './format';

export type Periode = 'hari' | '7' | '30' | 'semua';

export interface FilterSpot {
  periode: Periode;
  tipe: SpotTipe;
  jamIni: boolean; // hanya jam yang sama dengan sekarang (±1 jam)
}

export interface Cell {
  key: string;
  lat: number;
  lng: number;
  count: number;
  total: number; // total pendapatan order yang terkait (Rp)
  nominalCount: number;
  avg: number; // rata-rata pendapatan per order (Rp)
  nama: string;
  wilayah: string;
  terakhir: number;
  jamTerbanyak: number; // jam (0-23) paling sering
}

const CELL_DEG = 0.0025; // ± 275 m

function mulaiPeriode(p: Periode): number {
  const now = Date.now();
  if (p === 'hari') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (p === '7') return now - 7 * 86400000;
  if (p === '30') return now - 30 * 86400000;
  return 0;
}

function selisihJam(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 24 - d);
}

export function saring(spots: SpotData[], f: FilterSpot): SpotData[] {
  const dari = mulaiPeriode(f.periode);
  const jamNow = new Date().getHours();
  return spots.filter((s) => {
    if ((s.tipe ?? 'Spot Gacor') !== f.tipe) return false;
    if (s.timestamp < dari) return false;
    if (f.jamIni && selisihJam(new Date(s.timestamp).getHours(), jamNow) > 1) return false;
    return true;
  });
}

export function gabungkan(spots: SpotData[]): Cell[] {
  const map = new Map<
    string,
    { items: SpotData[]; sumLat: number; sumLng: number; jam: number[] }
  >();
  for (const s of spots) {
    const k = `${Math.floor(s.lat / CELL_DEG)}:${Math.floor(s.lng / CELL_DEG)}`;
    let g = map.get(k);
    if (!g) {
      g = { items: [], sumLat: 0, sumLng: 0, jam: new Array(24).fill(0) };
      map.set(k, g);
    }
    g.items.push(s);
    g.sumLat += s.lat;
    g.sumLng += s.lng;
    g.jam[new Date(s.timestamp).getHours()]++;
  }

  const cells: Cell[] = [];
  for (const [key, g] of map) {
    const n = g.items.length;
    const withNominal = g.items.filter((s) => (s.nominal ?? 0) > 0);
    const total = withNominal.reduce((a, s) => a + (s.nominal ?? 0), 0);
    // Nama dipilih dari catatan terbaru yang bukan koordinat mentah.
    const urut = [...g.items].sort((a, b) => b.timestamp - a.timestamp);
    const bernama = urut.find((s) => s.namaLokasi && !s.namaLokasi.startsWith('Titik GPS'));
    const ref = bernama ?? urut[0];
    let jamTop = 0;
    g.jam.forEach((c, h) => {
      if (c > g.jam[jamTop]) jamTop = h;
    });
    cells.push({
      key,
      lat: g.sumLat / n,
      lng: g.sumLng / n,
      count: n,
      total,
      nominalCount: withNominal.length,
      avg: withNominal.length ? total / withNominal.length : 0,
      nama: ref.namaLokasi || 'Titik lapangan',
      wilayah: ref.wilayah || 'Area Lapangan',
      terakhir: urut[0].timestamp,
      jamTerbanyak: jamTop,
    });
  }
  return cells.sort((a, b) => b.count - a.count || b.total - a.total || b.terakhir - a.terakhir);
}

function spotDari(
  tipe: SpotTipe,
  place: Place,
  orderId: string,
  nominal: number,
  platform: ActiveOrder['platform'],
  waktu: number
): SpotData {
  return {
    id: uid(),
    lat: place.lat,
    lng: place.lng,
    timestamp: waktu,
    namaLokasi: place.nama || `Titik GPS (${place.lat.toFixed(4)}, ${place.lng.toFixed(4)})`,
    wilayah: place.wilayah || 'Area Lapangan',
    jamGacor: jamSlot(new Date(waktu)),
    isEstimasi: place.acc > 60,
    nominal,
    platform,
    tipe,
    orderId,
  };
}

/**
 * Titik yang masuk Maps Gacor saat order selesai:
 *  - Spot Gacor = tempat driver berada ketika order masuk (lokasi mangkal yang "hidup")
 *  - Jemput / Antar = titik penjemputan & tujuan
 */
export function buatSpotOrder(
  a: ActiveOrder,
  orderId: string,
  nominal: number,
  waktuSelesai: number
): SpotData[] {
  const out: SpotData[] = [];
  if (a.dapat) out.push(spotDari('Spot Gacor', a.dapat, orderId, nominal, a.platform, a.waktuDapat));
  if (a.jemput) {
    out.push(spotDari('Jemput', a.jemput, orderId, nominal, a.platform, a.waktuJemput ?? waktuSelesai));
  }
  if (a.antar) out.push(spotDari('Antar', a.antar, orderId, nominal, a.platform, waktuSelesai));
  return out;
}
