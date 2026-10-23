/**
 * Service & Odometer Synchronization Engine
 * Mengelola sinkronisasi KM kendaraan, riwayat servis bengkel resmi & umum,
 * log perbaikan jangka panjang, dan estimasi biaya perawatan armada ojol.
 */

import {
  ServiceRecord,
  RepairLog,
  ServiceType,
  OJOL_SERVICE_INTERVALS,
  HARIAN_SERVICE_INTERVALS,
  DEFAULT_SERVICE_COSTS,
} from '@/types';

export interface ServiceStatusItem {
  type: ServiceType;
  lastRecord: ServiceRecord | null;
  kmAtServis: number;
  targetKM: number;
  currentKM: number;
  kmSudahJalan: number;    // Sudah berapa KM motor melaju sejak servis terakhir
  kmSisa: number;          // Sisa berapa KM sebelum harus servis lagi (bisa minus bila lewat)
  isOverdue: boolean;      // Terlambat servis
  lewatKM: number;         // Berapa KM sudah terlewat jika terlambat
  pctDipakai: number;      // 0 - 100%
  status: 'AMAN' | 'MENDEKATI' | 'JATUH_TEMPO';
  intervalKM: number;
  estimasiBiaya: number;
  bengkelTerakhir?: string;
  tanggalTerakhir?: string;
}

export function hitungStatusSemuaServis(
  services: ServiceRecord[],
  currentKM: number,
  modeKendaraan: 'Ojol Aktif' | 'Harian Biasa' = 'Ojol Aktif',
  thresholdPeringatanKM = 250
): ServiceStatusItem[] {
  const intervals = modeKendaraan === 'Ojol Aktif' ? OJOL_SERVICE_INTERVALS : HARIAN_SERVICE_INTERVALS;
  const types = Object.keys(intervals) as ServiceType[];

  return types.map((type) => {
    // Ambil record servis terbaru untuk jenis ini
    const filtered = services
      .filter((s) => s.type === type)
      .sort((a, b) => b.kmAtServis - a.kmAtServis || b.createdAt - a.createdAt);

    const last = filtered[0] || null;
    const intervalKM = intervals[type];

    // Jika belum pernah diservis: anggap kmAtServis adalah KM awal (atau 0)
    const kmAtServis = last ? last.kmAtServis : Math.max(0, currentKM - intervalKM + 100);
    const targetKM = last ? last.targetKM : kmAtServis + intervalKM;

    const kmSudahJalan = Math.max(0, currentKM - kmAtServis);
    const kmSisa = targetKM - currentKM;
    const isOverdue = kmSisa <= 0;
    const lewatKM = isOverdue ? Math.abs(kmSisa) : 0;

    let pctDipakai = Math.min(100, Math.round((kmSudahJalan / intervalKM) * 100));
    if (isOverdue) pctDipakai = 100;

    let status: 'AMAN' | 'MENDEKATI' | 'JATUH_TEMPO' = 'AMAN';
    if (isOverdue) {
      status = 'JATUH_TEMPO';
    } else if (kmSisa <= thresholdPeringatanKM) {
      status = 'MENDEKATI';
    }

    // Estimasi biaya berdasarkan riwayat servis sebelumnya untuk tipe ini
    const recordsForType = services.filter((s) => s.type === type && s.totalBiaya > 0);
    let estimasiBiaya = DEFAULT_SERVICE_COSTS[type];
    if (recordsForType.length > 0) {
      const sum = recordsForType.reduce((acc, r) => acc + r.totalBiaya, 0);
      estimasiBiaya = Math.round(sum / recordsForType.length);
    }

    return {
      type,
      lastRecord: last,
      kmAtServis,
      targetKM,
      currentKM,
      kmSudahJalan,
      kmSisa,
      isOverdue,
      lewatKM,
      pctDipakai,
      status,
      intervalKM,
      estimasiBiaya,
      bengkelTerakhir: last?.bengkel,
      tanggalTerakhir: last?.tanggal,
    };
  });
}

/**
 * Servis paling mendesak / terdekat yang butuh perhatian pengemudi
 */
export function getServisPalingMendesak(items: ServiceStatusItem[]): ServiceStatusItem | null {
  if (!items.length) return null;
  // Urutkan dari yang sisa KM paling kecil (termasuk yang minus/overdue paling banyak)
  const sorted = [...items].sort((a, b) => a.kmSisa - b.kmSisa);
  return sorted[0];
}

/**
 * Estimasi total biaya servis yang akan jatuh tempo dalam jangka pendek
 */
export function hitungEstimasiBiayaServisMendatang(items: ServiceStatusItem[]): {
  totalBiayaJatuhTempo: number;
  totalBiayaMendekati: number;
  itemPerluPerhatian: ServiceStatusItem[];
} {
  const itemPerluPerhatian = items.filter((i) => i.status !== 'AMAN');
  const totalBiayaJatuhTempo = items
    .filter((i) => i.status === 'JATUH_TEMPO')
    .reduce((acc, i) => acc + i.estimasiBiaya, 0);

  const totalBiayaMendekati = items
    .filter((i) => i.status === 'MENDEKATI')
    .reduce((acc, i) => acc + i.estimasiBiaya, 0);

  return {
    totalBiayaJatuhTempo,
    totalBiayaMendekati,
    itemPerluPerhatian,
  };
}

/**
 * Menghitung analisis biaya operasional per KM armada
 */
export function hitungAnalisisPerawatan(
  services: ServiceRecord[],
  repairs: RepairLog[],
  totalKM: number
): {
  totalPengeluaranServis: number;
  totalPengeluaranPerbaikan: number;
  totalKeseluruhan: number;
  biayaPerKM: number;
} {
  const totalServis = services.reduce((acc, s) => acc + (s.totalBiaya || 0), 0);
  const totalPerbaikan = repairs.reduce((acc, r) => acc + (r.biaya || 0), 0);
  const totalKeseluruhan = totalServis + totalPerbaikan;
  const biayaPerKM = totalKM > 0 ? Math.round(totalKeseluruhan / totalKM) : 0;

  return {
    totalPengeluaranServis: totalServis,
    totalPengeluaranPerbaikan: totalPerbaikan,
    totalKeseluruhan,
    biayaPerKM,
  };
}
