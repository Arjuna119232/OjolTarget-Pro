import React, { useState } from 'react';
import {
  TrendingUp,
  Gauge,
  MapPin,
  CheckCircle,
  PlusCircle,
  AlertTriangle,
  Zap,
  Navigation,
  DollarSign,
  ChevronRight,
  Shield,
  Compass,
} from 'lucide-react';
import {
  DriverProfile,
  ServiceRecord,
  OrderRecord,
  SpotData,
  TimerOnBidState,
  UserSettings,
  ActiveOrderState,
  PlatformType,
} from '@/types';
import { formatRupiah, formatKM } from '@/lib/nominatim';
import { hitungStatusSemuaServis, getServisPalingMendesak } from '@/lib/serviceEngine';
import { getCurrentPositionOnce } from '@/lib/geo';
import { getNamaLokasi } from '@/lib/nominatim';
import { TimerOnBidCard } from './TimerOnBidCard';

interface CockpitProps {
  profile: DriverProfile | null;
  services: ServiceRecord[];
  orders: OrderRecord[];
  spots: SpotData[];
  timer: TimerOnBidState;
  settings: UserSettings;
  activeOrder: ActiveOrderState | null;
  onQuickOrder: (nominal: number) => void;
  onStartNewOrder: (nominal: number) => void;
  onOpenServiceTab: () => void;
  onOpenTripTab: () => void;
  onUpdateTimer: (state: TimerOnBidState) => void;
  onUpdateKM: (km: number) => void;
}

