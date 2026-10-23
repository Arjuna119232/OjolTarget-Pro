import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DriverProfile,
  ServiceRecord,
  RepairLog,
  OrderRecord,
  SpotData,
  ActiveOrderState,
  TimerOnBidState,
  UserSettings,
  Page,
  PlatformType,
  ServiceType,
  OJOL_SERVICE_INTERVALS,
  OnboardingData,
} from '@/types';
import {
  loadDriverProfile,
  saveDriverProfile,
  loadServices,
  saveServices,
  loadRepairLogs,
  saveRepairLogs,
  loadOrders,
  saveOrders,
  loadActiveOrder,
  saveActiveOrder,
  loadSpotData,
  saveSpotData,
  loadTimerOnBid,
  saveTimerOnBid,
  loadUserSettings,
  saveUserSettings,
  syncWidgetSnapshotFromState,
} from '@/lib/storage';
import { applyAdaptivePowerMode, initBatteryMonitoring } from '@/lib/battery';
import { hitungStatusSemuaServis } from '@/lib/serviceEngine';
import { installWidgetSync, syncWidgetData } from '@/lib/widgetSync';

import { SplashScreen } from '@/components/SplashScreen';
import { HeaderHUD } from '@/components/HeaderHUD';
import { NavBar } from '@/components/NavBar';
import { FloatingHUDWidget } from '@/components/FloatingHUDWidget';
import { Cockpit } from '@/components/Cockpit';
import { TripTigaTombol } from '@/components/TripTigaTombol';
import { CatatOrder } from '@/components/CatatOrder';
import { RiwayatServis } from '@/components/RiwayatServis';
import { LevelGrab } from '@/components/LevelGrab';
import { StrategiSpot } from '@/components/StrategiSpot';
import { Pengaturan } from '@/components/Pengaturan';
import { Onboarding } from '@/components/Onboarding';
import { IzinAplikasiModal } from '@/components/IzinAplikasiModal';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const [profile, setProfile] = useState<DriverProfile | null>(() => loadDriverProfile());
  const [services, setServices] = useState<ServiceRecord[]>(() => loadServices());
  const [repairs, setRepairs] = useState<RepairLog[]>(() => loadRepairLogs());
  const [orders, setOrders] = useState<OrderRecord[]>(() => loadOrders());
  const [activeOrder, setActiveOrder] = useState<ActiveOrderState | null>(() => loadActiveOrder());
  const [spots, setSpots] = useState<SpotData[]>(() => loadSpotData());
  const [timer, setTimer] = useState<TimerOnBidState>(() => loadTimerOnBid());
  const [settings, setSettings] = useState<UserSettings>(() => loadUserSettings());
  const [page, setPage] = useState<Page>('cockpit');

  // Inisialisasi awal & instalasi Android bridge
  useEffect(() => {
    installWidgetSync();
    syncWidgetData();
    initBatteryMonitoring();

    // Menerapkan tema awal
    applyAdaptivePowerMode(
      settings.themeMode === 'amoled'
        ? 'amoled_ekstrem'
        : settings.adaptiveBatterySaver
        ? 'hemat'
        : 'normal'
    );

    // Listener saat ada order/spot masuk dari Android Native Widget
    const handleWidgetSync = () => {
      setOrders(loadOrders());
      setSpots(loadSpotData());
    };
    window.addEventListener('ojol-widget-synced', handleWidgetSync);

    return () => {
      window.removeEventListener('ojol-widget-synced', handleWidgetSync);
    };
  }, []);

  // Timer On-Bid ticker interval (live per detik)
  useEffect(() => {
    if (!timer.isRunning || timer.isPaused) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (!prev.isRunning || prev.isPaused || !prev.startTime) return prev;
        const now = Date.now();
        const currentSessionSeconds = Math.floor((now - prev.startTime) / 1000);
        const updated: TimerOnBidState = {
          ...prev,
          totalSeconds: prev.elapsedSeconds + currentSessionSeconds,
        };
        saveTimerOnBid(updated);
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.isPaused]);

  // Update KM Odometer Kendaraan
  const handleUpdateKM = useCallback(
    (newKM: number) => {
      if (!profile) return;
      const updated: DriverProfile = {
        ...profile,
        currentKM: newKM,
        terakhirUpdateKM: Date.now(),
      };
      setProfile(updated);
      saveDriverProfile(updated);
    },
    [profile]
  );

  // Toggle Mode Hemat Daya / AMOLED
  const handleToggleBatterySaver = useCallback(() => {
    setSettings((prev) => {
      const nextTheme = prev.themeMode === 'amoled' ? 'dark' : 'amoled';
      const updated: UserSettings = {
        ...prev,
        themeMode: nextTheme,
        adaptiveBatterySaver: true,
      };
      saveUserSettings(updated);
      applyAdaptivePowerMode(nextTheme === 'amoled' ? 'amoled_ekstrem' : 'hemat');
      return updated;
    });
  }, []);

  // Tambah Order 1-Klik Cepat (Murni Pendapatan yang Diterima Driver)
  const handleQuickOrder = useCallback(
    (nominal: number) => {
      const plat = profile?.primaryPlatform || settings.platform || 'Grab';

      const newOrder: OrderRecord = {
        id: crypto.randomUUID(),
        nominal,
        platform: plat,
        namaLokasi: 'Trip Cepat Lapangan',
        timestamp: Date.now(),
        createdAt: Date.now(),
      };

      const updated = [newOrder, ...orders];
      setOrders(updated);
      saveOrders(updated);

      if (settings.autoSyncKMWithOrders && profile) {
        handleUpdateKM(profile.currentKM + 4);
      }
    },
    [orders, profile, settings.autoSyncKMWithOrders, settings.platform, handleUpdateKM]
  );

  // Mulai Order Aktif dari Lapangan
  const handleStartActiveOrder = useCallback(
    (nominal: number) => {
      const plat = profile?.primaryPlatform || settings.platform || 'Grab';
      const currentKM = profile?.currentKM || 0;

      const newActive: ActiveOrderState = {
        id: crypto.randomUUID(),
        nominal,
        platform: plat,
        status: 'Menuju Titik Jemput',
        kmDapatOrder: currentKM,
        waktuMulai: Date.now(),
      };
      setActiveOrder(newActive);
      saveActiveOrder(newActive);
      setPage('trip');
    },
    [profile, settings.platform]
  );

  // Selesaikan Order dari Alur 3 Tombol Lapangan
  const handleFinishActiveOrder = useCallback(
    (
      active: ActiveOrderState,
      finalNominal: number,
      kmDetail: { kmKeJemput: number; kmKeAntar: number; kmTotalTrip: number }
    ) => {
      const newOrder: OrderRecord = {
        id: crypto.randomUUID(),
        nominal: finalNominal,
        platform: active.platform,
        titikJemputNama: active.titikJemput?.nama,
        titikAntarNama: active.titikAntar?.nama,
        namaLokasi: active.titikJemput?.nama || active.titikAntar?.nama || 'Trip Lapangan',
        kmKeJemput: kmDetail.kmKeJemput,
        kmKeAntar: kmDetail.kmKeAntar,
        kmTotalTrip: kmDetail.kmTotalTrip,
        timestamp: Date.now(),
        createdAt: Date.now(),
      };

      const updatedOrders = [newOrder, ...orders];
      setOrders(updatedOrders);
      saveOrders(updatedOrders);

      setActiveOrder(null);
      saveActiveOrder(null);

      // Odometer disinkronkan mengikuti jarak total trip
      if (profile && kmDetail.kmTotalTrip > 0) {
        handleUpdateKM(profile.currentKM + Math.round(kmDetail.kmTotalTrip));
      }
    },
    [orders, profile, handleUpdateKM]
  );

  // Manajemen Riwayat Servis
  const handleAddService = useCallback(
    (record: ServiceRecord) => {
      const updated = [record, ...services];
      setServices(updated);
      saveServices(updated);
    },
    [services]
  );

  const handleDeleteService = useCallback(
    (id: string) => {
      const updated = services.filter((s) => s.id !== id);
      setServices(updated);
      saveServices(updated);
    },
    [services]
  );

  // Manajemen Log Perbaikan
  const handleAddRepair = useCallback(
    (repair: RepairLog) => {
      const updated = [repair, ...repairs];
      setRepairs(updated);
      saveRepairLogs(updated);
    },
    [repairs]
  );

  const handleDeleteRepair = useCallback(
    (id: string) => {
      const updated = repairs.filter((r) => r.id !== id);
      setRepairs(updated);
      saveRepairLogs(updated);
    },
    [repairs]
  );

  // Update Profil Driver
  const handleSaveProfile = useCallback((p: DriverProfile) => {
    setProfile(p);
    saveDriverProfile(p);
  }, []);

  // Update Pengaturan User
  const handleSaveSettings = useCallback((s: UserSettings) => {
    setSettings(s);
    saveUserSettings(s);
    applyAdaptivePowerMode(
      s.themeMode === 'amoled' ? 'amoled_ekstrem' : s.adaptiveBatterySaver ? 'hemat' : 'normal'
    );
  }, []);

  // Selesaikan Onboarding Multi-Halaman
  const handleOnboardingComplete = useCallback((data: OnboardingData) => {
    const newProfile: DriverProfile = {
      nama: data.nama,
      noHp: data.noHp || '',
      platNomor: data.platNomor,
      tipeKendaraan: data.tipeKendaraan,
      modelKendaraan: data.modelKendaraan,
      tahunKendaraan: '2023',
      platforms: data.platforms,
      primaryPlatform: data.platform,
      daerahOperasional: data.daerahOperasional,
      odometerAwalPaten: data.odometerAwalPaten,
      currentKM: data.odometerAwalPaten,
      terakhirUpdateKM: Date.now(),
      modeKendaraan: 'Ojol Aktif',
      registeredAt: Date.now(),
    };

    setProfile(newProfile);
    saveDriverProfile(newProfile);

    // Update settings target harian mengikuti benchmark daerah
    const updatedSettings: UserSettings = {
      ...settings,
      platform: data.platform,
      targetHarian: data.targetHarian,
      daerahOperasional: data.daerahOperasional,
    };
    setSettings(updatedSettings);
    saveUserSettings(updatedSettings);

    // Inisialisasi setiap servis dengan input KM aktual dari onboarding
    const records: ServiceRecord[] = data.initialServices.map((init) => {
      const interval = OJOL_SERVICE_INTERVALS[init.type];
      const kmAt = init.kmTerakhirServis;
      return {
        id: crypto.randomUUID(),
        type: init.type,
        bengkel: 'Inisialisasi Servis Awal',
        tipeBengkel: 'Bengkel Resmi (AHASS/Yamaha/dll)',
        kmAtServis: kmAt,
        targetKM: kmAt + interval,
        biayaPart: 0,
        biayaJasa: 0,
        totalBiaya: 0,
        catatan: `KM Servis Terakhir: ${kmAt.toLocaleString('id-ID')} KM`,
        tanggal: new Date().toISOString(),
        createdAt: Date.now(),
      };
    });

    setServices(records);
    saveServices(records);
    setPage('cockpit');
  }, [settings]);

  // Hitung berapa servis yang butuh perhatian mendesak
  const currentKM = profile?.currentKM || 0;
  const serviceStatuses = useMemo(
    () =>
      hitungStatusSemuaServis(
        services,
        currentKM,
        profile?.modeKendaraan || 'Ojol Aktif',
        settings.servisReminderThresholdKM
      ),
    [services, currentKM, profile?.modeKendaraan, settings.servisReminderThresholdKM]
  );

  const urgentServiceCount = useMemo(
    () => serviceStatuses.filter((s) => s.status !== 'AMAN').length,
    [serviceStatuses]
  );

  // Splash Screen 4 Detik saat aplikasi dibuka
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Jika belum onboarding, tampilkan onboarding multi-halaman
  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top HUD Header with Battery, Odometer, and Permissions Button */}
      <HeaderHUD
        profile={profile}
        services={services}
        settings={settings}
        onUpdateKM={handleUpdateKM}
        onToggleBatterySaver={handleToggleBatterySaver}
        onOpenServiceTab={() => setPage('riwayat-servis')}
        onOpenPermissions={() => setShowPermissionsModal(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-lg w-full mx-auto p-3 overflow-y-auto">
        {page === 'cockpit' && (
          <Cockpit
            profile={profile}
            services={services}
            orders={orders}
            spots={spots}
            timer={timer}
            settings={settings}
            activeOrder={activeOrder}
            onQuickOrder={handleQuickOrder}
            onStartNewOrder={handleStartActiveOrder}
            onOpenServiceTab={() => setPage('riwayat-servis')}
            onOpenTripTab={() => setPage('trip')}
            onUpdateTimer={setTimer}
            onUpdateKM={handleUpdateKM}
          />
        )}

        {page === 'trip' && (
          <TripTigaTombol
            profile={profile}
            activeOrder={activeOrder}
            onUpdateActiveOrder={(o) => {
              setActiveOrder(o);
              saveActiveOrder(o);
            }}
            onFinishOrder={handleFinishActiveOrder}
            onAddSpot={(s) => {
              const next = [s, ...spots];
              setSpots(next);
              saveSpotData(next);
            }}
            onUpdateKM={handleUpdateKM}
          />
        )}

        {page === 'catat-order' && (
          <CatatOrder
            profile={profile}
            orders={orders}
            onAddOrder={(o) => {
              const next = [o, ...orders];
              setOrders(next);
              saveOrders(next);
            }}
            onDeleteOrder={(id) => {
              const next = orders.filter((o) => o.id !== id);
              setOrders(next);
              saveOrders(next);
            }}
            onStartActiveOrder={handleStartActiveOrder}
          />
        )}

        {page === 'riwayat-servis' && (
          <RiwayatServis
            profile={profile}
            services={services}
            repairs={repairs}
            settings={settings}
            onUpdateKM={handleUpdateKM}
            onAddService={handleAddService}
            onDeleteService={handleDeleteService}
            onAddRepair={handleAddRepair}
            onDeleteRepair={handleDeleteRepair}
            onUpdateModeKendaraan={(mode) => {
              if (profile) {
                handleSaveProfile({ ...profile, modeKendaraan: mode });
              }
            }}
          />
        )}

        {page === 'level-grab' && (
          <LevelGrab orders={orders} timer={timer} />
        )}

        {page === 'strategi' && (
          <StrategiSpot spots={spots} orders={orders} profile={profile} />
        )}

        {page === 'pengaturan' && (
          <Pengaturan
            profile={profile}
            settings={settings}
            onSaveProfile={handleSaveProfile}
            onSaveSettings={handleSaveSettings}
            onOpenPermissions={() => setShowPermissionsModal(true)}
          />
        )}
      </main>

      {/* Floating Active Order Status HUD Widget (Dengan Input Rp & 3 Tombol Lapangan) */}
      <FloatingHUDWidget
        activeOrder={activeOrder}
        currentKM={currentKM}
        platform={profile.primaryPlatform}
        onUpdateActiveOrder={(o) => {
          setActiveOrder(o);
          saveActiveOrder(o);
        }}
        onFinishOrder={handleFinishActiveOrder}
        onQuickOrderDirect={handleQuickOrder}
      />

      {/* Bottom Ergonomic Navigation Bar */}
      <NavBar
        page={page}
        onPageChange={setPage}
        urgentServiceCount={urgentServiceCount}
        hasActiveOrder={activeOrder !== null}
      />

      {/* Modal Izin Aplikasi Lapangan (GPS, Notifikasi, Baterai) */}
      <IzinAplikasiModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
      />
    </div>
  );
}
