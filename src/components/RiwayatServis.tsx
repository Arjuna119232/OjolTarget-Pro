import React, { useState } from 'react';
import {
  Wrench,
  Gauge,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  FileText,
  DollarSign,
  TrendingDown,
  Building2,
  ShieldCheck,
  Bell,
  Clock,
  Sparkles,
  Edit3,
} from 'lucide-react';
import {
  DriverProfile,
  ServiceRecord,
  RepairLog,
  ServiceType,
  WorkshopType,
  OJOL_SERVICE_INTERVALS,
  HARIAN_SERVICE_INTERVALS,
  UserSettings,
} from '@/types';
import {
  hitungStatusSemuaServis,
  hitungEstimasiBiayaServisMendatang,
  hitungAnalisisPerawatan,
  ServiceStatusItem,
} from '@/lib/serviceEngine';
import { formatRupiah, formatKM, formatTanggalIndonesia } from '@/lib/nominatim';
import { exportBukuServisPDF } from '@/lib/pdfExport';

interface RiwayatServisProps {
  profile: DriverProfile | null;
  services: ServiceRecord[];
  repairs: RepairLog[];
  settings: UserSettings;
  onUpdateKM: (km: number) => void;
  onAddService: (record: ServiceRecord) => void;
  onDeleteService: (id: string) => void;
  onAddRepair: (repair: RepairLog) => void;
  onDeleteRepair: (id: string) => void;
  onUpdateModeKendaraan: (mode: 'Ojol Aktif' | 'Harian Biasa') => void;
}

