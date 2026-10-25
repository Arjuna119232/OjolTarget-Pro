import React, { useState } from 'react';
import { Icon, IconName } from './Icons';

const SLIDES: Array<{ icon: IconName; judul: string; teks: string }> = [
  {
    icon: 'bolt',
    judul: 'Catat order dengan 3 tombol',
    teks: 'Dapat orderan, Sudah jemput, Order selesai. Cukup ketuk tombolnya di setiap tahap, tanpa mengetik.',
  },
  {
    icon: 'route',
    judul: 'Jarak otomatis, pendapatan dari Anda',
    teks: 'Jarak ke titik jemput dan ke tujuan dihitung dari GPS. Pendapatan order Anda isi sendiri sesuai yang diterima.',
  },
  {
    icon: 'map',
    judul: 'Maps Gacor',
    teks: 'Setiap order menyimpan titik dapat, jemput, dan antar. Lihat area paling ramai dan jam terbaiknya di peta.',
  },
];

export function IntroPage({ onSelesai }: { onSelesai: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const akhir = i === SLIDES.length - 1;

  return (
    <div className="fullpage intro">
      <div className="intro-top">
        {!akhir ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onSelesai}>
            Lewati
          </button>
        ) : (
          <span />
        )}
      </div>

      <div className="intro-body" key={i}>
        <span className="intro-art">
          <Icon name={s.icon} size={64} strokeWidth={1.8} />
        </span>
        <h2>{s.judul}</h2>
        <p>{s.teks}</p>
      </div>

      <div className="intro-foot">
        <div className="dots" aria-label={`Halaman ${i + 1} dari ${SLIDES.length}`}>
          {SLIDES.map((_, n) => (
            <span key={n} className={n === i ? 'on' : ''} />
          ))}
        </div>
        <div className="row-actions">
          {i > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setI(i - 1)}>
              Kembali
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary grow"
            onClick={() => (akhir ? onSelesai() : setI(i + 1))}
          >
            {akhir ? 'Mulai' : 'Lanjut'}
          </button>
        </div>
      </div>
    </div>
  );
}
