import React, { useEffect, useRef, useState } from 'react';
import { Akun, ActiveOrder, KmSource, OrderRecord, Place } from '../types';
import { getFix } from '../lib/geo';
import { estimasiKm, jarakRute } from '../lib/route';
import { cariNama } from '../lib/geocode';
import {
  formatDurasi,
  formatHariTanggal,
  formatJam,
  formatKm,
  formatRupiah,
  round1,
  startOfDay,
  totalOrder,
  uid,
} from '../lib/format';
import { vibrate } from '../lib/native';
import { Icon } from './Icons';
import { OrderFormValue, OrderSheet } from './OrderSheet';

export interface AksiWidget {
  id: 'dapat' | 'jemput' | 'selesai';
  n: number;
}

interface Props {
  akun: Akun;
  aksi: AksiWidget | null;
  onAksiDone: () => void;
  active: ActiveOrder | null;
  setActive: (fn: (prev: ActiveOrder | null) => ActiveOrder | null) => void;
  orders: OrderRecord[];
  onFinish: (a: ActiveOrder, v: OrderFormValue) => void;
  toast: (msg: string) => void;
  onLihatMaps: () => void;
}

type Busy = null | 'dapat' | 'jemput' | 'selesai';
type PlaceKey = 'dapat' | 'jemput' | 'antar';

function useNow(aktif: boolean): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!aktif) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [aktif]);
  return now;
}

