# Android shell — OjolTarget Pro

Membungkus web app (`../`) menjadi APK tanpa Gradle: `aapt2` + `javac` + `d8` +
`apksigner`. Web disajikan lewat HTTP loopback (`127.0.0.1:47210`–`47217`) oleh
`AssetServer`, sehingga origin stabil dan `localStorage` bertahan antar restart.

## Isi

| File | Keterangan |
|---|---|
| `AndroidManifest.xml` | Manifest, izin minimal, tema splash |
| `java/com/ojoltarget/pro/MainActivity.java` | WebView, bridge native, insets, notifikasi |
| `java/com/ojoltarget/pro/AssetServer.java` | Server aset lokal (loopback) |
| `res/` | Ikon adaptif, tema, splash, ikon notifikasi, network security config |
| `fonts/` | Plus Jakarta Sans + JetBrains Mono (offline) |
| `prepare-assets.sh` | Menyusun `assets/www` dari `../dist` + font + gambar |
| `build.sh` | Build + tanda tangan APK |
| `pack_apk.py` | Packer + alignment 4-byte (pengganti `zipalign`) |

## Build

```sh
cd .. && npm run build
cd android
./prepare-assets.sh
./build.sh
```

Variabel lingkungan yang dipakai `build.sh`:

- `ANDROID_HOME` (default `/opt/android-sdk`)
- `ANDROID_JAR` resource: `platforms/android-31/android.jar` (aapt2 2.19 Debian
  tidak bisa membaca tabel resource android-35)
- `CODE_JAR`: `platforms/android-35/android.jar` (targetSdk tetap 35)

Di host ARM64 gunakan `aapt2` native Debian dan `d8`/`apksigner` versi JVM dari
`build-tools/35.0.0/lib/`.

## Keystore

`build.sh` membuat `debug.keystore` otomatis (password `android`, alias
`ojoltarget`) jika belum ada. **Jangan commit keystore.** APK rilis resmi
ditandatangani dengan kunci terpisah; build lokal tidak bisa menimpanya.

## Spesifikasi

- Package `com.ojoltarget.pro` (v2.1.0, tanpa widget), label OjolTarget Pro
- minSdk 24, targetSdk 35
- Izin: `INTERNET`, `ACCESS_NETWORK_STATE`, `POST_NOTIFICATIONS`, `VIBRATE`,
  `WAKE_LOCK`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`,
  `WRITE_EXTERNAL_STORAGE` (maxSdk 28)
- `allowBackup=false`
- `setTextZoom(100)` agar ukuran huruf sistem tidak memperbesar UI
