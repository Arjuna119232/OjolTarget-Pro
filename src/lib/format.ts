const nfRp = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export function formatRupiah(v: number): string {
  return 'Rp' + nfRp.format(Math.round(v || 0));
}

/** "14400" -> "14.400" (untuk tampilan kolom input). */
export function formatDigits(digits: string): string {
  const d = digits.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return d ? nfRp.format(Number(d)) : '';
}

export function formatKm(v: number | undefined | null, empty = '-'): string {
  if (v === undefined || v === null || !isFinite(v)) return empty;
  return v.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km';
}

/** Terima "3,5" maupun "3.5". */
export function parseDecimal(s: string): number | undefined {
  const t = s.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return isFinite(n) && n >= 0 ? n : undefined;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function formatJam(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDurasi(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(sec)}` : `${pad2(m)}:${pad2(sec)}`;
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatTanggal(ts: number): string {
  const d = new Date(ts);
  const today = startOfDay(Date.now());
  const day = startOfDay(ts);
  if (day === today) return 'Hari ini';
  if (day === today - 86400000) return 'Kemarin';
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Label jam singkat untuk pengelompokan Maps Gacor. */
export function jamSlot(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 6 && h < 9) return '06:00-09:00 (Pagi Berangkat Kerja)';
  if (h >= 9 && h < 11) return '09:00-11:00 (Sela Kantor & Antar Paket)';
  if (h >= 11 && h < 14) return '11:00-14:00 (Jam Makan Siang)';
  if (h >= 14 && h < 17) return '14:00-17:00 (Sore Antar Barang)';
  if (h >= 17 && h < 20) return '17:00-20:00 (Jam Pulang Kantor)';
  if (h >= 20 && h < 23) return '20:00-23:00 (Malam Food & Hangout)';
  return '23:00-06:00 (Subuh & Kalong)';
}

export function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* lanjut ke fallback */
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
