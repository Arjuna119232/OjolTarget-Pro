import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActiveOrder, OrderRecord, Platform, Settings, SpotData, Tab } from './types';
import {
  loadActive,
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
import { jamSlot, round1, uid } from './lib/format';
import { requestLocationPermission, setChrome } from './lib/native';
import { Icon, IconName } from './components/Icons';
import { OrderFormValue } from './components/OrderSheet';
import { OrderPage } from './components/OrderPage';
import { MapsPage } from './components/MapsPage';
import { RiwayatPage } from './components/RiwayatPage';
import { SetelanPage } from './components/SetelanPage';

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

export default function App() {
  const [tab, setTab] = useState<Tab>('order');
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());
  const [orders, setOrdersState] = useState<OrderRecord[]>(() => loadOrders());
  const [spots, setSpotsState] = useState<SpotData[]>(() => loadSpots());
  const [active, setActiveState] = useState<ActiveOrder | null>(() => loadActive());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Ref selalu berisi nilai terbaru, sehingga callback async (nama lokasi, rute) tidak memakai state basi.
  const ordersRef = useRef(orders);
  const spotsRef = useRef(spots);
  const activeRef = useRef(active);
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

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3600);
  }, []);

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
  }, [settings]);

  // Izin lokasi diminta sekali di awal supaya tombol order langsung bisa mengunci GPS.
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const changeSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    saveSettings(s);
  }, []);

  const setPlatform = useCallback(
    (p: Platform) => changeSettings({ ...settings, platform: p }),
    [settings, changeSettings]
  );

  // Order berjalan memakai platform terpilih saat dimulai; saat tidak ada order, ikut setelan.
  const platform = active?.platform ?? settings.platform;

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

  // ---- Order selesai: simpan pendapatan manual + jarak, lalu isi Maps Gacor ----
  const onFinish = useCallback(
    (a: ActiveOrder, v: OrderFormValue) => {
      const now = Date.now();
      const id = uid();
      const kmJ = v.kmJemput;
      const kmA = v.kmAntar;
      const total = round1((kmJ ?? 0) + (kmA ?? 0));
      const akhir: ActiveOrder = { ...a, platform: v.platform };
      const titik = buatSpotOrder(akhir, id, v.nominal, now);

      const rec: OrderRecord = {
        id,
        nominal: v.nominal,
        platform: v.platform,
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
      if (v.platform !== settings.platform) changeSettings({ ...settings, platform: v.platform });
      toast(titik.length ? 'Order tersimpan. Titik masuk Maps Gacor.' : 'Order tersimpan (tanpa titik lokasi).');
      lengkapiNama(id, titik, akhir);
    },
    [setOrders, setSpots, setActive, settings, changeSettings, toast, lengkapiNama]
  );

  // ---- Riwayat ----
  const onAdd = useCallback(
    (v: OrderFormValue) => {
      const now = Date.now();
      const rec: OrderRecord = {
        id: uid(),
        nominal: v.nominal,
        platform: v.platform,
        timestamp: now,
        createdAt: now,
        kmKeJemput: v.kmJemput,
        kmKeAntar: v.kmAntar,
        kmTotalTrip: round1((v.kmJemput ?? 0) + (v.kmAntar ?? 0)),
        catatan: v.catatan || undefined,
        manual: true,
      };
      setOrders((prev) => [rec, ...prev]);
      toast('Order manual tersimpan.');
    },
    [setOrders, toast]
  );

  const onEdit = useCallback(
    (id: string, v: OrderFormValue) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                nominal: v.nominal,
                platform: v.platform,
                kmKeJemput: v.kmJemput,
                kmKeAntar: v.kmAntar,
                kmTotalTrip: round1((v.kmJemput ?? 0) + (v.kmAntar ?? 0)),
                catatan: v.catatan || undefined,
              }
            : o
        )
      );
      setSpots((prev) =>
        prev.map((s) => (s.orderId === id ? { ...s, nominal: v.nominal, platform: v.platform } : s))
      );
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

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="route" size={22} />
          </span>
          <div>
            <h1>OjolTarget Pro</h1>
            <p className="brand-sub">{settings.nama ? `Halo, ${settings.nama}` : 'Catat order, cari spot gacor'}</p>
          </div>
        </div>
        {active && (
          <button type="button" className="live-pill" onClick={() => setTab('order')} aria-label="Order berjalan">
            <span className="live-dot" />
            Berjalan
          </button>
        )}
      </header>

      <main className="main">
        {tab === 'order' && (
          <OrderPage
            platform={platform}
            onPlatform={setPlatform}
            active={active}
            setActive={setActive}
            orders={orders}
            onFinish={onFinish}
            toast={toast}
            onLihatMaps={() => setTab('maps')}
          />
        )}
        {tab === 'maps' && (
          <MapsPage spots={spots} peta={settings.peta} onPeta={(p) => changeSettings({ ...settings, peta: p })} />
        )}
        {tab === 'riwayat' && (
          <RiwayatPage
            orders={orders}
            platform={platform}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            toast={toast}
          />
        )}
        {tab === 'setelan' && (
          <SetelanPage
            settings={settings}
            orders={orders}
            spots={spots}
            onSettings={changeSettings}
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
