# OjolTarget Pro 2.1.0 — catatan perubahan

- Fokus Maps Gacor: Dapat orderan -> Sudah jemput -> Order selesai.
  - Jarak dapat->jemput dan jemput->antar dihitung dari GPS (rute OSRM, cadangan estimasi offline), bisa diedit.
  - Saat selesai: isi pendapatan MANUAL. Total jarak = dapat->jemput + jemput->antar.
  - Order tersimpan ke Riwayat dan 3 titik (dapat/jemput/antar) masuk Maps Gacor.
- Semua widget dihapus (HUD melayang di dalam app dan widget layar utama Android).
- Tampilan: warna status bar/navigasi native mengikuti tema, ikon bar menyesuaikan tema terang/gelap,
  tombol tidak lagi tertutup overlay, layout tidak restart saat ukuran font/tema sistem berubah.
- Data order/titik lama tetap terbaca (kunci penyimpanan sama).
- Build: `bun install && npm run build`, lalu `android/prepare-assets.sh && android/build.sh`
  (atau jalankan workflow GitHub Actions). Kunci debug.keystore dipertahankan agar bisa update tanpa uninstall.
