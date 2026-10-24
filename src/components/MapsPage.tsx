import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Fix, LapisPeta, SpotData, SpotTipe } from '../types';
import { Cell, FilterSpot, Periode, gabungkan, saring } from '../lib/spots';
import { getFix } from '../lib/geo';
import { formatRupiah, formatTanggal, pad2 } from '../lib/format';
import { bukaNavigasi } from '../lib/native';
import { Icon } from './Icons';
import { MapHandle, SlippyMap } from './SlippyMap';

interface Props {
  spots: SpotData[];
  peta: LapisPeta;
  onPeta: (p: LapisPeta) => void;
}

const PERIODE: Array<{ id: Periode; label: string }> = [
  { id: 'hari', label: 'Hari ini' },
  { id: '7', label: '7 hari' },
  { id: '30', label: '30 hari' },
  { id: 'semua', label: 'Semua' },
];

const TIPE: Array<{ id: SpotTipe; label: string; hint: string }> = [
  { id: 'Spot Gacor', label: 'Dapat order', hint: 'Lokasi Anda saat order masuk' },
  { id: 'Jemput', label: 'Jemput', hint: 'Titik penjemputan' },
  { id: 'Antar', label: 'Antar', hint: 'Titik tujuan' },
];

function jamRentang(h: number): string {
  return `${pad2(h)}:00-${pad2((h + 1) % 24)}:00`;
}

