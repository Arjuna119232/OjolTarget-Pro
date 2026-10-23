import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  MapPin,
  Bell,
  BatteryCharging,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  X,
  Smartphone,
} from 'lucide-react';
import { getCurrentPositionOnce } from '@/lib/geo';

interface IzinAplikasiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IzinAplikasiModal({ isOpen, onClose }: IzinAplikasiModalProps) {
  const [gpsStatus, setGpsStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>('default');
  const [batteryStatus, setBatteryStatus] = useState<boolean>(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Check Geolocation permission
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((res) => {
          setGpsStatus(res.state as any);
          res.onchange = () => setGpsStatus(res.state as any);
        })
        .catch(() => {});
    }

    // Check Notification permission
    if (typeof Notification !== 'undefined') {
      setNotifStatus(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestGPS = async () => {
    setRequesting(true);
    try {
      await getCurrentPositionOnce(6000);
      setGpsStatus('granted');
    } catch {
      setGpsStatus('denied');
    } finally {
      setRequesting(false);
    }
  };

  const handleRequestNotif = async () => {
    if (typeof Notification !== 'undefined') {
      const res = await Notification.requestPermission();
      setNotifStatus(res);
    }
  };

  const handleRequestAll = async () => {
    await handleRequestGPS();
    await handleRequestNotif();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Status Izin Aplikasi</h3>
              <p className="text-[11px] text-slate-400">
                Diperlukan untuk kestabilan navigasi & alarm servis di lapangan
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission List */}
        <div className="space-y-2.5 text-xs">
          {/* 1. GPS Location */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white">Lokasi GPS Akurat</div>
                <div className="text-[11px] text-slate-400">
                  Mengunci titik jemput/antar dan spot gacor otomatis.
                </div>
              </div>
            </div>

            <div>
              {gpsStatus === 'granted' ? (
                <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center gap-1 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Diizinkan
                </span>
              ) : (
                <button
                  onClick={handleRequestGPS}
                  disabled={requesting}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-bold text-[11px] shadow active:scale-95"
                >
                  {requesting ? 'Cek...' : 'Izinkan'}
                </button>
              )}
            </div>
          </div>

          {/* 2. Notifications */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Bell className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white">Notifikasi Pengingat Servis</div>
                <div className="text-[11px] text-slate-400">
                  Alarm saat oli/rem mendekati batas KM jatuh tempo.
                </div>
              </div>
            </div>

            <div>
              {notifStatus === 'granted' ? (
                <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center gap-1 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Diizinkan
                </span>
              ) : (
                <button
                  onClick={handleRequestNotif}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-bold text-[11px] shadow active:scale-95"
                >
                  Izinkan
                </button>
              )}
            </div>
          </div>

          {/* 3. Storage & Cache */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <HardDrive className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white">Penyimpanan Offline Lokal</div>
                <div className="text-[11px] text-slate-400">
                  Menyimpan data odometer, struk bengkel & buku servis.
                </div>
              </div>
            </div>

            <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center gap-1 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" /> Aktif
            </span>
          </div>
        </div>

        {/* Guidance Notice */}
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="font-bold text-slate-300 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Petunjuk Tambahan Android</span>
          </div>
          <p className="leading-relaxed">
            Jika GPS belum aktif, buka <strong>Pengaturan HP ➔ Aplikasi ➔ OjolTarget Pro ➔ Izin ➔ Lokasi (Pilih 'Izinkan Setiap Waktu')</strong> dan nonaktifkan 'Optimasi Baterai' agar aplikasi tidak ditutup sistem saat berjalan di latar belakang.
          </p>
        </div>

        <button
          onClick={handleRequestAll}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-98"
        >
          Aktifkan Seluruh Izin
        </button>
      </div>
    </div>
  );
}
