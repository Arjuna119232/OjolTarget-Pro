import jsPDF from 'jspdf';
import { formatRupiah, formatKM, formatTanggalIndonesia } from './nominatim';
import { ServiceRecord, RepairLog, DriverProfile, OrderRecord } from '@/types';

export function exportBukuServisPDF(
  profile: DriverProfile | null,
  services: ServiceRecord[],
  repairs: RepairLog[]
) {
  const doc = new jsPDF();
  let y = 18;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('BUKU SERVIS & LOG PERAWATAN KENDARAAN OJOL', 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dicetak dari OjolTarget Pro • ${new Date().toLocaleString('id-ID')}`, 14, y);
  y += 8;

  // Divider
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.6);
  doc.line(14, y, 196, y);
  y += 8;

  // Driver & Vehicle Information
  doc.setFont('helvetica', 'bold');
  doc.text('DATA KENDARAAN & DRIVER', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nama Pengemudi   : ${profile?.nama || 'Mitra Driver'}`, 14, y);
  doc.text(`Platform Utama   : ${profile?.primaryPlatform || 'Ojol'}`, 110, y);
  y += 5;
  doc.text(`Plat Nomor Kendaraan: ${profile?.platNomor || '-'}`, 14, y);
  doc.text(`Model Kendaraan  : ${profile?.modelKendaraan || '-'}`, 110, y);
  y += 5;
  doc.text(`Odometer Sekarang: ${formatKM(profile?.currentKM || 0)}`, 14, y);
  doc.text(`Daerah Operasi   : ${profile?.daerahOperasional || '-'}`, 110, y);
  y += 10;

  // Riwayat Servis Berkala
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('RIWAYAT SERVIS BERKALA (SINKRON DENGAN KM)', 14, y);
  y += 6;

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Tanggal', 16, y + 5);
  doc.text('Jenis Servis', 38, y + 5);
  doc.text('Bengkel', 74, y + 5);
  doc.text('KM Servis', 115, y + 5);
  doc.text('Target KM', 142, y + 5);
  doc.text('Total Biaya', 168, y + 5);
  y += 8;

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');

  if (services.length === 0) {
    doc.text('Belum ada data servis berkala tercatat.', 16, y + 5);
    y += 10;
  } else {
    const sorted = [...services].sort((a, b) => b.kmAtServis - a.kmAtServis);
    for (const s of sorted.slice(0, 18)) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(formatTanggalIndonesia(s.tanggal), 16, y);
      doc.text(s.type, 38, y);
      doc.text((s.bengkel || '-').substring(0, 20), 74, y);
      doc.text(formatKM(s.kmAtServis), 115, y);
      doc.text(formatKM(s.targetKM), 142, y);
      doc.text(formatRupiah(s.totalBiaya), 168, y);
      y += 6;
    }
  }

  y += 6;

  // Log Perbaikan
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LOG PERBAIKAN & PENGGANTIAN SUKU CADANG', 14, y);
  y += 6;

  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Tanggal', 16, y + 5);
  doc.text('Komponen / Part', 38, y + 5);
  doc.text('Kategori', 80, y + 5);
  doc.text('KM Perbaikan', 115, y + 5);
  doc.text('Bengkel', 142, y + 5);
  doc.text('Biaya', 168, y + 5);
  y += 8;

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');

  if (repairs.length === 0) {
    doc.text('Belum ada data perbaikan.', 16, y + 5);
    y += 10;
  } else {
    for (const r of repairs.slice(0, 12)) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(formatTanggalIndonesia(r.tanggal), 16, y);
      doc.text(r.komponen.substring(0, 20), 38, y);
      doc.text(r.kategori, 80, y);
      doc.text(formatKM(r.kmPerbaikan), 115, y);
      doc.text((r.bengkel || '-').substring(0, 14), 142, y);
      doc.text(formatRupiah(r.biaya), 168, y);
      y += 6;
    }
  }

  doc.save(`Buku-Servis-OjolTarget-${profile?.platNomor?.replace(/\s+/g, '_') || 'Armada'}.pdf`);
}

