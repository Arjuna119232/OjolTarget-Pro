import React, { useEffect, useRef, useState } from 'react';
import { IzinStatus, dengarIzin, izinStatus, mintaIzin } from '../lib/native';
import { Icon, IconName } from './Icons';

interface Props {
  onSelesai: () => void;
  /** Judul berbeda saat dibuka ulang dari Setelan. */
  ulang?: boolean;
}

interface Item {
  key: keyof IzinStatus;
  icon: IconName;
  judul: string;
  teks: string;
  wajib?: boolean;
}

const ITEMS: Item[] = [
  {
    key: 'location',
    icon: 'locate',
    judul: 'Lokasi (GPS)',
    teks: 'Wajib. Menghitung jarak dapat → jemput → antar dan mengisi Maps Gacor. Pilih "Presisi/Tepat".',
    wajib: true,
  },
  {
    key: 'notifications',
    icon: 'bell',
    judul: 'Notifikasi',
    teks: 'Pengingat dan info penting dari aplikasi.',
  },
  {
    key: 'battery',
    icon: 'battery',
    judul: 'Tanpa penghemat baterai',
    teks: 'Agar GPS tetap akurat saat layar mati atau Anda membuka aplikasi order.',
  },
  {
    key: 'storage',
    icon: 'folder',
    judul: 'Penyimpanan',
    teks: 'Menyimpan ekspor CSV dan cadangan ke folder Download (Android 9 ke bawah).',
  },
];

const URUTAN: Array<keyof IzinStatus> = ['location', 'notifications', 'battery', 'storage'];

export function IzinModal({ onSelesai, ulang }: Props) {
  const [st, setSt] = useState<IzinStatus>(() => izinStatus());
  const [jalan, setJalan] = useState(false);
  const jalanRef = useRef(false);
  const dicoba = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const berikutnya = () => {
    if (timer.current) clearTimeout(timer.current);
    const s = izinStatus();
    setSt(s);
    const k = URUTAN.find((x) => !s[x] && !dicoba.current.has(x));
    if (!k) {
      jalanRef.current = false;
      setJalan(false);
      return;
    }
    dicoba.current.add(k);
    mintaIzin(k);
    // Pengaman bila native tidak memanggil balik (mis. Android lama).
    timer.current = setTimeout(() => {
      if (jalanRef.current) berikutnya();
    }, 60000);
  };

  useEffect(() => {
    const lepas = dengarIzin(() => {
      if (jalanRef.current) setTimeout(berikutnya, 450);
      else setSt(izinStatus());
    });
    const vis = () => {
      if (!document.hidden) setSt(izinStatus());
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      lepas();
      document.removeEventListener('visibilitychange', vis);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const semua = () => {
    dicoba.current.clear();
    jalanRef.current = true;
    setJalan(true);
    berikutnya();
  };

  const tampil = ITEMS.filter((i) => i.key !== 'storage' || !st.storage);
  const lengkap = tampil.every((i) => st[i.key]);
  const lokasiBelum = !st.location;

  return (
    <div className="sheet-backdrop center-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Izin aplikasi">
        <div className="dialog-head">
          <span className="dialog-icon">
            <Icon name="shield" size={26} />
          </span>
          <h2>{ulang ? 'Izin aplikasi' : 'Izinkan akses agar optimal'}</h2>
          <p className="muted">
            Ketuk <strong>Izinkan semua</strong>, lalu pilih <strong>Izinkan</strong> pada setiap permintaan.
          </p>
        </div>

        <ul className="izin-list">
          {tampil.map((i) => (
            <li key={i.key} className={st[i.key] ? 'ok' : ''}>
              <span className="izin-icon">
                <Icon name={st[i.key] ? 'check' : i.icon} size={20} strokeWidth={st[i.key] ? 3 : 2} />
              </span>
              <div className="izin-text">
                <strong>
                  {i.judul} {i.wajib && <em>wajib</em>}
                </strong>
                <span>{i.teks}</span>
              </div>
              {!st[i.key] && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => mintaIzin(i.key)}>
                  Izinkan
                </button>
              )}
            </li>
          ))}
        </ul>

        {lokasiBelum && (
          <p className="notice">Tanpa izin lokasi, jarak order tidak bisa dihitung otomatis.</p>
        )}

        <div className="dialog-foot">
          {lengkap ? (
            <button type="button" className="btn btn-primary btn-block" onClick={onSelesai}>
              <Icon name="check" size={20} /> Lanjutkan
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={onSelesai}>
                {ulang ? 'Tutup' : 'Nanti saja'}
              </button>
              <button type="button" className="btn btn-primary grow" onClick={semua} disabled={jalan}>
                {jalan ? 'Menunggu…' : 'Izinkan semua'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
