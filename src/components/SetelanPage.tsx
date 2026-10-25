import React, { useEffect, useState } from 'react';
import { Akun, OrderRecord, Settings, SpotData } from '../types';
import { exportJSON, parseImport, ImporHasil } from '../lib/storage';
import { IzinStatus, izinStatus, openAppSettings, simpanFile, dengarIzin } from '../lib/native';
import { formatRupiah } from '../lib/format';
import { useBackClose } from '../lib/backclose';
import { Icon } from './Icons';
import { AkunForm } from './AkunForm';
import { IzinModal } from './IzinModal';

interface Props {
  settings: Settings;
  akun: Akun;
  orders: OrderRecord[];
  spots: SpotData[];
  onSettings: (s: Settings) => void;
  onAkun: (a: Akun) => void;
  onImport: (h: ImporHasil) => void;
  onReset: () => void;
  toast: (msg: string) => void;
}

const NAMA_IZIN: Array<[keyof IzinStatus, string]> = [
  ['location', 'Lokasi'],
  ['notifications', 'Notifikasi'],
  ['battery', 'Tanpa penghemat baterai'],
];

export function SetelanPage({ settings, akun, orders, spots, onSettings, onAkun, onImport, onReset, toast }: Props) {
  const [teks, setTeks] = useState('');
  const [konfirmReset, setKonfirmReset] = useState(false);
  const [ubahAkun, setUbahAkun] = useState(false);
  const [izinBuka, setIzinBuka] = useState(false);
  const [izin, setIzin] = useState<IzinStatus>(() => izinStatus());

  useBackClose(ubahAkun, () => setUbahAkun(false));
  useBackClose(izinBuka, () => setIzinBuka(false));

  useEffect(() => {
    const segarkan = () => setIzin(izinStatus());
    const lepas = dengarIzin(segarkan);
    document.addEventListener('visibilitychange', segarkan);
    return () => {
      lepas();
      document.removeEventListener('visibilitychange', segarkan);
    };
  }, []);

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
        <h3 className="card-title">Akun</h3>
        <button type="button" className="akun-card" onClick={() => setUbahAkun(true)} aria-label="Ubah akun">
          <span className="akun-avatar">
            <Icon name="user" size={26} />
          </span>
          <span className="akun-info">
            <strong>{akun.nama}</strong>
            <small>
              {akun.platform} · {akun.lencana}
            </small>
            <small>
              {akun.hariOnbid} hari onbid/minggu · {String(akun.jamOnline).replace('.', ',')} jam online/hari
            </small>
            <small>Target {formatRupiah(akun.targetHarian)} per hari</small>
          </span>
          <span className="akun-go">Ubah</span>
        </button>
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
      </section>

      <section className="card">
        <h3 className="card-title">Izin aplikasi</h3>
        <ul className="izin-ringkas">
          {NAMA_IZIN.map(([k, nama]) => (
            <li key={k} className={izin[k] ? 'ok' : ''}>
              <Icon name={izin[k] ? 'check' : 'x'} size={16} strokeWidth={3} />
              <span>{nama}</span>
              <small>{izin[k] ? 'Diizinkan' : 'Belum'}</small>
            </li>
          ))}
        </ul>
        <div className="row-actions">
          <button type="button" className="btn btn-ghost grow" onClick={() => setIzinBuka(true)}>
            <Icon name="shield" size={18} /> Atur izin
          </button>
          <button type="button" className="btn btn-ghost grow" onClick={openAppSettings}>
            <Icon name="settings" size={18} /> Setelan Android
          </button>
        </div>
      </section>

      <section className="card">
        <h3 className="card-title">
          Data{' '}
          <small>
            {orders.length} order · {spots.length} titik
          </small>
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
        OjolTarget Pro 2.2.0 · data tersimpan di perangkat ini. Peta: OpenStreetMap/CARTO. Jarak rute: OSRM.
      </p>

      {ubahAkun && (
        <div className="sheet-backdrop" onClick={() => setUbahAkun(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Ubah akun" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <div className="sheet-head">
              <h2>Ubah akun</h2>
              <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setUbahAkun(false)}>
                <Icon name="x" />
              </button>
            </div>
            <div className="sheet-body">
              <AkunForm
                awal={akun}
                simpanLabel="Simpan akun"
                onSave={(a) => {
                  onAkun(a);
                  setUbahAkun(false);
                  toast('Akun diperbarui.');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {izinBuka && (
        <IzinModal
          ulang
          onSelesai={() => {
            setIzinBuka(false);
            setIzin(izinStatus());
          }}
        />
      )}
    </div>
  );
}
