import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Akun, ActiveOrder, OrderRecord, Settings, SpotData, Tab } from './types';
import {
  loadActive,
  loadLegacy,
  loadOrders,
  loadSettings,
  loadSpots,
  saveActive,
  saveOrders,
  saveSettings,
  saveSpots,
  ImporHasil,
} from './lib/storage';
import { buatSpotOrder } from './lib/spots';
import { cariNama } from './lib/geocode';
import { formatHariTanggal, jamSlot, kunciHari, pad2, round1, startOfDay, totalOrder, uid } from './lib/format';
import { ambilAksiWidget, keepScreenOn, kirimWidget, requestLocationPermission, setChrome } from './lib/native';
import { Icon, IconName } from './components/Icons';
import { OrderFormValue } from './components/OrderSheet';
import { AksiWidget, OrderPage } from './components/OrderPage';
import { MapsPage } from './components/MapsPage';
import { RiwayatPage } from './components/RiwayatPage';
import { SetelanPage } from './components/SetelanPage';
import { SplashScreen } from './components/SplashScreen';
import { IzinModal } from './components/IzinModal';
import { IntroPage } from './components/IntroPage';
import { AkunForm } from './components/AkunForm';

const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: 'order', label: 'Order', icon: 'order' },
  { id: 'maps', label: 'Maps Gacor', icon: 'map' },
  { id: 'riwayat', label: 'Riwayat', icon: 'list' },
  { id: 'setelan', label: 'Setelan', icon: 'settings' },
];

const BG = { gelap: '#0a0f1d', terang: '#f1f4fa' };

function temaEfektif(s: Settings): 'gelap' | 'terang' {
  if (s.tema === 'sistem') {
    try {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'terang' : 'gelap';
    } catch {
      return 'gelap';
    }
  }
  return s.tema === 'terang' ? 'terang' : 'gelap';
}

/** Jam & tanggal mengikuti perangkat; berdetak sendiri tanpa memicu render seluruh aplikasi. */
function Jam() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const t = setInterval(tick, 5000);
    const vis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('focus', tick);
    };
  }, []);
  const d = new Date(now);
  return (
    <div className="clock" aria-label="Waktu perangkat">
      <strong>
        {pad2(d.getHours())}:{pad2(d.getMinutes())}
      </strong>
      <small>{formatHariTanggal(now)}</small>
    </div>
  );
}