export function Cockpit({
  profile,
  services,
  orders,
  spots,
  timer,
  settings,
  activeOrder,
  onQuickOrder,
  onStartNewOrder,
  onOpenServiceTab,
  onOpenTripTab,
  onUpdateTimer,
  onUpdateKM,
}: CockpitProps) {
  const [customNominal, setCustomNominal] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const platform = profile?.primaryPlatform || settings.platform || 'Grab';

  // Hitung total pendapatan hari ini (Murni apa yang didapat driver)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.getTime();

  const todayOrders = orders.filter((o) => o.timestamp >= startOfDay);
  const totalPendapatanHariIni = todayOrders.reduce((sum, o) => sum + o.nominal, 0);
  const target = settings.targetHarian || 250000;
  const progressPct = target > 0 ? Math.min(100, Math.round((totalPendapatanHariIni / target) * 100)) : 0;
  const sisaTarget = Math.max(0, target - totalPendapatanHariIni);

  // Status servis terdekat
  const currentKM = profile?.currentKM || 0;
  const serviceStatuses = hitungStatusSemuaServis(
    services,
    currentKM,
    profile?.modeKendaraan || 'Ojol Aktif',
    settings.servisReminderThresholdKM
  );
  const servisMendesak = getServisPalingMendesak(serviceStatuses);

  const handleTandaiSpot = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentPositionOnce(8000);
      const geo = await getNamaLokasi(pos.lat, pos.lng);
      showToast(`📍 Spot berhasil ditandai: ${geo.nama} (${geo.wilayah})`);
    } catch {
      showToast('⚠️ Gagal mengambil GPS. Pastikan izin lokasi aktif.');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="space-y-4 pb-12 text-slate-100">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-12 left-4 right-4 z-50 bg-emerald-500 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-white/80 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Hero Financial Card: Murni Pendapatan yang Diterima Driver */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 amoled:from-black amoled:to-black border border-slate-800 rounded-3xl p-4 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Target Harian • {profile?.daerahOperasional || 'Wilayah Anda'}</span>
          </div>
          <span className="text-emerald-400 font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30">
            {platform}
          </span>
        </div>

        {/* Big Earnings Amount (Pure Driver Income) */}
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-white font-mono">
              {formatRupiah(totalPendapatanHariIni)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Target Daerah: {formatRupiah(target)} • {todayOrders.length} Trip Selesai
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-sm font-bold font-mono px-2 py-1 rounded-lg ${
                progressPct >= 100
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {progressPct}%
            </span>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              {sisaTarget > 0 ? `Kurang ${formatRupiah(sisaTarget)}` : 'Target Tercapai! 🏆'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Live Jam On-Bid Ticker Component */}
      <TimerOnBidCard timer={timer} onUpdateTimer={onUpdateTimer} />

      {/* Odometer & Servis Terdekat Card */}
      <div
        onClick={onOpenServiceTab}
        className="bg-slate-900/90 amoled:bg-black border border-slate-800 rounded-3xl p-4 flex flex-col justify-between cursor-pointer hover:border-slate-700 transition shadow-xl"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 font-bold text-slate-200">
            <Gauge className="w-4 h-4 text-amber-400" /> Odometer & Perawatan Berkala
          </span>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <span>Buku Servis</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {formatKM(currentKM)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Kendaraan: {profile?.modelKendaraan || 'Motor'} ({profile?.platNomor || '-'})
            </div>
          </div>

          <div className="text-right">
            {servisMendesak ? (
              <span
                className={`text-xs font-bold font-mono px-2 py-1 rounded-lg ${
                  servisMendesak.status === 'JATUH_TEMPO'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {servisMendesak.kmSisa <= 0
                  ? `Lewat ${servisMendesak.lewatKM} KM!`
                  : `Sisa ${servisMendesak.kmSisa} KM`}
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-400">Semua Servis Aman</span>
            )}
            <div className="text-[10px] text-slate-400 mt-1">
              {servisMendesak ? servisMendesak.type : 'Kondisi Prima'}
            </div>
          </div>
        </div>

        {/* Progress bar servis terdekat */}
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-1">
          <div
            className={`h-2 rounded-full ${
              servisMendesak?.isOverdue
                ? 'bg-rose-500'
                : (servisMendesak?.kmSisa || 1000) <= 200
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
            style={{ width: `${servisMendesak?.pctDipakai || 20}%` }}
          />
        </div>
      </div>

      {/* Fast 1-Tap Quick Catat Nominal (Net Earnings) */}
      <div className="bg-slate-900/90 amoled:bg-black border border-slate-800 rounded-3xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Catat Pendapatan Driver ({platform})
          </span>
          <span className="text-[11px] text-slate-400">Hasil Bersih Diterima</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Trip Dekat', nominal: settings.quickOrderNominal || 10200 },
            { label: 'Trip Sedang', nominal: 14400 },
            { label: 'Trip Jauh', nominal: 22000 },
          ].map((item) => (
            <button
              key={item.nominal}
              onClick={() => {
                onQuickOrder(item.nominal);
                showToast(`💰 Berhasil mencatat ${formatRupiah(item.nominal)}`);
              }}
              className="py-3 px-2 rounded-2xl bg-slate-800/90 hover:bg-emerald-500/20 active:scale-95 border border-slate-700/80 hover:border-emerald-500/40 text-center transition flex flex-col items-center justify-center"
            >
              <span className="text-[10px] text-slate-400">{item.label}</span>
              <span className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                {formatRupiah(item.nominal)}
              </span>
            </button>
          ))}
        </div>

        {/* Action: Custom Nominal or Start 3-Button Trip */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setShowCustomModal(true)}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Nominal Lain...</span>
          </button>

          <button
            onClick={onOpenTripTab}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Trip 3 Tombol Lapangan</span>
          </button>
        </div>
      </div>

      {/* Field Actions: Tandai Spot Gacor & Navigasi */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpenTripTab}
          className="p-3.5 rounded-2xl bg-slate-900/90 amoled:bg-black border border-slate-800 hover:border-emerald-500/40 active:scale-98 text-left transition flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Alur 3 Tombol</div>
              <div className="text-[10px] text-slate-400">Dapat ➔ Jemput ➔ Turun</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={handleTandaiSpot}
          disabled={isLocating}
          className="p-3.5 rounded-2xl bg-slate-900/90 amoled:bg-black border border-slate-800 hover:border-amber-500/40 active:scale-98 text-left transition flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {isLocating ? 'Mencari GPS...' : 'Tandai Spot'}
              </div>
              <div className="text-[10px] text-slate-400">Kunci Titik Mangkal</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-amber-400">GPS</span>
        </button>
      </div>

      {/* Modal Custom Nominal Order */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xs w-full p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Input Pendapatan Bersih (Rp)</h3>
            <p className="text-xs text-slate-400 mb-3">
              Masukkan uang yang Anda dapatkan dari trip {platform}
            </p>
            <div className="relative mb-4">
              <input
                type="number"
                value={customNominal}
                onChange={(e) => setCustomNominal(e.target.value)}
                placeholder="Contoh: 18500"
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xl font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3.5 top-3.5 text-xs text-slate-500 font-bold">RP</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = parseInt(customNominal, 10);
                  if (!isNaN(val) && val > 0) {
                    onQuickOrder(val);
                    setShowCustomModal(false);
                    setCustomNominal('');
                    showToast(`💰 Tercatat: ${formatRupiah(val)}`);
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
