# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di sini.

Format mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan proyek ini memakai [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Added

- **Halaman Kebijakan Privasi** (`#/privasi`) — mengungkap penyimpanan data
  lokal, GPS, Google Fonts, OpenStreetMap, dan cookie iklan Google AdSense
  (syarat approval AdSense). Tertaut dari Pengaturan dan side-rail.
- **Integrasi Google AdSense** — tag loader AdSense (`ca-pub-1557856769360345`)
  di `<head>` untuk Auto ads, plus `public/ads.txt` (otorisasi seller) agar
  terhindar dari peringatan "Earnings at risk". Iklan hanya tampil online &
  setelah situs di-approve Google.
- **Kartu bagikan capaian lari mode "Dengan Peta"** — kartu share yang menyertakan
  peta jalan OpenStreetMap sebagai latar (opaque, gaya Strava), memakai proyeksi
  Web Mercator agar rute sejajar dengan jalan. Dilengkapi atribusi OSM. Toggle di
  dialog untuk memilih **Transparan** atau **Dengan Peta**. (`5f51c99`)
- **Bagikan capaian lari (kartu transparan)** — hasilkan PNG transparan berisi
  rute + statistik (pace, waktu, jarak) + branding Sprtan, bisa diunduh atau
  dibagikan lewat Web Share API, untuk ditempel ke foto lain. (`5b39f4d`)
- **Pelacakan lari GPS ala Strava** — rekam lari via Geolocation dengan peta
  Leaflet/OpenStreetMap (garis rute live, jarak, durasi, pace, elevasi),
  simpan lari, halaman riwayat + detail rute. Satuan jarak/pace mengikuti
  setelan kg/lbs (kg → km·min/km, lbs → mil·min/mil). Store Dexie `runs`
  (migrasi v2, aditif). (`b60764a`)
- Utilitas teruji: `geo` (haversine, jarak lintasan, elevasi, pace),
  `distance` (konversi & format km/mil), `projection` (GPS → kotak kanvas),
  `tilemath` (Web Mercator / tile OSM).
- Cache runtime tile OpenStreetMap (`osm-tiles-v2`) agar area yang pernah
  dibuka tetap tampil offline; hanya menyimpan respons CORS-clean agar aman
  dipakai ulang oleh kanvas kartu share.

### Changed

- Penguatan pelacakan & pemuatan lari: penanganan izin GPS ditolak menghentikan
  tracker, guard kebocoran `watchPosition`, guard navigasi saat lari berjalan,
  penanganan gagal-simpan, dan perbaikan status "tidak ditemukan" pada halaman
  detail. (`e82a4dd`)
- `TileLayer` Leaflet memakai `crossOrigin` agar tile yang di-cache dapat dipakai
  ulang oleh kanvas kartu share tanpa memicu *taint*.

### Fixed

- `projectPathToBox` kini memetakan titik tunggal / lintasan tanpa rentang ke
  tengah kanvas dengan tepat (sebelumnya meleset ke sudut).
- Peringatan build Workbox "glob pattern doesn't match any files" pada dev —
  `globPatterns` kini hanya diterapkan saat build produksi.

## [0.1.0] - 2026-07-21

### Added

- Rilis awal **Sprtan** — pencatat progress angkat beban offline-first (PWA).
- Catat latihan (set: beban × reps per tanggal), perpustakaan gerakan
  (17 baku + custom), grafik progres (Est. 1RM / beban maks / volume),
  rekor pribadi otomatis, satuan kg/lbs, tema Spartan "ANDREIA". (`eaf2eaf`)