export default function App() {
  const [splash, setSplash] = useState(true);
  const [tab, setTab] = useState<Tab>('order');
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());
  const [orders, setOrdersState] = useState<OrderRecord[]>(() => loadOrders());
  const [spots, setSpotsState] = useState<SpotData[]>(() => loadSpots());
  const [active, setActiveState] = useState<ActiveOrder | null>(() => loadActive());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [aksi, setAksi] = useState<AksiWidget | null>(null);
  const [hari, setHari] = useState(() => kunciHari());
  const [legacy] = useState(() => loadLegacy());

  // Ref selalu berisi nilai terbaru, sehingga callback async (nama lokasi, rute) tidak memakai state basi.
  const ordersRef = useRef(orders);
  const spotsRef = useRef(spots);
  const activeRef = useRef(active);
  const settingsRef = useRef(settings);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setOrders = useCallback((fn: (prev: OrderRecord[]) => OrderRecord[]) => {
    const next = fn(ordersRef.current);
    ordersRef.current = next;
    setOrdersState(next);
    saveOrders(next);
  }, []);

  const setSpots = useCallback((fn: (prev: SpotData[]) => SpotData[]) => {
    const next = fn(spotsRef.current);
    spotsRef.current = next;
    setSpotsState(next);
    saveSpots(next);
  }, []);

  const setActive = useCallback((fn: (prev: ActiveOrder | null) => ActiveOrder | null) => {
    const next = fn(activeRef.current);
    activeRef.current = next;
    setActiveState(next);
    saveActive(next);
  }, []);

  const changeSettings = useCallback((s: Settings) => {
    settingsRef.current = s;
    setSettingsState(s);
    saveSettings(s);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3600);
  }, []);

  const akun = settings.akun;

  // ---- Tema: sinkron ke dokumen dan ke warna bar native ----
  useEffect(() => {
    const root = document.documentElement;
    const terapkan = () => {
      const t = temaEfektif(settings);
      if (settings.tema === 'sistem') root.removeAttribute('data-tema');
      else root.setAttribute('data-tema', settings.tema);
      setChrome(BG[t], t === 'terang');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', BG[t]);
    };
    terapkan();
    if (settings.tema !== 'sistem') return;
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia('(prefers-color-scheme: light)');
      mq.addEventListener('change', terapkan);
    } catch {
      /* abaikan */
    }
    return () => mq?.removeEventListener('change', terapkan);
  }, [settings.tema]);

  // ---- Hari perangkat: ganti hari/tanggal/jam di perangkat langsung ikut (statistik "hari ini") ----
  useEffect(() => {
    const cek = () => setHari(kunciHari());
    const t = setInterval(cek, 20000);
    const vis = () => {
      if (!document.hidden) cek();
    };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('focus', cek);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('focus', cek);
    };
  }, []);

  // Layar tetap menyala selama ada order berjalan.
  useEffect(() => {
    keepScreenOn(active !== null);
    return () => keepScreenOn(false);
  }, [active !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Aksi dari widget layar utama ----
  useEffect(() => {
    const ambil = () => {
      const a = ambilAksiWidget();
      if (a === 'dapat' || a === 'jemput' || a === 'selesai') {
        setAksi({ id: a, n: Date.now() });
        setTab('order');
      }
    };
    ambil();
    (window as unknown as { __ojolWidgetAction?: () => void }).__ojolWidgetAction = ambil;
    return () => {
      delete (window as unknown as { __ojolWidgetAction?: () => void }).__ojolWidgetAction;
    };
  }, []);

  // ---- Widget layar utama: kirim status terbaru ----
  useEffect(() => {
    const mulai = startOfDay(Date.now());
    const hariIni = orders.filter((o) => o.timestamp >= mulai);
    kirimWidget({
      terdaftar: !!akun,
      fase: !active ? 'idle' : active.phase === 'menuju-jemput' ? 'jemput' : 'antar',
      platform: akun?.platform ?? '',
      nama: akun?.nama ?? '',
      waktuDapat: active?.waktuDapat ?? 0,
      hari: kunciHari(),
      orderHariIni: hariIni.length,
      rpHariIni: hariIni.reduce((s, o) => s + totalOrder(o), 0),
      target: akun?.targetHarian ?? 0,
    });
  }, [orders, active, akun, hari]);

  // Nama jalan untuk titik yang baru disimpan (lookup di latar belakang).
  const lengkapiNama = useCallback(
    (orderId: string, baru: SpotData[], a: ActiveOrder) => {
      for (const s of baru) {
        if (!s.namaLokasi.startsWith('Titik GPS')) continue;
        cariNama(s).then((n) => {
          if (n.nama.startsWith('Titik GPS')) return;
          setSpots((prev) =>
            prev.map((x) => (x.id === s.id ? { ...x, namaLokasi: n.nama, wilayah: n.wilayah } : x))
          );
          const key =
            s.tipe === 'Jemput' ? 'titikJemputNama' : s.tipe === 'Antar' ? 'titikAntarNama' : 'titikDapatNama';
          setOrders((prev) =>
            prev.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    [key]: n.nama,
                    ...(s.tipe === 'Spot Gacor' ? { wilayah: n.wilayah } : {}),
                    ...(s.tipe === 'Jemput' || (s.tipe === 'Spot Gacor' && !a.jemput) ? { namaLokasi: n.nama } : {}),
                  }
                : o
            )
          );
        });
      }
    },
    [setOrders, setSpots]
  );

  // ---- Order selesai: simpan pendapatan manual + jarak otomatis, lalu isi Maps Gacor ----
  const onFinish = useCallback(
    (a: ActiveOrder, v: OrderFormValue) => {
      const now = Date.now();
      const id = uid();
      const kmJ = v.kmJemput;
      const kmA = v.kmAntar;
      const total = round1((kmJ ?? 0) + (kmA ?? 0));
      const titik = buatSpotOrder(a, id, v.nominal + v.tambahan, now);

      const rec: OrderRecord = {
        id,
        nominal: v.nominal,
        tambahan: v.tambahan > 0 ? v.tambahan : undefined,
        platform: a.platform,
        timestamp: now,
        createdAt: now,
        waktuDapat: a.waktuDapat,
        waktuJemput: a.waktuJemput,
        titikDapatNama: a.dapat?.nama,
        titikJemputNama: a.jemput?.nama,
        titikAntarNama: a.antar?.nama,
        namaLokasi: a.dapat?.nama ?? a.jemput?.nama ?? a.antar?.nama,
        wilayah: a.dapat?.wilayah ?? a.jemput?.wilayah,
        jamGacor: jamSlot(new Date(a.waktuDapat)),
        kmKeJemput: kmJ,
        kmKeAntar: kmA,
        kmTotalTrip: total,
        catatan: v.catatan || undefined,
        lat: a.dapat?.lat,
        lng: a.dapat?.lng,
      };

      setOrders((prev) => [rec, ...prev]);
      if (titik.length) setSpots((prev) => [...titik, ...prev]);
      setActive(() => null);
      toast(titik.length ? 'Order tersimpan. Titik masuk Maps Gacor.' : 'Order tersimpan (tanpa titik lokasi).');
      lengkapiNama(id, titik, a);
    },
    [setOrders, setSpots, setActive, toast, lengkapiNama]
  );

  // ---- Riwayat ----
  const onEdit = useCallback(
    (id: string, v: OrderFormValue) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                nominal: v.nominal,
                tambahan: v.tambahan > 0 ? v.tambahan : undefined,
                kmKeJemput: v.kmJemput,
                kmKeAntar: v.kmAntar,
                kmTotalTrip: round1((v.kmJemput ?? 0) + (v.kmAntar ?? 0)),
                catatan: v.catatan || undefined,
              }
            : o
        )
      );
      setSpots((prev) => prev.map((s) => (s.orderId === id ? { ...s, nominal: v.nominal + v.tambahan } : s)));
      toast('Perubahan tersimpan.');
    },
    [setOrders, setSpots, toast]
  );

  const onDelete = useCallback(
    (id: string) => {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      setSpots((prev) => prev.filter((s) => s.orderId !== id));
      toast('Order dihapus.');
    },
    [setOrders, setSpots, toast]
  );

  // ---- Setelan ----
  const onImport = useCallback(
    (h: ImporHasil) => {
      setOrders((prev) => {
        const ada = new Set(prev.map((o) => o.id));
        return [...prev, ...h.orders.filter((o) => !ada.has(o.id))];
      });
      setSpots((prev) => {
        const ada = new Set(prev.map((s) => s.id));
        return [...prev, ...h.spots.filter((s) => !ada.has(s.id))];
      });
    },
    [setOrders, setSpots]
  );

  const onReset = useCallback(() => {
    setOrders(() => []);
    setSpots(() => []);
    setActive(() => null);
  }, [setOrders, setSpots, setActive]);

  const simpanAkun = useCallback(
    (a: Akun) => {
      changeSettings({ ...settingsRef.current, akun: a });
      // Order berjalan memakai platform terbaru bila akun diubah.
      setActive((prev) => (prev ? { ...prev, platform: a.platform } : prev));
    },
    [changeSettings, setActive]
  );

  const platformAkun = akun?.platform;
  useEffect(() => {
    // Order yang dimulai sebelum platform akun diubah tetap konsisten.
    if (platformAkun && activeRef.current && activeRef.current.platform !== platformAkun) {
      setActive((prev) => (prev ? { ...prev, platform: platformAkun } : prev));
    }
  }, [platformAkun, setActive]);

  // ---------- Tahap awal: splash 4 dtk -> izin -> onboarding 3 halaman -> daftar akun ----------
  if (splash) {
    return <SplashScreen onDone={() => setSplash(false)} />;
  }

  if (!settings.izinSelesai) {
    return (
      <div className="app">
        <IzinModal
          onSelesai={() => {
            requestLocationPermission();
            changeSettings({ ...settings, izinSelesai: true });
          }}
        />
      </div>
    );
  }

  if (!settings.introSelesai) {
    return <IntroPage onSelesai={() => changeSettings({ ...settings, introSelesai: true })} />;
  }

  if (!akun) {
    return (
      <div className="fullpage">
        <div className="daftar">
          <span className="brand-mark brand-mark-lg">
            <Icon name="user" size={28} />
          </span>
          <h2>Daftar akun</h2>
          <p className="muted">
            Isi sekali saja. Data ini dipakai untuk target harian dan hanya bisa diubah dari Setelan &gt; Akun.
          </p>
          <AkunForm prefill={legacy} simpanLabel="Simpan & mulai" onSave={simpanAkun} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="route" size={22} />
          </span>
          <div>
            <h1>OjolTarget Pro</h1>
            <p className="brand-sub">Halo, {akun.nama}</p>
          </div>
        </div>
        <Jam />
      </header>

      <main className="main">
        {tab === 'order' && (
          <OrderPage
            akun={akun}
            aksi={aksi}
            onAksiDone={() => setAksi(null)}
            active={active}
            setActive={setActive}
            orders={orders}
            onFinish={onFinish}
            toast={toast}
            onLihatMaps={() => setTab('maps')}
          />
        )}
        {tab === 'maps' && <MapsPage spots={spots} />}
        {tab === 'riwayat' && <RiwayatPage orders={orders} onEdit={onEdit} onDelete={onDelete} toast={toast} />}
        {tab === 'setelan' && (
          <SetelanPage
            settings={settings}
            akun={akun}
            orders={orders}
            spots={spots}
            onSettings={changeSettings}
            onAkun={simpanAkun}
            onImport={onImport}
            onReset={onReset}
            toast={toast}
          />
        )}
      </main>

      <nav className="tabbar" aria-label="Menu utama">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? 'on' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">
              <Icon name={t.icon} size={24} />
              {t.id === 'order' && active && <span className="tab-dot" />}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      {toastMsg && (
        <div className="toast" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
