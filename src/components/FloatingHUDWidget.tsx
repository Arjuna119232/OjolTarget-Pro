import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Play,
  ArrowRight,
  Send,
  DollarSign,
} from 'lucide-react';
import { ActiveOrderState, PlatformType } from '@/types';
import { formatRupiah, formatKM } from '@/lib/nominatim';
import { getCurrentPositionOnce, bukaNavigasiExternal } from '@/lib/geo';
import { getNamaLokasi } from '@/lib/nominatim';

interface FloatingHUDWidgetProps {
  activeOrder: ActiveOrderState | null;
  currentKM: number;
  platform: PlatformType;
  onUpdateActiveOrder: (order: ActiveOrderState | null) => void;
  onFinishOrder: (
    active: ActiveOrderState,
    nominal: number,
    kmDetail: { kmKeJemput: number; kmKeAntar: number; kmTotalTrip: number }
  ) => void;
  onQuickOrderDirect: (nominal: number) => void;
}

export function FloatingHUDWidget({
  activeOrder,
  currentKM,
  platform,
  onUpdateActiveOrder,
  onFinishOrder,
  onQuickOrderDirect,
}: FloatingHUDWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [manualInputRp, setManualInputRp] = useState('14400');
  const [showQuickRpInput, setShowQuickRpInput] = useState(false);

  // Status step 1: Dapat Orderan, 2: Jemput, 3: Turunkan
  const stepStatus = !activeOrder
    ? 0
    : activeOrder.status === 'Menuju Titik Jemput' || activeOrder.status === 'Diterima'
    ? 1
    : activeOrder.status === 'Menuju Titik Antar' || activeOrder.status === 'Sudah Jemput'
    ? 2
    : 3;

  // 1. Tombol Dapat Orderan
  const handleDapatOrder = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentPositionOnce(6000);
      const geo = await getNamaLokasi(pos.lat, pos.lng);
      const newOrder: ActiveOrderState = {
        id: crypto.randomUUID(),
        platform,
        nominal: parseInt(manualInputRp, 10) || 14400,
        status: 'Menuju Titik Jemput',
        kmDapatOrder: currentKM,
        waktuMulai: Date.now(),
        titikJemput: {
          nama: geo.nama,
          lat: pos.lat,
          lng: pos.lng,
        },
      };
      onUpdateActiveOrder(newOrder);
    } catch {
      const newOrder: ActiveOrderState = {
        id: crypto.randomUUID(),
        platform,
        nominal: parseInt(manualInputRp, 10) || 14400,
        status: 'Menuju Titik Jemput',
        kmDapatOrder: currentKM,
        waktuMulai: Date.now(),
      };
      onUpdateActiveOrder(newOrder);
    } finally {
      setIsLocating(false);
    }
  };

  // 2. Tombol Jemput
  const handleJemput = async () => {
    if (!activeOrder) return;
    setIsLocating(true);
    try {
      const pos = await getCurrentPositionOnce(6000);
      const geo = await getNamaLokasi(pos.lat, pos.lng);
      const kmDapat = activeOrder.kmDapatOrder || currentKM;
      const kmSekarang = currentKM >= kmDapat ? currentKM : kmDapat + 1.2;
      const kmKeJemput = parseFloat((kmSekarang - kmDapat).toFixed(1));

      onUpdateActiveOrder({
        ...activeOrder,
        status: 'Menuju Titik Antar',
        kmJemput: kmSekarang,
        kmKeJemput: kmKeJemput > 0 ? kmKeJemput : 1.2,
        titikJemput: {
          nama: geo.nama,
          lat: pos.lat,
          lng: pos.lng,
        },
      });
    } catch {
      const kmDapat = activeOrder.kmDapatOrder || currentKM;
      const kmSekarang = currentKM >= kmDapat ? currentKM : kmDapat + 1.2;
      onUpdateActiveOrder({
        ...activeOrder,
        status: 'Menuju Titik Antar',
        kmJemput: kmSekarang,
        kmKeJemput: 1.2,
      });
    } finally {
      setIsLocating(false);
    }
  };

  // 3. Tombol Turunkan & Selesai
  const handleTurunkan = async () => {
    if (!activeOrder) return;
    setIsLocating(true);
    try {
      const pos = await getCurrentPositionOnce(6000);
      const geo = await getNamaLokasi(pos.lat, pos.lng);
      const kmJemput = activeOrder.kmJemput || currentKM;
      const kmSekarang = currentKM >= kmJemput ? currentKM : kmJemput + 3.8;
      const kmKeAntar = parseFloat((kmSekarang - kmJemput).toFixed(1));
      const kmKeJemput = activeOrder.kmKeJemput || 1.2;
      const kmTotalTrip = parseFloat((kmKeJemput + kmKeAntar).toFixed(1));

      const nom = parseInt(manualInputRp, 10) || activeOrder.nominal || 14400;

      onFinishOrder(
        {
          ...activeOrder,
          titikAntar: { nama: geo.nama, lat: pos.lat, lng: pos.lng },
        },
        nom,
        {
          kmKeJemput,
          kmKeAntar,
          kmTotalTrip,
        }
      );
    } catch {
      const kmKeJemput = activeOrder.kmKeJemput || 1.2;
      const kmKeAntar = 3.8;
      const nom = parseInt(manualInputRp, 10) || activeOrder.nominal || 14400;

      onFinishOrder(activeOrder, nom, {
        kmKeJemput,
        kmKeAntar,
        kmTotalTrip: kmKeJemput + kmKeAntar,
      });
    } finally {
      setIsLocating(false);
    }
  };

  const handleKirimManualOngkos = (e: React.FormEvent) => {
    e.preventDefault();
    const nom = parseInt(manualInputRp, 10);
    if (!isNaN(nom) && nom > 0) {
      onQuickOrderDirect(nom);
      setShowQuickRpInput(false);
    }
  };

  return (
    <div className="fixed bottom-16 left-2 right-2 z-30 transition-all duration-300 max-w-lg mx-auto">
      <div className="bg-slate-900/95 amoled:bg-black/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-3 shadow-2xl text-slate-100">
        {/* Top bar with Minimizer and Status */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-white tracking-wide">
              {activeOrder ? `Pesanan: ${activeOrder.status}` : 'Widget Cepat Lapangan'}
            </span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {formatKM(currentKM)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowQuickRpInput(!showQuickRpInput)}
              className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono text-emerald-400 border border-slate-700 hover:bg-slate-700"
              title="Manual Input Rp"
            >
              Input Rp
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-md hover:bg-slate-800 text-slate-400"
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {activeOrder && (
              <button
                onClick={() => onUpdateActiveOrder(null)}
                className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                title="Batalkan"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Input Manual Rp / Ongkos & Tombol Kirim */}
        {showQuickRpInput && (
          <form onSubmit={handleKirimManualOngkos} className="flex gap-1.5 mb-2.5 pt-1">
            <div className="relative flex-1">
              <input
                type="number"
                value={manualInputRp}
                onChange={(e) => setManualInputRp(e.target.value)}
                placeholder="Nominal Rp"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-400"
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-slate-500 font-bold">RP</span>
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim</span>
            </button>
          </form>
        )}

        {/* 3 Tombol Lapangan: Dapat Orderan, Jemput, Turunkan */}
        {!isMinimized && (
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {/* Tombol 1: Dapat Orderan */}
            <button
              onClick={handleDapatOrder}
              disabled={isLocating || stepStatus !== 0}
              className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center border transition ${
                stepStatus === 0
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-md ring-1 ring-emerald-400/40 active:scale-95'
                  : 'bg-slate-950 text-slate-500 border-slate-800 opacity-60'
              }`}
            >
              <span className="text-[9px] font-mono opacity-80">1. Kunci KM</span>
              <span className="truncate text-[11px]">Dapat Orderan</span>
            </button>

            {/* Tombol 2: Jemput */}
            <button
              onClick={handleJemput}
              disabled={isLocating || stepStatus !== 1}
              className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center border transition ${
                stepStatus === 1
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-1 ring-amber-400/40 animate-pulse active:scale-95'
                  : 'bg-slate-950 text-slate-500 border-slate-800 opacity-60'
              }`}
            >
              <span className="text-[9px] font-mono opacity-80">2. Spot Gacor</span>
              <span className="truncate text-[11px]">Jemput</span>
            </button>

            {/* Tombol 3: Turunkan */}
            <button
              onClick={handleTurunkan}
              disabled={isLocating || stepStatus !== 2}
              className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center border transition ${
                stepStatus === 2
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md ring-1 ring-sky-400/40 animate-pulse active:scale-95'
                  : 'bg-slate-950 text-slate-500 border-slate-800 opacity-60'
              }`}
            >
              <span className="text-[9px] font-mono opacity-80">3. Rekap KM</span>
              <span className="truncate text-[11px]">Turunkan</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
