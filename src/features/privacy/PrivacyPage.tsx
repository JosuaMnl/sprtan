import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/primitives'
import './privacy.css'

/** Ganti dengan alamat email kontak aktif sebelum mengajukan AdSense. */
const CONTACT_EMAIL = 'kontak@sprtan.app'
const LAST_UPDATED = '24 Juli 2026'

function Ext({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="prose__link">
      {children}
    </a>
  )
}

export function PrivacyPage() {
  return (
    <div>
      <PageHeader eyebrow="ΝΟΜΟΣ" title="Kebijakan Privasi" />

      <Card className="prose">
        <p className="prose__meta">Terakhir diperbarui: {LAST_UPDATED}</p>

        <p>
          Sprtan adalah aplikasi web <strong>offline-first</strong> untuk mencatat
          latihan angkat beban dan melacak lari. Aplikasi ini{' '}
          <strong>tidak memiliki server, tidak memakai akun, dan tidak meminta login</strong>.
          Kebijakan ini menjelaskan data apa yang diproses dan oleh siapa.
        </p>

        <h2 className="prose__h">1. Data yang kamu buat disimpan di perangkatmu</h2>
        <p>
          Semua catatan latihan, set, dan lari (termasuk jejak rute GPS) disimpan{' '}
          <strong>secara lokal di dalam browser</strong> kamu (IndexedDB). Data ini{' '}
          <strong>tidak pernah dikirim ke server kami</strong>. Kami memang tidak
          punya server penyimpanan. Menghapus data situs di browser akan menghapus
          seluruh catatanmu secara permanen.
        </p>

        <h2 className="prose__h">2. Lokasi / GPS</h2>
        <p>
          Fitur pelacak lari menggunakan izin lokasi (Geolocation) browser hanya
          ketika kamu menekan “Mulai”. Titik-titik GPS dipakai untuk menghitung
          jarak, pace, dan menggambar rute, lalu disimpan{' '}
          <strong>hanya di perangkatmu</strong>. Lokasimu tidak kami kumpulkan atau
          kirim ke mana pun. Kamu bisa menolak atau mencabut izin lokasi kapan saja
          lewat pengaturan browser.
        </p>

        <h2 className="prose__h">3. Layanan pihak ketiga</h2>
        <p>Agar berfungsi, aplikasi memuat beberapa layanan pihak ketiga:</p>
        <ul className="prose__list">
          <li>
            <strong>Google Fonts</strong>: memuat huruf. Google dapat menerima
            alamat IP-mu saat font diunduh.
          </li>
          <li>
            <strong>OpenStreetMap</strong>: menyediakan peta jalan. Saat peta
            ditampilkan, alamat IP-mu dikirim ke server tile OpenStreetMap.
            Lihat{' '}
            <Ext href="https://wiki.osmfoundation.org/wiki/Privacy_Policy">
              kebijakan privasi OSM
            </Ext>
            .
          </li>
          <li>
            <strong>Google AdSense</strong>: menampilkan iklan (lihat bagian 4).
          </li>
        </ul>

        <h2 className="prose__h">4. Iklan &amp; cookie (Google AdSense)</h2>
        <ul className="prose__list">
          <li>
            Pihak ketiga, termasuk Google, menggunakan <strong>cookie</strong> untuk
            menayangkan iklan berdasarkan kunjungan sebelumnya ke situs ini atau
            situs lain.
          </li>
          <li>
            Penggunaan cookie iklan oleh Google memungkinkan Google dan mitranya
            menayangkan iklan kepadamu berdasarkan kunjunganmu ke situs ini dan/atau
            situs lain di internet.
          </li>
          <li>
            Kamu dapat menonaktifkan iklan yang dipersonalisasi melalui{' '}
            <Ext href="https://www.google.com/settings/ads">Setelan Iklan Google</Ext>
            .
          </li>
          <li>
            Kamu juga bisa menonaktifkan cookie vendor pihak ketiga lain melalui{' '}
            <Ext href="https://www.aboutads.info/choices/">
              www.aboutads.info/choices
            </Ext>
            .
          </li>
          <li>
            Info lebih lanjut: {' '}
            <Ext href="https://policies.google.com/technologies/ads">
              Bagaimana Google menggunakan cookie dalam iklan
            </Ext>
            .
          </li>
        </ul>

        <h2 className="prose__h">5. Pilihan &amp; hak kamu</h2>
        <ul className="prose__list">
          <li>Hapus lari atau latihan mana pun langsung di dalam aplikasi.</li>
          <li>
            Hapus seluruh data dengan membersihkan data situs di pengaturan browser.
          </li>
          <li>Cabut izin lokasi kapan saja lewat browser.</li>
          <li>Kelola preferensi iklan melalui tautan di bagian 4.</li>
        </ul>

        <h2 className="prose__h">6. Anak-anak</h2>
        <p>
          Aplikasi ini tidak ditujukan untuk anak di bawah 13 tahun dan tidak
          sengaja mengumpulkan data dari mereka.
        </p>

        <h2 className="prose__h">7. Perubahan kebijakan</h2>
        <p>
          Kebijakan ini dapat diperbarui sewaktu-waktu. Tanggal “Terakhir
          diperbarui” di atas akan menyesuaikan setiap ada perubahan.
        </p>

        <h2 className="prose__h">8. Kontak</h2>
        <p>
          Pertanyaan soal privasi? Hubungi{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="prose__link">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Card>

      <p className="prose__back">
        <Link to="/" className="prose__link">
          ← Kembali ke Arena
        </Link>
      </p>
    </div>
  )
}
