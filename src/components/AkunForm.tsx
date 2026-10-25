import React, { useState } from 'react';
import { Akun, PLATFORMS, Platform } from '../types';
import { formatDigits, parseDecimal } from '../lib/format';
import { Icon } from './Icons';

interface Props {
  awal?: Akun | null;
  prefill?: { nama?: string; platform?: Platform } | null;
  simpanLabel: string;
  onSave: (a: Akun) => void;
}

function teks(n: number | undefined): string {
  return n === undefined ? '' : String(n).replace('.', ',');
}

export function AkunForm({ awal, prefill, simpanLabel, onSave }: Props) {
  const [nama, setNama] = useState(awal?.nama ?? prefill?.nama ?? '');
  const [platform, setPlatform] = useState<Platform>(awal?.platform ?? prefill?.platform ?? 'Grab');
  const [lencana, setLencana] = useState(awal?.lencana ?? '');
  const [hari, setHari] = useState(teks(awal?.hariOnbid));
  const [jam, setJam] = useState(teks(awal?.jamOnline));
  const [target, setTarget] = useState(awal ? String(awal.targetHarian) : '');
  const [salah, setSalah] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseDecimal(hari);
    const j = parseDecimal(jam);
    const t = Number(target) || 0;
    if (!nama.trim()) return setSalah('Isi nama akun.');
    if (!lencana.trim()) return setSalah('Isi lencana / level akun.');
    if (h === undefined || h < 1 || h > 7) return setSalah('Hari onbid per minggu harus 1 sampai 7.');
    if (j === undefined || j < 0.5 || j > 24) return setSalah('Jam online per hari harus 0,5 sampai 24.');
    if (t <= 0) return setSalah('Isi target penghasilan per hari.');
    setSalah(null);
    onSave({
      nama: nama.trim(),
      platform,
      lencana: lencana.trim(),
      hariOnbid: Math.round(h),
      jamOnline: j,
      targetHarian: t,
      dibuat: awal?.dibuat ?? Date.now(),
    });
  };

  const fokus = (e: React.FocusEvent<HTMLElement>) =>
    e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });

  return (
    <form className="akun-form" onSubmit={submit} noValidate>
      <label className="field">
        <span className="field-label">Nama akun</span>
        <input
          className="input"
          value={nama}
          maxLength={40}
          autoComplete="off"
          placeholder="Nama Anda"
          onFocus={fokus}
          onChange={(e) => setNama(e.target.value)}
        />
      </label>

      <div className="field">
        <span className="field-label">Platform utama</span>
        <div className="chips">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              className={`chip ${platform === p ? 'on' : ''}`}
              onClick={() => setPlatform(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field-label">Lencana / level akun</span>
        <input
          className="input"
          value={lencana}
          maxLength={30}
          autoComplete="off"
          placeholder="Contoh: Juara, Jawara, Bronze"
          onFocus={fokus}
          onChange={(e) => setLencana(e.target.value)}
        />
      </label>

      <div className="grid2">
        <label className="field">
          <span className="field-label">Hari onbid / minggu</span>
          <input
            className="input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="6"
            value={hari}
            onFocus={fokus}
            onChange={(e) => setHari(e.target.value.replace(/[^\d]/g, '').slice(0, 1))}
          />
        </label>
        <label className="field">
          <span className="field-label">Jam online / hari</span>
          <input
            className="input"
            inputMode="decimal"
            autoComplete="off"
            placeholder="8"
            value={jam}
            onFocus={fokus}
            onChange={(e) => setJam(e.target.value.replace(/[^\d.,]/g, '').slice(0, 4))}
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">Target penghasilan per hari</span>
        <div className="money">
          <span className="money-prefix">Rp</span>
          <input
            className="input input-money input-money-sm"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={formatDigits(target)}
            onFocus={fokus}
            onChange={(e) => setTarget(e.target.value.replace(/\D/g, '').slice(0, 9))}
          />
        </div>
      </label>

      {salah && <p className="notice notice-error">{salah}</p>}

      <button type="submit" className="btn btn-primary btn-block btn-lg">
        <Icon name="check" size={20} />
        {simpanLabel}
      </button>
    </form>
  );
}
