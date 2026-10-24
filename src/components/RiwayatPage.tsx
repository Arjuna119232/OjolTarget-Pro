import React, { useMemo, useState } from 'react';
import { OrderRecord, Platform } from '../types';
import { formatJam, formatKm, formatRupiah, formatTanggal, round1, startOfDay } from '../lib/format';
import { ordersToCSV } from '../lib/storage';
import { simpanFile } from '../lib/native';
import { Icon } from './Icons';
import { OrderFormValue, OrderSheet } from './OrderSheet';

interface Props {
  orders: OrderRecord[];
  platform: Platform;
  onAdd: (v: OrderFormValue) => void;
  onEdit: (id: string, v: OrderFormValue) => void;
  onDelete: (id: string) => void;
  toast: (msg: string) => void;
}

type Rentang = 'hari' | '7' | 'semua';

export function RiwayatPage({ orders, platform, onAdd, onEdit, onDelete, toast }: Props) {
  const [rentang, setRentang] = useState<Rentang>('hari');
  const [form, setForm] = useState<null | { mode: 'tambah' } | { mode: 'edit'; order: OrderRecord }>(null);

  const daftar = useMemo(() => {
    const dari =
      rentang === 'hari' ? startOfDay(Date.now()) : rentang === '7' ? Date.now() - 7 * 86400000 : 0;
    return orders.filter((o) => o.timestamp >= dari).sort((a, b) => b.timestamp - a.timestamp);
  }, [orders, rentang]);

  const totalRp = daftar.reduce((s, o) => s + (o.nominal || 0), 0);
  const totalKm = round1(daftar.reduce((s, o) => s + (o.kmTotalTrip || 0), 0));
  const rpPerKm = totalKm > 0 ? totalRp / totalKm : 0;

  const grup = useMemo(() => {
    const m = new Map<string, OrderRecord[]>();
    for (const o of daftar) {
      const k = formatTanggal(o.timestamp);
      (m.get(k) ?? m.set(k, []).get(k)!).push(o);
    }
    return [...m.entries()];
  }, [daftar]);

  const ekspor = () => {
    if (!daftar.length) {
      toast('Belum ada order untuk diekspor.');
      return;
    }
    const nama = `OjolTarget-Order-${new Date().toISOString().slice(0, 10)}.csv`;
    const ok = simpanFile(nama, ordersToCSV(daftar), 'text/csv;charset=utf-8');
    toast(ok ? 'Ekspor CSV dikirim ke folder Download.' : 'Ekspor gagal.');
  };

  const tutup = () => setForm(null);

  return (
    <div className="page">
      <div className="chips">
        {(
          [
            ['hari', 'Hari ini'],
            ['7', '7 hari'],
            ['semua', 'Semua'],
          ] as Array<[Rentang, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`chip ${rentang === id ? 'on' : ''}`}
            onClick={() => setRentang(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="stats stats-4">
        <div className="stat">
          <span className="stat-label">Order</span>
          <strong>{daftar.length}</strong>
        </div>
        <div className="stat stat-wide">
          <span className="stat-label">Pendapatan</span>
          <strong>{formatRupiah(totalRp)}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">Jarak</span>
          <strong>{formatKm(totalKm, '0,0 km')}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">Rp / km</span>
          <strong>{rpPerKm ? formatRupiah(rpPerKm) : '-'}</strong>
        </div>
      </section>

      <div className="row-actions">
        <button type="button" className="btn btn-ghost grow" onClick={() => setForm({ mode: 'tambah' })}>
          <Icon name="plus" size={18} /> Catat manual
        </button>
        <button type="button" className="btn btn-ghost grow" onClick={ekspor}>
          <Icon name="download" size={18} /> Ekspor CSV
        </button>
      </div>

      {grup.length === 0 ? (
        <section className="card empty">
          <Icon name="list" size={34} />
          <p>Belum ada order pada rentang ini.</p>
        </section>
      ) : (
        grup.map(([tgl, items]) => (
          <section key={tgl} className="card">
            <h3 className="card-title">
              {tgl}
              <small>{formatRupiah(items.reduce((s, o) => s + o.nominal, 0))}</small>
            </h3>
            <ul className="orders">
              {items.map((o) => {
                const nama = [o.titikJemputNama ?? o.namaLokasi, o.titikAntarNama].filter(Boolean).join(' → ');
                return (
                  <li key={o.id}>
                    <button type="button" className="order-row" onClick={() => setForm({ mode: 'edit', order: o })}>
                      <span className="order-time">
                        {formatJam(o.timestamp)}
                        <small>{o.platform}</small>
                      </span>
                      <span className="order-main">
                        <strong>{formatRupiah(o.nominal)}</strong>
                        <small>
                          {o.kmTotalTrip
                            ? `${formatKm(o.kmTotalTrip)}${
                                o.kmKeJemput !== undefined && o.kmKeAntar !== undefined
                                  ? ` (jemput ${formatKm(o.kmKeJemput)} + antar ${formatKm(o.kmKeAntar)})`
                                  : ''
                              }`
                            : 'jarak belum diisi'}
                        </small>
                        {nama && <small className="order-places">{nama}</small>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {form?.mode === 'tambah' && (
        <OrderSheet
          judul="Catat order manual"
          simpanLabel="Simpan"
          platform={platform}
          onSave={(v) => {
            onAdd(v);
            tutup();
          }}
          onClose={tutup}
        />
      )}
      {form?.mode === 'edit' && (
        <OrderSheet
          judul="Ubah order"
          simpanLabel="Simpan perubahan"
          platform={form.order.platform}
          nominalAwal={form.order.nominal}
          kmJemput={form.order.kmKeJemput}
          kmAntar={form.order.kmKeAntar}
          catatan={form.order.catatan}
          onSave={(v) => {
            onEdit(form.order.id, v);
            tutup();
          }}
          onDelete={() => {
            onDelete(form.order.id);
            tutup();
          }}
          onClose={tutup}
        />
      )}
    </div>
  );
}
