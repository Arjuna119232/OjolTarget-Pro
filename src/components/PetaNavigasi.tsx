import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Navigation,
  MapPin,
  Compass,
  Crosshair,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { SpotData, ActiveOrderState, PlatformType } from '@/types';
import { getCurrentPositionOnce, bukaNavigasiExternal, GeoLocationResult } from '@/lib/geo';
import { getNamaLokasi, ReverseGeoResult } from '@/lib/nominatim';
import { smartCache } from '@/lib/cache';

interface PetaNavigasiProps {
  spots: SpotData[];
  activeOrder: ActiveOrderState | null;
  onUpdateActiveOrder: (order: ActiveOrderState | null) => void;
  onAddSpot: (spot: SpotData) => void;
}

export function PetaNavigasi({
  spots,
  activeOrder,
  onUpdateActiveOrder,
  onAddSpot,
}: PetaNavigasiProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.CircleMarker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const jemputMarkerRef = useRef<L.Marker | null>(null);
  const antarMarkerRef = useRef<L.Marker | null>(null);

  const [currentPos, setCurrentPos] = useState<GeoLocationResult | null>(null);
  const [currentAddress, setCurrentAddress] = useState<ReverseGeoResult | null>(null);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [mapLayer, setMapLayer] = useState<'driver' | 'dark' | 'outdoor'>('driver');
  const [selectedCoord, setSelectedCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Inisialisasi Peta Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    // Default center di Monas Jakarta
    const map = L.map(mapContainerRef.current, {
      center: [-6.1754, 106.8272],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Tile layer pilihan driver (kontras tinggi & hemat data)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Event tap pada peta untuk memilih titik secara bebas
    map.on('click', async (e: L.LeafletMouseEvent) => {
      setSelectedCoord({ lat: e.latlng.lat, lng: e.latlng.lng });
      try {
        const geo = await getNamaLokasi(e.latlng.lat, e.latlng.lng);
        setCurrentAddress(geo);
      } catch {
        // fallback
      }
    });

    mapInstanceRef.current = map;

    // Ambil posisi awal pengemudi
    refreshDriverLocation();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update spot markers on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Render spot gacor markers
    spots.slice(0, 30).forEach((spot) => {
      const circle = L.circleMarker([spot.lat, spot.lng], {
        radius: 6,
        color: '#f59e0b',
        fillColor: '#fbbf24',
        fillOpacity: 0.8,
        weight: 1.5,
      }).addTo(map);

      circle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 11px;">
          <strong>📍 ${spot.namaLokasi || 'Spot Gacor'}</strong><br/>
          Wilayah: ${spot.wilayah}<br/>
          Jam Gacor: ${spot.jamGacor}
        </div>
      `);
    });
  }, [spots]);

  // Update jemput & antar markers from activeOrder
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeOrder?.titikJemput) {
      if (jemputMarkerRef.current) map.removeLayer(jemputMarkerRef.current);
      const jemputIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background:#10b981; color:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:2px solid white; box-shadow:0 4px 6px rgba(0,0,0,0.3);">J</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      jemputMarkerRef.current = L.marker(
        [activeOrder.titikJemput.lat, activeOrder.titikJemput.lng],
        { icon: jemputIcon }
      )
        .addTo(map)
        .bindPopup(`<b>Titik Jemput:</b> ${activeOrder.titikJemput.nama}`);
    }

    if (activeOrder?.titikAntar) {
      if (antarMarkerRef.current) map.removeLayer(antarMarkerRef.current);
      const antarIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background:#0284c7; color:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:2px solid white; box-shadow:0 4px 6px rgba(0,0,0,0.3);">A</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      antarMarkerRef.current = L.marker(
        [activeOrder.titikAntar.lat, activeOrder.titikAntar.lng],
        { icon: antarIcon }
      )
        .addTo(map)
        .bindPopup(`<b>Titik Antar:</b> ${activeOrder.titikAntar.nama}`);
    }
  }, [activeOrder]);

  const refreshDriverLocation = async () => {
    setLoadingGPS(true);
    try {
      const pos = await getCurrentPositionOnce(10000, true);
      setCurrentPos(pos);

      const map = mapInstanceRef.current;
      if (map) {
        map.setView([pos.lat, pos.lng], 16, { animate: true });

        // Update driver accuracy circle
        if (accuracyCircleRef.current) map.removeLayer(accuracyCircleRef.current);
        accuracyCircleRef.current = L.circle([pos.lat, pos.lng], {
          radius: Math.max(15, pos.accuracy || 20),
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(map);

        // Update driver dot marker
        if (driverMarkerRef.current) map.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = L.circleMarker([pos.lat, pos.lng], {
          radius: 9,
          color: '#ffffff',
          fillColor: '#059669',
          fillOpacity: 1,
          weight: 3,
        }).addTo(map);
      }

      // Reverse geocode
      const geo = await getNamaLokasi(pos.lat, pos.lng);
      setCurrentAddress(geo);
    } catch (e: any) {
      showToast('⚠️ Gagal mengambil sinyal GPS: ' + (e.message || 'Timeout'));
    } finally {
      setLoadingGPS(false);
    }
  };

  const setTitikJemputFromMap = async () => {
    const target = selectedCoord || currentPos;
    if (!target) return alert('Silakan tunggu GPS atau sentuh lokasi pada peta.');

    const geo = currentAddress || (await getNamaLokasi(target.lat, target.lng));
    const newActive: ActiveOrderState = activeOrder || {
      id: crypto.randomUUID(),
      platform: 'Grab',
      nominal: 12000,
      status: 'Menuju Titik Jemput',
      waktuMulai: Date.now(),
    };

    onUpdateActiveOrder({
      ...newActive,
      titikJemput: {
        nama: geo.nama,
        lat: target.lat,
        lng: target.lng,
      },
    });

    showToast(`📍 Titik Jemput terkunci: ${geo.nama}`);
  };

  const setTitikAntarFromMap = async () => {
    const target = selectedCoord || currentPos;
    if (!target) return alert('Silakan tunggu GPS atau sentuh lokasi pada peta.');

    const geo = currentAddress || (await getNamaLokasi(target.lat, target.lng));
    const newActive: ActiveOrderState = activeOrder || {
      id: crypto.randomUUID(),
      platform: 'Grab',
      nominal: 12000,
      status: 'Menuju Titik Antar',
      waktuMulai: Date.now(),
    };

    onUpdateActiveOrder({
      ...newActive,
      titikAntar: {
        nama: geo.nama,
        lat: target.lat,
        lng: target.lng,
      },
    });

    showToast(`🏁 Titik Antar terkunci: ${geo.nama}`);
  };

  const targetJemput = activeOrder?.titikJemput;
  const targetAntar = activeOrder?.titikAntar;

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] space-y-2">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-12 left-4 right-4 z-50 bg-emerald-500 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-white/80 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Top Location Address Card */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-2xl p-3 shadow-md flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-slate-200 truncate">
              {currentAddress?.nama || (loadingGPS ? 'Mencari sinyal GPS...' : 'Lokasi Saat Ini')}
            </span>
            {currentAddress?.fromCache && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono">
                Cached
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
            {currentPos
              ? `${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)} • Akurasi ±${Math.round(currentPos.accuracy)}m`
              : 'Menunggu koordinat satelit'}
          </div>
        </div>

        <button
          onClick={refreshDriverLocation}
          disabled={loadingGPS}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 shrink-0"
          title="Segarkan Posisi GPS"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-400 ${loadingGPS ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Map Container */}
      <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-950" />

        {/* Floating Quick Action Overlays on Map */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 amoled:bg-black/90 backdrop-blur-md border border-slate-800 text-[10px] text-slate-300 font-mono shadow-md">
            📍 {spots.length} Spot Gacor Terdaftar
          </div>
        </div>

        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={refreshDriverLocation}
            className="p-2 rounded-xl bg-slate-900/90 amoled:bg-black/90 backdrop-blur-md border border-slate-700 text-emerald-400 shadow-lg hover:bg-slate-800"
            title="Pusatkan ke Posisi Saya"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Driver Navigasi & Titik Jemput/Antar Bar */}
      <div className="bg-slate-900/95 amoled:bg-black border border-slate-800 rounded-2xl p-3 space-y-2.5 shrink-0 shadow-xl">
        <div className="grid grid-cols-2 gap-2">
          {/* Tombol Titik Jemput */}
          <button
            onClick={setTitikJemputFromMap}
            className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Kunci Titik Jemput</span>
          </button>

          {/* Tombol Titik Antar */}
          <button
            onClick={setTitikAntarFromMap}
            className="py-2.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 active:scale-95 border border-sky-500/40 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Navigation className="w-4 h-4 text-sky-400" />
            <span>Kunci Titik Antar</span>
          </button>
        </div>

        {/* Turn-by-Turn Navigation Launchers */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-medium shrink-0">Buka Rute:</span>

          {targetJemput ? (
            <button
              onClick={() =>
                bukaNavigasiExternal(targetJemput.lat, targetJemput.lng, 'Titik Jemput Penumpang')
              }
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="truncate">Navigasi Jemput</span>
            </button>
          ) : (
            <button
              disabled
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800/50 text-slate-500 text-[11px] font-medium flex items-center justify-center gap-1 cursor-not-allowed"
            >
              Belum ada titik jemput
            </button>
          )}

          {targetAntar ? (
            <button
              onClick={() =>
                bukaNavigasiExternal(targetAntar.lat, targetAntar.lng, 'Titik Antar Tujuan')
              }
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-md shadow-sky-600/20"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="truncate">Navigasi Antar</span>
            </button>
          ) : (
            <button
              disabled
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800/50 text-slate-500 text-[11px] font-medium flex items-center justify-center gap-1 cursor-not-allowed"
            >
              Belum ada titik antar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
