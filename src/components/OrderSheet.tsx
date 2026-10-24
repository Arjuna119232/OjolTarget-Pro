import React, { useEffect, useRef, useState } from 'react';
import { KmSource, PLATFORMS, Platform } from '../types';
import { formatDigits, formatKm, parseDecimal, round1 } from '../lib/format';
import { Icon } from './Icons';

export interface OrderFormValue {
  nominal: number;
  kmJemput?: number;
  kmAntar?: number;
  platform: Platform;
  catatan: string;
}

interface Props {
  judul: string;
  /** Ringkasan rute (khusus order selesai). */
  ringkasan?: React.ReactNode;
  simpanLabel: string;
  platform: Platform;
  nominalAwal?: number;
  kmJemput?: number;
  kmAntar?: number;
  kmJemputSrc?: KmSource;
  kmAntarSrc?: KmSource;
  catatan?: string;
  /** Mode total saja (catat manual): satu kolom KM total. */
  onSave: (v: OrderFormValue) => void;
  onClose: () => void;
  onDelete?: () => void;
}

function kmText(v?: number): string {
  return v === undefined || !isFinite(v) ? '' : String(v).replace('.', ',');
}

const SRC_LABEL: Record<KmSource, string> = {
  rute: 'dari rute jalan',
  estimasi: 'estimasi (offline)',
  manual: 'diisi manual',
};

export function OrderSheet(p: Props) {
  const [digits, setDigits] = useState(p.nominalAwal ? String(p.nominalAwal) : '');
  const [kmJ, setKmJ] = useState(kmText(p.kmJemput));
  const [kmA, setKmA] = useState(kmText(p.kmAntar));
  const [dirtyJ, setDirtyJ] = useState(false);
  const [dirtyA, setDirtyA] = useState(false);
  const [platform, setPlatform] = useState<Platform>(p.platform);
  const [catatan, setCatatan] = useState(p.catatan ?? '');
  const [hapusYakin, setHapusYakin] = useState(false);
  const nomRef = useRef<HTMLInputElement>(null);

  // Hasil rute jalan bisa datang setelah sheet terbuka; perbarui selama belum diubah manual.
  useEffect(() => {
    if (!dirtyJ) setKmJ(kmText(p.kmJemput));
  }, [p.kmJemput, dirtyJ]);
  useEffect(() => {
    if (!dirtyA) setKmA(kmText(p.kmAntar));
  }, [p.kmAntar, dirtyA]);

  useEffect(() => {
    const t = setTimeout(() => nomRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const nominal = Number(digits) || 0;
  const j = parseDecimal(kmJ);
  const a = parseDecimal(kmA);
  const total = round1((j ?? 0) + (a ?? 0));
  const bisaSimpan = nominal > 0;

  const srcJ: KmSource | undefined = dirtyJ ? 'manual' : p.kmJemputSrc;
  const srcA: KmSource | undefined = dirtyA ? 'manual' : p.kmAntarSrc;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bisaSimpan) {
      nomRef.current?.focus();
      return;
    }
    p.onSave({ nominal, kmJemput: j, kmAntar: a, platform, catatan: catatan.trim() });
  };

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
                onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' })}
              />
            </div>
            <span className="field-hint">Isi sendiri sesuai yang Anda terima dari aplikasi.</span>
          </label>

          <div className="grid2">
            <label className="field">
              <span className="field-label">KM ke jemput</span>
              <input
                className="input"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,0"
                value={kmJ}
                onChange={(e) => {
                  setDirtyJ(true);
                  setKmJ(e.target.value.replace(/[^\d.,]/g, ''));
                }}
              />
              <span className="field-hint">{srcJ ? SRC_LABEL[srcJ] : 'isi manual'}</span>
            </label>
            <label className="field">
              <span className="field-label">KM jemput → antar</span>
              <input
                className="input"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,0"
                value={kmA}
                onChange={(e) => {
                  setDirtyA(true);
                  setKmA(e.target.value.replace(/[^\d.,]/g, ''));
                }}
              />
              <span className="field-hint">{srcA ? SRC_LABEL[srcA] : 'isi manual'}</span>
            </label>
          </div>

          <div className="total-row">
            <span>Total jarak order</span>
            <strong>{formatKm(total)}</strong>
          </div>

          <div className="field">
            <span className="field-label">Platform</span>
            <div className="chips">
              {PLATFORMS.map((pl) => (
                <button
                  type="button"
                  key={pl}
                  className={`chip ${platform === pl ? 'on' : ''}`}
                  onClick={() => setPlatform(pl)}
                >
                  {pl}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="field-label">Catatan (opsional)</span>
            <input
              className="input"
              value={catatan}
              maxLength={120}
              placeholder="Contoh: tip, tol, parkir"
              onChange={(e) => setCatatan(e.target.value)}
            />
          </label>
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
