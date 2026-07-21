# Sprtan — ΜΟΛΩΝ ΛΑΒΕ

Aplikasi web **offline-first** untuk mencatat progress angkat beban. Semua data
disimpan lokal di browser (IndexedDB) — tanpa server, tanpa login. Tema visual
**Spartan Yunani** ("ANDREIA"): batu gelap, perunggu, dan crimson Spartan.

## Fitur

- **Catat latihan** — pilih gerakan, catat set (beban × reps) per tanggal.
- **Perpustakaan gerakan** — 17 gerakan baku + tambah/hapus gerakan custom, dikelompokkan per otot.
- **Grafik progres** — kurva Est. 1RM / Beban Maks / Volume per gerakan dari waktu ke waktu.
- **Rekor pribadi** — deteksi otomatis PR (beban tertinggi, reps, estimasi 1RM Epley) + kilau "forge" saat rekor baru.
- **PWA** — installable ke home screen, jalan **offline penuh** (service worker + precache app shell & font), auto-update di latar belakang.
- **Satuan kg / lbs** — pilih di halaman Pengaturan. Berat selalu disimpan kanonik dalam **kg**; mengganti satuan hanya mengubah tampilan & input, tidak menyentuh data lama.

## Ikon PWA

Ikon di-generate dari [scripts/icon-source.svg](scripts/icon-source.svg) (logomark Λ):

```bash
npm run icons   # tulis public/icons/*.png (192, 512, maskable, apple-touch)
```

## Stack

React 18 · Vite 5 · TypeScript · Dexie (IndexedDB) · React Router (hash) · Recharts · Vitest

## Menjalankan

```bash
npm install
npm run dev       # server dev di http://localhost:5178
npm run build     # type-check + build produksi ke dist/
npm run preview   # pratinjau hasil build
npm test          # unit test (Vitest)
```

## Struktur

```
src/
├── db/            # Dexie schema, tipe, seed gerakan
├── lib/           # oneRepMax (Epley), prCalculator, progress series, format — teruji
├── features/
│   ├── dashboard/ # Arena (bento stats)
│   ├── workout/   # Catat latihan + ExerciseBlock
│   ├── progress/  # Grafik (lazy-loaded)
│   ├── records/   # Rekor pribadi
│   └── exercises/ # Perpustakaan gerakan
├── components/
│   ├── ui/        # Button, Card, StatTile, Badge, Lambda (logomark Λ)
│   └── layout/    # AppShell (side-rail + bottom-tab), PageHeader
└── styles/        # tokens.css (design system), global.css
```

## Estimasi 1RM

Formula **Epley**: `1RM = beban × (1 + reps / 30)`. Untuk 1 rep mengembalikan
beban itu sendiri. Logika inti (`src/lib/`) tercakup unit test.

## Catatan

- Satuan: **kg**.
- Data hanya di browser ini — hapus data situs = hilang. (Export/import JSON direncanakan v2.)
