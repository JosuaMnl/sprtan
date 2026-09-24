# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di sini.

Format mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan proyek ini memakai [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Changed

- **Redesign UI seluruh aplikasi**: gaya aplikasi lari modern mengikuti 2
  referensi: tema terang untuk semua halaman, layar tracking lari (`#/run/track`)
  bergelap dengan peta malam. Aksen tetap crimson Spartan, ditambah lime (target,
  rekor) dan indigo (pace). Font baru Bricolage Grotesque + Geist menggantikan
  Cinzel, Inter, dan IBM Plex Mono. Judul halaman dua warna ("Riwayat / Lari"),
  kartu sudut bulat besar, ikon SVG buatan sendiri menggantikan emoji di navigasi.
  Logo lambda dan nama SPRTAN dipertahankan; teks Yunani dan nama "Arena"
  (sekarang "Beranda") dihapus. Sistem desain dikunci di `design.md`.
- **Beranda**: kartu hero volume pekan ini, cincin "hari aktif" 7 hari terakhir
  (latihan + lari), ringkasan lari 7 hari, dan tombol "Catat Latihan" yang
  menempel di atas tab bar di HP.
- **Layar lari**: jarak raksasa, pill pace indigo, baris statistik bergaris,
  tombol Jeda/Selesai besar berdampingan; di desktop peta tampil di kolom kanan.
- Kartu bagikan lari memakai font baru.
- **Navigasi disederhanakan dari 7 jadi 4 menu**: Beranda, Catat, Lari, Progres.
  Rekor pribadi jadi tab di dalam Progres (Grafik / Rekor pribadi), Daftar
  gerakan dibuka dari halaman Catat dan Pengaturan, Pengaturan pindah ke ikon
  gerigi di pojok kanan atas (HP) atau bawah rail (desktop). Semua URL lama
  tetap berfungsi. Halaman turunan (Gerakan, Pengaturan, Privasi, Detail lari)
  punya tombol kembali. Tambah link "Lewati ke konten" untuk pengguna keyboard
  (memfokuskan konten tanpa mengubah rute hash).
- **Tema terang/gelap berlaku untuk semua halaman**: pilih lewat tombol
  bulan/matahari di pojok kanan atas atau di Pengaturan (Terang / Gelap / Ikuti
  HP, default mengikuti HP). Pilihan disimpan dan diterapkan sebelum halaman
  tampil, jadi tidak ada kedip putih. Layar lari tidak lagi dipaksa gelap. Ikon
  Pengaturan digambar ulang sebagai roda gigi agar tidak tertukar dengan ikon
  tema.
- **Catat latihan**: memilih gerakan langsung menambahkannya ke sesi (tanpa
  tombol "Tambah"), daftar dikelompokkan per otot.

### Added

- **Halaman Kebijakan Privasi** (`#/privasi`) — mengungkap penyimpanan data
  lokal, GPS, Google Fonts, OpenStreetMap, dan cookie iklan Google AdSense
  (syarat approval AdSense). Tertaut dari Pengaturan dan side-rail.
- **Integrasi Google AdSense** — tag loader AdSense (`ca-pub-1557856769360345`)
  dan meta verifikasi `google-adsense-account` di `<head>` untuk Auto ads, plus
  `public/ads.txt` (otorisasi seller) agar terhindar dari peringatan "Earnings at
  risk". Iklan hanya tampil online dan setelah situs di-approve Google.
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
- Utilitas teruji: `geo` (haversine, klasifikasi hop, filter Kalman, segmentasi
  rute, jarak lintasan, elevasi, pace rata-rata & pace jendela bergerak),
  `distance` (konversi & format km/mil), `projection` (GPS → kotak kanvas),
  `tilemath` (Web Mercator / tile OSM).
- Cache runtime tile OpenStreetMap (`osm-tiles-v2`) agar area yang pernah
  dibuka tetap tampil offline; hanya menyimpan respons CORS-clean agar aman
  dipakai ulang oleh kanvas kartu share.

### Changed

- **Peta lari lebih hemat baterai saat melacak.** `RunMap` kini di-memo dan
  gaya garis/penanda jadi konstanta, sehingga tick pembacaan 500 ms tidak lagi
  memicu `setStyle()`/`setLatLng()` Leaflet di setiap layer. Rute juga dibangun
  bertahap (`lib/routeChunks.ts`) dalam potongan maksimal 400 titik: fix GPS
  baru hanya memperbarui potongan terakhir, potongan lama tidak digambar ulang.
  Hasil uji dengan GPS simulasi 900 titik: perubahan SVG turun dari 25.218
  menjadi 2.855 (sekitar 9x lebih sedikit), dan saat tidak ada fix baru turun
  dari 208 per 4 detik menjadi 0. Aturan pemutusan segmen dipindah ke
  `isSegmentBreak` (dipakai bersama oleh `splitSegments`), perilakunya tetap.
  Lapisan glow rute kini berada di pane Leaflet tersendiri dan transparansinya
  diterapkan ke pane (token `--route-glow-opacity` menggantikan
  `--color-route-glow`), supaya sambungan antar-potongan tidak tampak menggelap.
- **Akurasi pelacakan lari & pace disetarakan dengan Strava.** Setiap fix GPS
  kini melewati pipeline bertahap yang sama, baik saat live maupun saat dihitung
  ulang dari jejak tersimpan:
  1. *gerbang akurasi* — fix di atas ±25 m dibuang (dulu ±30 m dan tetap dipakai);
  2. *gerbang teleportasi* — lompatan di atas 12,5 m/s (≈45 km/h) ditolak sebagai
     fix rusak, bukan ditambahkan sebagai jarak hantu;
  3. *penghalusan Kalman* — posisi difusikan dengan bobot akurasi tiap fix,
     memangkas zig-zag yang membuat rute patah-patah di peta **dan** membuat
     jarak melar (simulasi lari lurus 300 m dengan derau acak ±8 m tiap detik:
     692 m mentah → 397 m setelah dihaluskan);
  4. *lantai jitter adaptif* — ambang batas ikut akurasi (2–6 m), dan titik
     jangkar hanya bergeser saat sebuah hop benar-benar dihitung, sehingga
     langkah lambat tetap terakumulasi alih-alih dibuang satu per satu;
  5. *jeda otomatis* — jam berhenti saat kecepatan turun di bawah 0,8 m/s selama
     8 detik, jadi berhenti di lampu merah tidak lagi merusak pace rata-rata.
- **Pace kini menampilkan dua angka.** "Pace Kini" dihitung dari jendela 30 detik
  terakhir (seperti jam lari), bukan rata-rata seumur lari yang nyaris tak
  bergerak saat kamu berakselerasi; "Pace Rata²" tetap ditampilkan berdampingan.
- **Rute di peta dipecah per segmen.** Jeda manual dan hilangnya sinyal tidak
  lagi digambar sebagai garis lurus menembus peta; peta juga berhenti memaksa
  recenter begitu pengguna menggeser/zoom (tersedia tombol "Pusatkan").
- **Elevasi memakai pita histeresis 5 m** menggantikan penjumlahan setiap
  kenaikan >1 m — derau altimeter GPS (±10 m) tidak lagi mengubah rute datar
  menjadi ratusan meter "tanjakan".
- Layar ditahan tetap menyala via Screen Wake Lock selama merekam; layar terkunci
  membuat sistem membatasi geolocation dan meninggalkan lubang di jejak.
- `watchPosition` memakai `maximumAge: 0` dan mempertahankan lock GPS selama
  jeda manual, agar fix basi/lemah tidak mengotori awal segmen berikutnya.
- Indikator kekuatan sinyal GPS pada layar pelacakan — saat status "Mencari
  sinyal", memang belum ada satu pun titik yang direkam.
- Email kontak Kebijakan Privasi kini dibaca dari env `VITE_CONTACT_EMAIL`
  (fallback ke default bila kosong), agar email pribadi tidak ikut ter-commit;
  ditambah `.env.example` sebagai dokumentasi. Tanggal "Terakhir diperbarui"
  sengaja tetap konstanta di kode agar jujur mengikuti perubahan isi.
- Penguatan pelacakan & pemuatan lari: penanganan izin GPS ditolak menghentikan
  tracker, guard kebocoran `watchPosition`, guard navigasi saat lari berjalan,
  penanganan gagal-simpan, dan perbaikan status "tidak ditemukan" pada halaman
  detail. (`e82a4dd`)
- `TileLayer` Leaflet memakai `crossOrigin` agar tile yang di-cache dapat dipakai
  ulang oleh kanvas kartu share tanpa memicu *taint*.

### Fixed

- **Rute tidak lagi memotong tikungan dan jarak tidak lagi terbaca pendek.**
  Filter Kalman dulu hanya memperkirakan posisi, sehingga titik hasil saringan
  selalu tertinggal di belakang pelari (±4 m pada akurasi 5 m, ±14 m pada akurasi
  15 m) dan membulatkan setiap belokan. Kini filter juga memperkirakan kecepatan
  (model kecepatan konstan) dan memprediksi posisi berikutnya, lalu di-reset bila
  sinyal hilang lebih dari 10 detik. Simulasi 3 putaran blok 100 m (1.200 m):
  1.141 m dengan filter lama → 1.238 m sekarang. Hasilnya lebih dekat ke perilaku
  Strava yang cenderung sedikit lebih panjang, bukan lebih pendek. Lari yang
  sudah tersimpan tidak berubah.
- Jarak live dan jarak yang dihitung ulang dari `run.path` kini identik.
  Sebelumnya tracker memakai titik terakhir *yang dihitung* sebagai acuan
  sementara `pathDistanceM` memakai titik sebelumnya apa adanya, sehingga kedua
  angka bisa berbeda untuk jejak yang sama.
- Jarak yang ditempuh selama jeda manual tidak lagi ikut terhitung saat statistik
  dihitung ulang dari jejak tersimpan (titik pertama setelah jeda kini ditandai).
- Waktu tempuh kini benar-benar "waktu bergerak"; waktu total termasuk jeda
  otomatis disimpan terpisah (`Run.totalMs`, opsional) dan ditampilkan di halaman
  detail bila berbeda.
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
