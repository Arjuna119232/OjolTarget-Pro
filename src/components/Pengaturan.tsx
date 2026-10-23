import React, { useState } from 'react';
import {
  User,
  Settings,
  Bell,
  Moon,
  Sun,
  Zap,
  Battery,
  ShieldCheck,
  Database,
  Download,
  Upload,
  Trash2,
  CheckCircle,
  HelpCircle,
  Smartphone,
  Gauge,
} from 'lucide-react';
import {
  DriverProfile,
  UserSettings,
  PlatformType,
  VehicleType,
} from '@/types';
import { smartCache } from '@/lib/cache';
import { exportAllDataJSON, importAllDataJSON } from '@/lib/storage';

interface PengaturanProps {
  profile: DriverProfile | null;
  settings: UserSettings;
  onSaveProfile: (p: DriverProfile) => void;
  onSaveSettings: (s: UserSettings) => void;
  onOpenPermissions?: () => void;
  onResetAllData?: () => void;
}

export function Pengaturan({
  profile,
  settings,
  onSaveProfile,
  onSaveSettings,
  onOpenPermissions,
}: PengaturanProps) {
  const [profileForm, setProfileForm] = useState<DriverProfile>(
    profile || {
      nama: 'Budi Santoso',
      noHp: '',
      platNomor: 'B 1234 XYZ',
      tipeKendaraan: 'Motor Bebek / Matic',
      modelKendaraan: 'Honda Vario 160',
      tahunKendaraan: '2023',
      platforms: ['Grab', 'Gojek'],
      primaryPlatform: 'Grab',
      daerahOperasional: 'Jakarta Selatan',
      odometerAwalPaten: 42000,
      currentKM: 42000,
      terakhirUpdateKM: Date.now(),
      modeKendaraan: 'Ojol Aktif',
      registeredAt: Date.now(),
    }
  );

  const [settingsForm, setSettingsForm] = useState<UserSettings>(settings);
  const [cacheStats, setCacheStats] = useState(smartCache.getStats());
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSimpanProfil = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(profileForm);
    showToast('✅ Profil & kendaraan berhasil diperbarui');
  };

  const handleUpdateSetting = <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => {
    const updated = { ...settingsForm, [key]: val };
    setSettingsForm(updated);
    onSaveSettings(updated);
  };

  const handleDownloadBackup = () => {
    const json = exportAllDataJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup-OjolTarget-Pro-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('📥 File backup JSON berhasil diunduh');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importAllDataJSON(content);
        if (ok) {
          alert('Data berhasil dipulihkan dari file backup!');
          window.location.reload();
        } else {
          alert('Format file backup tidak valid.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleClearCache = () => {
    smartCache.clear();
    setCacheStats(smartCache.getStats());
    showToast('🗑️ Smart Cache berhasil dibersihkan');
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

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>Pengaturan & Profil Pengemudi</span>
        </h2>
        <p className="text-xs text-slate-400">
          Kustomisasi notifikasi, tema hemat daya AMOLED, data kendaraan, dan cache
        </p>
      </div>

      {/* 1. Profil Mitra & Data Kendaraan */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-white">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-400" />
            Profil Driver & Kendaraan
          </span>
          <span className="text-[10px] text-slate-400">OjolTarget Pro</span>
        </div>

        <form onSubmit={handleSimpanProfil} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Nama Driver</label>
              <input
                type="text"
                value={profileForm.nama}
                onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Plat Nomor Kendaraan</label>
              <input
                type="text"
                value={profileForm.platNomor}
                onChange={(e) => setProfileForm({ ...profileForm, platNomor: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Model Kendaraan</label>
              <input
                type="text"
                value={profileForm.modelKendaraan}
                onChange={(e) => setProfileForm({ ...profileForm, modelKendaraan: e.target.value })}
                placeholder="Honda Vario / Beat / NMAX"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Tipe Kendaraan</label>
              <select
                value={profileForm.tipeKendaraan}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, tipeKendaraan: e.target.value as VehicleType })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              >
                <option value="Motor Bebek / Matic">Motor Bebek / Matic</option>
                <option value="Motor Sport">Motor Sport</option>
                <option value="Mobil Konvensional">Mobil Konvensional</option>
                <option value="Mobil Listrik">Mobil Listrik</option>
              </select>
            </div>
          </div>

          {/* Platform Multi-select */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Platform Ojol yang Diikuti</label>
            <div className="flex gap-1.5 flex-wrap">
              {(['Grab', 'Gojek', 'Maxim', 'ShopeeFood', 'InDriver'] as PlatformType[]).map((p) => {
                const isSelected = profileForm.platforms?.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      const cur = profileForm.platforms || [];
                      const next = isSelected ? cur.filter((x) => x !== p) : [...cur, p];
                      setProfileForm({ ...profileForm, platforms: next });
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '} {p}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition active:scale-98"
          >
            Simpan Perubahan Profil
          </button>
        </form>
      </div>

      {/* 2. Pengaturan Tampilan & Mode Hemat Baterai Adaptif */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-white">
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            Mode Tampilan & Hemat Baterai Lapangan
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">Baterai Awet</span>
        </div>

        <div className="space-y-3 text-xs">
          {/* AMOLED Pure Black Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                Mode Gelap AMOLED (Pure Black #000000)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Mematikan piksel OLED saat on-bid untuk penghematan baterai hingga 40%.
              </div>
            </div>
            <button
              onClick={() =>
                handleUpdateSetting(
                  'themeMode',
                  settingsForm.themeMode === 'amoled' ? 'dark' : 'amoled'
                )
              }
              className={`px-3 py-1.5 rounded-xl font-bold border transition ${
                settingsForm.themeMode === 'amoled'
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {settingsForm.themeMode === 'amoled' ? 'Aktif' : 'Standar'}
            </button>
          </div>

          {/* Mode Hemat Daya Adaptif */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <Battery className="w-3.5 h-3.5 text-teal-400" />
                Mode Hemat Daya Adaptif
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Mengurangi animasi dan membatasi frekuensi polling background saat daya rendah.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settingsForm.adaptiveBatterySaver}
              onChange={(e) => handleUpdateSetting('adaptiveBatterySaver', e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
          </div>
        </div>
      </div>

      {/* 3. Kustomisasi Notifikasi & Pengingat Servis */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-white">
          <span className="flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-sky-400" />
            Kustomisasi Notifikasi & Pengingat Servis
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Alarm Armada</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="font-bold text-white">Suara Notifikasi & Peringatan</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Bunyikan alarm saat servis jatuh tempo atau orderan dicatat.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settingsForm.soundAlerts}
              onChange={(e) => handleUpdateSetting('soundAlerts', e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="font-bold text-white">Getaran Perangkat</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Haptic vibration saat menekan tombol cepat atau mendekati servis.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settingsForm.vibrationAlerts}
              onChange={(e) => handleUpdateSetting('vibrationAlerts', e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">Batas Peringatan Servis Berkala</span>
              <span className="font-mono text-amber-400 font-bold">
                {settingsForm.servisReminderThresholdKM} KM sebelum jadwal
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="500"
              step="50"
              value={settingsForm.servisReminderThresholdKM}
              onChange={(e) =>
                handleUpdateSetting('servisReminderThresholdKM', parseInt(e.target.value, 10))
              }
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>100 KM (Mepet)</span>
              <span>250 KM (Rekomendasi Ojol)</span>
              <span>500 KM (Awal)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Izin Aplikasi Lapangan */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-white">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Izin Aplikasi Lapangan (GPS & Notifikasi)
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">Status Sistem</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Pastikan izin lokasi GPS satelit dan notifikasi diizinkan agar aplikasi berjalan stabil di latar belakang saat Anda berkendara.
        </p>
        <button
          type="button"
          onClick={() => onOpenPermissions && onOpenPermissions()}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center justify-center gap-1.5"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Buka Panel Izin Aplikasi</span>
        </button>
      </div>

      {/* 4. Sistem Cache Cerdas (Hemat Kuota Data Latar Belakang) */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-white">
          <span className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-400" />
            Sistem Cache Cerdas (Hemat Data Latar Belakang)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Smart Cache</span>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center text-xs">
          <div>
            <div className="text-[10px] text-slate-400">Tersimpan</div>
            <div className="font-mono font-bold text-white mt-0.5">{cacheStats.entries} lokasi</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Efisiensi Hit</div>
            <div className="font-mono font-bold text-emerald-400 mt-0.5">
              {cacheStats.hitRatePct}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Hemat Kuota</div>
            <div className="font-mono font-bold text-sky-400 mt-0.5">
              ~{cacheStats.estimatedSavedDataKB} KB
            </div>
          </div>
        </div>

        <button
          onClick={handleClearCache}
          className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Bersihkan Cache Lokasi</span>
        </button>
      </div>

      {/* 5. Backup & Restore Data */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="text-xs font-bold text-white flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Download className="w-4 h-4 text-amber-400" />
            Cadangan & Pemulihan Data (Backup JSON)
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Semua riwayat servis, perbaikan bengkel, dan catatan trip tersimpan aman di perangkat Anda. Unduh cadangan untuk pindah ponsel atau simpan arsip.
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={handleDownloadBackup}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unduh Backup</span>
          </button>

          <label className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer text-center">
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Pulihkan Data</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* 6. Legal & Anti-Detection Compliance Notice */}
      <div className="bg-slate-950 p-4 rounded-3xl border border-emerald-500/30 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 font-bold text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Keamanan Akun & Kepatuhan Platform Terverifikasi</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-300">
          OjolTarget Pro tidak memodifikasi sistem platform Gojek, Grab, Shopee, Maxim, atau inDriver. Aplikasi ini beroperasi 100% sebagai asisten logbook & perawatan armada kendaraan mitra pengemudi. Bebas root, bebas fake GPS, dan aman dari suspensi.
        </p>
        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900 font-mono">
          OjolTarget Pro v2.0.0 • Siap Build Android via GitHub Actions
        </div>
      </div>
    </div>
  );
}
