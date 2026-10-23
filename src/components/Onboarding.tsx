import React, { useState } from 'react';
import {
  Car,
  User,
  Gauge,
  Wrench,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  DriverProfile,
  PlatformType,
  VehicleType,
  ServiceType,
  REGIONAL_BENCHMARKS,
  OJOL_SERVICE_INTERVALS,
  InitialServiceInput,
  OnboardingData,
} from '@/types';
import { formatRupiah, formatKM } from '@/lib/nominatim';

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void;
}

const COMMON_MODELS = [
  'Honda Beat 110',
  'Honda Vario 125/160',
  'Honda Scoopy',
  'Yamaha NMAX 155',
  'Yamaha Aerox 155',
  'Yamaha Mio / Fazzio',
  'Honda PCX 160',
  'Suzuki Address',
];

const PLATFORM_LIST: PlatformType[] = ['Grab', 'Gojek', 'Maxim', 'ShopeeFood', 'InDriver'];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [platNomor, setPlatNomor] = useState('');
  const [modelKendaraan, setModelKendaraan] = useState('Honda Vario 160');
  const [tipeKendaraan, setTipeKendaraan] = useState<VehicleType>('Motor Bebek / Matic');

  const [platforms, setPlatforms] = useState<PlatformType[]>(['Grab', 'Gojek']);
  const [primaryPlatform, setPrimaryPlatform] = useState<PlatformType>('Grab');
  const [daerahOperasional, setDaerahOperasional] = useState('Jakarta Selatan');

  // Odometer Paten
  const [odometerPaten, setOdometerPaten] = useState('42000');

  // Input KM Aktual Servis Terakhir
  const [servicesInput, setServicesInput] = useState<Record<ServiceType, { km: string; sudahPernah: boolean }>>({
    'Oli Mesin': { km: '40500', sudahPernah: true },
    'Oli Gardan': { km: '38000', sudahPernah: true },
    'Busi': { km: '36000', sudahPernah: true },
    'V-Belt & Roller': { km: '30000', sudahPernah: true },
    'Kampas Rem': { km: '35000', sudahPernah: true },
    'Ban Depan/Belakang': { km: '25000', sudahPernah: true },
    'Aki': { km: '24000', sudahPernah: true },
    'Filter Udara': { km: '36000', sudahPernah: true },
    'Radiator Coolant': { km: '32000', sudahPernah: true },
    'Servis Berkala / CVT': { km: '38000', sudahPernah: true },
  });

  const selectedRegion = REGIONAL_BENCHMARKS.find((r) => r.daerah === daerahOperasional) || REGIONAL_BENCHMARKS[0];
  const [customTargetHarian, setCustomTargetHarian] = useState(selectedRegion.targetHarianRekomendasi.toString());

  const togglePlatform = (p: PlatformType) => {
    if (platforms.includes(p)) {
      if (platforms.length > 1) {
        const next = platforms.filter((x) => x !== p);
        setPlatforms(next);
        if (primaryPlatform === p) setPrimaryPlatform(next[0]);
      }
    } else {
      setPlatforms([...platforms, p]);
    }
  };

  const handleRegionChange = (newDaerah: string) => {
    setDaerahOperasional(newDaerah);
    const reg = REGIONAL_BENCHMARKS.find((r) => r.daerah === newDaerah);
    if (reg) {
      setCustomTargetHarian(reg.targetHarianRekomendasi.toString());
    }
  };

  const handleFinishAll = (e: React.FormEvent) => {
    e.preventDefault();
    const kmPaten = parseInt(odometerPaten, 10) || 42000;
    const targetNom = parseInt(customTargetHarian, 10) || selectedRegion.targetHarianRekomendasi;

    const initialServices: InitialServiceInput[] = (Object.keys(servicesInput) as ServiceType[]).map((t) => {
      const item = servicesInput[t];
      const kmActual = item.sudahPernah && item.km ? parseInt(item.km, 10) || kmPaten : kmPaten;
      return {
        type: t,
        kmTerakhirServis: kmActual,
        sudahPernah: item.sudahPernah,
      };
    });

    const data: OnboardingData = {
      nama: nama.trim() || 'Mitra Driver',
      noHp: noHp.trim(),
      platNomor: platNomor.trim().toUpperCase() || 'B 1234 XYZ',
      tipeKendaraan,
      modelKendaraan,
      platform: primaryPlatform,
      platforms,
      daerahOperasional,
      odometerAwalPaten: kmPaten,
      targetHarian: targetNom,
      initialServices,
      completed: true,
    };

    onComplete(data);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-3 text-slate-100 selection:bg-emerald-500/30">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden my-4">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-sm">
              OT
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">OjolTarget Pro</h1>
              <p className="text-[10px] text-slate-400">Verifikasi & Pengaturan Mitra</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              Langkah {step} dari 5
            </span>
          </div>
        </div>

        {/* STEP 1: PROFIL DRIVER & ARMADA */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-400" />
                1. Data Mitra Pengemudi & Kendaraan
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Masukkan identitas dan kendaraan untuk registrasi armada ojol.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nama Lengkap Driver</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Nomor WhatsApp / HP</label>
                <input
                  type="tel"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  placeholder="0812XXXXXXXX (Opsional)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Plat Nomor Kendaraan</label>
                <input
                  type="text"
                  value={platNomor}
                  onChange={(e) => setPlatNomor(e.target.value)}
                  placeholder="Contoh: B 1234 XYZ"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Model Sepeda Motor</label>
                <input
                  type="text"
                  value={modelKendaraan}
                  onChange={(e) => setModelKendaraan(e.target.value)}
                  placeholder="Contoh: Honda Vario 160"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white mb-1.5 focus:outline-none"
                />
                <div className="flex gap-1 flex-wrap">
                  {COMMON_MODELS.slice(0, 4).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModelKendaraan(m)}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] text-slate-400 hover:text-white"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!nama.trim() || !platNomor.trim()) {
                  return alert('Silakan isi Nama Driver dan Plat Nomor Kendaraan');
                }
                setStep(2);
              }}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition"
            >
              <span>Lanjut: Platform & Daerah Operasional</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: PLATFORM & DAERAH OPERASIONAL DENGAN BENCHMARK PENDAPATAN */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                2. Platform Ojol & Daerah Operasional
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pilih aplikasi yang Anda jalankan dan wilayah utama narik.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Pilih Platform yang Anda Ikuti
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PLATFORM_LIST.map((p) => {
                    const isSel = platforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition ${
                          isSel
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-slate-950 text-slate-500 border-slate-800'
                        }`}
                      >
                        {isSel ? '✓ ' : '+ '} {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Platform Utama</label>
                <select
                  value={primaryPlatform}
                  onChange={(e) => setPrimaryPlatform(e.target.value as PlatformType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                >
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Pilih Daerah Operasional Utama
                </label>
                <select
                  value={daerahOperasional}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                >
                  {REGIONAL_BENCHMARKS.map((r) => (
                    <option key={r.daerah} value={r.daerah}>
                      {r.daerah} ({r.provinsi})
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Valid Pendapatan Daerah Card */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Data Valid Pendapatan: {selectedRegion.daerah}
                  </span>
                  <span className="font-mono text-white text-[10px]">
                    {formatRupiah(selectedRegion.targetHarianRekomendasi)} / hari
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {selectedRegion.deskripsi}
                </p>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900 font-mono">
                  <span>Rata-rata: {selectedRegion.rataRataTripHarian} Trip/hari</span>
                  <span className="text-amber-400">Jam Sibuk: {selectedRegion.jamSibuk}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-white shadow-lg flex items-center justify-center gap-1.5"
              >
                <span>Lanjut: Odometer Paten</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ODOMETER KENDARAAN (PATEN BASELINE) */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-400" />
                3. Odometer Awal Kendaraan (Paten)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Angka kilometer dasar speedometer saat motor mulai didaftarkan ke sistem.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/40 space-y-2">
                <label className="block text-slate-300 font-bold text-amber-400">
                  Angka KM Speedometer Sekarang
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={odometerPaten}
                    onChange={(e) => setOdometerPaten(e.target.value)}
                    placeholder="Contoh: 42000"
                    required
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-2xl font-mono font-extrabold text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs text-slate-500 font-mono font-bold">
                    KM
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed pt-1">
                  🔒 <strong>Paten Odometer Awal:</strong> Angka ini menjadi titik tolak dasar riwayat perawatan armada. Selanjutnya, KM akan berjalan mengikuti trip dan pembaruan berkala.
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = parseInt(odometerPaten, 10);
                  if (isNaN(val) || val <= 0) return alert('Silakan masukkan angka KM odometer valid.');
                  setStep(4);
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-white shadow-lg flex items-center justify-center gap-1.5"
              >
                <span>Lanjut: Riwayat KM Servis Terakhir</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: RIWAYAT TERAKHIR SERVIS PER KOMPONEN (SINKRONISASI AKTUAL) */}
        {step === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-emerald-400" />
                4. Input KM Terakhir Servis Komponen
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Kapan terakhir Anda ganti oli atau part ini? Masukkan angka KM saat servis tersebut agar sistem tahu sisa kilometer dengan akurat.
              </p>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 text-xs">
              {(Object.keys(OJOL_SERVICE_INTERVALS) as ServiceType[]).map((t) => {
                const item = servicesInput[t];
                const kmOdo = parseInt(odometerPaten, 10) || 0;
                const kmServ = parseInt(item.km, 10) || kmOdo;
                const sudahJalan = Math.max(0, kmOdo - kmServ);
                const sisaKM = (kmServ + OJOL_SERVICE_INTERVALS[t]) - kmOdo;

                return (
                  <div
                    key={t}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{t}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Interval Ojol: {formatKM(OJOL_SERVICE_INTERVALS[t])}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={item.km}
                          onChange={(e) => {
                            setServicesInput({
                              ...servicesInput,
                              [t]: { ...item, km: e.target.value, sudahPernah: true },
                            });
                          }}
                          placeholder={`KM saat terakhir ${t}`}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-amber-300"
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] text-slate-500 font-mono">
                          KM
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setServicesInput({
                            ...servicesInput,
                            [t]: { km: odometerPaten, sudahPernah: true },
                          });
                        }}
                        className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-300 border border-slate-700 whitespace-nowrap"
                      >
                        Baru Ganti
                      </button>
                    </div>

                    {/* Live calculation preview */}
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                      <span>Sudah jalan: <strong className="text-sky-300">{formatKM(sudahJalan)}</strong></span>
                      <span>Sisa: <strong className={sisaKM <= 0 ? 'text-rose-400' : 'text-emerald-400'}>{formatKM(sisaKM)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-white shadow-lg flex items-center justify-center gap-1.5"
              >
                <span>Lanjut: Target & Selesai</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: KONFIRMASI TARGET HARIAN & SELESAI */}
        {step === 5 && (
          <form onSubmit={handleFinishAll} className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                5. Konfirmasi Target & Siap On-Bid
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target harian otomatis mengikuti benchmark daerah operasional Anda.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-slate-400 font-medium">Ringkasan Data Armada:</div>
                <div className="grid grid-cols-2 gap-2 text-slate-200">
                  <div>Mitra: <strong>{nama}</strong></div>
                  <div>Plat: <strong className="font-mono">{platNomor}</strong></div>
                  <div>Motor: <strong>{modelKendaraan}</strong></div>
                  <div>Platform: <strong>{primaryPlatform}</strong></div>
                  <div>Daerah: <strong>{daerahOperasional}</strong></div>
                  <div>Odometer Paten: <strong className="font-mono text-amber-300">{formatKM(parseInt(odometerPaten, 10))}</strong></div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Target Pendapatan Harian Anda (Rp)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={customTargetHarian}
                    onChange={(e) => setCustomTargetHarian(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-emerald-500/80 rounded-xl px-4 py-3 text-xl font-mono font-extrabold text-emerald-400 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs text-slate-500 font-bold">RP</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Rekomendasi {daerahOperasional}: {formatRupiah(selectedRegion.targetHarianRekomendasi)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-98"
              >
                Selesai & Masuk Aplikasi
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