function namaTempat(p?: Place): string {
  if (!p) return 'Lokasi tidak terkunci';
  return p.nama || `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}

function SrcBadge({ src }: { src?: KmSource }) {
  if (!src) return null;
  const label = src === 'rute' ? 'rute' : src === 'estimasi' ? 'estimasi' : 'manual';
  return <span className={`badge badge-${src}`}>{label}</span>;
}

export function OrderPage({
  akun,
  aksi,
  onAksiDone,
  active,
  setActive,
  orders,
  onFinish,
  toast,
  onLihatMaps,
}: Props) {
  const [busy, setBusy] = useState<Busy>(null);
  const [acc, setAcc] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [konfirmBatal, setKonfirmBatal] = useState(false);
  const platform = akun.platform;
  const now = useNow(!!active);
  const aktifRef = useRef(active);
  aktifRef.current = active;
  const sheetPushed = useRef(false);

  // Tombol Kembali Android menutup lembar input, bukan keluar aplikasi.
  useEffect(() => {
    const onPop = () => {
      sheetPushed.current = false;
      setSheet(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const bukaSheet = () => {
    if (!sheetPushed.current) {
      try {
        history.pushState({ sheet: 1 }, '');
        sheetPushed.current = true;
      } catch {
        /* abaikan */
      }
    }
    setSheet(true);
  };
  // Idempoten: aman dipanggil lebih dari sekali (tidak mundur dua entri riwayat).
  const tutupSheet = () => {
    if (sheetPushed.current) {
      sheetPushed.current = false;
      history.back();
    }
    setSheet(false);
  };

  // Jika order sudah tidak ada (dibatalkan), pastikan lembar tertutup.
  useEffect(() => {
    if (!active && sheet) tutupSheet();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const isiNama = (id: string, key: PlaceKey, place: Place) => {
    cariNama(place).then((n) => {
      setActive((prev) =>
        prev && prev.id === id && prev[key]
          ? { ...prev, [key]: { ...prev[key]!, nama: n.nama, wilayah: n.wilayah } }
          : prev
      );
    });
  };

  const kunciPosisi = async (): Promise<{ place?: Place; pesan?: string }> => {
    setAcc(null);
    try {
      const fix = await getFix({ onProgress: setAcc });
      return { place: fix };
    } catch (e) {
      return { pesan: e instanceof Error ? e.message : 'GPS gagal' };
    } finally {
      setAcc(null);
    }
  };

  // ---- 1. DAPAT ORDERAN ----
  const dapatOrder = async () => {
    if (busy || active) return;
    setKonfirmBatal(false);
    setBusy('dapat');
    vibrate(25);
    const { place, pesan } = await kunciPosisi();
    const order: ActiveOrder = {
      id: uid(),
      platform,
      phase: 'menuju-jemput',
      waktuDapat: Date.now(),
      dapat: place,
    };
    setActive(() => order);
    setBusy(null);
    if (place) isiNama(order.id, 'dapat', place);
    toast(pesan ? `Order dimulai tanpa lokasi. ${pesan}` : 'Order tercatat. Lokasi dapat order terkunci.');
  };

  // Jarak dari titik a ke b: tampil estimasi dulu, lalu diperbarui dengan jarak rute jalan.
  const hitungJarak = (id: string, a: Place | undefined, b: Place | undefined, leg: 'jemput' | 'antar') => {
    if (!a || !b) return undefined;
    const est = estimasiKm(a, b);
    const kmKey = leg === 'jemput' ? 'kmJemput' : 'kmAntar';
    const srcKey = leg === 'jemput' ? 'kmJemputSrc' : 'kmAntarSrc';
    jarakRute(a, b).then((r) => {
      if (!r) return;
      setActive((prev) =>
        prev && prev.id === id && prev[srcKey] !== 'manual' ? { ...prev, [kmKey]: r.km, [srcKey]: 'rute' } : prev
      );
    });
    return est;
  };

  // ---- 2. SUDAH JEMPUT ----
  const sudahJemput = async () => {
    const a = aktifRef.current;
    if (busy || !a || a.phase !== 'menuju-jemput') return;
    setKonfirmBatal(false);
    setBusy('jemput');
    vibrate(25);
    const { place, pesan } = await kunciPosisi();
    const est = hitungJarak(a.id, a.dapat, place, 'jemput');
    setActive((prev) =>
      prev && prev.id === a.id
        ? {
            ...prev,
            phase: 'menuju-antar',
            waktuJemput: Date.now(),
            jemput: place,
            kmJemput: est?.km,
            kmJemputSrc: est?.src,
          }
        : prev
    );
    setBusy(null);
    if (place) isiNama(a.id, 'jemput', place);
    toast(
      pesan
        ? `Jemput tercatat tanpa lokasi. ${pesan}`
        : est
        ? `Jemput tercatat. Jarak ke jemput ${formatKm(est.km)}.`
        : 'Jemput tercatat.'
    );
  };

  // ---- 3. ORDER SELESAI ----
  const orderSelesai = async () => {
    const a = aktifRef.current;
    if (busy || !a || a.phase !== 'menuju-antar') return;
    // Lokasi antar sudah terkunci: langsung buka form, tidak mengunci ulang.
    if (a.waktuSelesai && a.antar) {
      bukaSheet();
      return;
    }
    setBusy('selesai');
    vibrate(25);
    const { place, pesan } = await kunciPosisi();
    const est = hitungJarak(a.id, a.jemput, place, 'antar');
    setActive((prev) =>
      prev && prev.id === a.id
        ? { ...prev, antar: place, waktuSelesai: Date.now(), kmAntar: est?.km, kmAntarSrc: est?.src }
        : prev
    );
    setBusy(null);
    if (place) isiNama(a.id, 'antar', place);
    if (pesan) toast(`Lokasi antar tidak terkunci. ${pesan} Isi KM manual.`);
    bukaSheet();
  };

  const batalkan = () => {
    setActive(() => null);
    setKonfirmBatal(false);
    toast('Order dibatalkan.');
  };

  // Aksi dari widget layar utama: dijalankan sekali, hanya bila masih baru.
  useEffect(() => {
    if (!aksi) return;
    onAksiDone();
    if (Date.now() - aksi.n > 120000) return;
    if (aksi.id === 'dapat') void dapatOrder();
    else if (aksi.id === 'jemput') void sudahJemput();
    else void orderSelesai();
  }, [aksi]); // eslint-disable-line react-hooks/exhaustive-deps

  const simpan = (v: OrderFormValue) => {
    const a = aktifRef.current;
    if (!a) return;
    onFinish(a, v);
    tutupSheet();
  };

  // ---- Ringkasan hari ini ----
  const mulai = startOfDay(Date.now());
  const hariIni = orders.filter((o) => o.timestamp >= mulai);
  const totalRp = hariIni.reduce((s, o) => s + totalOrder(o), 0);
  const pct = akun.targetHarian > 0 ? Math.min(100, Math.round((totalRp / akun.targetHarian) * 100)) : 0;
  const totalKm = round1(hariIni.reduce((s, o) => s + (o.kmTotalTrip || 0), 0));

  const phase = active?.phase;
  const langkah = !active ? 0 : phase === 'menuju-jemput' ? 1 : 2;

  return (
    <div className="page">
      <section className="card target" aria-label="Target hari ini">
        <div className="target-head">
          <span>
            Target hari ini <small>{formatHariTanggal(Date.now())}</small>
          </span>
          <strong>{pct}%</strong>
        </div>
        <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="muted small">
          {formatRupiah(totalRp)} dari {formatRupiah(akun.targetHarian)} · {akun.lencana} · online{' '}
          {String(akun.jamOnline).replace('.', ',')} jam/hari · {akun.hariOnbid} hari/minggu
        </p>
      </section>

      <section className="stats" aria-label="Ringkasan hari ini">
        <div className="stat">
          <span className="stat-label">Order</span>
          <strong>{hariIni.length}</strong>
        </div>
        <div className="stat stat-wide">
          <span className="stat-label">Pendapatan</span>
          <strong>{formatRupiah(totalRp)}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">Jarak</span>
          <strong>{formatKm(totalKm, '0,0 km')}</strong>
        </div>
      </section>

      <section className="card flow">
        <ol className="steps" aria-label="Tahap order">
          {['Dapat order', 'Jemput', 'Selesai'].map((t, i) => (
            <li key={t} className={i < langkah ? 'done' : i === langkah ? 'now' : ''}>
              <span className="step-dot">{i < langkah ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
              <span className="step-name">{t}</span>
            </li>
          ))}
        </ol>

        {!active && (
          <>
            <p className="flow-title">Siap menerima order</p>
            <p className="muted">Platform: {platform}</p>
            <button
              type="button"
              className="cta cta-green"
              onClick={dapatOrder}
              disabled={busy !== null}
            >
              <Icon name="bolt" size={30} />
              <span className="cta-text">
                <strong>{busy === 'dapat' ? 'Mengunci GPS…' : 'DAPAT ORDERAN'}</strong>
                <small>
                  {busy === 'dapat'
                    ? acc !== null
                      ? `Akurasi ±${Math.round(acc)} m`
                      : 'Menunggu sinyal satelit'
                    : 'Kunci lokasi sekarang, hitung jarak ke titik jemput'}
                </small>
              </span>
            </button>
          </>
        )}

        {active && (
          <>
            <div className="flow-head">
              <div>
                <p className="flow-title">
                  {phase === 'menuju-jemput' ? 'Menuju titik jemput' : 'Menuju titik antar'}
                </p>
                <p className="muted">
                  {active.platform} · mulai {formatJam(active.waktuDapat)}
                </p>
              </div>
              <div className="timer" aria-label="Lama order">
                <Icon name="clock" size={16} />
                {formatDurasi(now - active.waktuDapat)}
              </div>
            </div>

            <ul className="points">
              <li>
                <Icon name="bolt" size={18} />
                <div>
                  <span className="point-k">Dapat order</span>
                  <span className="point-v">{namaTempat(active.dapat)}</span>
                </div>
              </li>
              {active.phase === 'menuju-antar' && (
                <li>
                  <Icon name="pin" size={18} />
                  <div>
                    <span className="point-k">
                      Jemput · {formatKm(active.kmJemput, 'jarak belum ada')} <SrcBadge src={active.kmJemputSrc} />
                    </span>
                    <span className="point-v">{namaTempat(active.jemput)}</span>
                  </div>
                </li>
              )}
            </ul>

            {phase === 'menuju-jemput' ? (
              <button type="button" className="cta cta-amber" onClick={sudahJemput} disabled={busy !== null}>
                <Icon name="pin" size={30} />
                <span className="cta-text">
                  <strong>{busy === 'jemput' ? 'Mengunci GPS…' : 'SUDAH JEMPUT'}</strong>
                  <small>
                    {busy === 'jemput'
                      ? acc !== null
                        ? `Akurasi ±${Math.round(acc)} m`
                        : 'Menunggu sinyal satelit'
                      : 'Hitung jarak dapat order → titik jemput'}
                  </small>
                </span>
              </button>
            ) : (
              <button type="button" className="cta cta-blue" onClick={orderSelesai} disabled={busy !== null}>
                <Icon name="flag" size={30} />
                <span className="cta-text">
                  <strong>{busy === 'selesai' ? 'Mengunci GPS…' : 'ORDER SELESAI'}</strong>
                  <small>
                    {busy === 'selesai'
                      ? acc !== null
                        ? `Akurasi ±${Math.round(acc)} m`
                        : 'Menunggu sinyal satelit'
                      : 'Hitung jarak jemput → antar, lalu isi pendapatan'}
                  </small>
                </span>
              </button>
            )}

            <div className="flow-actions">
              {phase === 'menuju-antar' && active.waktuSelesai && (
                <button type="button" className="btn btn-ghost" onClick={bukaSheet}>
                  Buka form pendapatan
                </button>
              )}
              {/* Batalkan hanya ada setelah "Dapat orderan" dan hilang begitu "Sudah jemput" ditekan. */}
              {phase === 'menuju-jemput' &&
                (konfirmBatal ? (
                  <>
                    <button type="button" className="btn btn-danger" onClick={batalkan}>
                      Ya, batalkan
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setKonfirmBatal(false)}>
                      Tidak
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-ghost" onClick={() => setKonfirmBatal(true)}>
                    Batalkan order
                  </button>
                ))}
            </div>
          </>
        )}
      </section>

      <section className="card tip">
        <Icon name="map" size={20} />
        <p>
          Setiap order yang disimpan otomatis masuk ke <strong>Maps Gacor</strong>: lokasi dapat order,
          titik jemput, dan titik antar.
        </p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onLihatMaps}>
          Buka
        </button>
      </section>

      {sheet && active && (
        <OrderSheet
          judul="Order selesai"
          simpanLabel="Simpan order"
          kmJemput={active.kmJemput}
          kmAntar={active.kmAntar}
          kmJemputSrc={active.kmJemputSrc}
          kmAntarSrc={active.kmAntarSrc}
          ringkasan={
            <div className="route-sum">
              <div>
                <Icon name="bolt" size={16} />
                <span>{namaTempat(active.dapat)}</span>
              </div>
              <div>
                <Icon name="pin" size={16} />
                <span>{namaTempat(active.jemput)}</span>
              </div>
              <div>
                <Icon name="flag" size={16} />
                <span>{namaTempat(active.antar)}</span>
              </div>
            </div>
          }
          onSave={simpan}
          onClose={tutupSheet}
        />
      )}
    </div>
  );
}
