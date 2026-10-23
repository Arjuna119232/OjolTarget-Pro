import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  BatteryCharging,
  BatteryMedium,
  BatteryWarning,
  Gauge,
  Moon,
  Sun,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { DriverProfile, ServiceRecord, UserSettings } from '@/types';
import { hitungStatusSemuaServis, getServisPalingMendesak } from '@/lib/serviceEngine';
import { getCachedBatteryInfo, subscribeBattery, applyAdaptivePowerMode, PowerMode } from '@/lib/battery';
import { formatKM } from '@/lib/nominatim';

interface HeaderHUDProps {
  profile: DriverProfile | null;
  services: ServiceRecord[];
  settings: UserSettings;
  onUpdateKM: (newKM: number) => void;
  onToggleBatterySaver: () => void;
  onOpenServiceTab: () => void;
  onOpenPermissions?: () => void;
}

export function HeaderHUD({
  profile,
  services,
  settings,
  onUpdateKM,
  onToggleBatterySaver,
  onOpenServiceTab,
  onOpenPermissions,
}: HeaderHUDProps) {
  const [battery, setBattery] = useState(getCachedBatteryInfo());
  const [showKMModal, setShowKMModal] = useState(false);
  const [inputKM, setInputKM] = useState(profile?.currentKM?.toString() || '0');
  const [showComplianceModal, setShowComplianceModal] = useState(false);

  useEffect(() => {
    return subscribeBattery((info) => setBattery(info));
  }, []);

  const currentKM = profile?.currentKM || 0;
  const statusServis = hitungStatusSemuaServis(
    services,
    currentKM,
    profile?.modeKendaraan || 'Ojol Aktif',
    settings.servisReminderThresholdKM
  );
  const servisMendesak = getServisPalingMendesak(statusServis);

  const handleSimpanKM = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputKM, 10);
    if (!isNaN(val) && val >= 0) {
      onUpdateKM(val);
      setShowKMModal(false);
    }
  };

  const isAmoled = settings.themeMode === 'amoled';

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/90 amoled:bg-black/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 flex items-center justify-between gap-2 text-xs">
        {/* Brand & Platform Badge */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-sm">
            OT
          </div>
          <div className="leading-tight">
            <div className="font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>{profile?.nama || 'Mitra Ojol'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium">
                {profile?.primaryPlatform || 'Ojol'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {profile?.platNomor || 'Armada Aktif'}
            </div>
          </div>
        </div>

        {/* Center & Right Status Badges */}
        <div className="flex items-center gap-1.5">
          {/* Odometer Quick Button */}
          <button
            onClick={() => {
              setInputKM((profile?.currentKM || 0).toString());
              setShowKMModal(true);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700/60 font-mono transition"
            title="Sinkronkan KM Odometer Kendaraan"
          >
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-amber-300">{formatKM(currentKM)}</span>
          </button>

          {/* Urgent Service Reminder Chip */}
          {servisMendesak && servisMendesak.status !== 'AMAN' && (
            <button
              onClick={onOpenServiceTab}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium animate-pulse border ${
                servisMendesak.status === 'JATUH_TEMPO'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              }`}
              title={`${servisMendesak.type}: ${servisMendesak.status === 'JATUH_TEMPO' ? 'Jatuh Tempo!' : 'Segera Servis'}`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>
                {servisMendesak.type.split(' ')[0]} ({servisMendesak.kmSisa <= 0 ? 'Lewat!' : `${servisMendesak.kmSisa} KM`})
              </span>
            </button>
          )}

          {/* Compliance & Permissions */}
          <button
            onClick={() => {
              if (onOpenPermissions) onOpenPermissions();
              else setShowComplianceModal(true);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
            title="Izin Aplikasi & Kepatuhan Platform"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">Izin</span>
          </button>

          {/* Adaptive Battery Toggle */}
          <button
            onClick={onToggleBatterySaver}
            className={`flex items-center gap-1 px-2 py-1 rounded-md font-mono text-[11px] border transition ${
              settings.adaptiveBatterySaver
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Mode Hemat Daya Adaptif & AMOLED"
          >
            {battery.charging ? (
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            ) : battery.isLow ? (
              <BatteryWarning className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
            ) : (
              <BatteryMedium className="w-3.5 h-3.5 text-teal-400" />
            )}
            <span>{battery.levelPct}%</span>
            {isAmoled && <Zap className="w-3 h-3 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* Modal Sinkronisasi KM Odometer */}
      {showKMModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Sinkronisasi KM Kendaraan</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Masukkan angka KM speedometer kendaraan Anda saat ini. Data ini akan langsung disinkronkan dengan seluruh riwayat servis (oli, kampas rem, cvt, dll) untuk menghitung sisa KM yang akurat.
            </p>
            <form onSubmit={handleSimpanKM} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  KM Odometer Sekarang
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={inputKM}
                    onChange={(e) => setInputKM(e.target.value)}
                    placeholder="Contoh: 42500"
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-3.5 text-xs text-slate-500 font-mono font-medium">
                    KM
                  </span>
                </div>
              </div>

              {/* Quick Increment buttons */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Tambah cepat:</span>
                {[+25, +50, +100].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => {
                      const cur = parseInt(inputKM, 10) || currentKM;
                      setInputKM((cur + inc).toString());
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono"
                  >
                    +{inc} KM
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKMModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20"
                >
                  Simpan & Sinkronkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kepatuhan Platform (Anti-Detection Compliance) */}
      {showComplianceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">
                100% Kepatuhan Platform Mitra Driver
              </h3>
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              OjolTarget Pro dirancang secara ketat sebagai <strong>asisten logbook, navigasi titik, dan buku servis mandiri</strong> yang beroperasi berdampingan dengan aman tanpa melanggar aturan platform ojol:
            </p>
            <div className="space-y-2 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800 mb-4 font-sans">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span className="text-slate-300">
                  <strong>Bukan Fake GPS / Mock Location:</strong> Menggunakan sinyal GPS perangkat asli dari satelit tanpa manipulasi titik palsu.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span className="text-slate-300">
                  <strong>Bukan Auto-Clicker / Bot:</strong> Tidak menyentuh layar secara otomatis atau mengotomatisasi bid/terima pesanan.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span className="text-slate-300">
                  <strong>Non-Invasive:</strong> Tidak memodifikasi file APK Gojek, Grab, Shopee, Maxim, atau inDriver. Bebas root dan aman dari deteksi sistem anti-cheat.
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowComplianceModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
            >
              Saya Mengerti (Tutup)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
