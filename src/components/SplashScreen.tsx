import React, { useState, useEffect } from 'react';
import { Gauge, ShieldCheck, Zap, Compass } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Menginisialisasi Sistem Driver...');

  useEffect(() => {
    const totalDurationMs = 4000;
    const intervalMs = 50;
    const step = (intervalMs / totalDurationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 200);
          return 100;
        }

        if (next > 75) {
          setStatusText('Siap Meluncur — Salam Satu Aspal!');
        } else if (next > 50) {
          setStatusText('Sinkronisasi Jadwal Servis & Smart Cache...');
        } else if (next > 25) {
          setStatusText('Mengunci Sinyal GPS & Odometer Kendaraan...');
        }

        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16] flex flex-col items-center justify-between p-8 text-slate-100 select-none">
      {/* Top subtle badge */}
      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono tracking-wider pt-4">
        <ShieldCheck className="w-4 h-4" />
        <span>100% NON-INVASIVE DRIVER COMPANION</span>
      </div>

      {/* Center Branding */}
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Glowing Logo Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-400 p-0.5 shadow-2xl shadow-emerald-500/30 animate-pulse">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Gauge className="w-12 h-12 text-emerald-400" />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-amber-500 text-slate-950 shadow-md">
            <Zap className="w-4 h-4 fill-current" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            Ojol<span className="text-emerald-400">Target</span> <span className="text-amber-400 font-mono font-bold text-xl">PRO</span>
          </h1>
          <p className="text-xs text-slate-400 tracking-wide mt-1">
            Asisten Cerdas Navigasi & Perawatan Armada Driver
          </p>
        </div>

        {/* Platform compatibility pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
          <span>Gojek</span> • <span>Grab</span> • <span>Shopee</span> • <span>Maxim</span> • <span>inDriver</span>
        </div>
      </div>

      {/* Bottom Progress Bar & Loading Status */}
      <div className="w-full max-w-xs space-y-2 pb-6">
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span className="truncate">{statusText}</span>
          <span className="text-emerald-400 font-bold ml-2">{Math.round(progress)}%</span>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-center text-[10px] text-slate-500 font-mono pt-1">
          v2.0.0 • Edisi Mitra Pengemudi
        </div>
      </div>
    </div>
  );
}
