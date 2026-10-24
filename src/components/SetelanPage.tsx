import React, { useState } from 'react';
import { OrderRecord, PLATFORMS, Settings, SpotData } from '../types';
import { exportJSON, parseImport, ImporHasil } from '../lib/storage';
import { openAppSettings, requestLocationPermission, simpanFile } from '../lib/native';
import { Icon } from './Icons';

interface Props {
  settings: Settings;
  orders: OrderRecord[];
  spots: SpotData[];
  onSettings: (s: Settings) => void;
  onImport: (h: ImporHasil) => void;
  onReset: () => void;
  toast: (msg: string) => void;
}

export function SetelanPage({ settings, orders, spots, onSettings, onImport, onReset, toast }: Props) {
  const [teks, setTeks] = useState('');
  const [konfirmReset, setKonfirmReset] = useState(false);

  const cadangkan = () => {
    const nama = `OjolTarget-Cadangan-${new Date().toISOString().slice(0, 10)}.json`;
    const ok = simpanFile(nama, exportJSON(settings, orders, spots), 'application/json');
    toast(ok ? 'Cadangan disimpan ke folder Download.' : 'Gagal menyimpan cadangan.');
  };

  const pulihkan = () => {
    const h = parseImport(teks);
    if (!h) {
      toast('Isi cadangan tidak valid.');
      return;
    }
    onImport(h);
    setTeks('');
    toast(`Dipulihkan: ${h.orders.length} order, ${h.spots.length} titik.`);
  };

  return (
    <div className="page">
      <section className="card">
        <h3 className="card-title">Profil</h3>
        <label className="field">
          <span className="field-label">Nama</span>
          <input
            className="input"
            value={settings.nama}
            maxLength={40}
            placeholder="Nama Anda"
            onChange={(e) => onSettings({ ...settings, nama: e.target.value })}
          />
        </label>
        <div className="field">
          <span className="field-label">Platform utama</span>
          <div className="chips">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                className={`chip ${settings.platform === p ? 'on' : ''}`}
                onClick={() => onSettings({ ...settings, platform: p })}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="card-title">Tampilan</h3>
        <div className="field">
          <span className="field-label">Tema</span>
          <div className="chips">
            {(
              [
                ['gelap', 'Gelap'],
                ['terang', 'Terang'],
                ['sistem', 'Ikut sistem'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`chip ${settings.tema === id ? 'on' : ''}`}
                onClick={() => onSettings({ ...settings, tema: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Gaya peta</span>
          <div className="chips">
            {(
              [
                ['gelap', 'Gelap'],
                ['standar', 'Standar'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`chip ${settings.peta === id ? 'on' : ''}`}
                onClick={() => onSettings({ ...settings, peta: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="card-title">Izin lokasi</h3>
        <p className="muted">GPS dipakai untuk menghitung jarak dan mengisi Maps Gacor.</p>
        <div className="row-actions">
          <button
            type="button"
            className="btn btn-ghost grow"
            onClick={() => {
              requestLocationPermission();
              toast('Permintaan izin lokasi dikirim.');
            }}
          >
            <Icon name="locate" size={18} /> Minta izin
          </button>
          <button type="button" className="btn btn-ghost grow" onClick={openAppSettings}>
            <Icon name="settings" size={18} /> Setelan Android
          </button>
        </div>
      </section>

      <section className="card">
        <h3 className="card-title">
          Data <small>{orders.length} order · {spots.length} titik</small>
        </h3>
        <button type="button" className="btn btn-ghost btn-block" onClick={cadangkan}>
          <Icon name="download" size={18} /> Simpan cadangan (JSON)
        </button>
        <label className="field">
          <span className="field-label">Pulihkan dari cadangan</span>
          <textarea
            className="input textarea"
            rows={3}
            placeholder="Tempel isi file cadangan di sini"
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn-ghost btn-block" onClick={pulihkan} disabled={!teks.trim()}>
          Pulihkan
        </button>

        {konfirmReset ? (
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-danger grow"
              onClick={() => {
                onReset();
                setKonfirmReset(false);
                toast('Semua data order dan titik dihapus.');
              }}
            >
              Ya, hapus semua
            </button>
            <button type="button" className="btn btn-ghost grow" onClick={() => setKonfirmReset(false)}>
              Batal
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-danger-outline btn-block" onClick={() => setKonfirmReset(true)}>
            <Icon name="trash" size={18} /> Hapus semua data
          </button>
        )}
      </section>

      <p className="muted small center">
        OjolTarget Pro 2.1.0 · data tersimpan di perangkat ini. Peta: OpenStreetMap/CARTO. Jarak rute: OSRM.
      </p>
    </div>
  );
}
