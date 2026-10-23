import React, { useState } from 'react';
import {
  DollarSign,
  MapPin,
  Navigation,
  Search,
  Calendar,
  FileText,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  DriverProfile,
  OrderRecord,
  PlatformType,
} from '@/types';
import { formatRupiah, formatTanggalIndonesia } from '@/lib/nominatim';
import { getCurrentPositionOnce } from '@/lib/geo';
import { getNamaLokasi, deteksiWilayah, getJamGacorSlot } from '@/lib/nominatim';
import { exportLaporanOrderPDF } from '@/lib/pdfExport';

interface CatatOrderProps {
  profile: DriverProfile | null;
  orders: OrderRecord[];
  onAddOrder: (order: OrderRecord) => void;
  onDeleteOrder: (id: string) => void;
  onStartActiveOrder: (nominal: number, platform: PlatformType, jemputNama?: string, antarNama?: string) => void;
}

export function CatatOrder({
  profile,
  orders,
  onAddOrder,
  onDeleteOrder,
  onStartActiveOrder,
}: CatatOrderProps) {
  const platform = profile?.primaryPlatform || 'Grab';
  const [nominal, setNominal] = useState('14400');
  const [titikJemput, setTitikJemput] = useState('');
  const [titikAntar, setTitikAntar] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'Semua' | 'Hari Ini' | 'Minggu Ini' | 'Bulan Ini'>('Semua');
  const [isLocating, setIsLocating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Modal konfirmasi hapus order tanpa window.confirm (agar 100% responsif di iframe & webview)
  const [orderToDelete, setOrderToDelete] = useState<OrderRecord | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAmbilGPSJemput = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentPositionOnce(8000);
      const geo = await getNamaLokasi(pos.lat, pos.lng);
      setTitikJemput(geo.nama);
      showToast('📍 Titik jemput GPS berhasil dikunci');
    } catch {
      showToast('GPS tidak terdeteksi, silakan ketik manual');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSimpanOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const nom = parseInt(nominal, 10) || 0;
    if (nom <= 0) {
      showToast('⚠️ Nominal order harus lebih dari Rp 0');
      return;
    }

    let lat: number | undefined;
    let lng: number | undefined;
    let wil: string | undefined;

    try {
      const pos = await getCurrentPositionOnce(3000);
      lat = pos.lat;
      lng = pos.lng;
      wil = deteksiWilayah(pos.lat, pos.lng, '');
    } catch {
      // optional
    }

    const order: OrderRecord = {
      id: crypto.randomUUID(),
      nominal: nom,
      platform,
      titikJemputNama: titikJemput.trim() || undefined,
      titikAntarNama: titikAntar.trim() || undefined,
      namaLokasi: titikJemput.trim() || titikAntar.trim() || 'Trip Lapangan',
      wilayah: wil || profile?.daerahOperasional || 'Jabodetabek',
      jamGacor: getJamGacorSlot(new Date()),
      lat,
      lng,
      timestamp: Date.now(),
      createdAt: Date.now(),
    };

    onAddOrder(order);
    showToast(`💰 Pendapatan ${formatRupiah(nom)} (${platform}) berhasil dicatat!`);

    // Reset input
    setTitikJemput('');
    setTitikAntar('');
  };

  const handleMulaiTripAktif = () => {
    const nom = parseInt(nominal, 10) || 14400;
    onStartActiveOrder(nom, platform, titikJemput, titikAntar);
  };

  const confirmDelete = () => {
    if (!orderToDelete) return;
    onDeleteOrder(orderToDelete.id);
    showToast(`🗑️ Order ${formatRupiah(orderToDelete.nominal)} berhasil dihapus.`);
    setOrderToDelete(null);
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      (o.namaLokasi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.titikJemputNama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.titikAntarNama || '').toLowerCase().includes(searchQuery.toLowerCase());

    let matchPeriod = true;
    const now = Date.now();
    if (filterPeriod === 'Hari Ini') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      matchPeriod = o.timestamp >= d.getTime();
    } else if (filterPeriod === 'Minggu Ini') {
      matchPeriod = o.timestamp >= now - 7 * 24 * 60 * 60 * 1000;
    } else if (filterPeriod === 'Bulan Ini') {
      matchPeriod = o.timestamp >= now - 30 * 24 * 60 * 60 * 1000;
    }

    return matchSearch && matchPeriod;
  });

  const totalPendapatanFiltered = filteredOrders.reduce((s, o) => s + o.nominal, 0);

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
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>Catat & Riwayat Order</span>
          </h2>
          <p className="text-xs text-slate-400">
            Platform Terdaftar: <strong className="text-emerald-400">{platform}</strong> • Hasil Bersih yang Diterima
          </p>
        </div>

        <button
          onClick={() => exportLaporanOrderPDF(profile, filteredOrders, filterPeriod)}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Input Order Card */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl">
        <form onSubmit={handleSimpanOrder} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1">
              Pendapatan Driver yang Anda Terima (Rp)
            </label>
            <div className="relative">
              <input
                type="number"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                placeholder="Contoh: 14400"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-2xl font-mono font-extrabold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3.5 top-3.5 text-xs text-slate-500 font-bold">RP</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Masukkan uang bersih yang Anda dapatkan di dompet (tanpa potongan).
            </p>
          </div>

          {/* Titik Jemput & Titik Antar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-300 font-bold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Titik Jemput
                </label>
                <button
                  type="button"
                  onClick={handleAmbilGPSJemput}
                  disabled={isLocating}
                  className="text-[10px] text-emerald-400 hover:underline font-medium"
                >
                  {isLocating ? 'Cari GPS...' : '📍 Kunci GPS'}
                </button>
              </div>
              <input
                type="text"
                value={titikJemput}
                onChange={(e) => setTitikJemput(e.target.value)}
                placeholder="Misal: Stasiun Manggarai"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold flex items-center gap-1 mb-1">
                <Navigation className="w-3.5 h-3.5 text-sky-400" /> Titik Antar (Tujuan)
              </label>
              <input
                type="text"
                value={titikAntar}
                onChange={(e) => setTitikAntar(e.target.value)}
                placeholder="Misal: Mall Grand Indonesia"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="submit"
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Simpan Langsung</span>
            </button>

            <button
              type="button"
              onClick={handleMulaiTripAktif}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 active:scale-95 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
            >
              <Navigation className="w-4 h-4" />
              <span>Trip 3 Tombol Lapangan</span>
            </button>
          </div>
        </form>
      </div>

      {/* Riwayat Order Filter & List */}
      <div className="space-y-3">
        {/* Filter Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari lokasi jemput atau antar..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
            />
          </div>

          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300"
          >
            <option value="Semua">Semua Waktu</option>
            <option value="Hari Ini">Hari Ini</option>
            <option value="Minggu Ini">Minggu Ini</option>
            <option value="Bulan Ini">Bulan Ini</option>
          </select>
        </div>

        {/* Summary of Filtered Orders */}
        <div className="flex items-center justify-between text-xs px-1 text-slate-400">
          <span>
            Menampilkan <strong>{filteredOrders.length}</strong> trip
          </span>
          <span>
            Total Pendapatan:{' '}
            <strong className="text-emerald-400 font-mono text-sm">
              {formatRupiah(totalPendapatanFiltered)}
            </strong>
          </span>
        </div>

        {/* Order Cards */}
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-900/60 rounded-2xl p-8 text-center border border-slate-800 text-xs text-slate-400">
            Belum ada catatan perjalanan.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders
              .slice()
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((o) => {
                const date = new Date(o.timestamp);
                const jam = `${date.getHours().toString().padStart(2, '0')}:${date
                  .getMinutes()
                  .toString()
                  .padStart(2, '0')}`;

                return (
                  <div
                    key={o.id}
                    className="bg-slate-900/90 amoled:bg-black rounded-2xl p-3.5 border border-slate-800 hover:border-slate-700 transition space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono">
                            {formatTanggalIndonesia(o.timestamp)} • {jam}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                            {o.platform}
                          </span>
                        </div>

                        <div className="text-xs text-slate-200 font-medium mt-1 truncate">
                          {o.titikJemputNama && o.titikAntarNama ? (
                            <span>
                              {o.titikJemputNama} <span className="text-emerald-400 font-bold">➔</span> {o.titikAntarNama}
                            </span>
                          ) : (
                            o.namaLokasi || o.wilayah || 'Trip Lapangan'
                          )}
                        </div>

                        {o.kmTotalTrip && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            Jarak Tempuh: <strong className="text-amber-300">{o.kmTotalTrip.toFixed(1)} KM</strong>
                            {o.kmKeJemput ? ` (Jemput: ${o.kmKeJemput} KM, Antar: ${o.kmKeAntar || 0} KM)` : ''}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm font-bold text-emerald-400">
                          {formatRupiah(o.nominal)}
                        </div>

                        {/* TOMBOL HAPUS DENGAN MODAL IN-APP */}
                        <button
                          type="button"
                          onClick={() => setOrderToDelete(o)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700 mt-1 transition active:scale-95"
                          title="Hapus Catatan Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* MODAL KONFIRMASI HAPUS (BUKAN WINDOW.CONFIRM) */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xs w-full p-5 shadow-2xl space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Hapus Catatan Order?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Order sebesar <strong className="text-emerald-400 font-mono">{formatRupiah(orderToDelete.nominal)}</strong> akan dihapus permanen dari riwayat harian.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 active:scale-95"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
