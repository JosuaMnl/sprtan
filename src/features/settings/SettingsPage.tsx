import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/primitives'
import { Icon } from '../../components/ui/Icon'
import { useUnit } from '../../settings/UnitContext'
import { useTheme, type ThemePreference } from '../../settings/ThemeContext'
import type { WeightUnit } from '../../lib/units'
import './settings.css'

const UNITS: { value: WeightUnit; label: string; hint: string }[] = [
  { value: 'kg', label: 'Kilogram', hint: 'kg' },
  { value: 'lbs', label: 'Pound', hint: 'lbs' },
]

const THEMES: { value: ThemePreference; label: string; icon: 'sun' | 'moon' | 'gear' }[] = [
  { value: 'light', label: 'Terang', icon: 'sun' },
  { value: 'dark', label: 'Gelap', icon: 'moon' },
  { value: 'system', label: 'Ikuti HP', icon: 'gear' },
]

const LINKS = [
  {
    to: '/exercises',
    title: 'Daftar gerakan',
    desc: 'Tambah atau hapus gerakan buatanmu sendiri.',
  },
  {
    to: '/privasi',
    title: 'Privasi & data',
    desc: 'Data tersimpan lokal di perangkat ini. Baca cara Sprtan menangani data, lokasi, dan iklan.',
  },
]

export function SettingsPage() {
  const { unit, setUnit } = useUnit()
  const { preference, setPreference } = useTheme()

  return (
    <div>
      <PageHeader lead="Atur" title="Aplikasi" back={{ to: '/', label: 'Beranda' }} />

      <Card className="setting-card">
        <div className="setting-row">
          <div className="setting-row__text">
            <h2 className="setting-row__title">Satuan berat</h2>
            <p className="setting-row__desc">
              Semua data disimpan konsisten. Mengganti satuan hanya mengubah
              tampilan, tidak menyentuh angka aslimu.
            </p>
          </div>
          <div className="unit-toggle" role="radiogroup" aria-label="Satuan berat">
            {UNITS.map((u) => (
              <button
                key={u.value}
                role="radio"
                aria-checked={unit === u.value}
                className={`unit-toggle__opt ${unit === u.value ? 'is-active' : ''}`}
                onClick={() => setUnit(u.value)}
              >
                <span className="unit-toggle__label">{u.label}</span>
                <span className="unit-toggle__hint num">{u.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="setting-card">
        <div className="setting-row">
          <div className="setting-row__text">
            <h2 className="setting-row__title">Tema</h2>
            <p className="setting-row__desc">
              Berlaku untuk semua halaman. Tombol bulan/matahari di pojok kanan
              atas juga bisa mengganti tema dengan cepat.
            </p>
          </div>
          <div className="unit-toggle" role="radiogroup" aria-label="Tema">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={preference === t.value}
                className={`unit-toggle__opt ${preference === t.value ? 'is-active' : ''}`}
                onClick={() => setPreference(t.value)}
              >
                <Icon name={t.icon} size={18} />
                <span className="unit-toggle__label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <nav className="setting-links" aria-label="Menu lainnya">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="setting-links__row">
            <span className="setting-links__text">
              <span className="setting-links__title">{l.title}</span>
              <span className="setting-links__desc">{l.desc}</span>
            </span>
            <Icon name="arrow" size={18} className="setting-links__go" />
          </Link>
        ))}
      </nav>

      <p className="setting-foot">
        Konversi: 1 kg = 2,2046 lbs. Sprtan menyimpan berat dalam kilogram dan
        mengonversi ke satuan pilihanmu saat menampilkan.
      </p>
    </div>
  )
}
