import React, { useState, useMemo } from 'react';
import {
  Award,
  Trophy,
  Target,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { GrabLevel, LEVEL_TARGETS, OrderRecord, TimerOnBidState } from '@/types';
import {
  computeLevelProgress,
  getLevelColor,
  getProgressColor,
  getLevelIndicatorColor,
  hitungSisaHari,
} from '@/lib/level';

interface LevelGrabProps {
  orders: OrderRecord[];
  timer: TimerOnBidState;
}

export function LevelGrab({ orders, timer }: LevelGrabProps) {
  const [level, setLevel] = useState<GrabLevel>('Kesatria');
  const [rating, setRating] = useState('4.94');
  const [penyelesaian, setPenyelesaian] = useState('92');

  // Hitung otomatis data penggunaan bulan berjalan yang sinkron dengan Cockpit
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const monthOrders = useMemo(
    () => orders.filter((o) => o.timestamp >= startOfMonth),
    [orders, startOfMonth]
  );

  // Hitung jumlah hari aktif bulan ini
  const uniqueActiveDays = useMemo(() => {
    const daySet = new Set<string>();
    monthOrders.forEach((o) => {
      const d = new Date(o.timestamp);
      daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return Math.max(1, daySet.size);
  }, [monthOrders]);

  // Jam online sinkron dari total timer on-bid
  const actualJamOnline = Math.max(1, Math.round((timer.totalSeconds || 0) / 3600));
  const actualOrderan = monthOrders.length;

  const current = {
    hariOnline: uniqueActiveDays,
    jamOnline: actualJamOnline,
    penyelesaian: parseFloat(penyelesaian) || 90,
    rating: parseFloat(rating) || 4.9,
    orderan: actualOrderan,
  };

  const progress = computeLevelProgress(level, current);
  const colorStatus = getLevelIndicatorColor(level, progress, current);
  const sisaHari = hitungSisaHari();
  const target = LEVEL_TARGETS[level];

  // Hitung kekurangan target per hari
  const sisaOrderan = Math.max(0, target.orderan - current.orderan);
  const sisaJam = Math.max(0, target.jam - current.jamOnline);
  const orderPerHari = sisaHari > 0 ? (sisaOrderan / sisaHari).toFixed(1) : sisaOrderan.toString();
  const jamPerHari = sisaHari > 0 ? (sisaJam / sisaHari).toFixed(1) : sisaJam.toString();

  const kriteria = [
    {
      key: 'hariOnline',
      label: 'Hari Online',
      target: target.hari,
      unit: 'hari',
      value: current.hariOnline,
      isAuto: true,
    },
    {
      key: 'jamOnline',
      label: 'Jam On-Bid',
      target: target.jam,
      unit: 'jam',
      value: current.jamOnline,
      isAuto: true,
    },
    {
      key: 'penyelesaian',
      label: 'Tingkat Penyelesaian',
      target: target.penyelesaian,
      unit: '%',
      value: current.penyelesaian,
      isAuto: false,
    },
    {
      key: 'rating',
      label: 'Rating Pengemudi',
      target: target.rating,
      unit: 'bintang',
      value: current.rating,
      isAuto: false,
    },
    {
      key: 'orderan',
      label: 'Jumlah Orderan Bulan Ini',
      target: target.orderan,
      unit: 'order',
      value: current.orderan,
      isAuto: true,
    },
  ];

  return (
    <div className="space-y-4 pb-14 text-slate-100">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Level Grab (Sinkron Otomatis Cockpit)</span>
        </h2>
        <p className="text-xs text-slate-400">
          Status level, orderan bulan ini, dan jam on-bid otomatis terhubung dengan dashboard
        </p>
      </div>

      {/* Level Selector */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="text-xs font-bold text-slate-300">Pilih Target Level Anda:</div>
        <div className="grid grid-cols-3 gap-2">
          {(['Pejuang', 'Kesatria', 'Jawara'] as GrabLevel[]).map((lv) => {
            const isSel = level === lv;
            const t = LEVEL_TARGETS[lv];
            return (
              <button
                key={lv}
                onClick={() => setLevel(lv)}
                className={`py-3 px-2 rounded-2xl border text-center transition ${
                  isSel
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs">{lv}</div>
                <div className="text-[10px] mt-0.5 opacity-80 font-mono">
                  {t.orderan} order • {t.jam} jam
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Gap & Daily Quota Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 amoled:from-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Target className="w-4 h-4 text-amber-400" />
            Simulasi Kebutuhan Harian ({level})
          </span>
          <span className="text-amber-300 font-mono text-[11px] font-bold">
            Sisa {sisaHari} Hari Bulan Ini
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400">Kebutuhan Orderan</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {orderPerHari} <span className="text-xs font-normal text-slate-400">/ hari</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Tercapai {actualOrderan} dari {target.orderan} order
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400">Kebutuhan Jam On-Bid</div>
            <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
              {jamPerHari} <span className="text-xs font-normal text-slate-400">jam / hari</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Tercapai {actualJamOnline} dari {target.jam} jam
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bars for 5 Criteria */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-white">
          <span>Kriteria Level & Capaian Aktual</span>
          <span
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
              colorStatus === 'hijau'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : colorStatus === 'kuning'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {colorStatus === 'hijau' ? 'Memenuhi Syarat' : 'Perlu Dikejar'}
          </span>
        </div>

        <div className="space-y-3 text-xs">
          {kriteria.map((k) => {
            const pct = k.target > 0 ? Math.min(100, Math.round((k.value / k.target) * 100)) : 0;
            return (
              <div key={k.key} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    {k.label}
                    {k.isAuto && (
                      <span className="text-[9px] px-1 rounded bg-slate-800 text-emerald-400 font-mono">
                        Auto Cockpit
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-slate-400">
                    <strong className="text-white">{k.value}</strong> / {k.target} {k.unit} ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: getProgressColor(pct),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Calibration for Rating and Completion */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3 text-xs">
        <h3 className="font-bold text-white">Kalibrasi Rating & Tingkat Penyelesaian:</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Rating Driver (Bintang)</label>
            <input
              type="number"
              step="0.01"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Penyelesaian (%)</label>
            <input
              type="number"
              value={penyelesaian}
              onChange={(e) => setPenyelesaian(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
