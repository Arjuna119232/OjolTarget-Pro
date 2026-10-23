import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Clock,
  TrendingUp,
  Award,
  Sparkles,
  FileText,
  Navigation,
  Compass,
} from 'lucide-react';
import { SpotData, DriverProfile, OrderRecord } from '@/types';
import { formatRupiah, formatTanggalIndonesia } from '@/lib/nominatim';
import { exportLaporanOrderPDF } from '@/lib/pdfExport';
import { bukaNavigasiExternal } from '@/lib/geo';

interface StrategiSpotProps {
  spots: SpotData[];
  orders: OrderRecord[];
  profile: DriverProfile | null;
}

const JAM_SLOTS_PRESET = [
  { slot: '06:00-09:00', label: 'Pagi (Berangkat Kerja / Sekolah)', tips: 'Stasiun KRL, Halte Busway, Perumahan Padat' },
  { slot: '09:00-11:00', label: 'Sela Pagi (Antar Dokumen / Paket)', tips: 'Kawasan Perkantoran, Ruko Niaga, Ekspedisi' },
  { slot: '11:00-14:00', label: 'Makan Siang (Gofood / Grabfood / Shopee)', tips: 'Pusat Kuliner, Food Court Mall, Kantin Kantor' },
  { slot: '14:00-17:00', label: 'Sore (Paket & Belanja)', tips: 'Gudang Logistik, Mall, Pusat Grosir Tanah Abang' },
  { slot: '17:00-20:00', label: 'Jam Pulang Kerja (Puncak Orderan)', tips: 'Lobby Gedung Perkantoran, Stasiun MRT/KRL' },
  { slot: '20:00-23:00', label: 'Malam (Food & Hangout)', tips: 'Kuliner Malam, Cafe, Tempat Wisata Kota' },
  { slot: '23:00-06:00', label: 'Kalong & Subuh', tips: 'Pasar Induk, Rumah Sakit, Terminal Bus 24 Jam' },
];

export function StrategiSpot({ spots, orders, profile }: StrategiSpotProps) {
  const [filterPeriod, setFilterPeriod] = useState<'harian' | 'mingguan' | 'bulanan'>('bulanan');

  const now = new Date();
  const startOfPeriod = useMemo(() => {
    if (filterPeriod === 'harian') {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    if (filterPeriod === 'mingguan') {
      return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    }
    // bulanan
    return now.getTime() - 30 * 24 * 60 * 60 * 1000;
  }, [filterPeriod]);

  const filteredOrders = useMemo(
    () => orders.filter((o) => o.timestamp >= startOfPeriod),
    [orders, startOfPeriod]
  );

  // Group by wilayah
  const wilayahStats = useMemo(() => {
    const map: Record<string, { count: number; total: number; spots: string[] }> = {};
    filteredOrders.forEach((o) => {
      const w = o.wilayah || 'Area Lapangan';
      if (!map[w]) map[w] = { count: 0, total: 0, spots: [] };
      map[w].count++;
      map[w].total += o.nominal || 0;
      if (o.namaLokasi && !map[w].spots.includes(o.namaLokasi)) {
        map[w].spots.push(o.namaLokasi);
      }
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [filteredOrders]);

  // Group by jam slot
  const jamStats = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const slot = o.jamGacor || 'Lainnya';
      map[slot] = (map[slot] || 0) + 1;
    });
    return map;
  }, [filteredOrders]);

  const topWilayah = wilayahStats[0];
  const totalTrip = filteredOrders.length;
  const totalNominal = filteredOrders.reduce((s, o) => s + (o.nominal || 0), 0);

  return (
    <div className="space-y-4 pb-14 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            <span>Strategi Spot Gacor & Waktu</span>
          </h2>
          <p className="text-xs text-slate-400">
            Analisis titik jemput favorit, jam ramai pesanan, dan panduan rute
          </p>
        </div>

        <button
          onClick={() => exportLaporanOrderPDF(profile, filteredOrders, filterPeriod)}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export Rekap</span>
        </button>
      </div>

      {/* Period Filter Buttons */}
      <div className="flex gap-2">
        {(['harian', 'mingguan', 'bulanan'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setFilterPeriod(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              filterPeriod === p
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                : 'bg-slate-900 amoled:bg-black text-slate-400 border-slate-800'
            }`}
          >
            {p === 'harian' ? 'Hari Ini' : p === 'mingguan' ? '7 Hari Terakhir' : '30 Hari Terakhir'}
          </button>
        ))}
      </div>

      {/* Highlights 3 Columns */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900/90 amoled:bg-black border border-slate-800 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-400">Total Order</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{totalTrip}</div>
          <div className="text-[10px] text-slate-400 truncate font-mono">
            {formatRupiah(totalNominal)}
          </div>
        </div>

        <div className="bg-slate-900/90 amoled:bg-black border border-slate-800 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-400">Wilayah Favorit</div>
          <div className="text-sm font-bold text-amber-300 mt-1 truncate">
            {topWilayah ? topWilayah[0] : '-'}
          </div>
          <div className="text-[10px] text-slate-400">{topWilayah ? `${topWilayah[1].count} order` : '-'}</div>
        </div>

        <div className="bg-slate-900/90 amoled:bg-black border border-slate-800 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-400">Rata-rata / Trip</div>
          <div className="text-sm font-bold font-mono text-white mt-1">
            {totalTrip > 0 ? formatRupiah(Math.round(totalNominal / totalTrip)) : '-'}
          </div>
          <div className="text-[10px] text-slate-400">bersih driver</div>
        </div>
      </div>

      {/* Wilayah Ranking Distribution */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="text-xs font-bold text-white flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            Sebaran Wilayah Pesanan Anda
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Terurut Frekuensi</span>
        </div>

        {wilayahStats.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-6">
            Belum ada data wilayah tercatat pada periode ini.
          </div>
        ) : (
          <div className="space-y-2.5">
            {wilayahStats.map(([wilayah, data], idx) => {
              const pct = totalTrip > 0 ? Math.round((data.count / totalTrip) * 100) : 0;
              return (
                <div key={wilayah} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      {idx + 1}. {wilayah}
                    </span>
                    <span className="font-mono text-slate-400">
                      {data.count} order ({pct}%) • {formatRupiah(data.total)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {data.spots.length > 0 && (
                    <div className="text-[10px] text-slate-400 truncate pl-3">
                      Top spot: {data.spots.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panduan Jam Gacor & Rekomendasi Mangkal */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="text-xs font-bold text-white flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-sky-400" />
            Panduan Jam Gacor & Rekomendasi Titik Mangkal
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">Ojol Intelligence</span>
        </div>

        <div className="space-y-2 text-xs">
          {JAM_SLOTS_PRESET.map((slot) => {
            const hitCount = Object.entries(jamStats).find(([k]) => k.includes(slot.slot))?.[1] || 0;
            return (
              <div
                key={slot.slot}
                className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 flex items-start justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="text-amber-400 font-mono">{slot.slot}</span>
                    <span>• {slot.label}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    🎯 Rekomendasi Mangkal: <span className="text-slate-300">{slot.tips}</span>
                  </div>
                </div>

                {hitCount > 0 && (
                  <div className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/30 whitespace-nowrap">
                    {hitCount} trip
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