export function RiwayatServis({
  profile,
  services,
  repairs,
  settings,
  onUpdateKM,
  onAddService,
  onDeleteService,
  onAddRepair,
  onDeleteRepair,
  onUpdateModeKendaraan,
}: RiwayatServisProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'riwayat' | 'perbaikan' | 'estimasi'>('status');
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showAddRepairModal, setShowAddRepairModal] = useState(false);
  const [quickKMInput, setQuickKMInput] = useState(profile?.currentKM?.toString() || '0');

  // Modal in-app untuk hapus servis & perbaikan (tanpa window.confirm agar responsif di iframe & webview)
  const [serviceToDelete, setServiceToDelete] = useState<ServiceRecord | null>(null);
  const [repairToDelete, setRepairToDelete] = useState<RepairLog | null>(null);

  // Form State Tambah Servis
  const [formService, setFormService] = useState({
    type: 'Oli Mesin' as ServiceType,
    bengkel: 'AHASS Bengkel Resmi Honda',
    tipeBengkel: 'Bengkel Resmi (AHASS/Yamaha/dll)' as WorkshopType,
    noFaktur: '',
    kmAtServis: profile?.currentKM?.toString() || '0',
    biayaPart: '65000',
    biayaJasa: '25000',
    catatan: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  // Form State Tambah Perbaikan
  const [formRepair, setFormRepair] = useState({
    komponen: 'Ganti Roller & V-Belt CVT',
    kategori: 'Transmisi / CVT' as RepairLog['kategori'],
    gejala: 'Tarikan awal gredeg saat boncengan',
    tindakan: 'Ganti Baru' as RepairLog['tindakan'],
    kmPerbaikan: profile?.currentKM?.toString() || '0',
    biaya: '185000',
    bengkel: 'AHASS / Bengkel Resmi',
    garansiBulan: 1,
    tanggal: new Date().toISOString().split('T')[0],
  });

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const currentKM = profile?.currentKM || 0;
  const modeKendaraan = profile?.modeKendaraan || 'Ojol Aktif';
  const intervals = modeKendaraan === 'Ojol Aktif' ? OJOL_SERVICE_INTERVALS : HARIAN_SERVICE_INTERVALS;

  const serviceStatuses = hitungStatusSemuaServis(
    services,
    currentKM,
    modeKendaraan,
    settings.servisReminderThresholdKM
  );

  const estimasiBiaya = hitungEstimasiBiayaServisMendatang(serviceStatuses);
  const analisis = hitungAnalisisPerawatan(services, repairs, currentKM);

  const handleSaveKM = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(quickKMInput, 10);
    if (!isNaN(val) && val >= 0) {
      onUpdateKM(val);
      showToast(`✅ Odometer diperbarui ke ${formatKM(val)}. Semua data servis disinkronkan!`);
    }
  };

  const submitTambahServis = (e: React.FormEvent) => {
    e.preventDefault();
    const kmAt = parseInt(formService.kmAtServis, 10) || currentKM;
    const interval = intervals[formService.type];
    const bPart = parseInt(formService.biayaPart, 10) || 0;
    const bJasa = parseInt(formService.biayaJasa, 10) || 0;

    const record: ServiceRecord = {
      id: crypto.randomUUID(),
      type: formService.type,
      bengkel: formService.bengkel,
      tipeBengkel: formService.tipeBengkel,
      noFaktur: formService.noFaktur || undefined,
      kmAtServis: kmAt,
      targetKM: kmAt + interval,
      biayaPart: bPart,
      biayaJasa: bJasa,
      totalBiaya: bPart + bJasa,
      catatan: formService.catatan,
      tanggal: formService.tanggal || new Date().toISOString(),
      createdAt: Date.now(),
    };

    onAddService(record);

    if (kmAt > currentKM) {
      onUpdateKM(kmAt);
    }

    setShowAddServiceModal(false);
    showToast(`🔧 Servis ${record.type} berhasil disimpan pada ${formatKM(kmAt)}!`);
  };

  const submitTambahRepair = (e: React.FormEvent) => {
    e.preventDefault();
    const kmP = parseInt(formRepair.kmPerbaikan, 10) || currentKM;
    const b = parseInt(formRepair.biaya, 10) || 0;

    const rep: RepairLog = {
      id: crypto.randomUUID(),
      komponen: formRepair.komponen,
      kategori: formRepair.kategori,
      gejala: formRepair.gejala,
      tindakan: formRepair.tindakan,
      kmPerbaikan: kmP,
      biaya: b,
      bengkel: formRepair.bengkel,
      garansiBulan: formRepair.garansiBulan || 0,
      tanggal: formRepair.tanggal || new Date().toISOString(),
      createdAt: Date.now(),
    };

    onAddRepair(rep);
    setShowAddRepairModal(false);
    showToast(`🛠️ Log perbaikan ${rep.komponen} berhasil dicatat.`);
  };

  const handleConfirmDeleteService = () => {
    if (!serviceToDelete) return;
    onDeleteService(serviceToDelete.id);
    showToast(`🗑️ Servis ${serviceToDelete.type} berhasil dihapus.`);
    setServiceToDelete(null);
  };

  const handleConfirmDeleteRepair = () => {
    if (!repairToDelete) return;
    onDeleteRepair(repairToDelete.id);
    showToast(`🗑️ Log perbaikan ${repairToDelete.komponen} berhasil dihapus.`);
    setRepairToDelete(null);
  };

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

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" />
            <span>Perawatan & Servis Armada</span>
          </h2>
          <p className="text-xs text-slate-400">
            Sinkronisasi KM Odometer, Rekap Bengkel Resmi & Estimasi Biaya
          </p>
        </div>

        <button
          onClick={() => exportBukuServisPDF(profile, services, repairs)}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>Buku Servis PDF</span>
        </button>
      </div>

      {/* Odometer Real-Time Sync Bar */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">KM Odometer Kendaraan Berjalan</div>
              <div className="text-[11px] text-slate-400">
                {profile?.modelKendaraan || 'Motor'} ({profile?.platNomor || '-'})
              </div>
            </div>
          </div>

          {/* Mode Ojol vs Harian Selector */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px]">
            <button
              onClick={() => onUpdateModeKendaraan('Ojol Aktif')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                modeKendaraan === 'Ojol Aktif'
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Standar Ojol (Intensif)
            </button>
            <button
              onClick={() => onUpdateModeKendaraan('Harian Biasa')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                modeKendaraan === 'Harian Biasa'
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Harian Santai
            </button>
          </div>
        </div>

        {/* Input Form Odometer */}
        <form onSubmit={handleSaveKM} className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              type="number"
              value={quickKMInput}
              onChange={(e) => setQuickKMInput(e.target.value)}
              placeholder="KM speedometer saat ini"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
            />
            <span className="absolute right-3 top-3 text-xs text-slate-500 font-mono">KM</span>
          </div>

          <button
            type="submit"
            className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs shadow-md transition whitespace-nowrap"
          >
            Sinkronkan KM
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
          <span>
            {modeKendaraan === 'Ojol Aktif'
              ? '⚙️ Interval Oli Mesin ojol dihitung tiap 2.000 KM (kondisi jalanan macet & panas)'
              : '🛵 Interval Oli Mesin harian standar 4.000 KM'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-slate-900/90 amoled:bg-black border border-slate-800 text-xs">
        {[
          { id: 'status', label: 'Status & Jadwal', icon: Calendar },
          { id: 'riwayat', label: `Riwayat Servis (${services.length})`, icon: Wrench },
          { id: 'perbaikan', label: `Log Perbaikan (${repairs.length})`, icon: ShieldCheck },
          { id: 'estimasi', label: 'Estimasi Biaya', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isAct = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                isAct
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: STATUS & JADWAL SERVIS BERKALA (DENGAN SINKRONISASI KM) */}
      {activeTab === 'status' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300">
              Sinkronisasi Odometer vs Riwayat Servis
            </span>
            <button
              onClick={() => {
                setFormService({
                  ...formService,
                  kmAtServis: currentKM.toString(),
                });
                setShowAddServiceModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Servis Baru</span>
            </button>
          </div>

          {/* Cards for each service item */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {serviceStatuses.map((item) => {
              const isOverdue = item.isOverdue;
              const isWarning = item.status === 'MENDEKATI';

              return (
                <div
                  key={item.type}
                  className={`bg-slate-900/90 amoled:bg-black rounded-2xl p-4 border transition ${
                    isOverdue
                      ? 'border-rose-500/60 bg-rose-950/10'
                      : isWarning
                      ? 'border-amber-500/60 bg-amber-950/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{item.type}</span>
                        {isOverdue ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Jatuh Tempo!
                          </span>
                        ) : isWarning ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Segera Servis
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Aman
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Interval Ojol: tiap {formatKM(item.intervalKM)} • Estimasi Biaya:{' '}
                        {formatRupiah(item.estimasiBiaya)}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setFormService({
                          ...formService,
                          type: item.type,
                          kmAtServis: currentKM.toString(),
                        });
                        setShowAddServiceModal(true);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-emerald-300 border border-slate-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Catat
                    </button>
                  </div>

                  {/* 3 Metric Columns: KM Saat Servis, Sudah Jalan, Sisa KM */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 mb-3 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400">KM Servis Lalu</div>
                      <div className="font-mono text-xs font-bold text-slate-200 mt-0.5">
                        {formatKM(item.kmAtServis)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Sudah Jalan</div>
                      <div className="font-mono text-xs font-bold text-sky-400 mt-0.5">
                        {formatKM(item.kmSudahJalan)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">
                        {isOverdue ? 'Terlambat' : 'Sisa KM'}
                      </div>
                      <div
                        className={`font-mono text-xs font-bold mt-0.5 ${
                          isOverdue
                            ? 'text-rose-400 font-extrabold'
                            : isWarning
                            ? 'text-amber-300'
                            : 'text-emerald-400'
                        }`}
                      >
                        {isOverdue ? `Lewat ${item.lewatKM} KM!` : formatKM(item.kmSisa)}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Pemakaian: {item.pctDipakai}%</span>
                      <span>Target KM Berikutnya: {formatKM(item.targetKM)}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isOverdue ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, item.pctDipakai)}%` }}
                      />
                    </div>
                  </div>

                  {item.bengkelTerakhir && (
                    <div className="text-[10px] text-slate-400 mt-2 truncate">
                      🔧 Bengkel: {item.bengkelTerakhir} (
                      {item.tanggalTerakhir ? formatTanggalIndonesia(item.tanggalTerakhir) : '-'})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: RIWAYAT SERVIS RESMI & UMUM */}
      {activeTab === 'riwayat' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300">
              Riwayat Servis Terdaftar ({services.length})
            </span>
            <button
              onClick={() => {
                setFormService({ ...formService, kmAtServis: currentKM.toString() });
                setShowAddServiceModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Servis</span>
            </button>
          </div>

          {services.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl p-8 text-center border border-slate-800">
              <Wrench className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-300">Belum ada catatan servis</div>
              <p className="text-xs text-slate-500 mt-1">
                Catat servis resmi dari AHASS, Yamaha, atau bengkel langganan untuk melacak riwayat KM kendaraan.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {services
                .slice()
                .sort((a, b) => b.kmAtServis - a.kmAtServis || b.createdAt - a.createdAt)
                .map((s) => {
                  const sudahJalan = Math.max(0, currentKM - s.kmAtServis);
                  const sisa = s.targetKM - currentKM;

                  return (
                    <div
                      key={s.id}
                      className="bg-slate-900/90 amoled:bg-black rounded-2xl p-3.5 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{s.type}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {s.tipeBengkel.split(' ')[0]}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5 font-medium">
                            {s.bengkel} {s.noFaktur ? `(Faktur: ${s.noFaktur})` : ''}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Tanggal: {formatTanggalIndonesia(s.tanggal)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono text-sm font-bold text-emerald-400">
                            {formatRupiah(s.totalBiaya)}
                          </div>
                          {/* TOMBOL HAPUS DENGAN MODAL IN-APP */}
                          <button
                            type="button"
                            onClick={() => setServiceToDelete(s)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700 mt-1 inline-block transition active:scale-95"
                            title="Hapus Catatan Servis Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        </div>
                      </div>

                      {/* Detail Sinkronisasi KM */}
                      <div className="grid grid-cols-4 gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800 mt-2 text-center text-[10px]">
                        <div>
                          <span className="text-slate-500 block">KM Masuk</span>
                          <span className="font-mono font-bold text-slate-300">
                            {formatKM(s.kmAtServis)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">KM Sekarang</span>
                          <span className="font-mono font-bold text-amber-300">
                            {formatKM(currentKM)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Sudah Jalan</span>
                          <span className="font-mono font-bold text-sky-400">
                            {formatKM(sudahJalan)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Sisa KM</span>
                          <span
                            className={`font-mono font-bold ${
                              sisa <= 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {sisa <= 0 ? `Lewat ${Math.abs(sisa)} KM` : formatKM(sisa)}
                          </span>
                        </div>
                      </div>

                      {s.catatan && (
                        <div className="text-[11px] text-slate-400 mt-2 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                          "{s.catatan}"
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LOG RIWAYAT PERBAIKAN JANGKA PANJANG */}
      {activeTab === 'perbaikan' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <span className="text-xs font-bold text-slate-300">
                Log Perbaikan & Penggantian Part ({repairs.length})
              </span>
              <p className="text-[11px] text-slate-500">
                Memantau keawetan suku cadang dan performa jangka panjang
              </p>
            </div>
            <button
              onClick={() => {
                setFormRepair({ ...formRepair, kmPerbaikan: currentKM.toString() });
                setShowAddRepairModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Perbaikan</span>
            </button>
          </div>

          {repairs.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl p-8 text-center border border-slate-800">
              <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-300">Belum ada riwayat perbaikan</div>
              <p className="text-xs text-slate-500 mt-1">
                Catat penggantian roller, dinamo, aki, kampas rem, atau part berat lainnya saat motor diperbaiki.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {repairs
                .slice()
                .sort((a, b) => b.kmPerbaikan - a.kmPerbaikan || b.createdAt - a.createdAt)
                .map((r) => (
                  <div
                    key={r.id}
                    className="bg-slate-900/90 amoled:bg-black rounded-2xl p-3.5 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{r.komponen}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            {r.kategori}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Tindakan: <strong>{r.tindakan}</strong> • Bengkel: {r.bengkel}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          KM Perbaikan: <span className="font-mono font-bold text-amber-300">{formatKM(r.kmPerbaikan)}</span> • {formatTanggalIndonesia(r.tanggal)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-emerald-400">
                          {formatRupiah(r.biaya)}
                        </div>
                        {/* TOMBOL HAPUS DENGAN MODAL IN-APP */}
                        <button
                          type="button"
                          onClick={() => setRepairToDelete(r)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700 mt-1 inline-block transition active:scale-95"
                          title="Hapus Catatan Perbaikan Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>

                    {r.gejala && (
                      <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                        Gejala Awal: <span className="text-slate-300">{r.gejala}</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ESTIMASI BIAYA SERVIS BERDASARKAN RIWAYAT */}
      {activeTab === 'estimasi' && (
        <div className="space-y-3">
          <div className="bg-slate-900/90 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Estimasi Biaya Servis & Perawatan Armada
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Dihitung otomatis dari data riwayat perbaikan dan biaya suku cadang sebelumnya.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Servis Jatuh Tempo</div>
                <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                  {formatRupiah(estimasiBiaya.totalBiayaJatuhTempo)}
                </div>
                <div className="text-[10px] text-slate-500">Perlu dituntaskan segera</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Servis Mendekati</div>
                <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                  {formatRupiah(estimasiBiaya.totalBiayaMendekati)}
                </div>
                <div className="text-[10px] text-slate-500">Dalam ≤ 250 KM ke depan</div>
              </div>
            </div>

            {/* Total Maintenance Expense Analytics */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total Biaya Servis Berkala:</span>
                <span className="font-mono font-bold text-white">
                  {formatRupiah(analisis.totalPengeluaranServis)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Biaya Perbaikan & Part:</span>
                <span className="font-mono font-bold text-white">
                  {formatRupiah(analisis.totalPengeluaranPerbaikan)}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-emerald-400">
                <span>Total Pengeluaran Perawatan:</span>
                <span className="font-mono">{formatRupiah(analisis.totalKeseluruhan)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>Rata-rata Biaya Perawatan per KM:</span>
                <span className="font-mono font-bold text-amber-400">
                  Rp {analisis.biayaPerKM} / KM
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT SERVIS BARU (BENGKEL RESMI / UMUM) */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-5 shadow-2xl my-8">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-400" />
              <span>Input Data Servis Kendaraan</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Masukkan data KM saat servis dilakukan agar data odometer dan jarak tempuh sinkron akurat.
            </p>

            <form onSubmit={submitTambahServis} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Jenis Servis</label>
                <select
                  value={formService.type}
                  onChange={(e) => setFormService({ ...formService, type: e.target.value as ServiceType })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                >
                  {(Object.keys(OJOL_SERVICE_INTERVALS) as ServiceType[]).map((t) => (
                    <option key={t} value={t}>
                      {t} (Interval {intervals[t]} KM)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipe Bengkel</label>
                  <select
                    value={formService.tipeBengkel}
                    onChange={(e) =>
                      setFormService({ ...formService, tipeBengkel: e.target.value as WorkshopType })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white"
                  >
                    <option value="Bengkel Resmi (AHASS/Yamaha/dll)">Bengkel Resmi</option>
                    <option value="Bengkel Spesialis / Langganan">Bengkel Spesialis</option>
                    <option value="Planet Ban / Shop&Drive">Planet Ban / Shop&Drive</option>
                    <option value="Servis Mandiri (DIY)">Servis Mandiri</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nama Bengkel</label>
                  <input
                    type="text"
                    value={formService.bengkel}
                    onChange={(e) => setFormService({ ...formService, bengkel: e.target.value })}
                    placeholder="AHASS / Yamaha"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* CRITICAL: KM SAAT SERVIS DILAKUKAN */}
              <div>
                <label className="block text-slate-300 font-bold mb-1 text-emerald-400">
                  KM Saat Servis Dilakukan (Manual Odometer / Struk)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formService.kmAtServis}
                    onChange={(e) => setFormService({ ...formService, kmAtServis: e.target.value })}
                    placeholder="Contoh: 42000"
                    required
                    className="w-full bg-slate-950 border border-emerald-500/60 rounded-xl px-3.5 py-2.5 font-mono text-base font-bold text-amber-300 focus:outline-none"
                  />
                  <span className="absolute right-3 top-3 text-xs text-slate-500 font-mono">KM</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Angka ini memastikan Anda tahu persis berapa KM motor sudah melaju sejak servis ini.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Biaya Suku Cadang (Rp)</label>
                  <input
                    type="number"
                    value={formService.biayaPart}
                    onChange={(e) => setFormService({ ...formService, biayaPart: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Biaya Jasa Bengkel (Rp)</label>
                  <input
                    type="number"
                    value={formService.biayaJasa}
                    onChange={(e) => setFormService({ ...formService, biayaJasa: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">No. Faktur / Struk (Opsional)</label>
                  <input
                    type="text"
                    value={formService.noFaktur}
                    onChange={(e) => setFormService({ ...formService, noFaktur: e.target.value })}
                    placeholder="INV-2026-XXXX"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tanggal Pengerjaan</label>
                  <input
                    type="date"
                    value={formService.tanggal}
                    onChange={(e) => setFormService({ ...formService, tanggal: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Catatan Mekanik / Merk Part</label>
                <input
                  type="text"
                  value={formService.catatan}
                  onChange={(e) => setFormService({ ...formService, catatan: e.target.value })}
                  placeholder="Misal: Oli Shell Advance 10W-40 + Busi NGK"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20"
                >
                  Simpan & Sinkronkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INPUT PERBAIKAN BARU */}
      {showAddRepairModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-5 shadow-2xl my-8">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Catat Log Perbaikan & Penggantian Part</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Rekam tindakan perbaikan komponen untuk memantau performa dan umur pakai motor.
            </p>

            <form onSubmit={submitTambahRepair} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Komponen / Suku Cadang</label>
                <input
                  type="text"
                  value={formRepair.komponen}
                  onChange={(e) => setFormRepair({ ...formRepair, komponen: e.target.value })}
                  placeholder="Contoh: Roller KTC 10g + Kampas Ganda"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kategori</label>
                  <select
                    value={formRepair.kategori}
                    onChange={(e) => setFormRepair({ ...formRepair, kategori: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Transmisi / CVT">Transmisi / CVT</option>
                    <option value="Mesin">Mesin</option>
                    <option value="Rem">Rem</option>
                    <option value="Kelistrikan">Kelistrikan</option>
                    <option value="Kaki-kaki / Ban">Kaki-kaki / Ban</option>
                    <option value="Bodi / Aksesoris">Bodi / Aksesoris</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tindakan</label>
                  <select
                    value={formRepair.tindakan}
                    onChange={(e) => setFormRepair({ ...formRepair, tindakan: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Ganti Baru">Ganti Baru</option>
                    <option value="Perbaikan / Bubut">Perbaikan / Bubut</option>
                    <option value="Pembersihan / Setel">Pembersihan / Setel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">KM Saat Perbaikan</label>
                  <input
                    type="number"
                    value={formRepair.kmPerbaikan}
                    onChange={(e) => setFormRepair({ ...formRepair, kmPerbaikan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Total Biaya (Rp)</label>
                  <input
                    type="number"
                    value={formRepair.biaya}
                    onChange={(e) => setFormRepair({ ...formRepair, biaya: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Gejala / Alasan Perbaikan</label>
                <input
                  type="text"
                  value={formRepair.gejala}
                  onChange={(e) => setFormRepair({ ...formRepair, gejala: e.target.value })}
                  placeholder="Misal: Bunyi mendecit di roda belakang"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddRepairModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20"
                >
                  Simpan Log Perbaikan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS SERVIS (BUKAN WINDOW.CONFIRM) */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xs w-full p-5 shadow-2xl space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Hapus Catatan Servis?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Catatan servis <strong className="text-emerald-400">{serviceToDelete.type}</strong> pada KM {formatKM(serviceToDelete.kmAtServis)} akan dihapus.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteService}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 active:scale-95"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS LOG PERBAIKAN (BUKAN WINDOW.CONFIRM) */}
      {repairToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xs w-full p-5 shadow-2xl space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Hapus Log Perbaikan?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Catatan perbaikan <strong className="text-emerald-400">{repairToDelete.komponen}</strong> akan dihapus permanen.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRepairToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRepair}
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
