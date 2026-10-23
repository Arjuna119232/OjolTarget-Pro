import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  CheckCircle2,
  Clock,
  Gauge,
  DollarSign,
  Car,
  Compass,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  ActiveOrderState,
  DriverProfile,
  PlatformType,
  SpotData,
} from '@/types';
import { formatRupiah, formatKM, deteksiWilayah, getJamGacorSlot } from '@/lib/nominatim';
import { getCurrentPositionOnce, bukaNavigasiExternal } from '@/lib/geo';
import { getNamaLokasi } from '@/lib/nominatim';

interface TripTigaTombolProps {
  profile: DriverProfile | null;
  activeOrder: ActiveOrderState | null;
  onUpdateActiveOrder: (order: ActiveOrderState | null) => void;
  onFinishOrder: (
    active: ActiveOrderState,
    nominal: number,
    kmDetail: { kmKeJemput: number; kmKeAntar: number; kmTotalTrip: number }
  ) => void;
  onAddSpot: (spot: SpotData) => void;
  onUpdateKM: (newKM: number) => void;
}

export function TripTigaTombol({
  profile,
  activeOrder,
  onUpdateActiveOrder,
  onFinishOrder,
  onAddSpot,
  onUpdateKM,
}: TripTigaTombolProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [inputOngkos, setInputOngkos] = useState(activeOrder?.nominal?.toString() || '14400');
  const [toast, setToast] = useState<string | null>(null);

  const currentKM = profile?.currentKM || 0;
  const platform = profile?.primaryPlatform || 'Grab';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // TOMBOL 1: DAPAT ORDERAN
  const handleDapatOrderan = async () => {
    setLoadingAction('dapat');
    try {
      const pos = await getCurrentPositionOnce(8000);
      const geo = await getNamaLokasi(pos.lat, pos.lng);

      const newOrder: ActiveOrderState = {
        id: crypto.randomUUID(),
        platform,
        nominal: parseInt(inputOngkos, 10) || 14400,
        status: 'Menuju Titik Jemput',
        kmDapatOrder: currentKM,
        waktuMulai: Date.now(),
        titikJemput: {
          nama: 'Menunggu penjemputan di ' + geo.nama,
          lat: pos.lat,
          lng: pos.lng,
        },
      };

      onUpdateActiveOrder(newOrder);
      showToast('✅ Order Diterima! Odometer dikunci pada ' + formatKM(currentKM));
    } catch {
      // Fallback tanpa GPS jika offline
      const newOrder: ActiveOrderState = {
        id: crypto.randomUUID(),
        platform,
        nominal: parseInt(inputOngkos, 10) || 14400,
        status: 'Menuju Titik Jemput',
        kmDapatOrder: currentKM,
        waktuMulai: Date.now(),
      };
      onUpdateActiveOrder(newOrder);
      showToast('✅ Order Diterima pada ' + formatKM(currentKM));
    } finally {
      setLoadingAction(null);
    }
  };

  // TOMBOL 2: JEMPUT
  const handleJemput = async () => {
    if (!activeOrder) return;
    setLoadingAction('jemput');
    try {
      const pos = await getCurrentPositionOnce(8000);
      const geo = await getNamaLokasi(pos.lat, pos.lng);

      // Hitung jarak tempuh dari dapat orderan ke titik jemput
      const kmDapat = activeOrder.kmDapatOrder || currentKM;
      const kmSekarang = currentKM >= kmDapat ? currentKM : kmDapat + 1.2;
      const kmKeJemput = parseFloat((kmSekarang - kmDapat).toFixed(1));

      // Catat titik penjemputan ke DATA SPOT GACOR
      const newSpot: SpotData = {
        id: crypto.randomUUID(),
        lat: pos.lat,
        lng: pos.lng,
        timestamp: Date.now(),
        namaLokasi: geo.nama,
        wilayah: geo.wilayah,
        jamGacor: getJamGacorSlot(new Date()),
        isEstimasi: false,
        nominal: activeOrder.nominal,
        platform: activeOrder.platform,
        tipe: 'Spot Gacor',
      };
      onAddSpot(newSpot);

      const updated: ActiveOrderState = {
        ...activeOrder,
        status: 'Menuju Titik Antar',
        kmJemput: kmSekarang,
        kmKeJemput: kmKeJemput > 0 ? kmKeJemput : 1.2,
        titikJemput: {
          nama: geo.nama,
          lat: pos.lat,
          lng: pos.lng,
        },
      };

      onUpdateActiveOrder(updated);
      showToast(`📍 Penumpang Dijemput! Lokasi gacor tersimpan: ${geo.nama}`);
    } catch {
      const kmDapat = activeOrder.kmDapatOrder || currentKM;
      const kmSekarang = currentKM >= kmDapat ? currentKM : kmDapat + 1.2;
      const kmKeJemput = parseFloat((kmSekarang - kmDapat).toFixed(1));

      const updated: ActiveOrderState = {
        ...activeOrder,
        status: 'Menuju Titik Antar',
        kmJemput: kmSekarang,
        kmKeJemput: kmKeJemput > 0 ? kmKeJemput : 1.2,
      };
      onUpdateActiveOrder(updated);
      showToast('📍 Penumpang Dijemput! Status menuju titik antar.');
    } finally {
      setLoadingAction(null);
    }
  };

  // TOMBOL 3: TURUNKAN
  const handleTurunkanTrigger = async () => {
    if (!activeOrder) return;
    setLoadingAction('turunkan');
    try {
      const pos = await getCurrentPositionOnce(8000);
      const geo = await getNamaLokasi(pos.lat, pos.lng);

      const kmJemput = activeOrder.kmJemput || activeOrder.kmDapatOrder || currentKM;
      const kmSekarang = currentKM >= kmJemput ? currentKM : kmJemput + 3.8;
      const kmKeAntar = parseFloat((kmSekarang - kmJemput).toFixed(1));
      const kmKeJemput = activeOrder.kmKeJemput || 1.2;
      const kmTotalTrip = parseFloat((kmKeJemput + kmKeAntar).toFixed(1));

      onUpdateActiveOrder({
        ...activeOrder,
        status: 'Selesai',
        kmTurunkan: kmSekarang,
        kmKeAntar: kmKeAntar > 0 ? kmKeAntar : 3.5,
        kmTotalTrip,
        titikAntar: {
          nama: geo.nama,
          lat: pos.lat,
          lng: pos.lng,
        },
      });

      // Update Odometer kendaraan jika bertambah
      if (kmSekarang > currentKM) {
        onUpdateKM(kmSekarang);
      }

      setShowFinishModal(true);
    } catch {
      const kmJemput = activeOrder.kmJemput || currentKM;
      const kmSekarang = currentKM >= kmJemput ? currentKM : kmJemput + 3.8;
      const kmKeAntar = parseFloat((kmSekarang - kmJemput).toFixed(1));
      const kmKeJemput = activeOrder.kmKeJemput || 1.2;

      onUpdateActiveOrder({
        ...activeOrder,
        status: 'Selesai',
        kmTurunkan: kmSekarang,
        kmKeAntar: kmKeAntar > 0 ? kmKeAntar : 3.5,
        kmTotalTrip: kmKeJemput + kmKeAntar,
      });

      if (kmSekarang > currentKM) {
        onUpdateKM(kmSekarang);
      }

      setShowFinishModal(true);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleKonfirmasiSelesai = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    const nom = parseInt(inputOngkos, 10) || activeOrder.nominal || 14400;
    const kmKeJemput = activeOrder.kmKeJemput || 1.2;
    const kmKeAntar = activeOrder.kmKeAntar || 3.8;
    const kmTotalTrip = activeOrder.kmTotalTrip || kmKeJemput + kmKeAntar;

    onFinishOrder(activeOrder, nom, {
      kmKeJemput,
      kmKeAntar,
      kmTotalTrip,
    });

    setShowFinishModal(false);
    showToast(`💰 Trip Selesai! Pendapatan ${formatRupiah(nom)} berhasil dicatat.`);
  };

  const stepStatus = !activeOrder
    ? 0
    : activeOrder.status === 'Menuju Titik Jemput' || activeOrder.status === 'Diterima'
    ? 1
    : activeOrder.status === 'Menuju Titik Antar' || activeOrder.status === 'Sudah Jemput'
    ? 2
    : 3;

  return (
    <div className="space-y-4 pb-14 text-slate-100">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-12 left-4 right-4 z-50 bg-emerald-500 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-white/80 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-400" />
            <span>Dashboard 3 Tombol Lapangan</span>
          </h2>
          <p className="text-xs text-slate-400">
            Dapat Orderan ➔ Jemput ➔ Turunkan (Sinkron GPS & KM Odometer)
          </p>
        </div>
        <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-amber-300">
          {formatKM(currentKM)}
        </div>
      </div>

      {/* Active Trip Status Card */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-white">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeOrder ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            {activeOrder ? `Pesanan Sedang Berjalan (${activeOrder.platform})` : 'Status: Siaga / Menunggu Orderan'}
          </span>
          <span className="text-[11px] font-mono text-emerald-400">
            {activeOrder ? formatRupiah(activeOrder.nominal) : 'Standby'}
          </span>
        </div>

        {/* 3 Step Flow Tracker */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div
            className={`p-2 rounded-xl border transition ${
              stepStatus >= 1
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-mono">1. Kunci KM</div>
            <div>Dapat Order</div>
          </div>

          <div
            className={`p-2 rounded-xl border transition ${
              stepStatus >= 2
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-mono">2. Spot Gacor</div>
            <div>Jemput</div>
          </div>

          <div
            className={`p-2 rounded-xl border transition ${
              stepStatus >= 3
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-mono">3. Hitung KM</div>
            <div>Turunkan</div>
          </div>
        </div>

        {/* Active Locations Display */}
        {activeOrder && (
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold block">📍 TITIK JEMPUT:</span>
                <span className="text-white font-medium text-xs">
                  {activeOrder.titikJemput?.nama || 'Menuju ke penjemputan...'}
                </span>
              </div>
              {activeOrder.titikJemput && (
                <button
                  onClick={() =>
                    bukaNavigasiExternal(
                      activeOrder.titikJemput!.lat,
                      activeOrder.titikJemput!.lng,
                      'Titik Jemput'
                    )
                  }
                  className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/40 shrink-0 flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" /> Peta
                </button>
              )}
            </div>

            {activeOrder.titikAntar && (
              <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-900">
                <div>
                  <span className="text-[10px] text-sky-400 font-bold block">🏁 TITIK ANTAR:</span>
                  <span className="text-white font-medium text-xs">
                    {activeOrder.titikAntar.nama}
                  </span>
                </div>
                <button
                  onClick={() =>
                    bukaNavigasiExternal(
                      activeOrder.titikAntar!.lat,
                      activeOrder.titikAntar!.lng,
                      'Titik Antar'
                    )
                  }
                  className="px-2 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold text-[10px] border border-sky-500/40 shrink-0 flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" /> Peta
                </button>
              </div>
            )}

            {/* KM Breakdown Live Calculation */}
            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-900 text-center text-[10px]">
              <div>
                <span className="text-slate-500 block">KM Ke Jemput</span>
                <span className="font-mono font-bold text-amber-300">
                  {activeOrder.kmKeJemput ? `${activeOrder.kmKeJemput} KM` : '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">KM Ke Antar</span>
                <span className="font-mono font-bold text-sky-300">
                  {activeOrder.kmKeAntar ? `${activeOrder.kmKeAntar} KM` : '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total KM Trip</span>
                <span className="font-mono font-bold text-emerald-400">
                  {activeOrder.kmTotalTrip ? `${activeOrder.kmTotalTrip} KM` : '-'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3 BIG ERGONOMIC TOUCH BUTTONS FOR FIELD RIDING */}
      <div className="space-y-3">
        {/* TOMBOL 1: DAPAT ORDERAN */}
        <button
          onClick={handleDapatOrderan}
          disabled={loadingAction === 'dapat' || stepStatus !== 0}
          className={`w-full py-4 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-between border transition shadow-lg active:scale-98 ${
            stepStatus === 0
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white border-emerald-400 shadow-emerald-500/25 ring-2 ring-emerald-500/30'
              : 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
          }`}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
              1
            </div>
            <div>
              <div className="text-base tracking-tight">DAPAT ORDERAN</div>
              <div className="text-xs font-normal opacity-90">
                Kunci titik GPS awal & hitung KM ke lokasi jemput
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </button>

        {/* TOMBOL 2: JEMPUT */}
        <button
          onClick={handleJemput}
          disabled={loadingAction === 'jemput' || stepStatus !== 1}
          className={`w-full py-4 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-between border transition shadow-lg active:scale-98 ${
            stepStatus === 1
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-slate-950 border-amber-400 shadow-amber-500/25 ring-2 ring-amber-500/40 animate-pulse'
              : 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
          }`}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center font-bold text-lg">
              2
            </div>
            <div>
              <div className="text-base tracking-tight">JEMPUT PENUMPANG / BARANG</div>
              <div className="text-xs font-normal opacity-90">
                Simpan titik ke Spot Gacor & mulai rute antar tujuan
              </div>
            </div>
          </div>
          <MapPin className="w-5 h-5 shrink-0" />
        </button>

        {/* TOMBOL 3: TURUNKAN */}
        <button
          onClick={handleTurunkanTrigger}
          disabled={loadingAction === 'turunkan' || stepStatus !== 2}
          className={`w-full py-4 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-between border transition shadow-lg active:scale-98 ${
            stepStatus === 2
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 text-white border-sky-400 shadow-sky-500/25 ring-2 ring-sky-500/40 animate-pulse'
              : 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
          }`}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
              3
            </div>
            <div>
              <div className="text-base tracking-tight">TURUNKAN & REKAP KM</div>
              <div className="text-xs font-normal opacity-90">
                Hitung detail KM (jemput + antar) & input ongkos
              </div>
            </div>
          </div>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
        </button>
      </div>

      {/* MODAL INPUT ONGKOS PENDAPATAN BERSIH */}
      {showFinishModal && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Trip Selesai!</h3>
            </div>

            {/* Detail Jarak Tempuh */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
              <div className="text-slate-400 font-bold mb-1">Rincian Kilometer Perjalanan:</div>
              <div className="flex justify-between text-slate-300">
                <span>KM ke Titik Jemput:</span>
                <span className="font-mono font-bold text-amber-300">
                  {activeOrder.kmKeJemput || 1.2} KM
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>KM Jemput ke Antar:</span>
                <span className="font-mono font-bold text-sky-300">
                  {activeOrder.kmKeAntar || 3.8} KM
                </span>
              </div>
              <div className="border-t border-slate-800 pt-1 flex justify-between font-bold text-white">
                <span>Total KM Keseluruhan:</span>
                <span className="font-mono text-emerald-400">
                  {activeOrder.kmTotalTrip || 5.0} KM
                </span>
              </div>
            </div>

            {/* Input Ongkos Bersih yang Diterima Driver */}
            <form onSubmit={handleKonfirmasiSelesai} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Pendapatan Bersih yang Anda Terima (Rp)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={inputOngkos}
                    onChange={(e) => setInputOngkos(e.target.value)}
                    placeholder="Contoh: 14400"
                    autoFocus
                    required
                    className="w-full bg-slate-950 border border-emerald-500 rounded-xl px-4 py-3 text-2xl font-mono font-extrabold text-emerald-400 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs text-slate-500 font-bold">
                    RP
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Masukkan uang bersih yang masuk ke dompet driver tanpa potongan.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFinishModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
                >
                  Koreksi
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-98"
                >
                  Kirim & Catat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