export function MapsPage({ spots, peta, onPeta }: Props) {
  const [filter, setFilter] = useState<FilterSpot>({ periode: '30', tipe: 'Spot Gacor', jamIni: false });
  const [selKey, setSelKey] = useState<string | null>(null);
  const [user, setUser] = useState<Fix | null>(null);
  const [gpsPesan, setGpsPesan] = useState<string | null>(null);
  const [mencari, setMencari] = useState(false);
  const mapRef = useRef<MapHandle>(null);
  const sudahFit = useRef(false);

  const cells = useMemo(() => gabungkan(saring(spots, filter)), [spots, filter]);
  const selected = cells.find((c) => c.key === selKey) ?? null;
  const totalTitik = cells.reduce((s, c) => s + c.count, 0);

  const awal = useMemo(() => {
    if (cells.length) return { lat: cells[0].lat, lng: cells[0].lng, zoom: 14 };
    return { lat: -6.2, lng: 106.82, zoom: 11 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cariLokasi = async (pindah: boolean) => {
    setMencari(true);
    setGpsPesan(null);
    try {
      const fix = await getFix({ timeout: 10000, good: 60 });
      setUser(fix);
      if (pindah) mapRef.current?.flyTo(fix, 16);
    } catch (e) {
      setGpsPesan(e instanceof Error ? e.message : 'Lokasi tidak tersedia');
    } finally {
      setMencari(false);
    }
  };

  // Lokasi pengguna: sekali saat halaman dibuka.
  useEffect(() => {
    void cariLokasi(!cells.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tampilkan semua titik sekali saat pertama kali ada data.
  useEffect(() => {
    if (!sudahFit.current && cells.length) {
      sudahFit.current = true;
      setTimeout(() => mapRef.current?.fit(cells.map((c) => ({ lat: c.lat, lng: c.lng }))), 50);
    }
  }, [cells]);

  const pilih = (c: Cell | null) => setSelKey(c ? c.key : null);
  const ke = (c: Cell) => {
    setSelKey(c.key);
    mapRef.current?.flyTo({ lat: c.lat, lng: c.lng }, 16);
  };

  const tipeAktif = TIPE.find((t) => t.id === filter.tipe)!;

  return (
    <div className="page page-maps">
      <div className="filters" role="group" aria-label="Filter Maps Gacor">
        <div className="chips scroll-x">
          {TIPE.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`chip ${filter.tipe === t.id ? 'on' : ''}`}
              onClick={() => {
                setSelKey(null);
                setFilter((f) => ({ ...f, tipe: t.id }));
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="chips scroll-x">
          {PERIODE.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`chip chip-sm ${filter.periode === p.id ? 'on' : ''}`}
              onClick={() => {
                setSelKey(null);
                setFilter((f) => ({ ...f, periode: p.id }));
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className={`chip chip-sm ${filter.jamIni ? 'on' : ''}`}
            onClick={() => {
              setSelKey(null);
              setFilter((f) => ({ ...f, jamIni: !f.jamIni }));
            }}
          >
            <Icon name="clock" size={14} /> Jam ini
          </button>
        </div>
      </div>

      <div className="map-wrap">
        <SlippyMap
          ref={mapRef}
          layer={peta}
          cells={cells}
          selectedKey={selKey}
          user={user}
          initial={awal}
          onSelect={pilih}
        />

        <div className="map-tools">
          <button type="button" className="map-btn" aria-label="Perbesar" onClick={() => mapRef.current?.zoomBy(1)}>
            <Icon name="plus" />
          </button>
          <button type="button" className="map-btn" aria-label="Perkecil" onClick={() => mapRef.current?.zoomBy(-1)}>
            <Icon name="minus" />
          </button>
          <button
            type="button"
            className={`map-btn ${mencari ? 'busy' : ''}`}
            aria-label="Lokasi saya"
            onClick={() => cariLokasi(true)}
          >
            <Icon name="locate" />
          </button>
          <button
            type="button"
            className="map-btn"
            aria-label="Tampilkan semua titik"
            onClick={() => mapRef.current?.fit(cells.map((c) => ({ lat: c.lat, lng: c.lng })))}
            disabled={!cells.length}
          >
            <Icon name="map" />
          </button>
          <button
            type="button"
            className="map-btn map-btn-text"
            aria-label="Ganti gaya peta"
            onClick={() => onPeta(peta === 'gelap' ? 'standar' : 'gelap')}
          >
            {peta === 'gelap' ? 'Gelap' : 'Std'}
          </button>
        </div>

        <div className="map-count">
          {cells.length ? `${cells.length} area · ${totalTitik} titik` : 'Belum ada titik'}
        </div>

        {selected && (
          <div className="spot-card" role="dialog" aria-label="Detail area">
            <button type="button" className="icon-btn spot-close" aria-label="Tutup" onClick={() => setSelKey(null)}>
              <Icon name="x" size={18} />
            </button>
            <h3>{selected.nama}</h3>
            <p className="muted">{selected.wilayah}</p>
            <div className="spot-stats">
              <div>
                <strong>{selected.count}</strong>
                <span>order</span>
              </div>
              <div>
                <strong>{selected.nominalCount ? formatRupiah(selected.avg) : '-'}</strong>
                <span>rata-rata</span>
              </div>
              <div>
                <strong>{jamRentang(selected.jamTerbanyak)}</strong>
                <span>jam ramai</span>
              </div>
            </div>
            <p className="muted small">Terakhir: {formatTanggal(selected.terakhir)}</p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => bukaNavigasi(selected.lat, selected.lng)}
            >
              <Icon name="navigation" size={18} /> Navigasi ke sini
            </button>
          </div>
        )}
      </div>

      {gpsPesan && <p className="notice">{gpsPesan}</p>}

      <section className="card">
        <h3 className="card-title">
          Area paling gacor <small>{tipeAktif.hint}</small>
        </h3>
        {cells.length === 0 ? (
          <div className="empty">
            <Icon name="map" size={34} />
            <p>
              Belum ada data untuk filter ini. Selesaikan order lewat tab <strong>Order</strong> dan titiknya
              akan muncul di peta.
            </p>
          </div>
        ) : (
          <ol className="rank">
            {cells.slice(0, 8).map((c, i) => (
              <li key={c.key}>
                <button type="button" className={`rank-row ${c.key === selKey ? 'on' : ''}`} onClick={() => ke(c)}>
                  <span className="rank-n">{i + 1}</span>
                  <span className="rank-main">
                    <strong>{c.nama}</strong>
                    <small>
                      {c.wilayah} · ramai {jamRentang(c.jamTerbanyak)}
                    </small>
                  </span>
                  <span className="rank-val">
                    <strong>{c.count}x</strong>
                    <small>{c.nominalCount ? formatRupiah(c.avg) : '-'}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
