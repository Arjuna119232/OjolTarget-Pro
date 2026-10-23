import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
  StopCircle,
  Coffee,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { TimerOnBidState } from '@/types';
import { saveTimerOnBid } from '@/lib/storage';

interface TimerOnBidCardProps {
  timer: TimerOnBidState;
  onUpdateTimer: (updated: TimerOnBidState) => void;
}

export function TimerOnBidCard({ timer, onUpdateTimer }: TimerOnBidCardProps) {
  const [showStopModal, setShowStopModal] = useState(false);
  const [showRekapSuccessModal, setShowRekapSuccessModal] = useState(false);
  const [lastRekap, setLastRekap] = useState<{ jam: string; menit: string } | null>(null);

  // Format detik ke format HH:MM:SS
  const formatDigital = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return {
      hh: hours.toString().padStart(2, '0'),
      mm: minutes.toString().padStart(2, '0'),
      ss: seconds.toString().padStart(2, '0'),
    };
  };

  const { hh, mm, ss } = formatDigital(timer.totalSeconds || 0);
  const jamTotalFloat = ((timer.totalSeconds || 0) / 3600).toFixed(1);
  const targetJam = timer.targetJam || 250;
  const pctTarget = Math.min(100, Math.round(((timer.totalSeconds || 0) / (targetJam * 3600)) * 100));

  // Handler: Mulai On-Bid
  const handleStart = () => {
    const now = Date.now();
    const updated: TimerOnBidState = {
      ...timer,
      isRunning: true,
      isPaused: false,
      startTime: now,
    };
    onUpdateTimer(updated);
    saveTimerOnBid(updated);
  };

  // Handler: Jeda Sementara / Istirahat
  const handleIstirahat = () => {
    const now = Date.now();
    const sessionSec = timer.startTime ? Math.floor((now - timer.startTime) / 1000) : 0;
    const newElapsed = timer.elapsedSeconds + sessionSec;

    const updated: TimerOnBidState = {
      ...timer,
      isRunning: false,
      isPaused: true,
      startTime: null,
      elapsedSeconds: newElapsed,
      totalSeconds: newElapsed,
    };

    onUpdateTimer(updated);
    saveTimerOnBid(updated);
    setShowStopModal(false);
  };

  // Handler: Selesai Sesi On-Bid (Rekap Total)
  const handleSelesaiRekap = () => {
    const now = Date.now();
    const sessionSec = timer.startTime ? Math.floor((now - timer.startTime) / 1000) : 0;
    const finalSeconds = timer.elapsedSeconds + sessionSec;

    const formatted = formatDigital(finalSeconds);
    setLastRekap({ jam: formatted.hh, menit: formatted.mm });

    const history = timer.historySessions || [];
    const newSession = {
      tanggal: new Date().toISOString(),
      durasiDetik: finalSeconds,
      status: 'Selesai' as const,
    };

    // Reset timer ke 00:00:00 untuk sesi berikutnya
    const resetTimer: TimerOnBidState = {
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      totalSeconds: 0,
      targetJam,
      historySessions: [newSession, ...history],
    };

    onUpdateTimer(resetTimer);
    saveTimerOnBid(resetTimer);
    setShowStopModal(false);
    setShowRekapSuccessModal(true);
  };

  return (
    <>
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        {/* Header bar */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-white">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Jam On-Bid Lapangan</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                timer.isRunning
                  ? 'bg-emerald-400 animate-ping'
                  : timer.isPaused
                  ? 'bg-amber-400'
                  : 'bg-slate-600'
              }`}
            />
            <span
              className={`text-[11px] font-bold ${
                timer.isRunning
                  ? 'text-emerald-400'
                  : timer.isPaused
                  ? 'text-amber-300'
                  : 'text-slate-500'
              }`}
            >
              {timer.isRunning ? 'Sedang Berjalan' : timer.isPaused ? 'Sedang Istirahat' : 'Belum Mulai'}
            </span>
          </div>
        </div>

        {/* Big Live Digital Clock Display (HH : MM : SS) */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-center flex items-center justify-center gap-2 font-mono">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-extrabold text-white tracking-tight">{hh}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-sans mt-0.5">
              Jam
            </span>
          </div>
          <span className={`text-2xl font-bold ${timer.isRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`}>
            :
          </span>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">{mm}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-sans mt-0.5">
              Menit
            </span>
          </div>
          <span className={`text-2xl font-bold ${timer.isRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`}>
            :
          </span>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-extrabold text-amber-300 tracking-tight">{ss}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-sans mt-0.5">
              Detik
            </span>
          </div>
        </div>

        {/* Target Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Total On-Bid: <strong className="text-white font-mono">{jamTotalFloat} Jam</strong></span>
            <span>Target Bulanan: <strong className="text-amber-400 font-mono">{targetJam} Jam</strong> ({pctTarget}%)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 to-emerald-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${pctTarget}%` }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 pt-1">
          {!timer.isRunning ? (
            <button
              onClick={handleStart}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{timer.isPaused ? 'Lanjutkan On-Bid' : 'Mulai On-Bid'}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowStopModal(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Berhenti / Jeda</span>
            </button>
          )}
        </div>
      </div>

      {/* MODAL PILIHAN: ISTIRAHAT (JEDA) ATAU SELESAI (REKAP)? */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Konfirmasi Jam On-Bid</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Waktu on-bid berjalan saat ini:{' '}
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {hh}:{mm}:{ss}
              </span>
              . Apakah Anda ingin istirahat sejenak atau mengakhiri sesi untuk direkap?
            </p>

            <div className="space-y-2 pt-1">
              {/* Opsi 1: Istirahat (Jeda Sementara) */}
              <button
                onClick={handleIstirahat}
                className="w-full p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-left flex items-center justify-between transition group active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300">
                      Istirahat (Jeda Sementara)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Timer dijeda, waktu tetap tersimpan & bisa dilanjutkan
                    </div>
                  </div>
                </div>
              </button>

              {/* Opsi 2: Selesai Sesi (Rekap Total) */}
              <button
                onClick={handleSelesaiRekap}
                className="w-full p-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-left flex items-center justify-between transition group active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500 text-white">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-300">
                      Selesai Sesi (Rekap Total)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Waktu direkap ke jam kerja bulanan & timer direset
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowStopModal(false)}
              className="w-full py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-medium"
            >
              Batal (Lanjutkan Berjalan)
            </button>
          </div>
        </div>
      )}

      {/* MODAL REKAP BERHASIL */}
      {showRekapSuccessModal && lastRekap && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-xs w-full p-5 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Sesi On-Bid Berhasil Direkap!</h3>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 font-mono">
              <span className="text-2xl font-extrabold text-emerald-400">
                {lastRekap.jam} Jam {lastRekap.menit} Mnt
              </span>
              <div className="text-[10px] text-slate-400 mt-1 font-sans">
                Telah ditambahkan ke akumulasi target bulanan
              </div>
            </div>
            <button
              onClick={() => setShowRekapSuccessModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs"
            >
              Tutup & Istirahat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