export function exportLaporanOrderPDF(
  profile: DriverProfile | null,
  orders: OrderRecord[],
  periodeLabel: string
) {
  const doc = new jsPDF();
  let y = 18;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('REKAP PENDAPATAN & RUTE PERJALANAN DRIVER', 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${periodeLabel} • Waktu Cetak: ${new Date().toLocaleString('id-ID')}`, 14, y);
  y += 7;

  // Divider
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.6);
  doc.line(14, y, 196, y);
  y += 8;

  // Driver summary metrics
  const totalTrip = orders.length;
  const totalPendapatan = orders.reduce((sum, o) => sum + o.nominal, 0);

  doc.setFontSize(9);
  doc.text(`Nama Driver      : ${profile?.nama || 'Mitra'}`, 14, y);
  doc.text(`Total Perjalanan : ${totalTrip} Trip Selesai`, 110, y);
  y += 5;
  doc.text(`Plat Kendaraan   : ${profile?.platNomor || '-'} (${profile?.modelKendaraan || '-'})`, 14, y);
  doc.text(`Platform Terdaftar: ${profile?.primaryPlatform || 'Ojol'}`, 110, y);
  y += 5;
  doc.text(`Daerah Operasi   : ${profile?.daerahOperasional || 'Jabodetabek'}`, 14, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Pendapatan : ${formatRupiah(totalPendapatan)}`, 110, y);
  y += 9;

  // 1. ANALISIS PERSENTASE LOKASI & SEBARAN WILAYAH
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DISTRIBUSI & PERSENTASE LOKASI (SEBARAN TRIP)', 14, y);
  y += 5;

  // Hitung persentase lokasi
  const locationMap: Record<string, { count: number; totalNominal: number }> = {};
  orders.forEach((o) => {
    const loc = o.titikJemputNama || o.wilayah || o.namaLokasi || 'Area Lapangan';
    if (!locationMap[loc]) locationMap[loc] = { count: 0, totalNominal: 0 };
    locationMap[loc].count += 1;
    locationMap[loc].totalNominal += o.nominal;
  });

  const sortedLocations = Object.entries(locationMap).sort((a, b) => b[1].count - a[1].count);

  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 6, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Lokasi / Wilayah Titik', 16, y + 4.5);
  doc.text('Jumlah Trip', 110, y + 4.5);
  doc.text('Persentase (%)', 138, y + 4.5);
  doc.text('Total Pendapatan', 165, y + 4.5);
  y += 7.5;

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');

  if (sortedLocations.length === 0) {
    doc.text('Belum ada data perjalanan pada periode ini.', 16, y + 4);
    y += 8;
  } else {
    for (const [loc, data] of sortedLocations.slice(0, 8)) {
      const pct = totalTrip > 0 ? ((data.count / totalTrip) * 100).toFixed(1) : '0';
      doc.text(loc.substring(0, 45), 16, y);
      doc.text(`${data.count} trip`, 110, y);
      doc.text(`${pct}%`, 138, y);
      doc.text(formatRupiah(data.totalNominal), 165, y);
      y += 5.5;
    }
  }

  y += 6;

  // 2. DAFTAR DETAIL PERJALANAN (TITIK JEMPUT, TITIK ANTAR & DETAIL KM)
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DETAIL PERJALANAN (TITIK JEMPUT & ANTAR INPUT USER)', 14, y);
  y += 5;

  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 6, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Waktu', 16, y + 4.5);
  doc.text('Titik Jemput (Input User)', 42, y + 4.5);
  doc.text('Titik Antar (Tujuan)', 105, y + 4.5);
  doc.text('Detail KM', 152, y + 4.5);
  doc.text('Pendapatan', 172, y + 4.5);
  y += 7.5;

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');

  for (const o of orders.slice(0, 30)) {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    const t = new Date(o.timestamp);
    const jam = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
    const tgl = `${t.getDate()}/${t.getMonth() + 1}`;

    const jemputStr = (o.titikJemputNama || o.namaLokasi || '-').substring(0, 28);
    const antarStr = (o.titikAntarNama || o.wilayah || '-').substring(0, 24);
    const detailKMStr = o.kmTotalTrip ? `${o.kmTotalTrip.toFixed(1)} KM` : '-';

    doc.text(`${tgl} ${jam}`, 16, y);
    doc.text(jemputStr, 42, y);
    doc.text(antarStr, 105, y);
    doc.text(detailKMStr, 152, y);
    doc.text(formatRupiah(o.nominal), 172, y);
    y += 5.5;
  }

  // Footer notes
  y += 6;
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(
    '* Catatan: Pendapatan yang tercatat merupakan nominal bersih yang diterima langsung oleh mitra driver.',
    14,
    y
  );

  doc.save(`Rekap-Perjalanan-OjolTarget-${periodeLabel.replace(/\s+/g, '_')}.pdf`);
}
