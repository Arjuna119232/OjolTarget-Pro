import React, { useEffect, useRef, useState } from 'react';
import { KmSource } from '../types';
import { formatDigits, formatKm, formatRupiah, parseDecimal, round1 } from '../lib/format';
import { Icon } from './Icons';

export interface OrderFormValue {
  nominal: number; // pendapatan order (manual)
  tambahan: number; // hasil tambahan Rp (manual, opsional)
  kmJemput?: number;
  kmAntar?: number;
  catatan: string;
}

interface Props {
  judul: string;
  /** Ringkasan rute. */
  ringkasan?: React.ReactNode;
  simpanLabel: string;
  nominalAwal?: number;
  tambahanAwal?: number;
  kmJemput?: number;
  kmAntar?: number;
  kmJemputSrc?: KmSource;
  kmAntarSrc?: KmSource;
  catatan?: string;
  onSave: (v: OrderFormValue) => void;
  onClose: () => void;
  onDelete?: () => void;
}

const SRC_LABEL: Record<KmSource, string> = {
  rute: 'otomatis dari rute jalan',
  estimasi: 'otomatis (estimasi offline)',
  manual: 'diisi manual',
};

function kmText(v?: number): string {
  return v === undefined || !isFinite(v) ? '' : String(v).replace('.', ',');
}

/** Jarak otomatis (hanya tampil). Bila GPS gagal, kolom jadi bisa diisi sebagai cadangan. */
function KmField(p: {
  label: string;
  auto?: number;
  src?: KmSource;
  teks: string;
  setTeks: (s: string) => void;
}) {
  const otomatis = p.auto !== undefined && isFinite(p.auto);
  return (
    <div className="field">
      <span className="field-label">{p.label}</span>
      {otomatis ? (
        <div className="input input-readonly" aria-readonly="true">
          {formatKm(p.auto)}
        </div>
      ) : (
        <input
          className="input"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,0"
          value={p.teks}
          onChange={(e) => p.setTeks(e.target.value.replace(/[^\d.,]/g, ''))}
        />
      )}
      <span className="field-hint">
        {otomatis ? (p.src ? SRC_LABEL[p.src] : 'otomatis') : 'GPS tidak tersedia, isi jarak manual'}
      </span>
    </div>
  );
}

export function OrderSheet(p: Props) {
  const [digits, setDigits] = useState(p.nominalAwal ? String(p.nominalAwal) : '');
  const [tambah, setTambah] = useState(p.tambahanAwal ? String(p.tambahanAwal) : '');
  const [kmJ, setKmJ] = useState(kmText(p.kmJemput));
  const [kmA, setKmA] = useState(kmText(p.kmAntar));
  const [catatan, setCatatan] = useState(p.catatan ?? '');
  const [hapusYakin, setHapusYakin] = useState(false);
  const nomRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => nomRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const nominal = Number(digits) || 0;
  const tambahan = Number(tambah) || 0;
  const j = p.kmJemput !== undefined ? p.kmJemput : parseDecimal(kmJ);
  const a = p.kmAntar !== undefined ? p.kmAntar : parseDecimal(kmA);
  const total = round1((j ?? 0) + (a ?? 0));
  const bisaSimpan = nominal > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bisaSimpan) {
      nomRef.current?.focus();
      return;
    }
    p.onSave({ nominal, tambahan, kmJemput: j, kmAntar: a, catatan: catatan.trim() });
  };

  const fokus = (e: React.FocusEvent<HTMLElement>) =>
    e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });

  return (
    <div className="sheet-backdrop" onClick={p.onClose}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={p.judul}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{p.judul}</h2>
          <button type="button" className="icon-btn" onClick={p.onClose} aria-label="Tutup">
            <Icon name="x" />
          </button>
        </div>

        <div className="sheet-body">
          {p.ringkasan}

          <label className="field">
            <span className="field-label">Pendapatan order (Rp)</span>
            <div className="money">
              <span className="money-prefix">Rp</span>
              <input
                ref={nomRef}
                className="input input-money"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={formatDigits(digits)}
                onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 9))}
                onFocus={fokus}
              />
            </div>
            <span className="field-hint">Isi sendiri sesuai yang Anda terima dari aplikasi.</span>
          </label>

          <div className="grid2">
            <KmField label="KM ke jemput" auto={p.kmJemput} src={p.kmJemputSrc} teks={kmJ} setTeks={setKmJ} />
            <KmField label="KM jemput → antar" auto={p.kmAntar} src={p.kmAntarSrc} teks={kmA} setTeks={setKmA} />
          </div>

          <div className="total-row">
            <span>Total jarak order</span>
            <strong>{formatKm(total)}</strong>
          </div>

          <label className="field">
            <span className="field-label">Hasil tambahan Rp</span>
            <div className="money">
              <span className="money-prefix">Rp</span>
              <input
                className="input input-money input-money-sm"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={formatDigits(tambah)}
                onChange={(e) => setTambah(e.target.value.replace(/\D/g, '').slice(0, 9))}
                onFocus={fokus}
              />
            </div>
            <span className="field-hint">Opsional: tip, bonus, dan sejenisnya.</span>
          </label>

          <label className="field">
            <span className="field-label">Catatan (opsional)</span>
            <input
              className="input"
              value={catatan}
              maxLength={120}
              placeholder="Contoh: parkir, tol"
              onChange={(e) => setCatatan(e.target.value)}
              onFocus={fokus}
            />
          </label>

          <div className="total-row total-row-strong">
            <span>Total pendapatan</span>
            <strong>{formatRupiah(nominal + tambahan)}</strong>
          </div>
        </div>

        <div className="sheet-foot">
          {p.onDelete &&
            (hapusYakin ? (
              <button type="button" className="btn btn-danger" onClick={p.onDelete}>
                Ya, hapus
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setHapusYakin(true)}
                aria-label="Hapus order"
              >
                <Icon name="trash" />
              </button>
            ))}
          <button type="button" className="btn btn-ghost" onClick={p.onClose}>
            Kembali
          </button>
          <button type="submit" className="btn btn-primary grow" disabled={!bisaSimpan}>
            <Icon name="check" size={20} />
            {p.simpanLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
