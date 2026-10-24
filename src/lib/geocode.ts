import { LatLng } from '../types';

export interface NamaTempat {
  nama: string;
  wilayah: string;
}

const cache = new Map<string, NamaTempat>();
let antrian: Promise<unknown> = Promise.resolve();
let terakhir = 0;
const JEDA_MS = 1100; // batas 1 permintaan/detik dari Nominatim

function kunci(p: LatLng): string {
  return p.lat.toFixed(4) + ',' + p.lng.toFixed(4);
}

export function namaCadangan(p: LatLng): NamaTempat {
  return { nama: `Titik GPS (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`, wilayah: 'Area Lapangan' };
}

/**
 * Nama jalan/wilayah dari koordinat. Dijalankan di latar belakang dan tidak
 * pernah melempar error; tombol di layar tidak boleh menunggu fungsi ini.
 */
export function cariNama(p: LatLng): Promise<NamaTempat> {
  const k = kunci(p);
  const hit = cache.get(k);
  if (hit) return Promise.resolve(hit);

  const job = antrian.then(async () => {
    const again = cache.get(k);
    if (again) return again;

    const wait = JEDA_MS - (Date.now() - terakhir);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    terakhir = Date.now();

    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctrl?.abort(), 7000);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}` +
          `&zoom=18&addressdetails=1&accept-language=id`,
        { signal: ctrl?.signal }
      );
      if (!resp.ok) throw new Error(String(resp.status));
      const data = await resp.json();
      const a = data.address || {};
      const jalan = a.road || a.pedestrian || a.footway || a.path || a.amenity || a.building || '';
      const kelurahan = a.suburb || a.neighbourhood || a.quarter || a.village || '';
      const kecamatan = a.city_district || a.borough || a.subdistrict || '';
      const kota = a.city || a.town || a.municipality || a.county || a.state_district || '';
      const bagian = [jalan, kelurahan].filter(Boolean);
      const nama =
        bagian.join(', ') ||
        String(data.display_name || '')
          .split(',')
          .slice(0, 2)
          .join(',')
          .trim();
      const hasil: NamaTempat = {
        nama: nama || namaCadangan(p).nama,
        wilayah: kecamatan || kota || kelurahan || 'Area Lapangan',
      };
      cache.set(k, hasil);
      return hasil;
    } catch {
      return namaCadangan(p);
    } finally {
      clearTimeout(timer);
    }
  });
  antrian = job.catch(() => undefined);
  return job;
}
